# ⚡ Privacy Tools Lab - Quick Start (5 Minutes)

## 🎯 What You Need

- [ ] OpenAI account with $10 credit
- [ ] Val.town account (Pro $10/month)
- [ ] Access to your Netlify dashboard
- [ ] Access to your Supabase dashboard

---

## 📝 Step-by-Step Setup

### Step 1: Get OpenAI API Key (2 minutes)

1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Name it "Ghost Whistle Privacy Tools"
4. Copy the key (starts with `sk-`)
5. Add $10 credit at https://platform.openai.com/account/billing

✅ **Save this key somewhere safe!**

---

### Step 2: Get Val.town API Key (2 minutes)

1. Go to https://val.town
2. Sign up or log in
3. Upgrade to Pro ($10/month) - click your avatar → Upgrade
4. Go to Settings → API Tokens
5. Click "Create token"
6. Name it "Ghost Whistle"
7. Check permissions:
   - ✅ Create vals
   - ✅ Read vals
   - ✅ Update vals
8. Copy the token (starts with `vt_`)

✅ **Save this token somewhere safe!**

---

### Step 3: Add to Netlify (1 minute)

1. Go to https://app.netlify.com
2. Select your **Ghost Whistle** site
3. Click "Site settings" (top navigation)
4. Click "Environment variables" (left sidebar)
5. Click "Add a variable"

Add these two variables:

**Variable 1:**
```
Key:   OPENAI_API_KEY
Value: sk-proj-xxxxxxxxxxxxxxxxxxxxx  (paste your OpenAI key)
Scopes: All scopes
```

**Variable 2:**
```
Key:   VALTOWN_API_KEY
Value: vt_xxxxxxxxxxxxxxxxxxxxx  (paste your Val.town token)
Scopes: All scopes
```

6. Click "Save"

✅ **Done!**

---

### Step 4: Setup Supabase Database (2 minutes)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" (left sidebar)
4. Click "New query"
5. Copy and paste this SQL:

```sql
-- Privacy Tools Table
CREATE TABLE IF NOT EXISTS privacy_tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  val_id TEXT NOT NULL UNIQUE,
  val_name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  creator_wallet TEXT,
  url TEXT NOT NULL,
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review',
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by TEXT
);

-- Tool Votes Table
CREATE TABLE IF NOT EXISTS tool_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id UUID REFERENCES privacy_tools(id) ON DELETE CASCADE,
  voter_wallet TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tool_id, voter_wallet)
);

-- Tool Categories
CREATE TABLE IF NOT EXISTS tool_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO tool_categories (name, description, icon) VALUES
  ('Encryption', 'Tools for encrypting data and communications', '🔐'),
  ('Password', 'Password generators and managers', '🔑'),
  ('Anonymous', 'Tools for anonymous browsing and communication', '👤'),
  ('File Privacy', 'Secure file handling and sharing', '📁'),
  ('Network', 'VPN configs, proxy tools, network privacy', '🌐'),
  ('Metadata', 'Tools to remove or obfuscate metadata', '🏷️'),
  ('Messaging', 'Secure messaging and communication', '💬'),
  ('General', 'Other privacy tools', '🛠️')
ON CONFLICT (name) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_privacy_tools_status ON privacy_tools(status);
CREATE INDEX IF NOT EXISTS idx_privacy_tools_category ON privacy_tools(category);
CREATE INDEX IF NOT EXISTS idx_privacy_tools_created_at ON privacy_tools(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_privacy_tools_upvotes ON privacy_tools(upvotes DESC);
CREATE INDEX IF NOT EXISTS idx_tool_votes_tool_id ON tool_votes(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_votes_voter ON tool_votes(voter_wallet);

-- Enable RLS
ALTER TABLE privacy_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Public read approved tools" ON privacy_tools;
CREATE POLICY "Public read approved tools" ON privacy_tools
  FOR SELECT USING (status = 'approved');

DROP POLICY IF EXISTS "Anyone can create tools" ON privacy_tools;
CREATE POLICY "Anyone can create tools" ON privacy_tools
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public read votes" ON tool_votes;
CREATE POLICY "Public read votes" ON tool_votes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can vote" ON tool_votes;
CREATE POLICY "Anyone can vote" ON tool_votes
  FOR INSERT WITH CHECK (true);
```

