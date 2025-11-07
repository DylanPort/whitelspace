-- Manual insertion of current active nodes for testing
-- Run this in Supabase SQL Editor to populate the leaderboard

-- Insert the 4 active nodes that are currently showing in the UI
INSERT INTO node_performance (node_id, wallet_address, total_uptime_ms, total_relays, successful_relays, region, reputation_score, current_streak_ms, best_uptime_streak_ms) VALUES
('Gw-HbcwM1Kw-1761216513608', '7NFFKUqmQCXHps19XxFkB9qh7AX52UZE8HJVdUu8W6XF', 7920000, 0, 0, 'Africa/Johannesburg', 0, 7920000, 7920000),
('node_002', '9K8mN2pQrS5tUvWxYzA1bC3dE4fG6hI7jK8lM9nO0pQ', 7200000, 0, 0, 'US-East', 0, 7200000, 7200000),
('node_003', '2B3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV3wX4yZ5aB6c', 5400000, 0, 0, 'EU-West', 0, 5400000, 5400000),
('node_004', '4D5eF6gH7iJ8kL9mN0oP1qR2sT3uV4wX5yZ6aB7cD8e', 3600000, 0, 0, 'Asia-Pacific', 0, 3600000, 3600000);

-- Create leaderboard snapshot
SELECT create_leaderboard_snapshot();

-- Verify the data
SELECT * FROM node_performance ORDER BY total_uptime_ms DESC;
