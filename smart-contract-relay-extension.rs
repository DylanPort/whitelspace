// GHOST WHISTLE - ANONYMOUS RELAY EXTENSION
// Add these functions to the existing smart contract

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

// NEW ACCOUNT STRUCTURE
#[account]
pub struct RelayRequest {
    pub creator: Pubkey,              // Who created the relay
    pub request_id: u64,              // Unique ID
    pub relay_fee: u64,               // Total $WHISTLE paid
    pub num_hops: u8,                 // Number of relay hops
    pub relay_nodes: Vec<Pubkey>,     // Nodes that participated
    pub status: RelayStatus,          // pending/in_progress/completed/failed
    pub created_at: i64,              // Timestamp
    pub completed_at: i64,            // When completed
    pub transaction_hash: String,     // Final tx hash on Solana
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum RelayStatus {
    Pending,
    InProgress,
    Completed,
    Failed,
}

// NEW FUNCTIONS TO ADD:

/// User creates a relay request and locks payment
pub fn create_relay_request(
    ctx: Context<CreateRelayRequest>,
    num_hops: u8,
    relay_fee: u64,
) -> Result<()> {
    let relay_request = &mut ctx.accounts.relay_request;
    let pool = &mut ctx.accounts.pool;
    
    // Minimum 3 hops for privacy
    require!(num_hops >= 3, ErrorCode::InsufficientHops);
    
    // Minimum fee (10 $WHISTLE per hop with 6 decimals)
    let min_fee = (num_hops as u64) * 10_000_000;
    require!(relay_fee >= min_fee, ErrorCode::InsufficientRelayFee);
    
    // Transfer fee to pool (escrow)
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.pool_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    token::transfer(cpi_ctx, relay_fee)?;
    
    // Initialize relay request
    relay_request.creator = ctx.accounts.user.key();
    relay_request.request_id = pool.total_relays + 1;
    relay_request.relay_fee = relay_fee;
    relay_request.num_hops = num_hops;
    relay_request.relay_nodes = Vec::new();
    relay_request.status = RelayStatus::Pending;
    relay_request.created_at = Clock::get()?.unix_timestamp;
    relay_request.completed_at = 0;
    relay_request.transaction_hash = String::new();
    
    pool.fee_pool += relay_fee;
    
    msg!("Relay request created: ID {}, Fee: {}", relay_request.request_id, relay_fee);
    Ok(())
}

/// Node confirms participation in relay
pub fn join_relay(
    ctx: Context<JoinRelay>,
    request_id: u64,
) -> Result<()> {
    let relay_request = &mut ctx.accounts.relay_request;
    let node = &mut ctx.accounts.node_account;
    
    // Only pending or in-progress relays can be joined
    require!(
        relay_request.status == RelayStatus::Pending || 
        relay_request.status == RelayStatus::InProgress,
        ErrorCode::RelayNotAvailable
    );
    
    // Check node is staked
    require!(node.staked_amount >= 10_000_000_000, ErrorCode::NodeNotStaked);
    
    // Check not already in list
    require!(
        !relay_request.relay_nodes.contains(&ctx.accounts.user.key()),
        ErrorCode::AlreadyJoined
    );
    
    // Add node to relay
    relay_request.relay_nodes.push(ctx.accounts.user.key());
    
    // Update status if first node
    if relay_request.relay_nodes.len() == 1 {
        relay_request.status = RelayStatus::InProgress;
    }
    
    msg!("Node {} joined relay {}", ctx.accounts.user.key(), request_id);
    Ok(())
}

/// Complete relay and distribute payment
pub fn complete_relay(
    ctx: Context<CompleteRelay>,
    request_id: u64,
    transaction_hash: String,
) -> Result<()> {
    let relay_request = &mut ctx.accounts.relay_request;
    let pool = &mut ctx.accounts.pool;
    
    require!(relay_request.status == RelayStatus::InProgress, ErrorCode::InvalidRelayStatus);
    require!(relay_request.relay_nodes.len() as u8 >= relay_request.num_hops, ErrorCode::InsufficientNodes);
    
    // Mark as completed
    relay_request.status = RelayStatus::Completed;
    relay_request.completed_at = Clock::get()?.unix_timestamp;
    relay_request.transaction_hash = transaction_hash.clone();
    
    // Calculate payment per node (weighted by reputation)
    let total_fee = relay_request.relay_fee;
    let num_nodes = relay_request.relay_nodes.len() as u64;
    
    // Base payment per node
    let base_payment = total_fee / num_nodes;
    
    msg!("Relay {} completed, distributing {} $WHISTLE to {} nodes", 
        request_id, total_fee, num_nodes);
    
    Ok(())
}

/// Distribute payment to individual node (called separately for each)
pub fn claim_relay_payment(
    ctx: Context<ClaimRelayPayment>,
    request_id: u64,
) -> Result<()> {
    let relay_request = &ctx.accounts.relay_request;
    let node = &mut ctx.accounts.node_account;
    let pool = &mut ctx.accounts.pool;
    
    require!(relay_request.status == RelayStatus::Completed, ErrorCode::RelayNotCompleted);
    require!(relay_request.relay_nodes.contains(&ctx.accounts.user.key()), ErrorCode::NotParticipant);
    
    // Calculate this node's share
    let total_fee = relay_request.relay_fee;
    let num_nodes = relay_request.relay_nodes.len() as u64;
    let base_payment = total_fee / num_nodes;
    
    // Reputation bonus (up to 50% extra)
    let reputation_bonus = (base_payment * node.reputation_score) / 2000;
    let node_payment = base_payment + reputation_bonus;
    
    // Transfer payment
    let seeds = &[b"pool".as_ref(), &[ctx.bumps.pool]];
    let signer = &[&seeds[..]];
    
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.pool_vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: pool.to_account_info(),
        },
        signer,
    );
    token::transfer(cpi_ctx, node_payment)?;
    
    // Update node stats
    node.total_relays += 1;
    node.successful_relays += 1;
    node.total_earned += node_payment;
    node.last_relay = Clock::get()?.unix_timestamp;
    
    // Update reputation
    node.reputation_score = calculate_reputation(
        node.staked_amount,
        node.successful_relays,
        node.total_relays,
    );
    
    pool.fee_pool -= node_payment;
    
    msg!("Node earned {} $WHISTLE from relay {}", node_payment, request_id);
    Ok(())
}

