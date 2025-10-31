# 🛠️ Val.town Privacy Tools Integration Setup

## 📋 Overview

This system allows users to create privacy tools using AI (GPT-4), deploy them automatically to Val.town, and showcase them in a community gallery.

**Features:**
- ✅ AI-powered tool generation (GPT-4)
- ✅ Automatic deployment to Val.town
- ✅ Community voting system
- ✅ Tool gallery & showcase
- ✅ $500 monthly bounty for best tool
- ✅ Admin approval workflow

---

## 🔑 Required API Keys

You need to set up these services and get API keys:

### 1. OpenAI (GPT-4)
**Purpose:** Generate privacy tool code

**Steps:**
1. Go to https://platform.openai.com
2. Sign up / Log in
3. Go to "API Keys" section
4. Click "Create new secret key"
5. Copy the key (starts with `sk-...`)
6. Add $10-20 credit to your account

**Cost:** ~$0.50-1.00 per tool generated

---

### 2. Val.town
**Purpose:** Host and execute generated privacy tools

**Steps:**
1. Go to https://val.town
2. Sign up (free account works to start)
3. Go to Settings → API Tokens
4. Create new token with permissions:
   - Create vals
   - Read vals
   - Update vals
5. Copy the token

**Upgrade to Pro ($10/month) for:**
- Unlimited vals
- Custom domains
- Higher execution limits

**Cost:** $10/month (Pro plan recommended)

---

### 3. Supabase (Already setup)
**Purpose:** Store tool metadata, votes, and reviews

You already have Supabase configured. Just need to add new tables (see below).

---

## 📊 Database Schema (Supabase)

Run these SQL commands in your Supabase SQL editor:

```sql
-- Privacy Tools Table
CREATE TABLE privacy_tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  val_id TEXT NOT NULL UNIQUE,
  val_name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  creator_wallet TEXT,
  url TEXT NOT NULL,
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review', -- pending_review, approved, rejected
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

-- Tool Votes Table (track individual votes)
CREATE TABLE tool_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id UUID REFERENCES privacy_tools(id) ON DELETE CASCADE,
  voter_wallet TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tool_id, voter_wallet)
);

-- Tool Categories Reference
CREATE TABLE tool_categories (
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
  ('General', 'Other privacy tools', '🛠️');

-- Indexes for performance
CREATE INDEX idx_privacy_tools_status ON privacy_tools(status);
CREATE INDEX idx_privacy_tools_category ON privacy_tools(category);
CREATE INDEX idx_privacy_tools_created_at ON privacy_tools(created_at DESC);
CREATE INDEX idx_privacy_tools_upvotes ON privacy_tools(upvotes DESC);
CREATE INDEX idx_tool_votes_tool_id ON tool_votes(tool_id);
CREATE INDEX idx_tool_votes_voter ON tool_votes(voter_wallet);

-- Row Level Security (RLS)
ALTER TABLE privacy_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_votes ENABLE ROW LEVEL SECURITY;

-- Public read access for approved tools
CREATE POLICY "Public read approved tools" ON privacy_tools
  FOR SELECT USING (status = 'approved');

-- Anyone can insert tools (they start as pending_review)
CREATE POLICY "Anyone can create tools" ON privacy_tools
  FOR INSERT WITH CHECK (true);

-- Public can read all votes
CREATE POLICY "Public read votes" ON tool_votes
  FOR SELECT USING (true);

-- Anyone can vote
CREATE POLICY "Anyone can vote" ON tool_votes
  FOR INSERT WITH CHECK (true);

-- Helper functions for atomic vote counting
CREATE OR REPLACE FUNCTION increment_tool_vote(tool_id UUID, column_name TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('UPDATE privacy_tools SET %I = %I + 1 WHERE id = $1', column_name, column_name)
  USING tool_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_tool_vote(tool_id UUID, column_name TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('UPDATE privacy_tools SET %I = GREATEST(%I - 1, 0) WHERE id = $1', column_name, column_name)
  USING tool_id;
END;
$$ LANGUAGE plpgsql;
```

---

## 🔐 Environment Variables

Add these to your Netlify environment variables:

```bash
# OpenAI API Key (for code generation)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx

# Val.town API Key (for deploying tools)
VALTOWN_API_KEY=vt_xxxxxxxxxxxxxxxxxxxxx

# Supabase (already configured, but verify)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

### How to add in Netlify:
1. Go to Netlify dashboard
2. Select your site
3. Go to "Site settings" → "Environment variables"
4. Click "Add a variable"
5. Add each key-value pair above
6. Click "Save"

---

## 🚀 Testing the API

Once deployed, you can test the endpoints:

### 1. Create a Privacy Tool
```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/create-privacy-tool \
  -H "Content-Type: application/json" \
  -d '{
    "description": "A password strength checker with visual feedback and entropy calculation",
    "category": "Password",
    "creatorWallet": "YourSolanaWalletAddress"
  }'
