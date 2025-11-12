# 🚀 Ghost VPN - One-Click Setup Guide

## ✨ **The EASIEST Way to Connect to Your VPN**

You asked for one-click setup - **we delivered!**

---

## 📥 **How It Works (3 Steps):**

### **1. Deploy Your VPN Server**
- Go to https://whistel.space → Ghost VPN → Deploy Server
- Choose region & protocol
- Wait 3-4 minutes for server provisioning
- ✅ You now have your own private VPN server!

### **2. Download One-Click Setup Script**
**The dashboard will show TWO buttons:**

#### **💻 Windows Setup** (One-Click .bat)
- Click to download `ghost-vpn-connect.bat`
- Your server IP is **already embedded** in the script!

#### **🍎 Mac/Linux Setup** (One-Click .sh)
- Click to download `ghost-vpn-connect.sh`
- Your server IP is **already embedded** in the script!

### **3. Run the Script - DONE!**

#### **Windows:**
```
1. Right-click ghost-vpn-connect.bat
2. Select "Run as Administrator"
3. Done! Your browser now uses Ghost VPN
```

#### **Mac:**
```bash
chmod +x ghost-vpn-connect.sh
sudo bash ghost-vpn-connect.sh
# Enter your password when prompted
# Done! Your browser now uses Ghost VPN
```

#### **Linux:**
```bash
chmod +x ghost-vpn-connect.sh
sudo bash ghost-vpn-connect.sh
# Done! Your browser now uses Ghost VPN
```

---

## 🎯 **What the Script Does:**

### **Windows (.bat):**
✅ Configures system proxy to `YOUR_SERVER_IP:1080`  
✅ Sets SOCKS5 protocol  
✅ Applies to all browsers (Chrome, Edge, Firefox)  
✅ No manual configuration needed!

### **Mac/Linux (.sh):**
✅ Configures system network proxy  
✅ Works with GNOME/KDE/macOS Network Settings  
✅ Applies to all browsers automatically  
✅ No manual configuration needed!

---

## 🧪 **Verify It's Working:**

1. **Open your browser** (any browser - Chrome, Edge, Firefox, Safari)
2. **Visit:** https://whatismyip.com
3. **Check:** Your IP should show your **VPN server's IP**, not your real IP!

If you see your VPN server IP → **✅ Success! You're protected!**

---

## 🔌 **Disconnect:**

The setup scripts also create disconnect scripts:

### **Windows:**
- Run `ghost-vpn-disconnect.bat` (created automatically)

### **Mac/Linux:**
- Run `bash ghost-vpn-disconnect.sh` (created automatically)

---

## 🆚 **Comparison: Script vs Extension vs WireGuard**

| Method | Setup Time | Installation | System-Wide | Difficulty |
|--------|-----------|--------------|-------------|-----------|
| **One-Click Script** | **30 seconds** | ❌ None | ✅ All browsers | ⭐ Easiest |
| Browser Extension | 2 minutes | ⚠️ Load extension | ❌ Browser only | ⭐⭐ Easy |
| WireGuard App | 5 minutes | ⚠️ Install app | ✅ Full system | ⭐⭐⭐ Medium |

**The one-click script is the FASTEST and EASIEST method!**

---

## 🛠️ **Technical Details:**

### **What Protocol?**
- **SOCKS5** - Fast, secure, and widely supported

### **What's Configured?**
- Windows: `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Internet Settings`
- Mac: `networksetup -setsocksfirewallproxy`
- Linux: `gsettings (GNOME)` or `kwriteconfig5 (KDE)`

### **Is It Secure?**
- ✅ All traffic encrypted through SSH tunnel
- ✅ Your own dedicated server (not shared)
- ✅ No third-party logging
- ✅ Full DNS leak protection

---

## 🎉 **That's It!**

**Truly one-click VPN setup!**

No browser extensions to install.  
No native apps to download.  
No manual proxy configuration.  
Just **click, run, done!**

---

## 📝 **Troubleshooting:**

### **"Cannot reach VPN server"**
- Wait a few more minutes - server might still be provisioning
- Check your internet connection
- Make sure the server is deployed and showing an IP address

### **"Script won't run"**
- **Windows:** Right-click → "Run as Administrator"
- **Mac/Linux:** Make sure you used `sudo`

### **"Still seeing my real IP"**
- Restart your browser after running the script
- Check that the script said "✓ Ghost VPN Connected!"
- Try running the script again

### **"Script creates errors"**
- Make sure you downloaded the LATEST script from the dashboard
- The script is auto-generated with your server's real IP

---

## 🎯 **Pro Tips:**

1. **Bookmark the scripts** - You can reuse them anytime!
2. **Share with friends** - The script works for anyone (with your server IP)
3. **Multiple devices** - Download on each device and run
4. **Switch regions** - Deploy new server, download new script!

---

## 💡 **Want Even More Control?**

You can also use:
- **Browser Extension** (for per-browser control)
- **WireGuard App** (for full system VPN)

Both available in the Ghost VPN dashboard!

---

**Made with ❤️ by Ghost Whistle**

https://whistel.space

