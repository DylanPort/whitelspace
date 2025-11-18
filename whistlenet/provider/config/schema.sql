-- WHISTLE Provider Database Schema
-- PostgreSQL 15+
-- This schema stores indexed Solana blockchain data

-- ============= MAIN TABLES =============

-- Transactions table (core data)
CREATE TABLE IF NOT EXISTS transactions (
    signature TEXT PRIMARY KEY,
    slot BIGINT NOT NULL,
    block_time BIGINT NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    amount BIGINT NOT NULL,
    fee BIGINT NOT NULL,
    program_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
    logs TEXT[],
    instruction_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Token accounts table
CREATE TABLE IF NOT EXISTS token_accounts (
    address TEXT PRIMARY KEY,
    owner TEXT NOT NULL,
    mint TEXT NOT NULL,
    amount BIGINT NOT NULL,
    decimals INTEGER NOT NULL,
    ui_amount DECIMAL(20, 10),
    last_updated BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- NFT metadata table
CREATE TABLE IF NOT EXISTS nft_metadata (
    mint TEXT PRIMARY KEY,
    name TEXT,
    symbol TEXT,
    uri TEXT,
    image TEXT,
    description TEXT,
    attributes JSONB,
    collection TEXT,
    verified BOOLEAN DEFAULT FALSE,
    last_updated BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Token mints table (SPL tokens)
CREATE TABLE IF NOT EXISTS token_mints (
    address TEXT PRIMARY KEY,
    supply BIGINT NOT NULL,
    decimals INTEGER NOT NULL,
    mint_authority TEXT,
    freeze_authority TEXT,
    is_initialized BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Program accounts table (for indexed programs)
CREATE TABLE IF NOT EXISTS program_accounts (
    address TEXT PRIMARY KEY,
    program_id TEXT NOT NULL,
    owner TEXT NOT NULL,
    data BYTEA,
    lamports BIGINT NOT NULL,
    executable BOOLEAN DEFAULT FALSE,
    rent_epoch BIGINT,
    last_updated BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Blocks table (for tracking)
CREATE TABLE IF NOT EXISTS blocks (
    slot BIGINT PRIMARY KEY,
    blockhash TEXT NOT NULL,
    parent_slot BIGINT,
    block_time BIGINT,
    block_height BIGINT,
    transactions_count INTEGER DEFAULT 0,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============= INDEXES FOR PERFORMANCE =============

-- Transaction indexes
CREATE INDEX IF NOT EXISTS idx_tx_from ON transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_tx_to ON transactions(to_address);
CREATE INDEX IF NOT EXISTS idx_tx_time ON transactions(block_time DESC);
CREATE INDEX IF NOT EXISTS idx_tx_slot ON transactions(slot);
CREATE INDEX IF NOT EXISTS idx_tx_program ON transactions(program_id);
CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_tx_composite ON transactions(from_address, block_time DESC);
CREATE INDEX IF NOT EXISTS idx_tx_receiver_composite ON transactions(to_address, block_time DESC);

-- Token account indexes
CREATE INDEX IF NOT EXISTS idx_token_owner ON token_accounts(owner);
CREATE INDEX IF NOT EXISTS idx_token_mint ON token_accounts(mint);
CREATE INDEX IF NOT EXISTS idx_token_owner_mint ON token_accounts(owner, mint);

-- NFT indexes
CREATE INDEX IF NOT EXISTS idx_nft_collection ON nft_metadata(collection);
CREATE INDEX IF NOT EXISTS idx_nft_verified ON nft_metadata(verified);

-- Program account indexes
CREATE INDEX IF NOT EXISTS idx_program_accounts_program ON program_accounts(program_id);
CREATE INDEX IF NOT EXISTS idx_program_accounts_owner ON program_accounts(owner);

-- Block indexes
CREATE INDEX IF NOT EXISTS idx_blocks_time ON blocks(block_time DESC);
CREATE INDEX IF NOT EXISTS idx_blocks_height ON blocks(block_height DESC);
CREATE INDEX IF NOT EXISTS idx_blocks_processed ON blocks(processed) WHERE NOT processed;

-- ============= VIEWS FOR COMMON QUERIES =============

-- Wallet transaction history view
CREATE OR REPLACE VIEW wallet_transactions AS
SELECT 
    signature,
    slot,
    block_time,
    from_address,
    to_address,
    amount,
    fee,
    program_id,
    status,
    CASE 
        WHEN from_address = to_address THEN 'self'
        ELSE 'external'
    END as transaction_type
FROM transactions
ORDER BY block_time DESC;

-- Token balances summary view
CREATE OR REPLACE VIEW token_balances_summary AS
SELECT 
    owner,
    COUNT(DISTINCT mint) as unique_tokens,
    SUM(CASE WHEN amount > 0 THEN 1 ELSE 0 END) as tokens_with_balance,
    MAX(last_updated) as last_activity
FROM token_accounts
GROUP BY owner;

-- ============= FUNCTIONS =============

-- Function to get wallet transaction count
CREATE OR REPLACE FUNCTION get_wallet_tx_count(wallet_address TEXT)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM transactions
        WHERE from_address = wallet_address OR to_address = wallet_address
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get wallet balance changes over time
CREATE OR REPLACE FUNCTION get_balance_timeline(wallet_address TEXT, days INTEGER DEFAULT 30)
RETURNS TABLE(date DATE, net_change BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(TO_TIMESTAMP(block_time)) as date,
        SUM(
            CASE 
                WHEN to_address = wallet_address THEN amount
                WHEN from_address = wallet_address THEN -amount - fee
                ELSE 0
            END
        ) as net_change
    FROM transactions
    WHERE 
        (from_address = wallet_address OR to_address = wallet_address)
        AND block_time > EXTRACT(EPOCH FROM NOW() - INTERVAL '1 day' * days)
    GROUP BY DATE(TO_TIMESTAMP(block_time))
    ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to update token account
CREATE OR REPLACE FUNCTION upsert_token_account(
    p_address TEXT,
    p_owner TEXT,
    p_mint TEXT,
    p_amount BIGINT,
    p_decimals INTEGER,
    p_last_updated BIGINT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO token_accounts (address, owner, mint, amount, decimals, ui_amount, last_updated)
    VALUES (p_address, p_owner, p_mint, p_amount, p_decimals, p_amount::DECIMAL / POWER(10, p_decimals), p_last_updated)
    ON CONFLICT (address)
    DO UPDATE SET
        amount = EXCLUDED.amount,
        ui_amount = EXCLUDED.ui_amount,
        last_updated = EXCLUDED.last_updated,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============= TRIGGERS =============

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============= STATISTICS TABLES =============

-- Provider statistics
CREATE TABLE IF NOT EXISTS provider_stats (
    id SERIAL PRIMARY KEY,
    queries_served BIGINT DEFAULT 0,
    total_data_served BIGINT DEFAULT 0,
    uptime_percentage DECIMAL(5,2) DEFAULT 100.00,
    avg_response_time_ms INTEGER DEFAULT 0,
    last_heartbeat TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert initial stats row
INSERT INTO provider_stats (queries_served)
VALUES (0)
ON CONFLICT DO NOTHING;

-- Query logs table (for analytics)
CREATE TABLE IF NOT EXISTS query_logs (
    id BIGSERIAL PRIMARY KEY,
    endpoint TEXT NOT NULL,
    params JSONB,
    response_time_ms INTEGER,
    status_code INTEGER,
    error TEXT,
    client_ip TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index on query logs
CREATE INDEX IF NOT EXISTS idx_query_logs_endpoint ON query_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_query_logs_time ON query_logs(created_at DESC);

-- ============= MAINTENANCE =============

-- Function to clean old query logs (keep last 7 days)
CREATE OR REPLACE FUNCTION clean_old_query_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM query_logs
    WHERE created_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============= GRANTS (if using separate user) =============

-- Grant permissions to whistle_api user
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO whistle_api;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO whistle_api;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO whistle_api;

-- ============= COMMENTS =============

COMMENT ON TABLE transactions IS 'Main table for indexed Solana transactions';
COMMENT ON TABLE token_accounts IS 'SPL token account balances';
COMMENT ON TABLE nft_metadata IS 'NFT metadata from on-chain and off-chain sources';
COMMENT ON TABLE blocks IS 'Block tracking for indexer progress';
COMMENT ON TABLE provider_stats IS 'Provider performance and health metrics';
COMMENT ON TABLE query_logs IS 'API query analytics (auto-cleaned after 7 days)';

-- ============= INITIAL DATA =============

-- Insert example data for testing (can be removed in production)
-- INSERT INTO transactions (signature, slot, block_time, from_address, to_address, amount, fee, program_id, status)
-- VALUES 
--     ('test_sig_1', 100000, 1700000000, 'test_wallet_1', 'test_wallet_2', 1000000, 5000, '11111111111111111111111111111111', 'success'),
--     ('test_sig_2', 100001, 1700000100, 'test_wallet_2', 'test_wallet_3', 2000000, 5000, '11111111111111111111111111111111', 'success');

-- ============= VACUUM AND ANALYZE =============

-- Run after initial setup
-- VACUUM ANALYZE transactions;
-- VACUUM ANALYZE token_accounts;
-- VACUUM ANALYZE blocks;

COMMIT;


