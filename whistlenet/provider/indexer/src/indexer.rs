/**
 * Main indexer logic for WHISTLE
 * Watches Solana blockchain and indexes transactions
 */

use anyhow::{Result, Context};
use solana_client::rpc_client::RpcClient;
use solana_sdk::commitment_config::CommitmentConfig;
use solana_transaction_status::UiTransactionEncoding;
use sqlx::PgPool;
use tokio::time::{sleep, Duration};
use tracing::{info, error, warn, debug};

use crate::{config::{Config, StartSlot}, db, parser, types::{IndexedBlock, ProcessingStats}};

pub struct Indexer {
    config: Config,
    rpc_client: RpcClient,
    db_pool: PgPool,
    stats: ProcessingStats,
}

impl Indexer {
    /// Create new indexer instance
    pub fn new(config: Config, db_pool: PgPool) -> Result<Self> {
        let rpc_client = RpcClient::new_with_commitment(
            config.solana_rpc_url.clone(),
            CommitmentConfig::confirmed(),
        );

        Ok(Self {
            config,
            rpc_client,
            db_pool,
            stats: ProcessingStats::new(),
        })
    }

    /// Main indexing loop
    pub async fn run(&mut self) -> Result<()> {
        // Determine starting slot
        let start_slot = self.get_start_slot().await?;
        info!("📍 Starting from slot: {}", start_slot);

        let mut current_slot = start_slot;

        // Main processing loop
        loop {
            match self.process_slot(current_slot).await {
                Ok(processed) => {
                    if processed {
                        current_slot += 1;

                        // Log progress every 100 blocks
                        if current_slot % 100 == 0 {
                            self.log_progress(current_slot).await;
                        }
                    } else {
                        // Slot not available yet, wait and retry
                        sleep(Duration::from_millis(400)).await;
                    }
                }
                Err(e) => {
                    error!("Error processing slot {}: {}", current_slot, e);
                    self.stats.errors += 1;

                    // Wait before retrying
                    sleep(Duration::from_secs(5)).await;
                }
            }

            // Small delay to avoid overwhelming RPC
            sleep(Duration::from_millis(self.config.batch_delay_ms)).await;
        }
    }

    /// Determine starting slot based on configuration
    async fn get_start_slot(&self) -> Result<u64> {
        match &self.config.start_slot {
            StartSlot::Genesis => Ok(0),
            StartSlot::Latest => {
                let slot = self.rpc_client.get_slot()
                    .context("Failed to get current slot")?;
                Ok(slot)
            }
            StartSlot::Specific(slot) => Ok(*slot),
        }
    }

    /// Process a single slot
    async fn process_slot(&mut self, slot: u64) -> Result<bool> {
        // Check if slot exists
        let block_result = self.rpc_client.get_block_with_config(
            slot,
            solana_client::rpc_config::RpcBlockConfig {
                encoding: Some(UiTransactionEncoding::JsonParsed),
                transaction_details: Some(solana_transaction_status::TransactionDetails::Full),
                rewards: Some(false),
                commitment: Some(CommitmentConfig::confirmed()),
                max_supported_transaction_version: Some(0),
            },
        );

        let block = match block_result {
            Ok(b) => b,
            Err(e) => {
                // Slot might not be available yet
                debug!("Slot {} not available: {}", slot, e);
                return Ok(false);
            }
        };

        // Parse block data
        let block_time = block.block_time.map(|t| t as u64);
        let block_height = block.block_height.map(|h| h);
        let blockhash = block.blockhash.clone();
        let parent_slot = block.parent_slot;
        let transactions_count = block.transactions.as_ref().map(|txs| txs.len()).unwrap_or(0);

        debug!("Processing slot {} with {} transactions", slot, transactions_count);

        // Process transactions
        let mut indexed_txs = Vec::new();

        if let Some(transactions) = &block.transactions {
            for tx in transactions {
                match parser::parse_transaction(tx, slot) {
                    Ok(Some(indexed_tx)) => {
                        // Check if program should be indexed
                        if parser::should_index_program(&indexed_tx.program_id, &self.config.indexed_programs) {
                            indexed_txs.push(indexed_tx);
                        }
                    }
                    Ok(None) => {
                        // Transaction skipped (e.g., unsupported encoding)
                        debug!("Transaction skipped in slot {}", slot);
                    }
                    Err(e) => {
                        warn!("Failed to parse transaction in slot {}: {}", slot, e);
                    }
                }
            }
        }

        // Insert transactions to database
        if !indexed_txs.is_empty() {
            let inserted = db::insert_transactions_batch(&self.db_pool, &indexed_txs).await?;
            self.stats.transactions_indexed += inserted;
        }

        // Mark block as processed
        let indexed_block = IndexedBlock {
            slot,
            blockhash,
            parent_slot: Some(parent_slot),
            block_time,
            block_height,
            transactions_count,
        };

        db::mark_block_processed(&self.db_pool, &indexed_block).await?;
        self.stats.blocks_processed += 1;

        Ok(true)
    }

    /// Log indexing progress
    async fn log_progress(&self, current_slot: u64) {
        let latest_rpc_slot = self.rpc_client.get_slot().unwrap_or(0);
        let slots_behind = if latest_rpc_slot > current_slot {
            latest_rpc_slot - current_slot
        } else {
            0
        };

        info!(
            "📊 Progress: Slot {} | Blocks: {} | Txs: {} | Speed: {:.1} tx/s | Behind: {} slots",
            current_slot,
            self.stats.blocks_processed,
            self.stats.transactions_indexed,
            self.stats.transactions_per_sec(),
            slots_behind
        );

        // Get database stats periodically
        if current_slot % 500 == 0 {
            if let Ok(db_stats) = db::get_indexer_stats(&self.db_pool).await {
                info!(
                    "💾 Database: {} txs indexed | {} blocks | Latest slot: {}",
                    db_stats.transactions_indexed,
                    db_stats.blocks_processed,
                    db_stats.latest_slot
                );
            }
        }
    }
}


