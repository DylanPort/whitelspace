# 🔥 QUICK FIX - Environment Variable Issue

## The Problem
Your Windows system has a persistent `OPENAI_API_KEY` environment variable set to `ollama-local` that's overriding the `.env` file.

## ✅ SOLUTION (Run these commands in order)

### Step 1: Kill all Node processes
```powershell
taskkill /F /IM node.exe
```

### Step 2: Permanently delete the bad environment variable
```powershell
[System.Environment]::SetEnvironmentVariable('OPENAI_API_KEY', $null, 'User')
[System.Environment]::SetEnvironmentVariable('OPENAI_API_KEY', $null, 'Machine')
```

### Step 3: Verify it's gone
```powershell
[System.Environment]::GetEnvironmentVariable('OPENAI_API_KEY', 'User')
[System.Environment]::GetEnvironmentVariable('OPENAI_API_KEY', 'Machine')
```
Both should return blank/nothing.

### Step 4: Close PowerShell completely
Close this terminal window and open a NEW PowerShell window.

### Step 5: Navigate back to project and start server
```powershell
cd C:\Users\salva\Downloads\Encrypto
netlify dev
```

## 🎯 What to Look For

When `netlify dev` starts correctly, you should see:
```
⬥ Injected .env file env vars: OPENAI_API_KEY, VALTOWN_API_KEY, SUPABASE_URL, SUPABASE_KEY
```

You should **NOT** see:
```
⬥ Ignored .env file env var: OPENAI_API_KEY (defined in process)
```

## 🧪 Test AI Generation

Once the server is running, open http://localhost:8888/test-privacy-tools.html and try creating a tool!


