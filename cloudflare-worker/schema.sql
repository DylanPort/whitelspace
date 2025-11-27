-- WhistleNet RPC Subscriptions Database Schema
-- For Cloudflare D1 (SQLite)

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_key TEXT NOT NULL UNIQUE,
    wallet_address TEXT NOT NULL,
    package TEXT NOT NULL CHECK(package IN ('DAY', 'WEEK', 'MONTH')),
    package_name TEXT NOT NULL,
    price_sol REAL NOT NULL,
    rate_limit INTEGER NOT NULL,
    start_time INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    duration INTEGER NOT NULL,
    tx_sig TEXT NOT NULL UNIQUE,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Index for fast API key lookups
CREATE INDEX IF NOT EXISTS idx_api_key ON subscriptions(api_key);

-- Index for wallet address lookups
CREATE INDEX IF NOT EXISTS idx_wallet_address ON subscriptions(wallet_address);

-- Index for expiration checks
CREATE INDEX IF NOT EXISTS idx_expires_at ON subscriptions(expires_at);

-- Index for active subscriptions
CREATE INDEX IF NOT EXISTS idx_is_active ON subscriptions(is_active);

-- Composite index for active + non-expired subscriptions
CREATE INDEX IF NOT EXISTS idx_active_unexpired ON subscriptions(is_active, expires_at);

-- Usage tracking table (optional - for analytics)
CREATE TABLE IF NOT EXISTS usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_key TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    timestamp INTEGER NOT NULL,
    hour_bucket INTEGER NOT NULL, -- Unix timestamp rounded to hour
    day_bucket INTEGER NOT NULL,  -- Unix timestamp rounded to day
    FOREIGN KEY (api_key) REFERENCES subscriptions(api_key)
);

-- Index for usage analytics
CREATE INDEX IF NOT EXISTS idx_usage_api_key ON usage_logs(api_key);
CREATE INDEX IF NOT EXISTS idx_usage_hour ON usage_logs(hour_bucket);
CREATE INDEX IF NOT EXISTS idx_usage_day ON usage_logs(day_bucket);

-- View for active subscriptions
CREATE VIEW IF NOT EXISTS active_subscriptions AS
SELECT 
    api_key,
    wallet_address,
    package,
    package_name,
    rate_limit,
    start_time,
    expires_at,
    (expires_at - strftime('%s', 'now')) AS seconds_remaining,
    CASE 
        WHEN expires_at > strftime('%s', 'now') THEN 'active'
        ELSE 'expired'
    END AS status
FROM subscriptions
WHERE is_active = 1;

-- View for subscription analytics
CREATE VIEW IF NOT EXISTS subscription_stats AS
SELECT 
    package,
    COUNT(*) as total_subscriptions,
    SUM(CASE WHEN is_active = 1 AND expires_at > strftime('%s', 'now') THEN 1 ELSE 0 END) as active_count,
    SUM(CASE WHEN expires_at <= strftime('%s', 'now') THEN 1 ELSE 0 END) as expired_count,
    SUM(price_sol) as total_revenue_sol,
    AVG(price_sol) as avg_price_sol
FROM subscriptions
GROUP BY package;



