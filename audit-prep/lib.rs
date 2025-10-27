use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};

declare_id!("2uZWi6wC6CumhcCDCuNZcBaDSd7UJKf4BKreWdx1Pyaq");

pub const WHISTLE_TOKEN_MINT: &str = "6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump";

#[program]
pub mod ghost_whistle_staking {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.authority = ctx.accounts.authority.key();
        pool.whistle_mint = ctx.accounts.whistle_mint.key();
        pool.total_staked = 0;
        pool.total_nodes = 0;
        pool.total_reputation = 0;
        pool.fee_pool = 0;
        pool.base_reward = 5_000_000;
        pool.bonus_per_point = 1_000_000;
        pool.total_relay_requests = 0;
        msg!("Pool initialized successfully");
        Ok(())
    }

    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        require!(amount >= 10_000_000_000, ErrorCode::MinimumStakeNotMet);

        let node = &mut ctx.accounts.node_account;
        let pool = &mut ctx.accounts.pool;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.pool_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        let old_reputation = node.reputation_score;
        if node.staked_amount == 0 {
            node.owner = ctx.accounts.user.key();
            node.created_at = Clock::get()?.unix_timestamp;
            pool.total_nodes += 1;
        }

        node.staked_amount += amount;
        pool.total_staked += amount;

        node.reputation_score = calculate_reputation(
            node.staked_amount,
            node.successful_relays,
            node.total_relays,
        );

        pool.total_reputation = pool.total_reputation
            .saturating_sub(old_reputation)
            .saturating_add(node.reputation_score);

        msg!("Staked: {} tokens, New reputation: {}", amount, node.reputation_score);
        Ok(())
    }

    pub fn record_relay(
        ctx: Context<RecordRelay>,
        _transaction_signature: String,
        success: bool,
    ) -> Result<()> {
        let node = &mut ctx.accounts.node_account;
        let pool = &mut ctx.accounts.pool;

        let old_reputation = node.reputation_score;

        node.total_relays += 1;
        node.last_relay = Clock::get()?.unix_timestamp;

        if success {
            node.successful_relays += 1;

            let reward = calculate_reward(
                node.reputation_score,
                pool.base_reward,
                pool.bonus_per_point,
            );

            node.total_earned += reward;
            node.pending_rewards += reward;

            msg!("Relay successful, Reward: {}", reward);
        } else {
            node.failed_relays += 1;
        }

        node.reputation_score = calculate_reputation(
            node.staked_amount,
            node.successful_relays,
            node.total_relays,
        );

        pool.total_reputation = pool.total_reputation
            .saturating_sub(old_reputation)
            .saturating_add(node.reputation_score);

        Ok(())
    }

    pub fn create_relay_request(
        ctx: Context<CreateRelayRequest>,
        num_hops: u8,
        relay_fee: u64,
    ) -> Result<()> {
        let relay_request = &mut ctx.accounts.relay_request;
        let pool = &mut ctx.accounts.pool;
        
        require!(num_hops >= 3, ErrorCode::InsufficientHops);
        
        let min_fee = (num_hops as u64) * 5_000_000;
        require!(relay_fee >= min_fee, ErrorCode::InsufficientRelayFee);
        
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.pool_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            relay_fee,
        )?;
        
        relay_request.creator = ctx.accounts.user.key();
        relay_request.request_id = pool.total_relay_requests + 1;
        relay_request.relay_fee = relay_fee;
        relay_request.num_hops = num_hops;
        relay_request.num_participants = 0;
        relay_request.status = 0;
        relay_request.created_at = Clock::get()?.unix_timestamp;
        relay_request.completed_at = 0;
        
        pool.fee_pool += relay_fee;
        pool.total_relay_requests += 1;
        
        msg!("Relay request created: ID {}, Fee: {}", relay_request.request_id, relay_fee);
        Ok(())
    }

    pub fn join_relay(ctx: Context<JoinRelay>) -> Result<()> {
        let relay_request = &mut ctx.accounts.relay_request;
        let node = &ctx.accounts.node_account;
        
        require!(
            relay_request.status == 0 || relay_request.status == 1,
            ErrorCode::RelayNotAvailable
        );
        
        require!(node.staked_amount >= 10_000_000_000, ErrorCode::NodeNotStaked);
        
        require!(
            relay_request.num_participants < relay_request.num_hops,
            ErrorCode::RelayFull
        );
        
        relay_request.num_participants += 1;
        
        if relay_request.num_participants == 1 {
            relay_request.status = 1;
        }
        
        msg!("Node {} joined relay {}", ctx.accounts.user.key(), relay_request.request_id);
        Ok(())
    }

    pub fn complete_relay(
        ctx: Context<CompleteRelay>,
        transaction_hash: String,
    ) -> Result<()> {
        let relay_request = &mut ctx.accounts.relay_request;
        
        require!(relay_request.status == 1, ErrorCode::InvalidRelayStatus);
        require!(
            relay_request.num_participants >= relay_request.num_hops,
            ErrorCode::InsufficientNodes
        );
        
        relay_request.status = 2;
        relay_request.completed_at = Clock::get()?.unix_timestamp;
        
        msg!("Relay {} completed: {}", relay_request.request_id, transaction_hash);
        Ok(())
    }

    pub fn claim_relay_payment(ctx: Context<ClaimRelayPayment>) -> Result<()> {
        let relay_request = &ctx.accounts.relay_request;
        let node = &mut ctx.accounts.node_account;
        let pool = &mut ctx.accounts.pool;
        
        require!(relay_request.status == 2, ErrorCode::RelayNotCompleted);
        
        let total_fee = relay_request.relay_fee;
        let num_participants = relay_request.num_participants as u64;
        let base_payment = total_fee / num_participants;
        
        let reputation_bonus = (base_payment * node.reputation_score) / 2000;
        let node_payment = base_payment + reputation_bonus;
        
        let bump = *ctx.bumps.get("pool").unwrap();
        let seeds = &[b"pool".as_ref(), &[bump]];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.pool_vault.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: pool.to_account_info(),
                },
                signer,
            ),
            node_payment,
        )?;
        
        let old_reputation = node.reputation_score;
        node.total_relays += 1;
        node.successful_relays += 1;
        node.total_earned += node_payment;
        node.last_relay = Clock::get()?.unix_timestamp;
        
        node.reputation_score = calculate_reputation(
            node.staked_amount,
            node.successful_relays,
            node.total_relays,
        );
        
        pool.total_reputation = pool.total_reputation
            .saturating_sub(old_reputation)
            .saturating_add(node.reputation_score);
        
        pool.fee_pool = pool.fee_pool.saturating_sub(node_payment);
        
        msg!("Node earned {} $WHISTLE from relay {}", node_payment, relay_request.request_id);
        Ok(())
    }

    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        let node = &mut ctx.accounts.node_account;
        let pool = &mut ctx.accounts.pool;

        require!(node.pending_rewards > 0, ErrorCode::NoRewardsToClaim);

        let amount = node.pending_rewards;

        let bump = *ctx.bumps.get("pool").unwrap();
        let seeds = &[b"pool".as_ref(), &[bump]];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.pool_vault.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: pool.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        node.pending_rewards = 0;
        node.total_claimed += amount;
        pool.fee_pool = pool.fee_pool.saturating_sub(amount);

        msg!("Claimed: {} tokens", amount);
        Ok(())
    }

    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
        let node = &mut ctx.accounts.node_account;
        let pool = &mut ctx.accounts.pool;

        require!(amount <= node.staked_amount, ErrorCode::InsufficientStake);
        require!(node.pending_rewards == 0, ErrorCode::ClaimRewardsFirst);

        let old_reputation = node.reputation_score;

        let bump = *ctx.bumps.get("pool").unwrap();
        let seeds = &[b"pool".as_ref(), &[bump]];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.pool_vault.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: pool.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        node.staked_amount -= amount;
        pool.total_staked -= amount;

        node.reputation_score = calculate_reputation(
            node.staked_amount,
            node.successful_relays,
            node.total_relays,
        );

        pool.total_reputation = pool.total_reputation
            .saturating_sub(old_reputation)
            .saturating_add(node.reputation_score);

        msg!("Unstaked: {} tokens", amount);
        Ok(())
    }

    pub fn deposit_fees(ctx: Context<DepositFees>, amount: u64) -> Result<()> {
        let pool = &mut ctx.accounts.pool;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.pool_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        pool.fee_pool += amount;

        msg!("Fee deposited: {} tokens", amount);
        Ok(())
    }

    pub fn update_params(
        ctx: Context<UpdateParams>,
        new_base: u64,
        new_bonus: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        require!(ctx.accounts.authority.key() == pool.authority, ErrorCode::Unauthorized);

        pool.base_reward = new_base;
        pool.bonus_per_point = new_bonus;

        msg!("Updated params: base={}, bonus={}", new_base, new_bonus);
        Ok(())
    }
}

