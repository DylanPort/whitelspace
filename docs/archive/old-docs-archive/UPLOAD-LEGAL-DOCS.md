# 📜 Upload Privacy Policy & Terms of Service

After you get your APK, you need to upload legal documents to your website. The app store requires these to be publicly accessible.

**Time needed:** 30-60 minutes

---

## 📋 What You Need to Upload

From your `solana-dapp-store-submission/` folder:
1. ✅ `privacy-policy-template.html` → Upload as `privacy.html`
2. ✅ `terms-of-service-template.html` → Upload as `terms.html`

**Where they'll be accessible:**
- Privacy Policy: `https://whitelspace.netlify.app/privacy.html`
- Terms of Service: `https://whitelspace.netlify.app/terms.html`

---

## 🚀 Method 1: Netlify Dashboard (Easiest)

### Step 1: Prepare Files

First, rename the files:

```powershell
cd solana-dapp-store-submission

# Copy and rename
Copy-Item "privacy-policy-template.html" -Destination "..\privacy.html"
Copy-Item "terms-of-service-template.html" -Destination "..\terms.html"
```

### Step 2: Log into Netlify

1. Go to: https://app.netlify.com/
2. Log in with your account
3. Click on your site: **whitelspace**

### Step 3: Deploy Files

**Option A: Drag & Drop**
1. Click **Deploys** tab
2. Scroll down to **"Need to update your site?"**
3. Drag your project folder (or just `privacy.html` and `terms.html`)
4. Wait for deploy to complete (~1-2 minutes)

**Option B: Manual Deploy**
1. Click **Deploys** tab
2. Click **Deploy site** dropdown → **Upload deploy folder**
3. Select your project folder
4. Deploy will start automatically

### Step 4: Verify Files Are Live

Open in browser:
```
https://whitelspace.netlify.app/privacy.html
https://whitelspace.netlify.app/terms.html
```

Both pages should load and display the legal text.

---

## 🚀 Method 2: Netlify CLI

### Step 1: Install Netlify CLI

```bash
npm install -g netlify-cli
```

### Step 2: Login

```bash
netlify login
```

Browser will open for authentication. Log in and authorize.

### Step 3: Link to Your Site

```bash
cd C:\Users\salva\Downloads\Encrypto
netlify link
```

Select your site: **whitelspace**

### Step 4: Deploy

```bash
# Copy files to root if not already there
Copy-Item "solana-dapp-store-submission\privacy-policy-template.html" -Destination "privacy.html"
Copy-Item "solana-dapp-store-submission\terms-of-service-template.html" -Destination "terms.html"

# Deploy
netlify deploy --prod
```

### Step 5: Verify

```bash
# Test the URLs
curl https://whitelspace.netlify.app/privacy.html
curl https://whitelspace.netlify.app/terms.html
```

---

## 🚀 Method 3: Git Push (If Connected to GitHub)

### Step 1: Copy Files to Project Root

```bash
cd C:\Users\salva\Downloads\Encrypto

Copy-Item "solana-dapp-store-submission\privacy-policy-template.html" -Destination "privacy.html"
Copy-Item "solana-dapp-store-submission\terms-of-service-template.html" -Destination "terms.html"
```

### Step 2: Commit and Push

```bash
git add privacy.html terms.html
git commit -m "Add Privacy Policy and Terms of Service for app store submission"
git push
```

### Step 3: Wait for Deploy

- Netlify will auto-deploy (if connected to Git)
- Check Netlify dashboard for deploy status
- Usually takes 1-2 minutes

### Step 4: Verify

Visit:
```
https://whitelspace.netlify.app/privacy.html
https://whitelspace.netlify.app/terms.html
```

---

## ✅ Verification Checklist

Before proceeding to submission:

- [ ] Privacy Policy URL works: `https://whitelspace.netlify.app/privacy.html`
- [ ] Terms of Service URL works: `https://whitelspace.netlify.app/terms.html`
- [ ] Both pages display properly (no 404 errors)
- [ ] Text is readable and formatted correctly
- [ ] URLs are HTTPS (not HTTP)

---

## 🎨 Optional: Customize the Templates

Before uploading, you can customize:

### Update Contact Information

In both files, find and replace:
- `support@ghostwhistle.com` → Your real support email
- `privacy@ghostwhistle.com` → Your real privacy email
- `legal@ghostwhistle.com` → Your real legal email

### Update Jurisdiction

In `terms-of-service-template.html`, find:
```html
These Terms are governed by the laws of [YOUR JURISDICTION]
```
Replace with your actual jurisdiction (e.g., "Delaware, USA")

### Update Company Name (if applicable)

Replace "Ghost Whistle" with your company name if different.

---

## ⚠️ Troubleshooting

### "404 Not Found" after uploading
- Wait 2-3 minutes for cache to clear
- Hard refresh browser: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
- Check file names are exactly: `privacy.html` and `terms.html`
- Ensure files are in root directory, not subfolder

### "Files won't upload via drag & drop"
- Try Netlify CLI method instead
- Check file size (should be < 50KB each)
- Disable browser extensions temporarily

### "Netlify CLI not found"
```bash
npm install -g netlify-cli
```
- Restart terminal after installation
- Use full path: `npx netlify-cli login`

### "Git push doesn't trigger deploy"
- Check Netlify → Site settings → Build & deploy
- Ensure GitHub integration is connected
- Manually trigger deploy in Netlify dashboard

---

## 📊 Progress After This Step

```
✅ Documentation:        100% ████████████████████
✅ Icon (512×512):       100% ████████████████████
✅ Screenshots (5):      100% ████████████████████
✅ APK File:             100% ████████████████████
✅ Legal Docs (online):  100% ████████████████████
⚠️  Store Submission:      0% ░░░░░░░░░░░░░░░░░░░░

OVERALL:                  95% ███████████████████░
```

---

## 🚀 Next Step: Submit to Store!

Once your legal docs are live, you're ready for the final step:

### What You'll Need:

**Files to Upload:**
- ✅ `ghost-whistle-v1.0.0.apk` (from submission folder)
- ✅ `app-icon-512x512.png` (from assets folder)
- ✅ 5 screenshot PNG files (from screenshots folder)

**Information to Provide:**
- ✅ App name, package ID, descriptions (from `LISTING-DETAILS.md`)
- ✅ Privacy Policy URL: `https://whitelspace.netlify.app/privacy.html`
- ✅ Terms of Service URL: `https://whitelspace.netlify.app/terms.html`
- ✅ Support email
- ✅ Website URL
- ✅ Keywords and tags

**Where to Submit:**
- Solana Seeker dApp Store developer portal
- Create account if needed
- Fill submission form
- Upload all files
- Submit for review

**Review Time:** 2-7 days typically

---

## ✅ Final Checklist Before Submission

Use `SUBMISSION-CHECKLIST.md` for the complete list, but here's the quick version:

**Files Ready:**
- [x] APK file
- [x] App icon (512×512)
- [x] 5 Screenshots
- [x] Privacy Policy (online)
- [x] Terms of Service (online)

**Information Ready:**
- [x] App name and package ID
- [x] Short description
- [x] Long description
- [x] Keywords
- [x] Support contact
- [x] All URLs

**Testing:**
- [ ] APK tested on device (optional but recommended)
- [x] All assets verified
- [x] Legal docs accessible

---

## 🎉 You're Almost There!

After uploading legal docs, you'll be **95% complete**!

Just one final step: Submit to the Solana Seeker dApp Store!

---

**Time remaining:** ~30-60 minutes for this step + 30 minutes for final submission = **1-1.5 hours total** until you're done! 🚀

