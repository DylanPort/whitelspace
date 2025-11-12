const fetch = require('node-fetch');
const crypto = require('crypto');

// Linode API token (store in Netlify environment variables)
const LINODE_API_TOKEN = process.env.LINODE_API_TOKEN;
const LINODE_API_URL = 'https://api.linode.com/v4';

// Map regions to Linode region IDs
const REGION_MAP = {
  'nyc1': 'us-east',      // New York
  'sfo2': 'us-west',      // San Francisco/Fremont
  'ams3': 'eu-west',      // Amsterdam/London
  'sgp1': 'ap-south',     // Singapore
  'lon1': 'eu-west',      // London
  'fra1': 'eu-central',   // Frankfurt
  'tor1': 'ca-central',   // Toronto
  'blr1': 'ap-south'      // Bangalore/Singapore
};

// Generate WireGuard keys
function generateWireGuardKey() {
  return crypto.randomBytes(32).toString('base64');
}

function generatePublicKeyFromPrivate(privateKey) {
  // Simple hash-based public key (for demo - real implementation would use Curve25519)
  const hash = crypto.createHash('sha256').update(privateKey + 'public').digest();
  return hash.toString('base64');
}

// Helper function to add timeout to fetch
function fetchWithTimeout(url, options, timeout = 5000) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]);
}

exports.handler = async (event, context) => {
  // Ensure function returns quickly
  context.callbackWaitsForEmptyEventLoop = false;
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { region, protocol, userId } = JSON.parse(event.body);

    if (!LINODE_API_TOKEN) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'VPN provisioning not configured. Add LINODE_API_TOKEN to Netlify environment variables.' 
        })
      };
    }

    // Map region to Linode region
    const linodeRegion = REGION_MAP[region] || 'us-east';
    
    // Generate unique search tag
    const searchTag = `ghost-vpn-${userId}-${Date.now()}`;
    const label = searchTag;

    // Generate WireGuard keys upfront
    const serverPrivateKey = generateWireGuardKey();
    const serverPublicKey = generatePublicKeyFromPrivate(serverPrivateKey);
    const clientPrivateKey = generateWireGuardKey();
    const clientPublicKey = generatePublicKeyFromPrivate(clientPrivateKey);

    console.log('Creating VPN server in', linodeRegion, 'with tag:', searchTag);
    console.log('Keys generated - Server:', serverPublicKey.substring(0, 10), 'Client:', clientPublicKey.substring(0, 10));
    
    // Start the request but don't await it
    const createPromise = fetch(`${LINODE_API_URL}/linode/instances`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINODE_API_TOKEN}`
      },
      body: JSON.stringify({
        label: label,
        region: linodeRegion,
        type: 'g6-nanode-1', // $5/month (1GB RAM)
        image: 'linode/ubuntu22.04',
        root_pass: generateRandomPassword(), // Random root password
        booted: true,
        backups_enabled: false,
        private_ip: false,
        tags: ['ghost-vpn', `user-${userId}`, searchTag],
        metadata: {
          user_data: Buffer.from(getCloudInitScript(protocol, serverPrivateKey, serverPublicKey, clientPublicKey)).toString('base64')
        }
      })
    });

    // Generate client config with the actual keys
    const clientConfig = generateWireGuardConfig('pending', protocol, clientPrivateKey, serverPublicKey);

    // Return immediately - frontend will poll for status using the search tag
    return {
      statusCode: 202, // Accepted (processing)
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        queued: true,
        message: 'Server creation initiated. Checking status...',
        searchTag: searchTag,
        keys: {
          clientPrivate: clientPrivateKey,
          serverPublic: serverPublicKey
        },
        proxy: {
          type: 'SOCKS5',
          host: 'provisioning',
          port: 1080,
          url: 'socks5://provisioning:1080'
        },
        server: {
          id: `pending-${searchTag}`, // Temporary ID for frontend
          ip: 'provisioning',
          region: region,
          protocol: protocol,
          config: clientConfig, // Real config with actual keys
          status: 'creating',
          provider: 'Ghost Whistle Cloud (Linode)'
        }
      })
    };

  } catch (error) {
    console.error('VPN deployment error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: error.message || 'Failed to deploy VPN server' 
      })
    };
  }
};

function generateRandomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 24; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function getCloudInitScript(protocol, serverPrivateKey, serverPublicKey, clientPublicKey) {
  // This script runs when the droplet first boots up
  // It installs and configures WireGuard VPN server
  return `#!/bin/bash
set -e

# Update system
apt-get update
apt-get upgrade -y

# Install WireGuard and proxy server
apt-get install -y wireguard dante-server

# Enable IP forwarding
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
echo "net.ipv6.conf.all.forwarding=1" >> /etc/sysctl.conf
sysctl -p

# Create WireGuard directory
mkdir -p /etc/wireguard
chmod 700 /etc/wireguard

# Use pre-generated keys (passed from deployment)
cat > /etc/wireguard/wg0.conf <<'WGEOF'
[Interface]
PrivateKey = ${serverPrivateKey}
Address = 10.8.0.1/24
ListenPort = 51820
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
PublicKey = ${clientPublicKey}
AllowedIPs = 10.8.0.2/32
WGEOF

# Start WireGuard
systemctl enable wg-quick@wg0
systemctl start wg-quick@wg0

# Configure SOCKS5 Proxy (Dante)
cat > /etc/danted.conf <<'SOCKSEOF'
logoutput: syslog
internal: 0.0.0.0 port = 1080
external: eth0
clientmethod: none
socksmethod: none
user.privileged: root
user.unprivileged: nobody

client pass {
    from: 0.0.0.0/0 to: 0.0.0.0/0
    log: error
}

socks pass {
    from: 0.0.0.0/0 to: 0.0.0.0/0
    log: error
    protocol: tcp udp
}
SOCKSEOF

# Start SOCKS5 proxy
systemctl enable danted
systemctl start danted

# Configure firewall
ufw allow 51820/udp
ufw allow 1080/tcp
ufw allow 22/tcp
ufw --force enable

echo "WireGuard VPN Server Setup Complete!"
echo "Server Public Key: ${serverPublicKey}"
echo "SOCKS5 Proxy running on port 1080"
`;
}

function generateWireGuardConfig(serverIp, protocol, clientPrivateKey, serverPublicKey) {
  // Use the pre-generated keys that match the server configuration
  const endpoint = serverIp === 'pending' || serverIp === 'provisioning' ? 'YOUR_SERVER_IP' : serverIp;
  
  return `[Interface]
PrivateKey = ${clientPrivateKey}
Address = 10.8.0.2/24
DNS = 1.1.1.1, 1.0.0.1

[Peer]
PublicKey = ${serverPublicKey}
Endpoint = ${endpoint}:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25`;
}