```

**Response:**
```json
{
  "success": true,
  "tool": {
    "id": "uuid",
    "url": "https://username-privacy_tool_123.web.val.run",
    "status": "pending_review",
    "message": "Tool created successfully!"
  }
}
```

### 2. Get All Tools
```bash
curl https://your-site.netlify.app/.netlify/functions/get-privacy-tools?status=approved&sortBy=upvotes
```

### 3. Vote on a Tool
```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/vote-privacy-tool \
  -H "Content-Type: application/json" \
  -d '{
    "toolId": "uuid",
    "voteType": "upvote",
    "voterWallet": "YourSolanaWalletAddress"
  }'
```

---

## 💰 Cost Breakdown

**Monthly costs for moderate usage (100 tool creations/month):**

| Service | Cost | Purpose |
|---------|------|---------|
| Val.town Pro | $10/month | Hosting & execution |
| OpenAI GPT-4 | $50-100/month | Code generation |
| Supabase | Free | Database (within limits) |
| Netlify Functions | Free | API endpoints (within limits) |
| **TOTAL** | **$60-110/month** | |

**Per tool cost:** ~$0.60-1.10

---

## 📈 Scaling Considerations

**When you exceed free tiers:**

- **Netlify Functions:** Upgrade to Pro ($19/month) for more execution time
- **Supabase:** Upgrade to Pro ($25/month) for more storage/bandwidth
- **Val.town:** Already on Pro
- **OpenAI:** Pay-as-you-go (set usage limits to control costs)

**At 500 tools/month:**
- Val.town: $10/month (unlimited)
- OpenAI: $250-500/month
- Supabase: May need Pro ($25/month)
- **Total: ~$285-535/month**

---

## 🛡️ Security Best Practices

### Code Review Process

**Before approving tools:**
1. Check generated code for malicious patterns
2. Test in sandbox environment
3. Verify no external API calls to unknown services
4. Check for data exfiltration attempts
5. Review user-facing security warnings

### Automated Checks (TODO - Future Enhancement)

Add automated security scanning:
- ESLint security rules
- Pattern matching for dangerous code
- Rate limiting on tool creation
- CAPTCHA for submissions

---

## 🎯 Admin Workflow

### Reviewing Submitted Tools

**Option 1: Supabase Dashboard (Simple)**
1. Go to Supabase → Table Editor
2. Open `privacy_tools` table
3. Filter by `status = 'pending_review'`
4. Review each tool:
   - Click `url` to test it
   - Read `code` column
   - Check `description`
5. Update `status` to `approved` or `rejected`
6. Add `admin_notes` if rejected

**Option 2: Build Admin Panel (Recommended)**
- Create admin section in your app
- Show pending tools with embedded preview
- One-click approve/reject
- Bulk actions
- Analytics dashboard

---

## 🏆 Monthly Bounty Program

### How to Run the Contest

**Weekly Cycle:**
1. Monday: Open submissions
2. Sunday: Close submissions, start voting
3. Next Sunday: Announce winner
4. Monday: Pay $500 + integrate winner

### Winner Selection

**Automatic Leaderboard:**
```sql
SELECT 
  id,
  description,
  creator_wallet,
  upvotes,
  downvotes,
  views,
  (upvotes * 10 + views) as score
FROM privacy_tools
WHERE status = 'approved'
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY score DESC
LIMIT 10;
```

**Manual Review:**
- Top 3 by score go to manual review
- Test functionality
- Check code quality
- Verify originality
- Select winner

### Payment Process

1. Contact winner via wallet address
2. Request additional info (name, social media)
3. Send 500 USDC/SOL to their wallet
4. Feature their tool on homepage
5. Announce on social media

---

## 🎨 Frontend Integration

The frontend UI is being added to `index.html` with:

- **Create Tool Page** - Form for submitting tools
- **Tool Gallery** - Grid of community tools
- **Tool Detail Modal** - Preview tool in iframe
- **Voting Buttons** - Upvote/downvote
- **Filter/Sort** - By category, popularity, newest
- **Featured Section** - Highlight winner of the week

---

## 📚 Next Steps

1. ✅ Set up API keys (OpenAI, Val.town)
2. ✅ Run Supabase SQL schema
3. ✅ Add environment variables to Netlify
4. ✅ Test API endpoints
5. ✅ Review and approve first test tool
6. ✅ Launch with announcement
7. ✅ Monitor for first week
8. ✅ Award first $500 bounty

---

## 🐛 Troubleshooting

### "OpenAI API error"
- Check API key is correct
- Verify you have credits
- Check rate limits

### "Val.town deployment failed"
- Verify API token permissions
- Check code syntax
- Try manual deployment first

### "Database error"
- Verify Supabase tables exist
- Check RLS policies
- Verify API key

### "No tools showing up"
- Check `status = 'approved'` filter
- Verify tools in database
- Check API endpoint response

---

## 📞 Support

For issues or questions:
- Check Netlify function logs
- Review Supabase logs
- Test APIs with curl
- Check browser console

---

**Ready to launch! 🚀**


