# 🎨 Additional Graphics Required

The Solana dApp Store CLI now requires additional graphics!

---

## 📊 Required Graphics

### 1. **Banner Graphic (MANDATORY)**
- **Size:** 1200 × 600 px
- **Format:** PNG or JPG
- **Purpose:** Store listing banner
- **Status:** ⚠️ NEED TO CREATE

### 2. **Feature Graphic (OPTIONAL)**
- **Size:** 1200 × 1200 px
- **Format:** PNG or JPG
- **Purpose:** Editor's Choice carousel
- **Status:** ⚠️ OPTIONAL

### 3. **Existing Graphics** ✅
- Icon: 512×512 ✅
- Screenshots: 5 images ✅

---

## 🚀 Quick Solution: Create Banner Now

### Option 1: Simple Banner with Logo (Fastest)

Use your existing logo and create a banner:

1. Go to: https://www.canva.com/create/banners/
2. Or: https://www.figma.com/
3. Or: Any image editor

**Banner specs:**
- Size: 1200 × 600 pixels
- Background: #0b0f14 (dark) or #10b981 (green)
- Add: Whistle logo centered
- Add text: "Whistle - Privacy on Solana" or similar
- Export as PNG

### Option 2: Use Online Tool

**Photopea (free Photoshop alternative):**
1. Go to: https://www.photopea.com/
2. File → New → 1200 × 600 px
3. Add background color: #0b0f14
4. Import whistle logo
5. Add text if desired
6. Export as PNG

### Option 3: Quick PowerShell/ImageMagick

If you have ImageMagick:
```bash
# Create simple banner from logo
magick whistel_logo_top_right_2048.png -resize 600x600 -gravity center -background "#0b0f14" -extent 1200x600 banner-1200x600.png
```

---

## 📁 Where to Save

```
solana-dapp-store-submission/assets/
├── app-icon-512x512.png ✅
├── banner-1200x600.png ⚠️ CREATE THIS
└── feature-1200x1200.png (optional)
```

---

## ⏱️ Time Estimate

- Banner creation: 5-10 minutes
- Feature graphic (optional): 10-15 minutes

---

## 🎯 After Creating Banner

Save as:
```
C:\Users\salva\Downloads\Encrypto\solana-dapp-store-submission\assets\banner-1200x600.png
```

Then retry the command!

