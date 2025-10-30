# ✅ Pre-Commit Security Checklist

## 🔒 CRITICAL: Before Committing to Git

Run through this checklist EVERY time before pushing:

---

## ✅ Security Checks (MUST PASS ALL)

### **1. Node Keys Protected**
```bash
git status --ignored | grep "node-keys"
```
✅ **PASS**: Should show `node-keys/` as ignored  
❌ **FAIL**: If node-keys shows in `git status` (not ignored section)

### **2. No Keypair Files**
```bash
git status | grep -i "keypair"
```
✅ **PASS**: Should return nothing  
❌ **FAIL**: If any keypair files show up

### **3. No Environment Files**
```bash
git status | grep -E "\.env$"
```
✅ **PASS**: Should return nothing  
❌ **FAIL**: If .env files show up

### **4. No Wallet Addresses in Code**
```bash
git diff | grep -E "[A-Za-z0-9]{32,44}" | grep -v "example\|sample\|test"
```
✅ **PASS**: Should return nothing or only example addresses  
❌ **FAIL**: If real wallet addresses found

### **5. .gitignore Updated**
```bash
cat .gitignore | grep "node-keys"
```
✅ **PASS**: Should show `node-keys/` entry  
❌ **FAIL**: If node-keys not in .gitignore

---

## 📋 What WILL Be Committed (Safe Files)

### **✅ SAFE - Core Application Files:**
- `index.html` (frontend with map updates)
- `node-client.js` (with bootstrap security checks)
- `signaling-server.js` (updated)
- `sw.js` (service worker)
- `package.json` (dependencies)

### **✅ SAFE - Deployment Guides:**
- `HYBRID-DEPLOYMENT.md`
- `HYBRID-DEPLOY-COMMANDS.txt`
- `PRODUCTION-NODE-DEPLOYMENT.md`
- `PRODUCTION-DEPLOYMENT.md`
- `DEPLOYMENT-COMPARISON.md`
- `DOCKER-DEPLOYMENT.md`
- `QUICK-START-VULTR.md`
- `RUN-LOCALLY.md`
- `MAP-NODE-TYPES.md`
- `SECURITY-CLEANUP-SUMMARY.txt`

### **✅ SAFE - Deployment Scripts:**
- `deploy-to-vultr.sh`
- `deploy-all-vultr.sh`
- `check-all-nodes.sh`
- `get-node-addresses.sh`
- `generate-keypairs.sh`
- `setup-production.sh`

### **✅ SAFE - Configuration Files:**
- `.gitignore` (protects sensitive files)
- `render.yaml` (Render deployment)
- `docker-compose.yml` (Docker deployment)
- `ecosystem.config.js` (PM2 configuration)
- `Dockerfile`
- `env.template` (template only, no secrets)

### **✅ SAFE - New Node Types:**
- `user-node-client.js` (user node without wallets)

### **✅ SAFE - Community:**
- `COMMUNITY_ENGAGEMENT_IDEAS.md`

---

## ❌ What WILL NOT Be Committed (Protected)

### **🔒 PROTECTED - Never Committed:**
- ❌ `node-keys/` directory (all keypairs)
- ❌ `*.json` files in node-keys/
- ❌ `.env` files (environment variables)
- ❌ `logs/` directory
- ❌ `node-storage/` directory
- ❌ `node_modules/` (dependencies)

---

## 🗑️ What WAS Deleted (Cleanup)

### **Removed Internal/Debug Files:**
- Old deployment docs (20+ files)
- Test files (test-*.html)
- Backup files (old_*.html, index-backup.html)
- Internal notes (*.txt)
- Utility scripts with wallet addresses

---

## 🚀 Ready to Commit?

### **Run This Quick Check:**

```bash
# 1. Verify no sensitive data
git status | grep -E "(node-keys|\.env|keypair)"

# Should return NOTHING. If it does, DO NOT COMMIT!

# 2. View what will be committed
git status

# 3. Review changes (optional but recommended)
git diff index.html | head -100
git diff node-client.js | head -50

# 4. Check .gitignore is working
git check-ignore node-keys/bootstrap-node-1-keypair.json
# Should return: node-keys/bootstrap-node-1-keypair.json
```

### **All Checks Passed? Commit!**

```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "feat: hybrid deployment with bootstrap & user nodes

- Added hybrid deployment architecture (local bootstrap + cloud services)
- Implemented bootstrap-only SOL handling security
- Updated map to show bootstrap vs user nodes visually
- Added deployment scripts for Vultr, Render, Docker
- Protected node-keys with comprehensive .gitignore
- Cleaned up 40+ internal/test files
- Created deployment guides for all scenarios"

# Push to remote
git push origin main
```

---

## ⚠️ If Something Goes Wrong

### **Accidentally Staged Sensitive Files?**

```bash
# Unstage specific file
git reset HEAD node-keys/bootstrap-node-1-keypair.json

# Unstage all
git reset HEAD .

# Start over
git status
```

### **Already Committed Sensitive Data?**

```bash
# Undo last commit (keeps changes)
git reset HEAD~1

# Remove sensitive files
git rm --cached node-keys/*.json

# Add to .gitignore
echo "node-keys/" >> .gitignore

# Commit again
git add .gitignore
git commit -m "fix: add node-keys to gitignore"
```

### **Already Pushed to Remote?**

**🚨 CRITICAL: If you pushed keypairs to public repo:**

1. **ASSUME COMPROMISED** - Those keys are public forever
2. **Generate new keypairs immediately**
3. **Move any funds from old wallets**
4. **Never use those addresses again**
5. **Contact support** if it's a private repo (can help scrub history)

---

## 📊 Commit Summary

**Files Changed:**
- Modified: 7 files (index.html, node-client.js, etc.)
- Added: 25+ new deployment files
- Deleted: 30+ old/internal files

**Size:**
- No large files (all code/docs)
- No binaries
- No secrets

**Security:**
- ✅ .gitignore protecting sensitive data
- ✅ No wallet addresses in code
- ✅ No keypairs committed
- ✅ Template files only

---

## 🎯 Final Verification

Before pushing, ask yourself:

1. ❓ Would I be comfortable if this repo was public?
2. ❓ Are there any API keys, passwords, or secrets?
3. ❓ Are node wallet addresses visible in diffs?
4. ❓ Is .gitignore properly configured?
5. ❓ Have I reviewed the changes?

**ALL YES?** → Safe to push! ✅  
**ANY NO?** → Fix before pushing! ⚠️

---

## 📝 Post-Commit Actions

After successfully pushing:

1. **Verify on GitHub/GitLab:**
   - Check files are there
   - Verify node-keys/ is NOT visible
   - Check no .env files uploaded

2. **Generate Keypairs (if deploying):**
   ```bash
   bash generate-keypairs.sh
   ```

3. **Deploy:**
   ```bash
   # Local
   pm2 start ecosystem.config.js
   
   # Or VPS
   bash deploy-all-vultr.sh IP1 IP2 IP3 IP4 IP5
   ```

4. **Test:**
   - Open frontend
   - Check map shows nodes
   - Try anonymous relay

---

**Remember: Code is public, keys are private!** 🔒

Once committed, you can deploy with confidence knowing sensitive data is protected.

