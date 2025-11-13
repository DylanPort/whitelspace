/**
 * WHISTLE Blockchain Indexer
 * Watches Solana blockchain and indexes transactions to PostgreSQL
 */

mod config;
mod db;
mod indexer;
mod parser;
mod types;

use anyhow::Result;
use tracing::{info, error};
use tracing_subscriber;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter("whistle_indexer=info")
        .init();

    info!("🚀 WHISTLE Blockchain Indexer starting...");

    // Load configuration
    let config = config::Config::load()?;
    info!("✅ Configuration loaded");
    info!("   Network: {}", config.solana_network);
    info!("   RPC: {}", config.solana_rpc_url);
    info!("   Start slot: {:?}", config.start_slot);

    // Connect to database
    let db_pool = db::connect(&config.database_url).await?;
    info!("✅ Database connected");

    // Run migrations
    db::run_migrations(&db_pool).await?;
    info!("✅ Database migrations complete");

    // Create indexer
    let mut indexer = indexer::Indexer::new(config, db_pool)?;
    info!("✅ Indexer initialized");

    // Start indexing
    info!("🔄 Starting blockchain indexing...");
    info!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    if let Err(e) = indexer.run().await {
        error!("❌ Indexer error: {}", e);
        return Err(e);
    }

    Ok(())
}

