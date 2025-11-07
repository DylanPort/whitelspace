-- Ghost Whistle Social Hub Database Schema
-- Run this in your Supabase SQL Editor

-- Enable Row Level Security
ALTER TABLE IF EXISTS social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS social_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS social_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS social_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS social_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS social_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS social_notifications CASCADE;
DROP TABLE IF EXISTS social_media CASCADE;
DROP TABLE IF EXISTS social_reactions CASCADE;
DROP TABLE IF EXISTS social_follows CASCADE;
DROP TABLE IF EXISTS social_comments CASCADE;
DROP TABLE IF EXISTS social_posts CASCADE;

-- Social Posts Table
CREATE TABLE social_posts (
  id SERIAL PRIMARY KEY,
  author_wallet TEXT NOT NULL,
  author_node_id TEXT,
  title TEXT,
  content TEXT NOT NULL,
  post_type TEXT DEFAULT 'message' CHECK (post_type IN ('message', 'announcement', 'question', 'idea', 'update')),
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'technical', 'governance', 'ideas', 'updates', 'community')),
  tags TEXT[] DEFAULT '{}',
  views_count INTEGER DEFAULT 0,
  reactions_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Social Comments Table
CREATE TABLE social_comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  author_wallet TEXT NOT NULL,
  author_node_id TEXT,
  content TEXT NOT NULL,
  parent_comment_id INTEGER REFERENCES social_comments(id) ON DELETE CASCADE,
  reactions_count INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Social Reactions Table
CREATE TABLE social_reactions (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES social_posts(id) ON DELETE CASCADE,
  comment_id INTEGER REFERENCES social_comments(id) ON DELETE CASCADE,
  reactor_wallet TEXT NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry', 'fire', 'rocket')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, reactor_wallet, reaction_type),
  UNIQUE(comment_id, reactor_wallet, reaction_type),
  CHECK ((post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL))
);

-- Social Follows Table
CREATE TABLE social_follows (
  id SERIAL PRIMARY KEY,
  follower_wallet TEXT NOT NULL,
  following_wallet TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_wallet, following_wallet),
  CHECK (follower_wallet != following_wallet)
);

