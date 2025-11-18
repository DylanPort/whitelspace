# 🔄 How to Rotate Your API Keys

## Step-by-Step Guide

---

## 1️⃣ Rotate Helius RPC API Key (HIGH PRIORITY)

### **Why?**
Your Helius API key is exposed in `.env` file. This key provides access to your RPC quota.

### **Steps:**

1. **Go to Helius Dashboard**
   ```
   https://helius.dev
   ```

2. **Login to your account**

3. **Navigate to API Keys**
   - Click on "API Keys" in sidebar
   - Find your current key

4. **Revoke Old Key**
   - Click "Delete" or "Revoke" on the exposed key
   - Confirm deletion

5. **Generate New Key**
   - Click "Create New API Key"
   - Name it: "Whistlenet Production"
   - Copy the new key

6. **Update Local .env File**
   ```bash
   # File: whistlenet/provider/api/.env
   
   # OLD (DELETE THIS):
   # MAINNET_RPC_URL=https://mainnet.helius-rpc.com/?api-key=413dfeef-84d4-4a37-98a7-1e0716bfc4ba
   
   # NEW (USE YOUR NEW KEY):
   MAINNET_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_NEW_KEY_HERE
   ```

7. **Update Render Environment Variables**
   - Go to https://dashboard.render.com
   - Select your "whistlenet-api" service
   - Go to "Environment" tab
   - Update `MAINNET_RPC_URL` with new key
   - Click "Save Changes"

8. **Test**
   ```bash
   npm run dev:api
   ```
   Check logs for successful RPC connection

---

## 2️⃣ Rotate HaveIBeenPwned API Key (MEDIUM PRIORITY)

### **Why?**
HIBP API key is exposed in root `.env` file.

### **Steps:**

1. **Check if rotation is possible**
   - HIBP may not support key rotation
   - Check their documentation: https://haveibeenpwned.com/API

2. **If rotation available:**
   - Go to your HIBP account
   - Generate new API key
   - Update `.env` file:
     ```bash
     # File: .env (root)
     
     # OLD (DELETE THIS):
     # HIBP_API_KEY=ccac04e904014631a35d34e8762954eb
     
     # NEW:
     HIBP_API_KEY=YOUR_NEW_KEY_HERE
     ```

3. **If rotation not available:**
   - Monitor usage for suspicious activity
   - Consider rate limiting on your end
   - Check if you need this integration

4. **Test**
   ```bash
   npm run dev:main
   ```
   Test any features that use HIBP API

---

## 3️⃣ Update Production Environment Variables

### **Netlify (Whistlenet Dashboard):**

1. Go to https://app.netlify.com
2. Select your site
3. Go to "Site configuration" → "Environment variables"
4. Update or add:
   ```
   NEXT_PUBLIC_RPC_ENDPOINT=https://mainnet.helius-rpc.com/?api-key=YOUR_NEW_KEY
   ```
5. Click "Save"
6. Trigger a new deploy

### **Render (Backend API):**

1. Go to https://dashboard.render.com
2. Select "whistlenet-api" service
3. Go to "Environment" tab
4. Update:
   ```
   MAINNET_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_NEW_KEY
   ```
5. Click "Save Changes"
6. Service will auto-restart

---

## 4️⃣ Verify New Keys Work

### **Local Test:**
```bash
cd C:\Users\salva\Downloads\Encrypto
npm run dev
```

**Check:**
- ✅ Main website loads (port 3001)
- ✅ Whistlenet dashboard loads (port 3000)
- ✅ Backend API connects (port 8080)
- ✅ RPC queries work
- ✅ No API errors in console

### **Production Test:**
1. Visit your Netlify URL
2. Try connecting wallet
3. Try staking/querying
4. Check Render logs for API calls
5. Verify no authentication errors

---

## 5️⃣ Secure Your New Keys

### **Do:**
✅ Store keys in `.env` files (gitignored)  
✅ Use environment variables in production  
✅ Keep keys separate per environment  
✅ Document which keys are used where  
✅ Set up monitoring/alerts  

### **Don't:**
❌ Commit keys to git  
❌ Share keys in chat/email  
❌ Use same key for dev and prod  
❌ Leave keys in code comments  
❌ Screenshot keys  

---

## 🔐 Key Management Best Practices

### **Use a Secret Manager**

For production, consider:
- **Netlify:** Built-in environment variables
- **Render:** Built-in environment variables
- **1Password/Bitwarden:** For team sharing
- **AWS Secrets Manager:** For complex setups
- **HashiCorp Vault:** For enterprise

### **Rotate Regularly**
- ✅ API keys: Every 3-6 months
- ✅ Database passwords: Every 6 months
- ✅ Wallet keys: Never (use new wallets)

### **Monitor Usage**
- Check Helius dashboard for unusual traffic
- Set up alerts for quota limits
- Monitor API costs

### **Document Everything**
Create a secure document with:
- Where each key is used
- When keys were last rotated
- Who has access to keys
- Rotation schedule

---

## 🚨 If Keys Are Already Compromised

### **Signs of Compromise:**
- Unexpected API usage
- Quota exceeded warnings
- Unknown transactions
- Failed authentication

### **Immediate Actions:**
1. **Revoke compromised keys immediately**
2. **Generate new keys**
3. **Update all environments**
4. **Check for unauthorized usage**
5. **Review access logs**
6. **Change any related passwords**
7. **Enable 2FA everywhere**

---

## ✅ Checklist

Before continuing to production:
- [ ] Helius RPC key rotated
- [ ] HIBP key rotated (if possible)
- [ ] Local `.env` files updated
- [ ] Render environment variables updated
- [ ] Netlify environment variables updated
- [ ] Local development tested
- [ ] Production deployment tested
- [ ] No keys in codebase (checked with search)
- [ ] `.gitignore` protecting `.env` files
- [ ] Key management documented

---

## 🎯 After Rotation

1. **Delete old keys from:**
   - [ ] `.env` files
   - [ ] Any backup files
   - [ ] Notes/documents
   - [ ] Chat history

2. **Verify .gitignore:**
   ```bash
   git status
   ```
   Should NOT show `.env` files

3. **Test everything:**
   - [ ] Local development
   - [ ] Staging (if you have it)
   - [ ] Production

4. **Monitor for 24 hours:**
   - Check Helius dashboard
   - Check Render logs
   - Check for errors

---

## 📝 Quick Reference

### **Current Exposed Keys:**
```
Helius RPC: 413dfeef-84d4-4a37-98a7-1e0716bfc4ba (REVOKE NOW)
HIBP: ccac04e904014631a35d34e8762954eb (ROTATE IF POSSIBLE)
```

### **Files to Update:**
```
.env (root)
whistlenet/provider/api/.env
Render environment variables
Netlify environment variables
```

### **Services to Update:**
```
Render: whistlenet-api
Netlify: whistlenet-dashboard
```

---

## 🎉 You're Secure!

After following this guide:
- ✅ Old keys revoked
- ✅ New keys generated
- ✅ All environments updated
- ✅ Keys properly secured
- ✅ Ready for production!

**Great job taking security seriously!** 🔒🚀