fn calculate_reputation(staked: u64, successful: u64, total: u64) -> u64 {
    if total == 0 {
        return integer_sqrt(staked / 10_000_000_000) * 1000;
    }
    let stake_mult = integer_sqrt(staked / 10_000_000_000) * 1000;
    let perf_mult = (successful * 1000) / total;
    (stake_mult * perf_mult) / 1000
}

fn integer_sqrt(n: u64) -> u64 {
    if n == 0 {
        return 0;
    }
    let mut x = n;
    let mut y = (x + 1) / 2;
    while y < x {
        x = y;
        y = (x + n / x) / 2;
    }
    x
}

fn calculate_reward(rep: u64, base: u64, bonus: u64) -> u64 {
    base + (rep * bonus / 1000)
}

#[account]
pub struct StakingPool {
    pub authority: Pubkey,
    pub whistle_mint: Pubkey,
    pub total_staked: u64,
    pub total_nodes: u64,
    pub total_reputation: u64,
    pub fee_pool: u64,
    pub base_reward: u64,
    pub bonus_per_point: u64,
    pub total_relay_requests: u64,
}

#[account]
pub struct NodeAccount {
    pub owner: Pubkey,
    pub staked_amount: u64,
    pub reputation_score: u64,
    pub total_relays: u64,
    pub successful_relays: u64,
    pub failed_relays: u64,
    pub total_earned: u64,
    pub pending_rewards: u64,
    pub total_claimed: u64,
    pub created_at: i64,
    pub last_relay: i64,
}

