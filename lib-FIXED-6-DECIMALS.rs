use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};

declare_id!("Hf38P6icw2npaFneCJp4LbcPxJqmnD957FXjPCb9nCHs");

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
        pool.base_reward = 5_000_000; // 5 $WHISTLE (6 decimals)
        pool.bonus_per_point = 1_000_000; // 1 $WHISTLE per reputation point (6 decimals)
        msg!("Pool initialized successfully");
        Ok(())
    }

    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        require!(amount >= 10_000_000_000, ErrorCode::MinimumStakeNotMet); // 10,000 $WHISTLE with 6 decimals

        let node = &mut ctx.accounts.node_account;
        let pool = &mut ctx.accounts.pool;

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.pool_vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::transfer(cpi_ctx, amount)?;

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

    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        let node = &mut ctx.accounts.node_account;
        let pool = &mut ctx.accounts.pool;

        require!(node.pending_rewards > 0, ErrorCode::NoRewardsToClaim);

        let amount = node.pending_rewards;

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
        token::transfer(cpi_ctx, amount)?;

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
        token::transfer(cpi_ctx, amount)?;

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

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.pool_vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::transfer(cpi_ctx, amount)?;

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

fn calculate_reputation(
    staked: u64,
    successful: u64,
    total: u64,
) -> u64 {
    if total == 0 {
        return integer_sqrt(staked / 10_000_000_000) * 1000; // 10,000 with 6 decimals
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

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 256,
        seeds = [b"pool"],
        bump
    )]
    pub pool: Account<'info, StakingPool>,
    #[account(
        constraint = whistle_mint.key().to_string() == WHISTLE_TOKEN_MINT
    )]
    pub whistle_mint: Account<'info, Mint>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(
        init_if_needed,
        payer = user,
        space = 256,
        seeds = [b"node", user.key().as_ref()],
        bump
    )]
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
}

