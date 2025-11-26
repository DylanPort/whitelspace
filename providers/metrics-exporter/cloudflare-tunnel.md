# Setting Up Cloudflare Tunnel for whistle.ninja

This guide sets up a secure tunnel from your validator server to Cloudflare,
exposing your metrics API at `https://api.whistle.ninja` (or similar subdomain).

## Prerequisites

- Cloudflare account with whistle.ninja added
- Root access to your validator server

## Step 1: Install cloudflared

```bash
# On your validator server (212.108.83.86)
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb
```

## Step 2: Authenticate with Cloudflare

```bash
cloudflared tunnel login
```

This opens a browser. Log in and authorize the domain.

## Step 3: Create the Tunnel

```bash
# Create tunnel named "whistle-validator"
cloudflared tunnel create whistle-validator

# Note the tunnel ID (e.g., a1b2c3d4-e5f6-...)
```

## Step 4: Configure the Tunnel

Create config file:

```bash
sudo mkdir -p /etc/cloudflared
sudo nano /etc/cloudflared/config.yml
```

Add this content:

```yaml
tunnel: whistle-validator
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  # Metrics API
  - hostname: api.whistle.ninja
    service: http://localhost:3001
  
  # Optional: Direct RPC access (be careful with this!)
  # - hostname: rpc.whistle.ninja
  #   service: http://localhost:8899
  
  # Catch-all
  - service: http_status:404
```

## Step 5: Route DNS

```bash
# Create DNS record pointing to tunnel
cloudflared tunnel route dns whistle-validator api.whistle.ninja
```

## Step 6: Run as Service

```bash
# Install as system service
sudo cloudflared service install

# Start the service
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

## Step 7: Verify

```bash
# Check tunnel status
cloudflared tunnel info whistle-validator

# Test from anywhere
curl https://api.whistle.ninja/health
curl https://api.whistle.ninja/metrics
```

## Firewall Notes

With Cloudflare Tunnel, you don't need to open port 3001 to the internet.
All traffic goes through Cloudflare's secure tunnel.

Your firewall can stay locked down:
```bash
# Only allow SSH and Solana ports
ufw allow 22/tcp
ufw allow 8000:8020/tcp
ufw allow 8000:8020/udp
# Port 3001 stays internal only
```

## Quick Reference

| Endpoint | URL |
|----------|-----|
| Health Check | https://api.whistle.ninja/health |
| Full Metrics | https://api.whistle.ninja/metrics |
| Current Slot | https://api.whistle.ninja/metrics/slot |
| Epoch Info | https://api.whistle.ninja/metrics/epoch |
| Prometheus | https://api.whistle.ninja/metrics/prometheus |

## Troubleshooting

```bash
# Check cloudflared status
sudo systemctl status cloudflared

# View logs
sudo journalctl -u cloudflared -f

# Test local metrics first
curl http://localhost:3001/metrics
```