// CONTEXT STRUCTS

#[derive(Accounts)]
pub struct CreateRelayRequest<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 8 + 8 + 1 + (32 * 10) + 1 + 8 + 8 + 100,
        seeds = [b"relay", user.key().as_ref(), &(pool.total_relays + 1).to_le_bytes()],
        bump
    )]
    pub relay_request: Account<'info, RelayRequest>,
    #[account(mut, seeds = [b"pool"], bump)]
    pub pool: Account<'info, StakingPool>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub pool_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(request_id: u64)]
pub struct JoinRelay<'info> {
    #[account(mut)]
    pub relay_request: Account<'info, RelayRequest>,
    #[account(mut, seeds = [b"node", user.key().as_ref()], bump)]
    pub node_account: Account<'info, NodeAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(request_id: u64)]
pub struct CompleteRelay<'info> {
    #[account(mut)]
    pub relay_request: Account<'info, RelayRequest>,
    #[account(mut, seeds = [b"pool"], bump)]
    pub pool: Account<'info, StakingPool>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(request_id: u64)]
pub struct ClaimRelayPayment<'info> {
    #[account(mut)]
    pub relay_request: Account<'info, RelayRequest>,
    #[account(mut, seeds = [b"node", user.key().as_ref()], bump)]
    pub node_account: Account<'info, NodeAccount>,
    #[account(mut, seeds = [b"pool"], bump)]
    pub pool: Account<'info, StakingPool>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub pool_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

// NEW ERROR CODES
#[error_code]
pub enum ErrorCode {
    // ... existing errors ...
    #[msg("Minimum 3 hops required for privacy")]
    InsufficientHops,
    #[msg("Relay fee too low")]
    InsufficientRelayFee,
    #[msg("Relay not available")]
    RelayNotAvailable,
    #[msg("Node not staked")]
    NodeNotStaked,
    #[msg("Already joined this relay")]
    AlreadyJoined,
    #[msg("Invalid relay status")]
    InvalidRelayStatus,
    #[msg("Insufficient nodes for relay")]
    InsufficientNodes,
    #[msg("Relay not completed")]
    RelayNotCompleted,
    #[msg("Not a participant in this relay")]
    NotParticipant,
}

