# 🔐 Environment Variables Setup Guide

## Required Environment Variables

Add these to your Netlify dashboard under **Site settings → Environment variables**:

### 1. OpenAI API Key
```
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
```
**Where to get it:**
- Go to https://platform.openai.com/api-keys
- Create new secret key
- Copy the key (starts with `sk-proj-` or `sk-`)

**Cost:** ~$0.50-1.00 per tool generated

---

### 2. Val.town API Key
```
VALTOWN_API_KEY=vt_xxxxxxxxxxxxxxxxxxxxx
```
**Where to get it:**
- Go to https://val.town
- Sign up/login
- Go to Settings → API Tokens
- Create new token with permissions:
  - Create vals ✓
  - Read vals ✓
  - Update vals ✓
- Copy the token

**Cost:** $10/month (Pro plan)

---

### 3. Supabase (Already configured)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key-here
```
**Already setup** - just verify these are in your Netlify environment variables

---

## How to Add to Netlify

1. Go to https://app.netlify.com
2. Select your site
3. Go to **Site settings**
4. Click **Environment variables** in left sidebar
5. Click **Add a variable**
6. Add each key-value pair:
   - Key: `OPENAI_API_KEY`
   - Value: `sk-proj-xxxxxxxxxxxxxxxxxxxxx`
   - Scopes: Select all
7. Click **Save**
8. Repeat for `VALTOWN_API_KEY`

---

## Testing API Keys

### Test OpenAI:
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_KEY_HERE"
```

### Test Val.town:
```bash
curl https://api.val.town/v1/me \
  -H "Authorization: Bearer YOUR_KEY_HERE"
```

Both should return 200 OK with JSON data.

---

## Security Notes

- ✅ Never commit API keys to git
- ✅ Only add keys in Netlify dashboard (server-side)
- ✅ Keys are encrypted by Netlify
- ✅ Never expose keys in frontend code
- ✅ All API calls go through Netlify Functions (secure)

---

## Cost Summary

| Service | Monthly Cost | Usage Limit |
|---------|-------------|-------------|
| OpenAI GPT-4 | ~$50-100 | 100-200 tools |
| Val.town Pro | $10 | Unlimited |
| Supabase Free | $0 | 500MB DB, 2GB bandwidth |
| Netlify Free | $0 | 100GB bandwidth, 125k function calls |
| **Total** | **$60-110/month** | |

**Per tool cost:** ~$0.60-1.10

---

## Optional: Usage Limits

To control costs, you can:

1. **Set OpenAI spending limit:**
   - Go to https://platform.openai.com/account/billing/limits
   - Set monthly limit (e.g. $100)

2. **Add rate limiting to Netlify Functions:**
   - Use Netlify Rate Limiting addon
   - Or add custom rate limiting in code

3. **Require wallet connection:**
   - Only allow connected wallets to create tools
   - Prevents spam/abuse

---

## Ready to Deploy?

Once you've added both API keys to Netlify:

1. ✅ Commit your code
2. ✅ Push to GitHub
3. ✅ Netlify auto-deploys
4. ✅ Test creating a tool!

🚀 You're all set!