6. Click "Run" (or press Ctrl+Enter)
7. You should see "Success. No rows returned"

✅ **Database ready!**

---

### Step 5: Deploy (30 seconds)

Now that everything is configured, just deploy:

```bash
git add .
git commit -m "Add Privacy Tools Lab with Val.town integration"
git push origin main
```

Netlify will automatically deploy! ⚡

---

### Step 6: Test It! (1 minute)

1. Wait for Netlify build to finish (~2 minutes)
2. Go to your live site
3. Navigate to the Privacy Tools section
4. Click "Create Tool"
5. Enter: "A random password generator with strength meter"
6. Click "Create Tool with AI"
7. Wait 30-60 seconds
8. You should see: "🎉 Your privacy tool has been created!"

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] Netlify build succeeded
- [ ] Privacy Tools section appears on site
- [ ] Can see "Create Tool" form
- [ ] Test tool creation works
- [ ] Tool appears in Supabase `privacy_tools` table
- [ ] Can view tool in gallery after approval
- [ ] Voting buttons work

---

## 🎨 Frontend Integration

The Privacy Tools section is in `privacy-tools-section.html`.

**To add it to your site**, open `index.html` and add before `</body>`:

```html
<!-- Privacy Tools Lab -->
<div id="privacy-tools-section"></div>

<script type="text/babel">
  // Paste content from privacy-tools-section.html here
  // OR import it as a separate file
</script>
```

Or see `INTEGRATION-GUIDE.md` for detailed options.

---

## 🏆 Launch the $500 Contest

Once everything is working:

1. **Announce on Twitter/X:**
```
🛠️ NEW: Privacy Tools Lab

Create privacy tools with AI, no coding needed!

🏆 Best tool each month wins $500

Features:
✅ AI-powered builder
✅ Community voting
✅ Live preview
✅ Instant deployment

Try it now: [your-link]

#Privacy #AI #Crypto
```

2. **Post on Discord:**
```
@everyone

🎉 Privacy Tools Lab is LIVE!

Create privacy tools using AI (no code needed!) and compete for $500 monthly prize!

🛠️ How it works:
1. Describe your tool idea
2. AI builds it for you
3. Community votes
4. Winner gets $500!

Try it: [your-link]
```

3. **Set Monthly Reminder:**
- First day of each month: Announce winner
- Send 500 USDC to winner's wallet
- Feature winning tool on homepage
- Start new contest

---

## 💰 Cost Summary

**One-time setup:**
- OpenAI: $10 credit (100-200 tools)

**Monthly recurring:**
- Val.town Pro: $10/month
- OpenAI: ~$50-100/month (100 tools)
- Winner prize: $500/month
- **Total: ~$560-610/month**

**But you get:**
- Massive community engagement
- 100+ new privacy tools
- Viral marketing
- User-generated content
- Differentiation from competitors

**Worth it? Absolutely!** 🚀

---

## 🐛 Troubleshooting

### "API call failed"
→ Check Netlify environment variables are set correctly

### "Database error"
→ Verify Supabase SQL ran successfully, check table exists

### "Val.town deployment failed"
→ Check Val.town API token has correct permissions

### "Tool not appearing"
→ Tool is pending review, approve it in Supabase dashboard:
1. Go to Supabase → Table Editor
2. Open `privacy_tools` table
3. Find your tool
4. Change `status` from `pending_review` to `approved`

---

## 📚 Additional Documentation

- **Full Setup Guide:** `VALTOWN-SETUP.md`
- **Integration Options:** `INTEGRATION-GUIDE.md`
- **Environment Variables:** `ENV-VARIABLES-GUIDE.md`
- **Complete Summary:** `PRIVACY-TOOLS-SUMMARY.md`

---

## 🎉 You're Done!

Your Privacy Tools Lab is now live! Users can:
- ✅ Create tools with AI
- ✅ Browse community tools
- ✅ Vote on favorites
- ✅ Compete for $500 prize

**Time to announce it to the world!** 📣

Questions? Check the documentation files above or test locally with:
```bash
netlify dev
```

**Happy building!** 🚀


