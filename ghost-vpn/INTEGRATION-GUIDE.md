# 🚀 Ghost VPN Integration Guide

Complete guide to integrate Ghost VPN into your Ghost Whistle platform.

---

## 📦 **STEP 1: INSTALL DEPENDENCIES**

```bash
cd ghost-vpn
npm install

# Install monorepo dependencies
npm install -D lerna typescript eslint

# Install core dependencies
npm install --workspace=@ghost-vpn/core \
  wireguard.js \
  node-ssh \
  crypto

# Install web dependencies
npm install --workspace=@ghost-vpn/web \
  react \
  react-dom \
  qrcode \
  @supabase/supabase-js

# Install function dependencies
npm install \
  @netlify/functions \
  @supabase/supabase-js \
  do-wrapper \
  aws-sdk \
  node-ssh
```

---

## 🗄️ **STEP 2: SETUP DATABASE**

Add to your Supabase database:

```sql
-- Run in Supabase SQL Editor
\i database/ghost-vpn-schema.sql
```

Or manually:

```sql
-- VPN Servers Table
CREATE TABLE user_vpn_servers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  server_ip TEXT NOT NULL,
  droplet_id TEXT NOT NULL,
  region TEXT NOT NULL,
  protocol TEXT NOT NULL CHECK (protocol IN ('wireguard', 'openvpn', 'shadowsocks')),
  provider TEXT NOT NULL DEFAULT 'digitalocean',
  config TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'stopped', 'deleted')),
  monthly_cost DECIMAL(10,2) DEFAULT 5.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  stopped_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  
  -- Only one active VPN per user
  UNIQUE(user_id, status) WHERE status = 'active'
);

CREATE INDEX idx_user_vpn_servers_user_id ON user_vpn_servers(user_id);
CREATE INDEX idx_user_vpn_servers_status ON user_vpn_servers(status);

-- RLS Policies
ALTER TABLE user_vpn_servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own VPN servers"
  ON user_vpn_servers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own VPN servers"
  ON user_vpn_servers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own VPN servers"
  ON user_vpn_servers FOR UPDATE
  USING (auth.uid() = user_id);
```

---

## 🔧 **STEP 3: ENVIRONMENT VARIABLES**

Add to `.env`:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Cloud Providers (optional - users provide their own)
DO_API_TOKEN=your-digitalocean-token
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
```

---

## 📂 **STEP 4: COPY FILES TO YOUR PROJECT**

```bash
# Copy VPN core to your project
cp -r ghost-vpn/packages/core ../Encrypto/vpn-core

# Copy React component
cp ghost-vpn/packages/web/src/components/GhostVPNDashboard.tsx ../Encrypto/components/
cp ghost-vpn/packages/web/src/components/GhostVPNDashboard.css ../Encrypto/components/

