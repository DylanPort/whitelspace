/**
 * Transaction parser for WHISTLE Indexer
 */

use anyhow::Result;
use solana_sdk::{pubkey::Pubkey, signature::Signature};
use solana_transaction_status::{EncodedConfirmedTransactionWithStatusMeta, UiTransactionEncoding};
use tracing::{warn, debug};

use crate::types::IndexedTransaction;

/// Parse a Solana transaction into IndexedTransaction
pub fn parse_transaction(
    tx: &EncodedConfirmedTransactionWithStatusMeta,
    slot: u64,
) -> Result<Option<IndexedTransaction>> {
    // Extract transaction data
    let transaction = match &tx.transaction.transaction {
        solana_transaction_status::EncodedTransaction::Json(ui_tx) => ui_tx,
        _ => {
            warn!("Unsupported transaction encoding");
            return Ok(None);
        }
    };

    // Get signature
    let signatures = &transaction.signatures;
    if signatures.is_empty() {
        return Ok(None);
    }
    let signature = signatures[0].clone();

    // Get block time
    let block_time = tx.block_time.unwrap_or(0) as u64;

    // Get accounts
    let message = &transaction.message;
    let account_keys = match &message {
        solana_transaction_status::UiMessage::Parsed(parsed) => {
            &parsed.account_keys
        }
        solana_transaction_status::UiMessage::Raw(raw) => {
            &raw.account_keys
        }
    };

    // Extract from/to addresses (simplified - first account is payer/from)
    let from_address = if !account_keys.is_empty() {
        account_keys[0].to_string()
    } else {
        "unknown".to_string()
    };

    // Get to_address (typically second account, or same as from for self-transactions)
    let to_address = if account_keys.len() > 1 {
        account_keys[1].to_string()
    } else {
        from_address.clone()
    };

    // Get fee
    let fee = tx.transaction.meta.as_ref()
        .and_then(|meta| meta.fee)
        .unwrap_or(0);

    // Get program ID (first instruction's program)
    let program_id = match &message {
        solana_transaction_status::UiMessage::Parsed(parsed) => {
            if let Some(instruction) = parsed.instructions.first() {
                match instruction {
                    solana_transaction_status::UiInstruction::Parsed(parsed_instr) => {
                        parsed_instr.program.clone()
                    }
                    solana_transaction_status::UiInstruction::Compiled(compiled) => {
                        if let Some(program_idx) = compiled.program_id_index.as_u64() {
                            account_keys.get(program_idx as usize)
                                .map(|k| k.to_string())
                                .unwrap_or_else(|| "system".to_string())
                        } else {
                            "unknown".to_string()
                        }
                    }
                }
            } else {
                "system".to_string()
            }
        }
        solana_transaction_status::UiMessage::Raw(raw) => {
            if let Some(instruction) = raw.instructions.first() {
                let program_idx = instruction.program_id_index as usize;
                account_keys.get(program_idx)
                    .map(|k| k.to_string())
                    .unwrap_or_else(|| "unknown".to_string())
            } else {
                "system".to_string()
            }
        }
    };

    // Get status
    let status = if tx.transaction.meta.as_ref()
        .and_then(|meta| meta.err.as_ref())
        .is_some()
    {
        "failed".to_string()
    } else {
        "success".to_string()
    };

    // Get logs
    let logs = tx.transaction.meta.as_ref()
        .and_then(|meta| meta.log_messages.clone())
        .unwrap_or_default();

    // Extract amount (simplified - get pre/post balances difference)
    let amount = extract_amount(tx);

    Ok(Some(IndexedTransaction {
        signature,
        slot,
        block_time,
        from_address,
        to_address,
        amount,
        fee,
        program_id,
        status,
        logs,
    }))
}

/// Extract transfer amount from transaction
fn extract_amount(tx: &EncodedConfirmedTransactionWithStatusMeta) -> u64 {
    if let Some(meta) = &tx.transaction.meta {
        // Get pre and post balances
        let pre_balances = &meta.pre_balances;
        let post_balances = &meta.post_balances;

        if pre_balances.len() >= 2 && post_balances.len() >= 2 {
            // Calculate difference for sender (index 0)
            let sender_diff = if pre_balances[0] > post_balances[0] {
                pre_balances[0] - post_balances[0]
            } else {
                0
            };

            // Subtract fee to get actual transfer amount
            let fee = meta.fee.unwrap_or(0);
            if sender_diff > fee {
                return sender_diff - fee;
            }
        }
    }

    0
}

/// Check if program should be indexed
pub fn should_index_program(program_id: &str, indexed_programs: &[String]) -> bool {
    if indexed_programs.is_empty() || indexed_programs.contains(&"*".to_string()) {
        return true;
    }

    indexed_programs.iter().any(|p| p == program_id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_should_index_program() {
        let all_programs = vec!["*".to_string()];
        assert!(should_index_program("any_program", &all_programs));

        let specific = vec!["program1".to_string(), "program2".to_string()];
        assert!(should_index_program("program1", &specific));
        assert!(!should_index_program("program3", &specific));
    }
}


