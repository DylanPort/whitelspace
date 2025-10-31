-- Privacy Tools Lab - Supabase Database Schema
-- Run this in Supabase SQL Editor before testing

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

-- Success message
SELECT 'Privacy Tools database schema created successfully! 🎉' as message;


