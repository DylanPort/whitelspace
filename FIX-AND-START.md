# 🔧 SIMPLE FIX - Copy & Paste These Commands

## Step 1: Stop Everything & Remove Bad Environment Variable

**Copy and paste this entire block into PowerShell:**

```powershell
# Kill all node processes
taskkill /F /IM node.exe 2>$null

# Free up ports
npx kill-port 3999 8888

# Remove bad environment variable permanently
[Environment]::SetEnvironmentVariable("OPENAI_API_KEY", $null, "User")
[Environment]::SetEnvironmentVariable("OPENAI_API_KEY", $null, "Machine")

Write-Host "✅ Fixed! Now close this PowerShell window and open a NEW one."
```

## Step 2: Open NEW PowerShell Window

Close the current PowerShell and open a **brand new** one.

## Step 3: Start Server

```powershell
cd C:\Users\salva\Downloads\Encrypto
netlify dev
```

## Step 4: Wait 15 seconds, then test

Open: http://localhost:8888/test-privacy-tools.html

---

## What This Does:

1. ✅ Kills ALL old node processes
2. ✅ Frees up the ports
3. ✅ **PERMANENTLY** removes the "ollama-local" environment variable
4. ✅ Fresh start will use correct API key from `.env`

---

## You'll Know It Worked When:

Terminal shows:
```
⬥ Injected .env file env vars: OPENAI_API_KEY, VALTOWN_API_KEY, SUPABASE_URL, SUPABASE_KEY
```

Instead of:
```
⬥ Ignored .env file env var: OPENAI_API_KEY (defined in process)
```

---

**DO THIS NOW - It will fix everything!** 🚀


