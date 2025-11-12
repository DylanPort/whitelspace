# 🔒 Ghost VPN Browser Extension

One-click browser proxy through your Ghost VPN server. No WireGuard app needed!

## ✨ Features

- ✅ One-click connect/disconnect
- ✅ SOCKS5 proxy support
- ✅ All browser traffic routed through your VPN
- ✅ Remembers your server settings
- ✅ Beautiful UI with connection status
- ✅ No external dependencies

## 📦 Installation

### Chrome/Edge/Brave

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `ghost-vpn-extension` folder
5. Extension will appear in your toolbar! 🎉

### Firefox

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select the `manifest.json` file
4. Extension will appear in your toolbar! 🎉

## 🚀 Usage

1. **Deploy your VPN server** at https://whistel.space
2. **Get your server IP** from the Ghost VPN dashboard
3. **Click the extension icon** in your browser toolbar
4. **Enter your server IP** and port `1080`
5. **Click "Connect to Proxy"**
6. **Done!** All your browser traffic now goes through your VPN 🔒

## 🔧 How It Works

1. Extension connects to your VPN server's SOCKS5 proxy (port 1080)
2. All HTTP/HTTPS traffic is routed through the proxy
3. Your real IP is hidden, server IP is shown to websites
4. DNS requests are also proxied (no DNS leaks)

## 🛡️ Privacy

- ✅ No data collection
- ✅ No analytics
- ✅ No external API calls
- ✅ All traffic goes directly to YOUR server
- ✅ Open source - audit the code yourself!

## 🎯 Troubleshooting

### "Can't connect to proxy"
- Make sure your VPN server is running
- Check that port 1080 is open (should be by default)
- Try the server IP shown in Ghost Whistle dashboard

### "Still seeing my real IP"
- Make sure extension shows "Connected" status
- Visit https://whatismyip.com to verify
- If not working, try disconnecting and reconnecting

### "Extension not working"
- Try reloading the extension in `chrome://extensions/`
- Check browser console for errors
- Make sure you entered the correct server IP

## 📝 Manual Browser Proxy Setup

If you prefer not to use the extension:

### Chrome/Edge
1. Settings → System → Open proxy settings
2. Manual proxy configuration
3. SOCKS proxy: `your-server-ip:1080`
4. Version: SOCKS v5

### Firefox
1. Settings → General → Network Settings
2. Manual proxy configuration
3. SOCKS Host: `your-server-ip`, Port: `1080`
4. Select "SOCKS v5"
5. Check "Proxy DNS when using SOCKS v5"

## 🔗 Links

- **Website:** https://whistel.space
- **Dashboard:** https://whistel.space (Ghost VPN section)
- **Support:** Create an issue on GitHub

## 📄 License

MIT License - Feel free to modify and distribute!

---

Made with ❤️ by Ghost Whistle