# Copy Netlify functions
cp ghost-vpn/netlify/functions/*.ts ../Encrypto/netlify/functions/
```

---

## 🎨 **STEP 5: INTEGRATE INTO index.html**

Add Ghost VPN section to your existing index.html:

```html
<!-- Add after your existing tools -->
<div class="tool-card ghost-vpn-tool" onclick="openGhostVPN()">
  <h3>🔒 Ghost VPN</h3>
  <p>Deploy your own private VPN server</p>
  <span class="badge new">NEW</span>
</div>

<!-- Ghost VPN Container (hidden by default) -->
<div id="ghost-vpn-container" style="display: none;">
  <div id="ghost-vpn-root"></div>
</div>

<script>
// Add to your existing JavaScript
function openGhostVPN() {
  // Hide other tools
  document.querySelectorAll('.tool-container').forEach(el => {
    el.style.display = 'none';
  });
  
  // Show Ghost VPN
  document.getElementById('ghost-vpn-container').style.display = 'block';
  
  // Load React component (if not already loaded)
  if (!window.GhostVPNLoaded) {
    loadGhostVPNComponent();
    window.GhostVPNLoaded = true;
  }
}

function loadGhostVPNComponent() {
  // Load React if not already loaded
  if (typeof React === 'undefined') {
    const reactScript = document.createElement('script');
    reactScript.src = 'https://unpkg.com/react@18/umd/react.production.min.js';
    document.head.appendChild(reactScript);
    
    const reactDOMScript = document.createElement('script');
    reactDOMScript.src = 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js';
    document.head.appendChild(reactDOMScript);
    
    reactDOMScript.onload = () => {
      initGhostVPN();
    };
  } else {
    initGhostVPN();
  }
}

function initGhostVPN() {
  // Import and render Ghost VPN component
  import('./components/GhostVPNDashboard.js').then(module => {
    const GhostVPNDashboard = module.default;
    const root = ReactDOM.createRoot(document.getElementById('ghost-vpn-root'));
    root.render(React.createElement(GhostVPNDashboard));
  });
}
</script>
```

---

## 🌐 **STEP 6: ADD NETLIFY FUNCTIONS**

Your `netlify.toml` should include:

```toml
[build]
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"

[[plugins]]
  package = "@netlify/plugin-functions-install-core"
```

---

## 🚀 **STEP 7: BUILD & DEPLOY**

```bash
# Build Ghost VPN packages
cd ghost-vpn
npm run build

# Deploy to Netlify
cd ../Encrypto
netlify deploy --prod
```

---

## 🧪 **STEP 8: TEST**

1. **Deploy a Test Server**
   ```bash
   # Use DigitalOcean API key
   # Select "nyc1" region
   # Choose "wireguard" protocol
   # Click "Deploy"
   ```

2. **Connect**
   ```bash
   # Download config
   # Import into WireGuard app
   # Connect!
   ```

3. **Verify**
   ```bash
   # Check IP changed
   curl ifconfig.me
   
   # Test DNS leaks
   curl https://dnsleaktest.com/
   ```

---

## 📱 **STEP 9: BUILD NATIVE APPS (Optional)**

### **Electron Desktop App**

```bash
cd ghost-vpn/packages/desktop
npm install
npm run build

# Outputs:
# - Ghost-VPN-Setup.exe (Windows)
# - Ghost-VPN.dmg (macOS)
# - ghost-vpn.AppImage (Linux)
```

### **Mobile Apps**

```bash
cd ghost-vpn/packages/mobile

# Android
npm run build:android
# Outputs: android/app/build/outputs/apk/release/app-release.apk

# iOS
npm run build:ios
# Opens Xcode - build from there
```

---

## 🎨 **STEP 10: CUSTOMIZE BRANDING**

Replace "Ghost VPN" with your brand:

```bash
# Find and replace
find . -type f -name "*.ts" -o -name "*.tsx" -exec sed -i 's/Ghost VPN/Your Brand VPN/g' {} +
find . -type f -name "*.css" -exec sed -i 's/ghost-vpn/your-brand-vpn/g' {} +

# Update logo
cp your-logo.png packages/web/src/assets/logo.png
cp your-icon.ico packages/desktop/assets/icon.ico
```

---

## 🔐 **SECURITY BEST PRACTICES**

1. **Encrypt API Keys**
   ```typescript
   import { createCipheriv } from 'crypto';
   
   const encryptAPIKey = (apiKey: string): string => {
     const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, IV);
     return cipher.update(apiKey, 'utf8', 'hex') + cipher.final('hex');
   };
   ```

2. **Use Environment Variables**
   ```bash
   # Never commit API keys to git
   echo "*.key" >> .gitignore
   echo ".env*" >> .gitignore
   ```

3. **Implement Rate Limiting**
   ```typescript
   // In Netlify function
   const RATE_LIMIT = 3; // 3 deployments per day
   ```

4. **Enable Kill Switch by Default**
   ```typescript
   const killSwitch = new KillSwitch({
     enabled: true,
     blockOnDisconnect: true
   });
   ```

---

## 🐛 **TROUBLESHOOTING**

### **Deployment Fails**

```bash
# Check API key
curl -H "Authorization: Bearer $DO_API_TOKEN" \
  https://api.digitalocean.com/v2/account

# Check SSH access
ssh root@SERVER_IP -i ~/.ssh/ghost-vpn-key

# Check Docker
docker ps
```

### **Connection Issues**

```bash
# Check firewall
ufw status

# Check WireGuard
wg show

# Check routing
ip route
```

### **DNS Leaks**

```bash
# Test DNS
nslookup example.com

# Should return 1.1.1.1 or 1.0.0.1
```

---

## 📊 **MONITORING**

### **Server Health**

```typescript
// Add to Ghost VPN dashboard
const checkServerHealth = async () => {
  const response = await fetch(`http://${server.ip}:51820`);
  return response.ok;
};
```

### **Usage Analytics**

```typescript
// Track usage (privacy-respecting)
plausible('VPN Connected', { region: server.region });
plausible('VPN Deployed', { protocol: 'wireguard' });
```

---

## 🎉 **DONE!**

Your Ghost VPN is now fully integrated! Users can:

✅ Deploy their own VPN servers
✅ Connect from any device
✅ Full privacy (no logs, no tracking)
✅ $3.50-$5/month cost
✅ Complete control

---

## 🚀 **NEXT STEPS**

1. **Add More Protocols**
   - IKEv2 for better mobile support
   - V2Ray for advanced obfuscation

2. **Multi-Hop VPN**
   - Route through 2+ servers
   - Maximum anonymity

3. **Managed Plans**
   - Offer managed servers
   - $10-15/month with support

4. **Team Features**
   - Shared VPN for organizations
   - Admin dashboard

---

**Need help?** Join our Discord: https://discord.gg/ghostwhistle

