-- Ghost Whistle Node Performance Database Schema
-- Run this in your Supabase SQL Editor

-- Enable Row Level Security
ALTER TABLE IF EXISTS node_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS node_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS claim_history ENABLE ROW LEVEL SECURITY;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS leaderboard_snapshots CASCADE;
DROP TABLE IF EXISTS node_sessions CASCADE;
DROP TABLE IF EXISTS node_performance CASCADE;
DROP TABLE IF EXISTS claim_history CASCADE;

-- Node performance tracking (main table)
CREATE TABLE node_performance (
  id SERIAL PRIMARY KEY,
  node_id TEXT UNIQUE NOT NULL,
  wallet_address TEXT NOT NULL,
  total_uptime_ms BIGINT DEFAULT 0,
  total_relays INTEGER DEFAULT 0,
  successful_relays INTEGER DEFAULT 0,
  failed_relays INTEGER DEFAULT 0,
  best_uptime_streak_ms BIGINT DEFAULT 0,
  current_streak_ms BIGINT DEFAULT 0,
  region TEXT,
  reputation_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session tracking (for detailed session history)
CREATE TABLE node_sessions (
  id SERIAL PRIMARY KEY,
  node_id TEXT NOT NULL,
  session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_end TIMESTAMP WITH TIME ZONE,
  uptime_ms BIGINT DEFAULT 0,
  relays_completed INTEGER DEFAULT 0,
  region TEXT,
  reputation_gained INTEGER DEFAULT 0
);

-- Leaderboard snapshots (for historical rankings)
CREATE TABLE leaderboard_snapshots (
  id SERIAL PRIMARY KEY,
  snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  node_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  rank INTEGER NOT NULL,
  uptime_ms BIGINT,
  total_relays INTEGER,
  reputation_score INTEGER,
  region TEXT,
  current_streak_ms BIGINT DEFAULT 0
);

-- Claim history (for 24h cooldown enforcement)
CREATE TABLE claim_history (
  id SERIAL PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  last_claim_timestamp BIGINT NOT NULL,
  last_claim_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  claim_amount NUMERIC(20, 9) DEFAULT 0,
  transaction_signature TEXT,
  claim_status TEXT DEFAULT 'completed',
  claim_lock BOOLEAN DEFAULT false,
  claim_lock_expires_at BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_node_performance_node_id ON node_performance(node_id);
CREATE INDEX idx_node_performance_wallet ON node_performance(wallet_address);
CREATE INDEX idx_node_performance_reputation ON node_performance(reputation_score DESC);
CREATE INDEX idx_node_performance_uptime ON node_performance(total_uptime_ms DESC);

CREATE INDEX idx_node_sessions_node_id ON node_sessions(node_id);
CREATE INDEX idx_node_sessions_start ON node_sessions(session_start);

CREATE INDEX idx_leaderboard_snapshots_time ON leaderboard_snapshots(snapshot_time DESC);
CREATE INDEX idx_leaderboard_snapshots_rank ON leaderboard_snapshots(snapshot_time DESC, rank);

CREATE INDEX idx_claim_history_wallet ON claim_history(wallet_address);
CREATE INDEX idx_claim_history_timestamp ON claim_history(last_claim_timestamp DESC);

-- RLS Policies (allow read access to all, write only from service role)
CREATE POLICY "Allow read access to node_performance" ON node_performance FOR SELECT USING (true);
CREATE POLICY "Allow service role write to node_performance" ON node_performance FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow read access to node_sessions" ON node_sessions FOR SELECT USING (true);
CREATE POLICY "Allow service role write to node_sessions" ON node_sessions FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow read access to leaderboard_snapshots" ON leaderboard_snapshots FOR SELECT USING (true);
CREATE POLICY "Allow service role write to leaderboard_snapshots" ON leaderboard_snapshots FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow read access to claim_history" ON claim_history FOR SELECT USING (true);
CREATE POLICY "Allow service role write to claim_history" ON claim_history FOR ALL USING (auth.role() = 'service_role');

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_node_performance_updated_at 
    BEFORE UPDATE ON node_performance 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_claim_history_updated_at 
    BEFORE UPDATE ON claim_history 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create leaderboard snapshot
CREATE OR REPLACE FUNCTION create_leaderboard_snapshot()
RETURNS void AS $$
DECLARE
    node_record RECORD;
    current_rank INTEGER := 1;
BEGIN
    -- Clear old snapshots (keep only last 1000)
    DELETE FROM leaderboard_snapshots 
    WHERE id NOT IN (
        SELECT id FROM leaderboard_snapshots 
        ORDER BY snapshot_time DESC 
        LIMIT 1000
    );
    
    -- Create new snapshot
    FOR node_record IN 
        SELECT node_id, wallet_address, total_uptime_ms, total_relays, 
               reputation_score, region, current_streak_ms
        FROM node_performance 
        ORDER BY reputation_score DESC, total_uptime_ms DESC
    LOOP
        INSERT INTO leaderboard_snapshots (
            node_id, wallet_address, rank, uptime_ms, 
            total_relays, reputation_score, region, current_streak_ms
        ) VALUES (
            node_record.node_id, node_record.wallet_address, current_rank,
            node_record.total_uptime_ms, node_record.total_relays,
            node_record.reputation_score, node_record.region, node_record.current_streak_ms
        );
        current_rank := current_rank + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Insert some sample data for testing
INSERT INTO node_performance (node_id, wallet_address, total_uptime_ms, total_relays, successful_relays, region, reputation_score) VALUES
('node_001', '7NFFKUqmQCXHps19XxFkB9qh7AX52UZE8HJVdUu8W6XF', 3600000, 25, 23, 'US-East', 95),
('node_002', '9K8mN2pQrS5tUvWxYzA1bC3dE4fG6hI7jK8lM9nO0pQ', 7200000, 45, 42, 'EU-West', 98),
('node_003', '2B3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV3wX4yZ5aB6c', 1800000, 12, 11, 'Asia-Pacific', 87);

-- Create initial leaderboard snapshot
SELECT create_leaderboard_snapshot();
