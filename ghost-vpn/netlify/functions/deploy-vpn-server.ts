/**
 * Ghost VPN - Server Deployment Function
 * Deploy WireGuard servers across multiple cloud providers
 */

import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import DigitalOcean from 'do-wrapper';
import AWS from 'aws-sdk';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface DeploymentRequest {
  userId: string;
  region: string;
  protocol: 'wireguard' | 'openvpn' | 'shadowsocks';
  provider: 'digitalocean' | 'vultr' | 'linode' | 'aws';
  apiKey: string;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const request: DeploymentRequest = JSON.parse(event.body!);
    
    // Validate user
    const user = await validateUser(event.headers.authorization);
    if (!user || user.id !== request.userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // Check if user already has an active server
    const { data: existingServer } = await supabase
      .from('user_vpn_servers')
      .select('*')
      .eq('user_id', request.userId)
      .eq('status', 'active')
      .single();

    if (existingServer) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'You already have an active VPN server. Delete it first.' 
        })
      };
    }

    // Deploy server based on provider
    let deployment;
    switch (request.provider) {
      case 'digitalocean':
        deployment = await deployDigitalOceanServer(request);
        break;
      case 'vultr':
        deployment = await deployVultrServer(request);
        break;
      case 'linode':
        deployment = await deployLinodeServer(request);
        break;
      case 'aws':
        deployment = await deployAWSServer(request);
        break;
      default:
        throw new Error(`Unsupported provider: ${request.provider}`);
    }

    // Install VPN server
    const vpnConfig = await installVPNServer(
      deployment.ip,
      deployment.sshKey,
      request.protocol
    );

    // Store in database
    const { data: server, error } = await supabase
      .from('user_vpn_servers')
      .insert({
        user_id: request.userId,
        server_ip: deployment.ip,
        droplet_id: deployment.id,
        region: request.region,
        protocol: request.protocol,
        provider: request.provider,
        config: vpnConfig,
        status: 'active',
        monthly_cost: deployment.cost
      })
      .select()
      .single();

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        server: {
          id: server.id,
          ip: deployment.ip,
          region: request.region,
          protocol: request.protocol,
          config: vpnConfig,
          cost: deployment.cost
        }
      })
    };

  } catch (error: any) {
    console.error('Deployment error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message || 'Deployment failed' 
      })
    };
  }
};

/**
 * Deploy on DigitalOcean
 */
async function deployDigitalOceanServer(request: DeploymentRequest) {
  const api = new DigitalOcean(request.apiKey, 250);

  // Generate SSH key
  const sshKey = await generateSSHKey();
  
  // Upload SSH key to DO
  const keyResponse = await api.accountAddKey({
    name: `ghost-vpn-${Date.now()}`,
    public_key: sshKey.publicKey
  });

  // Create droplet
  const dropletConfig = {
    name: `ghost-vpn-${request.userId.substring(0, 8)}`,
    region: request.region,
    size: 's-1vcpu-1gb', // $5/month
    image: 'ubuntu-22-04-x64',
    ssh_keys: [keyResponse.body.ssh_key.id],
    ipv6: true,
    monitoring: true,
    tags: ['ghost-vpn', `user-${request.userId}`]
  };

  const droplet = await api.dropletsCreate(dropletConfig);
  const dropletId = droplet.body.droplet.id;

  // Wait for droplet to be ready
  let ip: string | null = null;
  for (let i = 0; i < 60; i++) {
    await sleep(5000); // Wait 5 seconds

    const status = await api.dropletsGetById(dropletId);
    if (status.body.droplet.status === 'active' && status.body.droplet.networks.v4.length > 0) {
      ip = status.body.droplet.networks.v4[0].ip_address;
      break;
    }
  }

  if (!ip) {
    throw new Error('Failed to get droplet IP address');
  }

  // Wait for SSH to be ready
  await sleep(30000);

  return {
    id: dropletId.toString(),
    ip,
    sshKey: sshKey.privateKey,
    cost: 5.00
  };
}

/**
 * Deploy on AWS Lightsail
 */
async function deployAWSServer(request: DeploymentRequest) {
  const lightsail = new AWS.Lightsail({
    region: request.region,
    accessKeyId: request.apiKey.split(':')[0],
    secretAccessKey: request.apiKey.split(':')[1]
  });

  // Generate SSH key
  const sshKey = await generateSSHKey();

  // Upload SSH key
  const keyPairName = `ghost-vpn-${Date.now()}`;
  await lightsail.importKeyPair({
    keyPairName,
    publicKeyBase64: Buffer.from(sshKey.publicKey).toString('base64')
  }).promise();

  // Create instance
  const instanceName = `ghost-vpn-${request.userId.substring(0, 8)}`;
  const instance = await lightsail.createInstances({
    instanceNames: [instanceName],
    availabilityZone: `${request.region}a`,
    blueprintId: 'ubuntu_22_04',
    bundleId: 'nano_2_0', // $3.50/month
    keyPairName,
    tags: [
      { key: 'app', value: 'ghost-vpn' },
      { key: 'user', value: request.userId }
    ]
  }).promise();

  // Wait for instance to be running
  let ip: string | null = null;
  for (let i = 0; i < 60; i++) {
    await sleep(5000);

    const status = await lightsail.getInstance({
      instanceName
    }).promise();

    if (status.instance?.state.name === 'running' && status.instance?.publicIpAddress) {
      ip = status.instance.publicIpAddress;
      break;
    }
  }

  if (!ip) {
    throw new Error('Failed to get instance IP address');
  }

  // Wait for SSH
  await sleep(30000);

  return {
    id: instanceName,
    ip,
    sshKey: sshKey.privateKey,
    cost: 3.50
  };
}