-- Social Media Table (for file attachments)
CREATE TABLE social_media (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES social_posts(id) ON DELETE CASCADE,
  comment_id INTEGER REFERENCES social_comments(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video', 'audio', 'document')),
  file_name TEXT,
  file_size INTEGER,
  alt_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK ((post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL))
);

-- Social Notifications Table
CREATE TABLE social_notifications (
  id SERIAL PRIMARY KEY,
  recipient_wallet TEXT NOT NULL,
  sender_wallet TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('like', 'comment', 'follow', 'mention', 'reply')),
  post_id INTEGER REFERENCES social_posts(id) ON DELETE CASCADE,
  comment_id INTEGER REFERENCES social_comments(id) ON DELETE CASCADE,
  content TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_social_posts_author ON social_posts(author_wallet);
CREATE INDEX idx_social_posts_category ON social_posts(category);
CREATE INDEX idx_social_posts_type ON social_posts(post_type);
CREATE INDEX idx_social_posts_created ON social_posts(created_at DESC);
CREATE INDEX idx_social_posts_pinned ON social_posts(is_pinned DESC, created_at DESC);

CREATE INDEX idx_social_comments_post ON social_comments(post_id);
CREATE INDEX idx_social_comments_author ON social_comments(author_wallet);
CREATE INDEX idx_social_comments_parent ON social_comments(parent_comment_id);

CREATE INDEX idx_social_reactions_post ON social_reactions(post_id);
CREATE INDEX idx_social_reactions_comment ON social_reactions(comment_id);
CREATE INDEX idx_social_reactions_reactor ON social_reactions(reactor_wallet);

CREATE INDEX idx_social_follows_follower ON social_follows(follower_wallet);
CREATE INDEX idx_social_follows_following ON social_follows(following_wallet);

CREATE INDEX idx_social_media_post ON social_media(post_id);
CREATE INDEX idx_social_media_comment ON social_media(comment_id);

CREATE INDEX idx_social_notifications_recipient ON social_notifications(recipient_wallet);
CREATE INDEX idx_social_notifications_unread ON social_notifications(recipient_wallet, is_read);

-- RLS Policies (allow read access to all, write only from service role)
CREATE POLICY "Allow read access to social_posts" ON social_posts FOR SELECT USING (true);
CREATE POLICY "Allow service role write to social_posts" ON social_posts FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow read access to social_comments" ON social_comments FOR SELECT USING (true);
CREATE POLICY "Allow service role write to social_comments" ON social_comments FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow read access to social_reactions" ON social_reactions FOR SELECT USING (true);
CREATE POLICY "Allow service role write to social_reactions" ON social_reactions FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow read access to social_follows" ON social_follows FOR SELECT USING (true);
CREATE POLICY "Allow service role write to social_follows" ON social_follows FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow read access to social_media" ON social_media FOR SELECT USING (true);
CREATE POLICY "Allow service role write to social_media" ON social_media FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow read access to social_notifications" ON social_notifications FOR SELECT USING (true);
CREATE POLICY "Allow service role write to social_notifications" ON social_notifications FOR ALL USING (auth.role() = 'service_role');

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_social_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_social_posts_updated_at 
    BEFORE UPDATE ON social_posts 
    FOR EACH ROW EXECUTE FUNCTION update_social_updated_at_column();

CREATE TRIGGER update_social_comments_updated_at 
    BEFORE UPDATE ON social_comments 
    FOR EACH ROW EXECUTE FUNCTION update_social_updated_at_column();

-- Function to update reaction counts
CREATE OR REPLACE FUNCTION update_reaction_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.post_id IS NOT NULL THEN
            UPDATE social_posts SET reactions_count = reactions_count + 1 WHERE id = NEW.post_id;
        END IF;
        IF NEW.comment_id IS NOT NULL THEN
            UPDATE social_comments SET reactions_count = reactions_count + 1 WHERE id = NEW.comment_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.post_id IS NOT NULL THEN
            UPDATE social_posts SET reactions_count = reactions_count - 1 WHERE id = OLD.post_id;
        END IF;
        IF OLD.comment_id IS NOT NULL THEN
            UPDATE social_comments SET reactions_count = reactions_count - 1 WHERE id = OLD.comment_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers for reaction counts
CREATE TRIGGER update_post_reaction_count
    AFTER INSERT OR DELETE ON social_reactions
    FOR EACH ROW EXECUTE FUNCTION update_reaction_counts();

-- Function to update comment counts
CREATE OR REPLACE FUNCTION update_comment_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE social_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE social_posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for comment counts
CREATE TRIGGER update_post_comment_count
    AFTER INSERT OR DELETE ON social_comments
    FOR EACH ROW EXECUTE FUNCTION update_comment_counts();

-- Insert some sample posts for testing
INSERT INTO social_posts (author_wallet, author_node_id, title, content, post_type, category, tags) VALUES
('7NFFKUqmQCXHps19XxFkB9qh7AX52UZE8HJVdUu8W6XF', 'Gw-HbcwM1Kw-1761216513608', 'Welcome to Ghost Whistle Social Hub!', 'Hey everyone! This is where we can share ideas, discuss network improvements, and collaborate on making Ghost Whistle even better. Looking forward to hearing your thoughts!', 'announcement', 'community', ARRAY['welcome', 'community']),
('9K8mN2pQrS5tUvWxYzA1bC3dE4fG6hI7jK8lM9nO0pQ', 'test_node_002', 'Node Performance Optimization Ideas', 'I''ve been running a node for a while now and have some ideas for improving relay efficiency. What do you think about implementing adaptive routing based on node performance?', 'idea', 'technical', ARRAY['optimization', 'routing', 'performance']),
('2B3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV3wX4yZ5aB6c', 'test_node_003', 'Governance Proposal: Reward Structure', 'I propose we adjust the reward structure to better incentivize long-term node operation. Currently, short-term nodes get the same rewards as dedicated operators.', 'question', 'governance', ARRAY['governance', 'rewards', 'proposal']);

-- Insert some sample comments
INSERT INTO social_comments (post_id, author_wallet, author_node_id, content) VALUES
(1, '9K8mN2pQrS5tUvWxYzA1bC3dE4fG6hI7jK8lM9nO0pQ', 'test_node_002', 'Great initiative! This will definitely help build a stronger community around Ghost Whistle.'),
(2, '2B3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV3wX4yZ5aB6c', 'test_node_003', 'Interesting idea! Adaptive routing could significantly improve network efficiency. Have you tested this approach?'),
(3, '7NFFKUqmQCXHps19XxFkB9qh7AX52UZE8HJVdUu8W6XF', 'Gw-HbcwM1Kw-1761216513608', 'I agree! Long-term operators should be rewarded more. Maybe we could implement a multiplier based on consecutive uptime?');

-- Insert some sample reactions
INSERT INTO social_reactions (post_id, reactor_wallet, reaction_type) VALUES
(1, '9K8mN2pQrS5tUvWxYzA1bC3dE4fG6hI7jK8lM9nO0pQ', 'like'),
(1, '2B3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV3wX4yZ5aB6c', 'fire'),
(2, '7NFFKUqmQCXHps19XxFkB9qh7AX52UZE8HJVdUu8W6XF', 'rocket'),
(3, '9K8mN2pQrS5tUvWxYzA1bC3dE4fG6hI7jK8lM9nO0pQ', 'like');

-- Insert some sample follows
INSERT INTO social_follows (follower_wallet, following_wallet) VALUES
('9K8mN2pQrS5tUvWxYzA1bC3dE4fG6hI7jK8lM9nO0pQ', '7NFFKUqmQCXHps19XxFkB9qh7AX52UZE8HJVdUu8W6XF'),
('2B3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV3wX4yZ5aB6c', '7NFFKUqmQCXHps19XxFkB9qh7AX52UZE8HJVdUu8W6XF'),
('7NFFKUqmQCXHps19XxFkB9qh7AX52UZE8HJVdUu8W6XF', '9K8mN2pQrS5tUvWxYzA1bC3dE4fG6hI7jK8lM9nO0pQ');
