/**
 * Database operations for WHISTLE Indexer
 */

use anyhow::Result;
use sqlx::{PgPool, postgres::PgPoolOptions};
use tracing::{info, warn};

use crate::types::{IndexedTransaction, IndexedTokenAccount, IndexedBlock};

/// Connect to PostgreSQL database
pub async fn connect(database_url: &str) -> Result<PgPool> {
    let pool = PgPoolOptions::new()
        .max_connections(20)
        .min_connections(5)
        .connect(database_url)
        .await?;

    Ok(pool)
}

/// Run database migrations (if needed)
pub async fn run_migrations(pool: &PgPool) -> Result<()> {
    // Check if tables exist
    let result = sqlx::query("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'transactions'")
        .fetch_one(pool)
        .await;

    if result.is_err() {
        warn!("Database tables not found. Please run schema.sql first!");
    }

    Ok(())
}

/// Insert transactions in batch
pub async fn insert_transactions_batch(
    pool: &PgPool,
    transactions: &[IndexedTransaction],
) -> Result<u64> {
    if transactions.is_empty() {
        return Ok(0);
    }

    let mut inserted = 0;

    for tx in transactions {
        let result = sqlx::query(
            r#"
            INSERT INTO transactions 
            (signature, slot, block_time, from_address, to_address, amount, fee, program_id, status, logs)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (signature) DO NOTHING
            "#
        )
        .bind(&tx.signature)
        .bind(tx.slot as i64)
        .bind(tx.block_time as i64)
        .bind(&tx.from_address)
        .bind(&tx.to_address)
        .bind(tx.amount as i64)
        .bind(tx.fee as i64)
        .bind(&tx.program_id)
        .bind(&tx.status)
        .bind(&tx.logs)
        .execute(pool)
        .await?;

        inserted += result.rows_affected();
    }

    Ok(inserted)
}

/// Insert or update token account
pub async fn upsert_token_account(
    pool: &PgPool,
    account: &IndexedTokenAccount,
) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO token_accounts (address, owner, mint, amount, decimals, ui_amount, last_updated)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (address) 
        DO UPDATE SET
            amount = EXCLUDED.amount,
            ui_amount = EXCLUDED.ui_amount,
            last_updated = EXCLUDED.last_updated
        "#
    )
    .bind(&account.address)
    .bind(&account.owner)
    .bind(&account.mint)
    .bind(account.amount as i64)
    .bind(account.decimals as i32)
    .bind(account.ui_amount)
    .bind(account.last_updated as i64)
    .execute(pool)
    .await?;

    Ok(())
}

/// Mark block as processed
pub async fn mark_block_processed(
    pool: &PgPool,
    block: &IndexedBlock,
) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO blocks (slot, blockhash, parent_slot, block_time, block_height, transactions_count, processed)
        VALUES ($1, $2, $3, $4, $5, $6, true)
        ON CONFLICT (slot) 
        DO UPDATE SET processed = true
        "#
    )
    .bind(block.slot as i64)
    .bind(&block.blockhash)
    .bind(block.parent_slot.map(|s| s as i64))
    .bind(block.block_time.map(|t| t as i64))
    .bind(block.block_height.map(|h| h as i64))
    .bind(block.transactions_count as i32)
    .execute(pool)
    .await?;

    Ok(())
}

/// Get last processed slot
pub async fn get_last_processed_slot(pool: &PgPool) -> Result<Option<u64>> {
    let result: Option<(i64,)> = sqlx::query_as(
        "SELECT MAX(slot) FROM blocks WHERE processed = true"
    )
    .fetch_optional(pool)
    .await?;

    Ok(result.and_then(|(slot,)| Some(slot as u64)))
}

/// Get indexer statistics
pub async fn get_indexer_stats(pool: &PgPool) -> Result<IndexerStats> {
    let tx_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM transactions")
        .fetch_one(pool)
        .await?;

    let block_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM blocks WHERE processed = true")
        .fetch_one(pool)
        .await?;

    let latest_slot: Option<(i64,)> = sqlx::query_as("SELECT MAX(slot) FROM blocks")
        .fetch_optional(pool)
        .await?;

    Ok(IndexerStats {
        transactions_indexed: tx_count.0 as u64,
        blocks_processed: block_count.0 as u64,
        latest_slot: latest_slot.map(|(s,)| s as u64).unwrap_or(0),
    })
}

#[derive(Debug)]
pub struct IndexerStats {
    pub transactions_indexed: u64,
    pub blocks_processed: u64,
    pub latest_slot: u64,
}