#[account]
pub struct RelayRequest {
    pub creator: Pubkey,
    pub request_id: u64,
    pub relay_fee: u64,
    pub num_hops: u8,
    pub num_participants: u8,
    pub status: u8,
    pub created_at: i64,
    pub completed_at: i64,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = 8 + 32 + 32 + 8 * 7, seeds = [b"pool"], bump)]
    pub pool: Account<'info, StakingPool>,
    pub whistle_mint: Account<'info, Mint>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(init_if_needed, payer = user, space = 8 + 32 + 8 * 9 + 8 * 2, seeds = [b"node", user.key().as_ref()], bump)]
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
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateRelayRequest<'info> {
    #[account(init, payer = user, space = 8 + 32 + 8 + 8 + 1 + 1 + 1 + 8 + 8 + 32, seeds = [b"relay", user.key().as_ref(), &(pool.total_relay_requests + 1).to_le_bytes()], bump)]
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
pub struct JoinRelay<'info> {
    #[account(mut)]
    pub relay_request: Account<'info, RelayRequest>,
    #[account(seeds = [b"node", user.key().as_ref()], bump)]
    pub node_account: Account<'info, NodeAccount>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct CompleteRelay<'info> {
    #[account(mut)]
    pub relay_request: Account<'info, RelayRequest>,
    #[account(mut, seeds = [b"pool"], bump)]
    pub pool: Account<'info, StakingPool>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
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

#[derive(Accounts)]
pub struct RecordRelay<'info> {
    #[account(mut, seeds = [b"node", node_account.owner.as_ref()], bump)]
    pub node_account: Account<'info, NodeAccount>,
    #[account(mut, seeds = [b"pool"], bump)]
    pub pool: Account<'info, StakingPool>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
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

#[derive(Accounts)]
pub struct Unstake<'info> {
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

#[derive(Accounts)]
pub struct DepositFees<'info> {
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

#[derive(Accounts)]
pub struct UpdateParams<'info> {
    #[account(mut, seeds = [b"pool"], bump)]
    pub pool: Account<'info, StakingPool>,
    pub authority: Signer<'info>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Minimum stake is 10,000 $WHISTLE")]
    MinimumStakeNotMet,
    #[msg("No rewards to claim")]
    NoRewardsToClaim,
    #[msg("Insufficient staked amount")]
    InsufficientStake,
    #[msg("Must claim rewards before unstaking")]
    ClaimRewardsFirst,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Minimum 3 hops required for privacy")]
    InsufficientHops,
    #[msg("Relay fee too low (minimum 5 $WHISTLE per hop)")]
    InsufficientRelayFee,
    #[msg("Relay not available for joining")]
    RelayNotAvailable,
    #[msg("Node must stake 10,000 $WHISTLE to participate")]
    NodeNotStaked,
    #[msg("Relay already has maximum participants")]
    RelayFull,
    #[msg("Invalid relay status")]
    InvalidRelayStatus,
    #[msg("Not enough nodes joined the relay")]
    InsufficientNodes,
    #[msg("Relay not completed yet")]
    RelayNotCompleted,
}