# 📝 CLI Prompts & Answers - Quick Reference (UPDATED)

Keep this open while running the dapp-store commands!

---

## 🚀 Command to Run

```bash
dapp-store create app --keypair "C:\Users\salva\.config\solana\temp-keypair.json"
```

---

## 📋 Answer These Prompts

### App Information

**Q: App Name?**  
A: `Whistle`

**Q: Package ID?**  
A: `com.ghostwhistle.app`

**Q: Category?**  
A: `Finance` (or `DeFi` if available)

---

### Descriptions

**Q: Short Description?**  
A: `Multi Privacy Centered Tools and privacy node network`

**Q: Long Description?**  
A: 
```
Whistle is a decentralized privacy network built on Solana that provides multiple privacy-centered tools and rewards users for running privacy nodes.

Key Features:
• Multi Privacy Centered Tools suite
• Run privacy nodes and earn rewards
• Anonymous transaction relay on Solana
• Encrypted P2P communication
• Stake WHISTLE tokens to participate
• Real-time leaderboards and stats
• Exclusive community chat for node operators

Built on Solana for instant rewards with minimal fees. Join the privacy revolution!
```

---

### URLs

**Q: Website URL?**  
A: `https://whistle.ninja`

**Q: Privacy Policy URL?**  
A: `https://whistle.ninja/privacy.html`

**Q: Terms of Service URL?**  
A: `https://whistle.ninja/terms.html`

---

### Contact

**Q: Support Email?**  
A: `whistleninja@virgilio.it`

**Q: Publisher Email?**  
A: `whistleninja@virgilio.it`

---

### Asset File Paths (USE FULL PATHS!)

**Q: App Icon Path?**  
A: `C:\Users\salva\Downloads\Encrypto\solana-dapp-store-submission\assets\app-icon-512x512.png`

**Q: Banner Graphic Path?**  
A: `C:\Users\salva\Downloads\Encrypto\solana-dapp-store-submission\assets\banner-1200x600.png`

**Q: Feature Graphic Path? (optional)**  
A: Press Enter to skip (or provide path if you created one)

---

## 📝 Notes

- Answer each prompt and press Enter
- For file paths, copy-paste the full path
- If unsure about a prompt, choose the most relevant option
- The CLI will upload files as you provide paths

---

## ✅ After "Create App" Succeeds

You'll see a success message with your App NFT mint address.

**Next command:**
```bash
dapp-store create release --keypair "C:\Users\salva\.config\solana\temp-keypair.json"
```

---

## 📋 Create Release Prompts

**Q: App Mint Address?**  
A: (Should auto-fill from config.yaml)

**Q: Version?**  
A: `1.0.0`

**Q: Version Code?**  
A: `1`

**Q: APK Path?**  
A: `C:\Users\salva\Downloads\Encrypto\solana-dapp-store-submission\whistle-v1.0.0.apk`

**Q: Screenshots?**  
A: Provide paths to all 5:
```
C:\Users\salva\Downloads\Encrypto\solana-dapp-store-submission\screenshots\Whistle_UI_centered_1_1920x1080.png
C:\Users\salva\Downloads\Encrypto\solana-dapp-store-submission\screenshots\Whistle_UI_centered_2_1920x1080.png
C:\Users\salva\Downloads\Encrypto\solana-dapp-store-submission\screenshots\Whistle_UI_centered_3_1920x1080.png
C:\Users\salva\Downloads\Encrypto\solana-dapp-store-submission\screenshots\Whistle_UI_centered_4_1920x1080.png
C:\Users\salva\Downloads\Encrypto\solana-dapp-store-submission\screenshots\Whistle_UI_centered_5_1920x1080.png
```

**Q: Release Notes?**  
A:
```
🎉 Whistle v1.0.0 - Initial Release

Features:
• Multi Privacy Centered Tools suite
• Run privacy nodes and earn rewards
• Anonymous transaction relay on Solana
• Encrypted P2P communication
• Stake WHISTLE tokens to participate
• Real-time leaderboards
• Exclusive community chat for node operators
• On-chain reward distribution

Join the decentralized privacy revolution with Whistle!
```

---

## ✅ After "Create Release" Succeeds

**Final command:**
```bash
dapp-store publish submit --keypair "C:\Users\salva\.config\solana\temp-keypair.json" --complies-with-solana-dapp-store-policies --requestor-is-authorized
```

This submits to the publisher portal for review!

---

## 💰 Cost

- Create App: ~0.01 SOL
- Create Release: ~0.01 SOL  
- Publish Submit: Free
- **Total: ~0.02-0.03 SOL**

---

## ⏱️ Timeline

- CLI prompts: ~15-20 minutes
- Review process: 2-7 days
- Then: LIVE! 🎉

---

## ⚠️ IMPORTANT: Check Legal Docs URLs

Make sure these URLs are accessible:
- https://whistle.ninja/privacy.html
- https://whistle.ninja/terms.html

If they're not live yet, upload the privacy-policy-template.html and terms-of-service-template.html to whistle.ninja!

---

**Keep this reference open and run the commands in your PowerShell terminal!**
