-- RPC Subscriptions Database Schema
-- For storing time-based RPC access subscriptions

CREATE TABLE IF NOT EXISTS rpc_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL UNIQUE,
  package_type TEXT NOT NULL CHECK(package_type IN ('DAY', 'WEEK', 'MONTH')),
  package_name TEXT NOT NULL,
  price_sol REAL NOT NULL,
  rate_limit INTEGER NOT NULL,
  start_time INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  transaction_signature TEXT NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast wallet lookups
CREATE INDEX IF NOT EXISTS idx_wallet_address ON rpc_subscriptions(wallet_address);

-- Index for expiry checks
CREATE INDEX IF NOT EXISTS idx_expires_at ON rpc_subscriptions(expires_at);

-- Index for active subscriptions
CREATE INDEX IF NOT EXISTS idx_active ON rpc_subscriptions(is_active, expires_at);

-- Table for tracking recent requests (for rate limiting)
CREATE TABLE IF NOT EXISTS rate_limits (
  wallet_address TEXT NOT NULL,
  minute_bucket INTEGER NOT NULL,
  request_count INTEGER DEFAULT 0,
  PRIMARY KEY (wallet_address, minute_bucket)
);

-- Index for cleanup of old rate limit data
CREATE INDEX IF NOT EXISTS idx_minute_bucket ON rate_limits(minute_bucket);



