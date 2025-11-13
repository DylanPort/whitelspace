// Initialize liquidity pool tables in the database
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

console.log('Initializing pool tables...\n');

// Open both databases
const databases = [
  '../config/whistlenet.db',
  '../data/whistle-mainnet.db'
];

for (const dbPath of databases) {
  console.log(`Processing ${dbPath}...`);
  
  const db = new Database(dbPath);
  
  // Create liquidity_pools table
  db.exec(`
    CREATE TABLE IF NOT EXISTS liquidity_pools (
      address TEXT PRIMARY KEY,
      dex TEXT NOT NULL,
      token_a TEXT NOT NULL,
      token_b TEXT NOT NULL,
      reserve_a REAL NOT NULL,
      reserve_b REAL NOT NULL,
      decimals_a INTEGER NOT NULL,
      decimals_b INTEGER NOT NULL,
      price_a_to_b REAL NOT NULL,
      price_b_to_a REAL NOT NULL,
      liquidity_usd REAL,
      volume_24h REAL DEFAULT 0,
      fee_rate REAL,
      is_active BOOLEAN DEFAULT TRUE,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_pools_token_a ON liquidity_pools(token_a);
    CREATE INDEX IF NOT EXISTS idx_pools_token_b ON liquidity_pools(token_b);
    CREATE INDEX IF NOT EXISTS idx_pools_dex ON liquidity_pools(dex);
    CREATE INDEX IF NOT EXISTS idx_pools_liquidity ON liquidity_pools(liquidity_usd DESC);
    CREATE INDEX IF NOT EXISTS idx_pools_active ON liquidity_pools(is_active);
    
    CREATE TABLE IF NOT EXISTS pool_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pool_address TEXT NOT NULL,
      reserve_a REAL NOT NULL,
      reserve_b REAL NOT NULL,
      price_a_to_b REAL NOT NULL,
      liquidity_usd REAL,
      snapshot_time DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_snapshots_pool ON pool_snapshots(pool_address);
    CREATE INDEX IF NOT EXISTS idx_snapshots_time ON pool_snapshots(snapshot_time);
  `);
  
  console.log(`  ✅ Tables created\n`);
  
  db.close();
}

console.log('✅ Pool tables initialized in all databases!');

