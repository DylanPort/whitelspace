/**
 * Configuration management for WHISTLE Indexer
 */

use anyhow::{Result, Context};
use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    // Solana configuration
    pub solana_rpc_url: String,
    pub solana_network: String,
    pub solana_ws_url: Option<String>,

    // Database configuration
    pub database_url: String,

    // Indexer configuration
    pub start_slot: StartSlot,
    pub parallel_slots: usize,
    pub batch_size: usize,
    pub batch_delay_ms: u64,
    pub indexed_programs: Vec<String>,

    // Performance
    pub workers: usize,
}

#[derive(Debug, Clone)]
pub enum StartSlot {
    Genesis,
    Latest,
    Specific(u64),
}

impl Config {
    pub fn load() -> Result<Self> {
        // Load .env file if it exists
        dotenv::from_filename("../config/config.env").ok();

        let start_slot = match env::var("INDEXER_START_SLOT").unwrap_or_else(|_| "latest".to_string()).as_str() {
            "0" | "genesis" => StartSlot::Genesis,
            "latest" => StartSlot::Latest,
            slot => StartSlot::Specific(slot.parse().context("Invalid start slot")?),
        };

        let indexed_programs = env::var("INDEXED_PROGRAMS")
            .unwrap_or_else(|_| "*".to_string())
            .split(',')
            .map(|s| s.trim().to_string())
            .collect();

        Ok(Config {
            solana_rpc_url: env::var("SOLANA_RPC_URL")
                .unwrap_or_else(|_| "https://api.mainnet-beta.solana.com".to_string()),
            
            solana_network: env::var("SOLANA_NETWORK")
                .unwrap_or_else(|_| "mainnet-beta".to_string()),
            
            solana_ws_url: env::var("SOLANA_WS_URL").ok(),

            database_url: env::var("DATABASE_URL")
                .context("DATABASE_URL environment variable not set")?,

            start_slot,

            parallel_slots: env::var("INDEXER_PARALLEL_SLOTS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(10),

            batch_size: env::var("INDEXER_BATCH_SIZE")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(100),

            batch_delay_ms: env::var("INDEXER_BATCH_DELAY")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(100),

            indexed_programs,

            workers: env::var("INDEXER_WORKERS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(4),
        })
    }
}





