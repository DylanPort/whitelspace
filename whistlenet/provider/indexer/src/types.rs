/**
 * Type definitions for WHISTLE Indexer
 */

use serde::{Deserialize, Serialize};

/// Indexed transaction data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexedTransaction {
    pub signature: String,
    pub slot: u64,
    pub block_time: u64,
    pub from_address: String,
    pub to_address: String,
    pub amount: u64,
    pub fee: u64,
    pub program_id: String,
    pub status: String,
    pub logs: Vec<String>,
}

/// Indexed token account
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexedTokenAccount {
    pub address: String,
    pub owner: String,
    pub mint: String,
    pub amount: u64,
    pub decimals: u8,
    pub ui_amount: f64,
    pub last_updated: u64,
}

/// Indexed block data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexedBlock {
    pub slot: u64,
    pub blockhash: String,
    pub parent_slot: Option<u64>,
    pub block_time: Option<u64>,
    pub block_height: Option<u64>,
    pub transactions_count: usize,
}

/// Processing statistics
#[derive(Debug, Clone, Default)]
pub struct ProcessingStats {
    pub blocks_processed: u64,
    pub transactions_indexed: u64,
    pub tokens_updated: u64,
    pub errors: u64,
    pub start_time: std::time::Instant,
}

impl ProcessingStats {
    pub fn new() -> Self {
        Self {
            start_time: std::time::Instant::now(),
            ..Default::default()
        }
    }

    pub fn elapsed_secs(&self) -> u64 {
        self.start_time.elapsed().as_secs()
    }

    pub fn transactions_per_sec(&self) -> f64 {
        let elapsed = self.elapsed_secs();
        if elapsed == 0 {
            0.0
        } else {
            self.transactions_indexed as f64 / elapsed as f64
        }
    }

    pub fn blocks_per_sec(&self) -> f64 {
        let elapsed = self.elapsed_secs();
        if elapsed == 0 {
            0.0
        } else {
            self.blocks_processed as f64 / elapsed as f64
        }
    }
}