/**
 * Install VPN server via SSH
 */
async function installVPNServer(
  ip: string,
  privateKey: string,
  protocol: string
): Promise<string> {
  const { NodeSSH } = require('node-ssh');
  const ssh = new NodeSSH();

  await ssh.connect({
    host: ip,
    username: 'root',
    privateKey
  });

  // Update system
  await ssh.execCommand('apt-get update && apt-get upgrade -y');

  // Install Docker
  await ssh.execCommand('curl -fsSL https://get.docker.com | sh');

  let config: string;

  switch (protocol) {
    case 'wireguard':
      config = await installWireGuard(ssh);
      break;
    case 'openvpn':
      config = await installOpenVPN(ssh);
      break;
    case 'shadowsocks':
      config = await installShadowsocks(ssh);
      break;
    default:
      throw new Error(`Unsupported protocol: ${protocol}`);
  }

  ssh.dispose();
  return config;
}

/**
 * Install WireGuard server
 */
async function installWireGuard(ssh: any): Promise<string> {
  // Install WireGuard
  await ssh.execCommand('apt-get install -y wireguard');

  // Generate keys
  const { stdout: privateKey } = await ssh.execCommand('wg genkey');
  const { stdout: publicKey } = await ssh.execCommand(`echo "${privateKey.trim()}" | wg pubkey`);
  
  // Generate client keys
  const { stdout: clientPrivateKey } = await ssh.execCommand('wg genkey');
  const { stdout: clientPublicKey } = await ssh.execCommand(`echo "${clientPrivateKey.trim()}" | wg pubkey`);

  // Create server config
  const serverConfig = `
[Interface]
Address = 10.8.0.1/24
ListenPort = 51820
PrivateKey = ${privateKey.trim()}
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
PublicKey = ${clientPublicKey.trim()}
AllowedIPs = 10.8.0.2/32
  `.trim();

  await ssh.execCommand(`echo "${serverConfig}" > /etc/wireguard/wg0.conf`);

  // Enable IP forwarding
  await ssh.execCommand('sysctl -w net.ipv4.ip_forward=1');
  await ssh.execCommand('echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf');

  // Start WireGuard
  await ssh.execCommand('systemctl enable wg-quick@wg0');
  await ssh.execCommand('systemctl start wg-quick@wg0');

  // Get server public IP
  const { stdout: serverIP } = await ssh.execCommand('curl -s ifconfig.me');

  // Generate client config
  const clientConfig = `
[Interface]
PrivateKey = ${clientPrivateKey.trim()}
Address = 10.8.0.2/24
DNS = 1.1.1.1, 1.0.0.1

[Peer]
PublicKey = ${publicKey.trim()}
Endpoint = ${serverIP.trim()}:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
  `.trim();

  return clientConfig;
}

/**
 * Install OpenVPN server (placeholder)
 */
async function installOpenVPN(ssh: any): Promise<string> {
  // Similar implementation for OpenVPN
  // Using openvpn-install script
  return 'OpenVPN config placeholder';
}

/**
 * Install Shadowsocks server (placeholder)
 */
async function installShadowsocks(ssh: any): Promise<string> {
  // Similar implementation for Shadowsocks
  return 'Shadowsocks config placeholder';
}

/**
 * Deploy on Vultr (placeholder)
 */
async function deployVultrServer(request: DeploymentRequest) {
  throw new Error('Vultr deployment not yet implemented');
}

/**
 * Deploy on Linode (placeholder)
 */
async function deployLinodeServer(request: DeploymentRequest) {
  throw new Error('Linode deployment not yet implemented');
}

/**
 * Validate user from JWT
 */
async function validateUser(authHeader: string | undefined) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  return error ? null : user;
}

/**
 * Generate SSH keypair
 */
async function generateSSHKey(): Promise<{ privateKey: string; publicKey: string }> {
  const { generateKeyPairSync } = require('crypto');
  
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  // Convert to SSH format
  const sshPublicKey = publicKey
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\n/g, '');

  return {
    privateKey,
    publicKey: `ssh-rsa ${sshPublicKey}`
  };
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

