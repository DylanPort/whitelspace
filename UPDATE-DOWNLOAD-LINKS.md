# 🔗 Update Download Links After GitHub Release

After you upload your Linux node runner to GitHub Releases, you need to update the download links in `download-desktop.html`.

---

## 🎯 Quick Update Guide

### 1. Upload to GitHub Releases First

1. Go to your GitHub repository
2. Click **"Releases"** → **"Draft a new release"**
3. **Tag**: `v1.0.0`
4. **Title**: `Ghost Whistle Node Runner v1.0.0`
5. Upload these files from `dist/`:
   - `ghost-node-runner-linux`
   - `checksums.txt`
   - `README.md`
6. Click **"Publish release"**

### 2. Get Your GitHub Download URL

After publishing, your download URL will be:
```
https://github.com/YOUR-USERNAME/YOUR-REPO/releases/download/v1.0.0/ghost-node-runner-linux
```

**Example:**
```
https://github.com/DylanPort/whitelspace/releases/download/v1.0.0/ghost-node-runner-linux
```

---

## 📝 Update download-desktop.html

### Find and Replace

Open `download-desktop.html` and replace **3 instances** of:

```
YOUR-USERNAME/YOUR-REPO
```

With your actual GitHub username and repository name.

### Locations to Update:

**1. Main Download Button (Line ~79):**
```html
<a 
  href="https://github.com/YOUR-USERNAME/YOUR-REPO/releases/latest/download/ghost-node-runner-linux"
  class="px-8 py-4 bg-gradient-to-r..."
>
```

**2. View All Releases Link (Line ~90):**
```html
<a href="https://github.com/YOUR-USERNAME/YOUR-REPO/releases" target="_blank"...>
```

**3. Linux Instructions Modal (Line ~373):**
```javascript
wget https://github.com/YOUR-USERNAME/YOUR-REPO/releases/latest/download/ghost-node-runner-linux
```

---

## 🔄 Easy Find & Replace Method

### Visual Studio Code / Any Editor:

1. Press `Ctrl+H` (Find & Replace)
2. **Find**: `YOUR-USERNAME/YOUR-REPO`
3. **Replace**: `YourActualUsername/YourActualRepo`
4. Click **"Replace All"**
5. Save the file!

### PowerShell (Automated):

```powershell
# Replace with your actual GitHub info
$username = "DylanPort"
$repo = "whitelspace"

# Update the file
(Get-Content download-desktop.html) -replace 'YOUR-USERNAME/YOUR-REPO', "$username/$repo" | Set-Content download-desktop.html

Write-Host "✅ Updated all download links!"
```

### Bash/Linux (Automated):

```bash
# Replace with your actual GitHub info
username="DylanPort"
repo="whitelspace"

# Update the file
sed -i "s/YOUR-USERNAME\/YOUR-REPO/$username\/$repo/g" download-desktop.html

echo "✅ Updated all download links!"
```

---

## ✅ Verify the Update

### Test the Download Link

1. Open `download-desktop.html` in a browser
2. Click **"Download for Linux"**
3. Should start downloading from GitHub
4. Click **"📖 Installation Guide"**
5. Should show correct wget/curl commands

### Check All 3 Locations

Search for `YOUR-USERNAME/YOUR-REPO` in the file - should find **0 results** after updating.

---

## 🎨 Optional: Update Existing Windows Link

I noticed your Windows download already has a real GitHub link:
```html
href="https://github.com/DylanPort/whitelspace/releases/download/v1.01/Ghost.Whistle.Desktop.1.0.0.exe"
```

You can use the same repository for the Linux executable!

**Just replace:**
```
YOUR-USERNAME/YOUR-REPO
```

**With:**
```
DylanPort/whitelspace
```

---

## 🚀 Full Example

If your GitHub is:
- **Username**: `DylanPort`
- **Repository**: `whitelspace`
- **Tag**: `v1.0.0`

**Your URLs should be:**

**Main Download:**
```
https://github.com/DylanPort/whitelspace/releases/download/v1.0.0/ghost-node-runner-linux
```

**Or use `latest` for auto-updates:**
```
https://github.com/DylanPort/whitelspace/releases/latest/download/ghost-node-runner-linux
```

---

## 📦 Quick Copy-Paste

Based on your existing Windows link, here's what to use:

**Find:**
```
https://github.com/YOUR-USERNAME/YOUR-REPO/releases/latest/download/ghost-node-runner-linux
```

**Replace with:**
```
https://github.com/DylanPort/whitelspace/releases/latest/download/ghost-node-runner-linux
```

---

## 🧪 After Updating - Test Checklist

- [ ] Uploaded `ghost-node-runner-linux` to GitHub Releases
- [ ] Updated all 3 instances in `download-desktop.html`
- [ ] Saved the file
- [ ] Deployed/pushed changes to website
- [ ] Tested download button works
- [ ] Downloaded file successfully
- [ ] Verified file size is ~65 MB
- [ ] Installation guide shows correct commands

---

## 🔗 Useful Links

- **Your Windows Release**: https://github.com/DylanPort/whitelspace/releases/download/v1.01/Ghost.Whistle.Desktop.1.0.0.exe
- **Your Releases Page**: https://github.com/DylanPort/whitelspace/releases
- **Add New Release**: https://github.com/DylanPort/whitelspace/releases/new

---

## 💡 Pro Tips

### Use `/latest/` in URLs
Instead of hardcoding `v1.0.0`, use `/latest/`:
```
/releases/latest/download/ghost-node-runner-linux
```

This automatically serves the newest release!

### Update Checksums
After uploading to GitHub, update `dist/checksums.txt` and re-upload if you rebuild.

### Version Tags
When you update the executable:
1. Build new version
2. Create new GitHub release with new tag (v1.0.1, v1.0.2, etc.)
3. Users with `/latest/` links get automatic updates!

---

## ❓ Need Help?

1. **Can't find the file?** Make sure you saved `download-desktop.html`
2. **Link not working?** Check your GitHub release is published (not draft)
3. **404 error?** Verify the file name matches exactly: `ghost-node-runner-linux`
4. **Still stuck?** Check your GitHub repository visibility (should be public)

---

**You're almost there! Just upload to GitHub and update the 3 links!** 🎉

