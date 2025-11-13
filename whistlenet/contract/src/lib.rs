use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
    clock::Clock,
};
use spl_token::instruction as token_instruction;

// Program ID (to be replaced when deployed)
solana_program::declare_id!("ENATkxyz123456789ABCDEFGHJKLMNPQRSTUVWXYZabc");

entrypoint!(process_instruction);

// ============= CONSTANTS =============

// WHISTLE token mint: 6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump
const OFFICIAL_WHISTLE_MINT: &str = "6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump";
const MAX_STAKE_PER_USER: u64 = 100_000_000_000_000; // 100k WHISTLE max per user
const MIN_PROVIDER_BOND: u64 = 1_000_000_000; // 1000 WHISTLE minimum bond for providers
const QUERY_COST: u64 = 1_000_000; // 0.001 SOL per query in lamports
const HEARTBEAT_TIMEOUT: i64 = 300; // 5 minutes in seconds
const MIN_HEARTBEAT_INTERVAL: i64 = 30; // 30 seconds minimum between heartbeats
const MIN_ENDPOINT_LENGTH: usize = 10; // Minimum endpoint URL length
const MAX_ENDPOINT_LENGTH: usize = 256; // Maximum endpoint URL length

// ============= DATA STRUCTURES =============

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct StakingPool {
    pub authority: Pubkey,           // Pool authority
    pub whistle_mint: Pubkey,        // WHISTLE token mint address
    pub token_vault: Pubkey,         // SPL token vault for WHISTLE
    pub total_staked: u64,            // Total WHISTLE tokens staked
    pub total_access_tokens: u64,     // Total access tokens minted
    pub min_stake_amount: u64,        // Minimum stake to participate
    pub tokens_per_whistle: u64,      // Access tokens per WHISTLE staked
    pub is_active: bool,              // Pool status
    pub created_at: i64,              // Creation timestamp
    pub cooldown_period: i64,         // Unstake cooldown in seconds
    pub max_stake_per_user: u64,      // Maximum stake per user
    pub rate_locked: bool,            // Prevents rate manipulation
    pub bump: u8,                     // PDA bump seed
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct StakerAccount {
    pub staker: Pubkey,               // Staker wallet address
    pub staked_amount: u64,           // Amount staked
    pub access_tokens: u64,           // Access tokens earned
    pub last_stake_time: i64,         // Last staking timestamp
    pub node_operator: bool,          // Can operate network nodes
    pub voting_power: u64,            // Governance voting power
    pub data_encrypted: u64,          // Amount of data encrypted (usage metric)
    pub pending_rewards: u64,         // Unclaimed staker rewards (5% pool)
    pub bump: u8,                     // PDA bump seed
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct ProviderAccount {
    pub provider: Pubkey,             // Provider wallet
    pub endpoint: String,             // API endpoint URL (max 256 chars)
    pub registered_at: i64,           // Registration timestamp
    pub is_active: bool,              // Provider status
    pub stake_bond: u64,              // Bonded WHISTLE (minimum 1000)
    
    // Earnings tracking
    pub total_earned: u64,            // Lifetime SOL earned
    pub pending_earnings: u64,        // Unclaimed 70% share
    pub queries_served: u64,          // Total queries handled
    
    // Reputation metrics (0-10000 basis points)
    pub reputation_score: u64,        // Composite score
    pub uptime_percentage: u64,       // Uptime % (9500 = 95%)
    pub response_time_avg: u64,       // Avg latency in ms
    pub accuracy_score: u64,          // Data accuracy %
    pub last_heartbeat: i64,          // Last ping timestamp
    
    // Slashing
    pub slashed_amount: u64,          // Total slashed from bond
    pub penalty_count: u32,           // Number of penalties
    
    pub bump: u8,                     // PDA bump seed
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct PaymentVault {
    pub authority: Pubkey,            // Vault authority
    pub total_collected: u64,         // All SOL received from queries
    pub provider_pool: u64,           // 70% accumulator
    pub bonus_pool: u64,              // 20% for top performers
    pub treasury: u64,                // 5% for development
    pub staker_rewards_pool: u64,     // 5% for all stakers
    pub last_distribution: i64,       // Last bonus distribution
    pub bump: u8,                     // PDA bump seed
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone, PartialEq)]
pub enum AccessTier {
    Basic,      // 100-1000 tokens staked
    Premium,    // 1001-10000 tokens staked
    Elite,      // 10001+ tokens staked
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone, PartialEq)]
pub enum SlashReason {
    LowUptime,        // <95% uptime
    WrongData,        // Failed accuracy check
    SlowResponse,     // High latency
    MissedHeartbeat,  // Offline for >5 minutes
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum StakingInstruction {
    /// Initialize the staking pool
    /// Accounts:
    /// 0. `[writable, signer]` Authority
    /// 1. `[writable]` Staking pool account (PDA)
    /// 2. `[writable]` Token vault (PDA - SPL token account)
    /// 3. `[]` WHISTLE mint
    /// 4. `[]` Token program
    /// 5. `[]` System program
    /// 6. `[]` Rent sysvar
    InitializePool {
        min_stake_amount: u64,
        tokens_per_whistle: u64,
        cooldown_period: i64,
    },

    /// Stake WHISTLE tokens to mint access tokens
    /// Accounts:
    /// 0. `[writable, signer]` Staker
    /// 1. `[writable]` Staking pool
    /// 2. `[writable]` Staker account (PDA)
    /// 3. `[writable]` Staker's WHISTLE token account
    /// 4. `[writable]` Token vault (PDA)
    /// 5. `[]` Token program
    /// 6. `[]` System program
    /// 7. `[]` Clock sysvar
    Stake {
        amount: u64,
    },

    /// Unstake WHISTLE tokens (burns access tokens)
    /// Accounts:
    /// 0. `[writable, signer]` Staker
    /// 1. `[writable]` Staking pool
    /// 2. `[writable]` Staker account (PDA)
    /// 3. `[writable]` Staker's WHISTLE token account
    /// 4. `[writable]` Token vault (PDA)
    /// 5. `[]` Token program
    /// 6. `[]` System program
    /// 7. `[]` Clock sysvar
    Unstake {
        amount: u64,
    },

    /// Transfer access token (not sell, just delegate)
    /// SECURITY: Recipient PDA is validated
    /// Accounts:
    /// 0. `[signer]` Current owner
    /// 1. `[writable]` From staker account (PDA)
    /// 2. `[writable]` To staker account (PDA - must exist with stake)
    /// 3. `[]` Staking pool
    /// 4. `[]` To staker pubkey (for PDA validation)
    TransferAccess {
        access_tokens: u64,
    },

    /// Activate node operator status
    /// Accounts:
    /// 0. `[signer]` Staker
    /// 1. `[writable]` Staker account
    /// 2. `[]` Staking pool
    ActivateNodeOperator,

    /// Record encrypted data usage (for metrics)
    /// NOTE: In production, this should require oracle/verifier signatures
    /// Accounts:
    /// 0. `[signer]` Node operator
    /// 1. `[writable]` Staker account
    RecordDataUsage {
        data_size: u64,
    },

    /// Pause/unpause the pool (emergency use)
    /// Accounts:
    /// 0. `[signer]` Authority
    /// 1. `[writable]` Staking pool
    SetPoolStatus {
        is_active: bool,
    },

    /// Lock the token rate (prevents manipulation)
    /// Accounts:
    /// 0. `[signer]` Authority
    /// 1. `[writable]` Staking pool
    LockRate,

    // ========== PROVIDER INSTRUCTIONS ==========
    
    /// Initialize payment vault
    /// Accounts:
    /// 0. `[writable, signer]` Authority
    /// 1. `[writable]` Payment vault (PDA)
    /// 2. `[]` System program
    /// 3. `[]` Rent sysvar
    InitializePaymentVault,

    /// Register as a data provider
    /// Accounts:
    /// 0. `[writable, signer]` Provider
    /// 1. `[writable]` Provider account (PDA)
    /// 2. `[writable]` Provider's WHISTLE token account
    /// 3. `[writable]` Token vault
    /// 4. `[]` Token program
    /// 5. `[]` System program
    /// 6. `[]` Clock sysvar
    RegisterProvider {
        endpoint: String,
        bond_amount: u64,
    },

    /// Deregister provider and return bond
    /// Accounts:
    /// 0. `[writable, signer]` Provider
    /// 1. `[writable]` Provider account (PDA)
    /// 2. `[writable]` Token vault
    /// 3. `[writable]` Provider's WHISTLE token account
    /// 4. `[]` Token program
    DeregisterProvider,

    /// Update provider endpoint
    /// Accounts:
    /// 0. `[signer]` Provider
    /// 1. `[writable]` Provider account (PDA)
    UpdateEndpoint {
        new_endpoint: String,
    },

    /// Record provider heartbeat
    /// Accounts:
    /// 0. `[signer]` Provider
    /// 1. `[writable]` Provider account (PDA)
    /// 2. `[]` Clock sysvar
    RecordHeartbeat,

    /// Record query performance metrics
    /// Accounts:
    /// 0. `[signer]` Oracle/Authority
    /// 1. `[writable]` Provider account (PDA)
    RecordQueryMetrics {
        provider: Pubkey,
        latency_ms: u64,
        success: bool,
    },

    /// Update reputation scores
    /// Accounts:
    /// 0. `[signer]` Authority/Oracle
    /// 1. `[writable]` Provider account (PDA)
    UpdateReputationMetrics {
        provider: Pubkey,
        uptime: u64,
        latency: u64,
        accuracy: u64,
    },

    /// Slash provider for violations
    /// Accounts:
    /// 0. `[signer]` Authority
    /// 1. `[writable]` Provider account (PDA)
    /// 2. `[writable]` Payment vault (bonus pool)
    SlashProvider {
        provider: Pubkey,
        penalty: u64,
        reason: SlashReason,
    },

    // ========== PAYMENT INSTRUCTIONS ==========

    /// Process query payment and route to pools
    /// Accounts:
    /// 0. `[writable, signer]` User (payer)
    /// 1. `[writable]` Payment vault (PDA)
    /// 2. `[writable]` Provider account (PDA)
    /// 3. `[writable]` Staking pool
    /// 4. `[]` System program
    ProcessQueryPayment {
        provider: Pubkey,
        query_cost: u64,
    },

    /// Provider claims their earnings (70% share)
    /// Accounts:
    /// 0. `[writable, signer]` Provider
    /// 1. `[writable]` Provider account (PDA)
    /// 2. `[writable]` Payment vault (PDA)
    /// 3. `[]` System program
    ClaimProviderEarnings,

    /// Distribute bonus pool to top 20% providers
    /// Accounts:
    /// 0. `[signer]` Authority/Oracle
    /// 1. `[writable]` Payment vault (PDA)
    /// 2+. `[writable]` Top provider accounts (PDAs)
    DistributeBonusPool {
        top_providers: Vec<Pubkey>,
    },

    /// Distribute staker rewards from 5% pool
    /// Accounts:
    /// 0. `[signer]` Authority
    /// 1. `[writable]` Payment vault (PDA)
    /// 2. `[]` Staking pool (to get total_staked)
    DistributeStakerRewards,

    /// Staker claims their share of rewards
    /// Accounts:
    /// 0. `[writable, signer]` Staker
    /// 1. `[writable]` Staker account (PDA)
    /// 2. `[writable]` Payment vault (PDA)
    /// 3. `[]` System program
    ClaimStakerRewards,

    // ========== QUERY AUTHORIZATION ==========

    /// Authorize query access (check stake + provider status)
    /// Accounts:
    /// 0. `[]` User staker account (PDA)
    /// 1. `[]` Provider account (PDA)
    /// 2. `[]` Staking pool
    AuthorizeQuery {
        user: Pubkey,
        provider: Pubkey,
    },

    /// Record query for metrics
    /// Accounts:
    /// 0. `[signer]` Provider
    /// 1. `[writable]` Provider account (PDA)
    RecordQuery {
        user: Pubkey,
    },
}

// ============= ENTRYPOINT =============

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = StakingInstruction::try_from_slice(instruction_data)?;

    match instruction {
        StakingInstruction::InitializePool {
            min_stake_amount,
            tokens_per_whistle,
            cooldown_period,
        } => initialize_pool(program_id, accounts, min_stake_amount, tokens_per_whistle, cooldown_period),

        StakingInstruction::Stake { amount } => stake(program_id, accounts, amount),

        StakingInstruction::Unstake { amount } => unstake(program_id, accounts, amount),

        StakingInstruction::TransferAccess { access_tokens } => {
            transfer_access(program_id, accounts, access_tokens)
        }

        StakingInstruction::ActivateNodeOperator => {
            activate_node_operator(program_id, accounts)
        }

        StakingInstruction::RecordDataUsage { data_size } => {
            record_data_usage(program_id, accounts, data_size)
        }

        StakingInstruction::SetPoolStatus { is_active } => {
            set_pool_status(program_id, accounts, is_active)
        }

        StakingInstruction::LockRate => {
            lock_rate(program_id, accounts)
        }

        // Provider instructions
        StakingInstruction::InitializePaymentVault => {
            initialize_payment_vault(program_id, accounts)
        }

        StakingInstruction::RegisterProvider { endpoint, bond_amount } => {
            register_provider(program_id, accounts, endpoint, bond_amount)
        }

        StakingInstruction::DeregisterProvider => {
            deregister_provider(program_id, accounts)
        }

        StakingInstruction::UpdateEndpoint { new_endpoint } => {
            update_endpoint(program_id, accounts, new_endpoint)
        }

        StakingInstruction::RecordHeartbeat => {
            record_heartbeat(program_id, accounts)
        }

        StakingInstruction::RecordQueryMetrics { provider, latency_ms, success } => {
            record_query_metrics(program_id, accounts, provider, latency_ms, success)
        }

        StakingInstruction::UpdateReputationMetrics { provider, uptime, latency, accuracy } => {
            update_reputation_metrics(program_id, accounts, provider, uptime, latency, accuracy)
        }

        StakingInstruction::SlashProvider { provider, penalty, reason } => {
            slash_provider(program_id, accounts, provider, penalty, reason)
        }

        // Payment instructions
        StakingInstruction::ProcessQueryPayment { provider, query_cost } => {
            process_query_payment(program_id, accounts, provider, query_cost)
        }

        StakingInstruction::ClaimProviderEarnings => {
            claim_provider_earnings(program_id, accounts)
        }

        StakingInstruction::DistributeBonusPool { top_providers } => {
            distribute_bonus_pool(program_id, accounts, top_providers)
        }

        StakingInstruction::DistributeStakerRewards => {
            distribute_staker_rewards(program_id, accounts)
        }

        StakingInstruction::ClaimStakerRewards => {
            claim_staker_rewards(program_id, accounts)
        }

        // Query authorization
        StakingInstruction::AuthorizeQuery { user, provider } => {
            authorize_query(program_id, accounts, user, provider)
        }

        StakingInstruction::RecordQuery { user } => {
            record_query(program_id, accounts, user)
        }
    }
}

// ============= INSTRUCTION HANDLERS =============

fn initialize_pool(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    min_stake_amount: u64,
    tokens_per_whistle: u64,
    cooldown_period: i64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let authority = next_account_info(account_info_iter)?;
    let pool_account = next_account_info(account_info_iter)?;
    let token_vault = next_account_info(account_info_iter)?;
    let whistle_mint = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    let rent_sysvar = next_account_info(account_info_iter)?;

    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // CRITICAL FIX: Check if pool already initialized
    if !pool_account.data_is_empty() {
        msg!("Pool already initialized - cannot re-initialize");
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    // CRITICAL FIX: Check if vault already exists
    if !token_vault.data_is_empty() {
        msg!("Token vault already exists - cannot re-initialize");
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    // Validate parameters
    if tokens_per_whistle == 0 {
        msg!("Tokens per WHISTLE must be greater than 0");
        return Err(ProgramError::InvalidInstructionData);
    }

    // HIGH SEVERITY FIX: Validate cooldown period is not negative
    if cooldown_period < 0 {
        msg!("Cooldown period cannot be negative");
        return Err(ProgramError::InvalidInstructionData);
    }

    // CRITICAL SECURITY FIX: Validate WHISTLE mint address
    let expected_mint = OFFICIAL_WHISTLE_MINT.parse::<Pubkey>()
        .map_err(|_| ProgramError::InvalidAccountData)?;
    if *whistle_mint.key != expected_mint {
        msg!("Invalid WHISTLE mint address");
        msg!("Expected: {}", OFFICIAL_WHISTLE_MINT);
        msg!("Received: {}", whistle_mint.key);
        return Err(ProgramError::InvalidAccountData);
    }

    // Derive PDA for pool
    let (pool_pda, bump) = Pubkey::find_program_address(
        &[b"staking_pool", authority.key.as_ref()],
        program_id,
    );

    if pool_pda != *pool_account.key {
        msg!("Invalid pool PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // Derive PDA for token vault
    let (vault_pda, vault_bump) = Pubkey::find_program_address(
        &[b"token_vault", authority.key.as_ref()],
        program_id,
    );

    if vault_pda != *token_vault.key {
        msg!("Invalid token vault PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    let rent = Rent::from_account_info(rent_sysvar)?;
    
    // Create pool account
    let pool_space = std::mem::size_of::<StakingPool>();
    let pool_lamports = rent.minimum_balance(pool_space);

    invoke_signed(
        &system_instruction::create_account(
            authority.key,
            pool_account.key,
            pool_lamports,
            pool_space as u64,
            program_id,
        ),
        &[authority.clone(), pool_account.clone(), system_program.clone()],
        &[&[b"staking_pool", authority.key.as_ref(), &[bump]]],
    )?;

    // Create SPL token account for vault
    let token_account_space = 165; // SPL token account size
    let token_account_lamports = rent.minimum_balance(token_account_space);

    invoke_signed(
        &system_instruction::create_account(
            authority.key,
            token_vault.key,
            token_account_lamports,
            token_account_space,
            token_program.key,
        ),
        &[authority.clone(), token_vault.clone(), system_program.clone()],
        &[&[b"token_vault", authority.key.as_ref(), &[vault_bump]]],
    )?;

    // Initialize token account
    invoke(
        &token_instruction::initialize_account(
            token_program.key,
            token_vault.key,
            whistle_mint.key,
            &vault_pda, // Owner is the PDA itself
        )?,
        &[token_vault.clone(), whistle_mint.clone(), token_program.clone()],
    )?;

    let clock = Clock::get()?;
    let pool = StakingPool {
        authority: *authority.key,
        whistle_mint: *whistle_mint.key,
        token_vault: *token_vault.key,
        total_staked: 0,
        total_access_tokens: 0,
        min_stake_amount,
        tokens_per_whistle,
        is_active: true,
        created_at: clock.unix_timestamp,
        cooldown_period,
        max_stake_per_user: MAX_STAKE_PER_USER,
        rate_locked: false,
        bump,
    };

    pool.serialize(&mut &mut pool_account.data.borrow_mut()[..])?;

    msg!("Staking pool initialized with WHISTLE token!");
    msg!("WHISTLE mint: {}", whistle_mint.key);
    msg!("Min stake: {} tokens", min_stake_amount);
    msg!("Access tokens per WHISTLE: {}", tokens_per_whistle);
    msg!("Cooldown period: {} seconds", cooldown_period);

    Ok(())
}

fn stake(program_id: &Pubkey, accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let staker = next_account_info(account_info_iter)?;
    let pool_account = next_account_info(account_info_iter)?;
    let staker_account = next_account_info(account_info_iter)?;
    let staker_token_account = next_account_info(account_info_iter)?;
    let token_vault = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    let clock_sysvar = next_account_info(account_info_iter)?;

    if !staker.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // SECURITY FIX: Zero amount check
    if amount == 0 {
        msg!("Cannot stake zero amount");
        return Err(ProgramError::InvalidInstructionData);
    }

    // Verify pool account is owned by this program
    if pool_account.owner != program_id {
        msg!("Pool account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut pool = StakingPool::try_from_slice(&pool_account.data.borrow())?;

    // SECURITY FIX: Check pool status
    if !pool.is_active {
        msg!("Pool is not active");
        return Err(ProgramError::InvalidAccountData);
    }

    // Verify pool PDA
    let (pool_pda, _) = Pubkey::find_program_address(
        &[b"staking_pool", pool.authority.as_ref()],
        program_id,
    );

    if pool_pda != *pool_account.key {
        msg!("Invalid pool PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // Verify token vault PDA
    let (vault_pda, _) = Pubkey::find_program_address(
        &[b"token_vault", pool.authority.as_ref()],
        program_id,
    );

    if vault_pda != *token_vault.key {
        msg!("Invalid token vault PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // Verify token vault matches pool's configured vault
    if *token_vault.key != pool.token_vault {
        msg!("Token vault does not match pool configuration");
        return Err(ProgramError::InvalidAccountData);
    }

    if amount < pool.min_stake_amount {
        msg!("Stake amount below minimum");
        return Err(ProgramError::InvalidInstructionData);
    }

    // Verify staker PDA
    let (staker_pda, bump) = Pubkey::find_program_address(
        &[b"staker", staker.key.as_ref()],
        program_id,
    );

    if *staker_account.key != staker_pda {
        msg!("Invalid staker PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // HIGH SECURITY FIX: Validate staker's token account
    let staker_token_data = spl_token::state::Account::unpack(&staker_token_account.data.borrow())
        .map_err(|_| {
            msg!("Invalid token account data");
            ProgramError::InvalidAccountData
        })?;
    
    // Verify token account is owned by staker
    if staker_token_data.owner != *staker.key {
        msg!("Token account not owned by staker");
        return Err(ProgramError::InvalidAccountData);
    }
    
    // Verify token account has correct mint (WHISTLE)
    if staker_token_data.mint != pool.whistle_mint {
        msg!("Wrong token mint - must be WHISTLE");
        return Err(ProgramError::InvalidAccountData);
    }
    
    // Verify staker has sufficient balance
    if staker_token_data.amount < amount {
        msg!("Insufficient token balance");
        return Err(ProgramError::InsufficientFunds);
    }

    // Use checked arithmetic to prevent overflow - 1:1 ratio for WHISTLE
    let access_tokens = amount
        .checked_mul(pool.tokens_per_whistle)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    // SECURITY FIX: Ensure user gets at least some tokens
    if access_tokens == 0 {
        msg!("Stake amount too small to generate tokens");
        return Err(ProgramError::InvalidInstructionData);
    }

    // Transfer WHISTLE tokens to vault
    invoke(
        &token_instruction::transfer(
            token_program.key,
            staker_token_account.key,
            token_vault.key,
            staker.key,
            &[],
            amount,
        )?,
        &[
            staker_token_account.clone(),
            token_vault.clone(),
            staker.clone(),
            token_program.clone(),
        ],
    )?;

    let clock = Clock::from_account_info(clock_sysvar)?;

    if staker_account.data_is_empty() {
        // Check max stake limit for new accounts
        if amount > pool.max_stake_per_user {
            msg!("Stake amount exceeds maximum per user");
            return Err(ProgramError::InvalidInstructionData);
        }

        // Initialize new staker account
        let rent = Rent::get()?;
        let space = std::mem::size_of::<StakerAccount>();
        let lamports = rent.minimum_balance(space);

        invoke_signed(
            &system_instruction::create_account(
                staker.key,
                staker_account.key,
                lamports,
                space as u64,
                program_id,
            ),
            &[staker.clone(), staker_account.clone(), system_program.clone()],
            &[&[b"staker", staker.key.as_ref(), &[bump]]],
        )?;

        let staker_data = StakerAccount {
            staker: *staker.key,
            staked_amount: amount,
            access_tokens,
            last_stake_time: clock.unix_timestamp,
            node_operator: false,
            voting_power: access_tokens,
            data_encrypted: 0,
            pending_rewards: 0,
            bump,
        };

        staker_data.serialize(&mut &mut staker_account.data.borrow_mut()[..])?;
    } else {
        // Verify staker account is owned by program
        if staker_account.owner != program_id {
            msg!("Staker account not owned by program");
            return Err(ProgramError::IncorrectProgramId);
        }

        // Update existing staker
        let mut staker_data = StakerAccount::try_from_slice(&staker_account.data.borrow())?;
        
        // Verify ownership
        if staker_data.staker != *staker.key {
            msg!("Staker account does not belong to signer");
            return Err(ProgramError::InvalidAccountData);
        }

        // Check max stake limit
        let new_total = staker_data.staked_amount
            .checked_add(amount)
            .ok_or(ProgramError::ArithmeticOverflow)?;
            
        if new_total > pool.max_stake_per_user {
            msg!("Total stake would exceed maximum per user");
            return Err(ProgramError::InvalidInstructionData);
        }

        staker_data.staked_amount = new_total;
        staker_data.access_tokens = staker_data.access_tokens
            .checked_add(access_tokens)
            .ok_or(ProgramError::ArithmeticOverflow)?;
        staker_data.last_stake_time = clock.unix_timestamp;
        staker_data.voting_power = staker_data.voting_power
            .checked_add(access_tokens)
            .ok_or(ProgramError::ArithmeticOverflow)?;
        
        staker_data.serialize(&mut &mut staker_account.data.borrow_mut()[..])?;
    }

    // Use checked arithmetic for pool updates
    pool.total_staked = pool.total_staked
        .checked_add(amount)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    pool.total_access_tokens = pool.total_access_tokens
        .checked_add(access_tokens)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    pool.serialize(&mut &mut pool_account.data.borrow_mut()[..])?;

    msg!("Staked {} lamports", amount);
    msg!("Minted {} access tokens", access_tokens);

    Ok(())
}

fn unstake(program_id: &Pubkey, accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let staker = next_account_info(account_info_iter)?;
    let pool_account = next_account_info(account_info_iter)?;
    let staker_account = next_account_info(account_info_iter)?;
    let staker_token_account = next_account_info(account_info_iter)?;
    let token_vault = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    let clock_sysvar = next_account_info(account_info_iter)?;

    if !staker.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // SECURITY FIX: Zero amount check
    if amount == 0 {
        msg!("Cannot unstake zero amount");
        return Err(ProgramError::InvalidInstructionData);
    }

    // Verify ownership
    if pool_account.owner != program_id {
        msg!("Pool account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    if staker_account.owner != program_id {
        msg!("Staker account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut pool = StakingPool::try_from_slice(&pool_account.data.borrow())?;
    let mut staker_data = StakerAccount::try_from_slice(&staker_account.data.borrow())?;

    // SECURITY FIX: Check pool status for unstaking
    if !pool.is_active {
        msg!("Pool is paused - unstaking not allowed");
        return Err(ProgramError::InvalidAccountData);
    }

    // Verify pool PDA
    let (pool_pda, _) = Pubkey::find_program_address(
        &[b"staking_pool", pool.authority.as_ref()],
        program_id,
    );

    if pool_pda != *pool_account.key {
        msg!("Invalid pool PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // Verify token vault PDA
    let (vault_pda, vault_bump) = Pubkey::find_program_address(
        &[b"token_vault", pool.authority.as_ref()],
        program_id,
    );

    if vault_pda != *token_vault.key {
        msg!("Invalid token vault PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // HIGH SEVERITY FIX: Validate staker PDA
    let (staker_pda, _) = Pubkey::find_program_address(
        &[b"staker", staker.key.as_ref()],
        program_id,
    );

    if staker_pda != *staker_account.key {
        msg!("Invalid staker PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // Verify staker ownership
    if staker_data.staker != *staker.key {
        msg!("Staker account does not belong to signer");
        return Err(ProgramError::InvalidAccountData);
    }

    // HIGH SECURITY FIX: Validate staker's token account for return transfer
    let staker_token_data = spl_token::state::Account::unpack(&staker_token_account.data.borrow())
        .map_err(|_| {
            msg!("Invalid token account data");
            ProgramError::InvalidAccountData
        })?;
    
    // Verify token account is owned by staker
    if staker_token_data.owner != *staker.key {
        msg!("Token account not owned by staker");
        return Err(ProgramError::InvalidAccountData);
    }
    
    // Verify token account has correct mint (WHISTLE)
    if staker_token_data.mint != pool.whistle_mint {
        msg!("Wrong token mint - must be WHISTLE");
        return Err(ProgramError::InvalidAccountData);
    }

    // Enforce cooldown period
    let clock = Clock::from_account_info(clock_sysvar)?;
    let time_since_stake = clock.unix_timestamp - staker_data.last_stake_time;
    
    if time_since_stake < pool.cooldown_period {
        msg!("Cooldown period not met");
        msg!("Time remaining: {} seconds", pool.cooldown_period - time_since_stake);
        return Err(ProgramError::InvalidInstructionData);
    }

    if staker_data.staked_amount < amount {
        msg!("Insufficient staked amount");
        return Err(ProgramError::InsufficientFunds);
    }

    // SECURITY FIX: Calculate tokens to burn proportionally
    // This fixes the stake_rate overwrite problem
    // Formula: tokens_to_burn = (unstake_amount / total_staked) * total_tokens
    let tokens_to_burn = if staker_data.staked_amount == amount {
        // Unstaking everything - burn all tokens
        staker_data.access_tokens
    } else {
        // Partial unstake - burn proportionally
        staker_data.access_tokens
            .checked_mul(amount)
            .ok_or(ProgramError::ArithmeticOverflow)?
            .checked_div(staker_data.staked_amount)
            .ok_or(ProgramError::ArithmeticOverflow)?
    };

    if staker_data.access_tokens < tokens_to_burn {
        msg!("Insufficient access tokens");
        return Err(ProgramError::InsufficientFunds);
    }

    // HIGH SEVERITY FIX: Token vault balance check handled by SPL token program
    // SPL token transfer will fail automatically if insufficient balance

    // Transfer WHISTLE tokens back from vault using invoke_signed
    invoke_signed(
        &token_instruction::transfer(
            token_program.key,
            token_vault.key,
            staker_token_account.key,
            &vault_pda,
            &[],
            amount,
        )?,
        &[
            token_vault.clone(),
            staker_token_account.clone(),
            token_program.clone(),
        ],
        &[&[b"token_vault", pool.authority.as_ref(), &[vault_bump]]],
    )?;

    // Update staker
    staker_data.staked_amount = staker_data.staked_amount
        .checked_sub(amount)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    staker_data.access_tokens = staker_data.access_tokens
        .checked_sub(tokens_to_burn)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    staker_data.voting_power = staker_data.voting_power
        .checked_sub(tokens_to_burn)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    // SECURITY FIX: Revoke node operator status if stake falls below minimum
    if staker_data.node_operator {
        let min_node_stake = pool.min_stake_amount
            .checked_mul(10)
            .ok_or(ProgramError::ArithmeticOverflow)?;
        
        if staker_data.staked_amount < min_node_stake {
            staker_data.node_operator = false;
            msg!("Node operator status revoked due to insufficient stake");
        }
    }

    staker_data.serialize(&mut &mut staker_account.data.borrow_mut()[..])?;

    // Update pool
    pool.total_staked = pool.total_staked
        .checked_sub(amount)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    pool.total_access_tokens = pool.total_access_tokens
        .checked_sub(tokens_to_burn)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    pool.serialize(&mut &mut pool_account.data.borrow_mut()[..])?;

    msg!("Unstaked {} lamports", amount);
    msg!("Burned {} access tokens", tokens_to_burn);

    Ok(())
}

fn transfer_access(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    access_tokens: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let owner = next_account_info(account_info_iter)?;
    let from_account = next_account_info(account_info_iter)?;
    let to_account = next_account_info(account_info_iter)?;
    let pool_account = next_account_info(account_info_iter)?;
    let to_staker_pubkey = next_account_info(account_info_iter)?; // CRITICAL FIX: Added recipient pubkey

    if !owner.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // SECURITY FIX: Validate zero amount
    if access_tokens == 0 {
        msg!("Cannot transfer zero tokens");
        return Err(ProgramError::InvalidInstructionData);
    }

    // SECURITY FIX: Better check ordering - check empty first for better error message
    if to_account.data_is_empty() {
        msg!("Recipient must stake before receiving delegated tokens");
        msg!("This ensures all token holders have skin in the game");
        return Err(ProgramError::InvalidAccountData);
    }

    // Verify ownership
    if from_account.owner != program_id {
        msg!("From account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    if pool_account.owner != program_id {
        msg!("Pool account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    if to_account.owner != program_id {
        msg!("To account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    // CRITICAL FIX: Verify sender PDA matches expected staker
    let (from_staker_pda, _) = Pubkey::find_program_address(
        &[b"staker", owner.key.as_ref()],
        program_id,
    );

    if from_staker_pda != *from_account.key {
        msg!("Invalid sender staker PDA");
        msg!("From account does not match expected PDA for sender");
        return Err(ProgramError::InvalidSeeds);
    }

    // CRITICAL FIX: Verify recipient PDA matches expected staker
    let (to_staker_pda, _) = Pubkey::find_program_address(
        &[b"staker", to_staker_pubkey.key.as_ref()],
        program_id,
    );

    if to_staker_pda != *to_account.key {
        msg!("Invalid recipient staker PDA");
        msg!("To account does not match expected PDA for recipient");
        return Err(ProgramError::InvalidSeeds);
    }

    let mut from_data = StakerAccount::try_from_slice(&from_account.data.borrow())?;
    let mut to_data = StakerAccount::try_from_slice(&to_account.data.borrow())?;
    let pool = StakingPool::try_from_slice(&pool_account.data.borrow())?;

    // SECURITY FIX: Check pool status
    if !pool.is_active {
        msg!("Pool is paused - transfers not allowed");
        return Err(ProgramError::InvalidAccountData);
    }

    if from_data.staker != *owner.key {
        msg!("Not the owner");
        return Err(ProgramError::InvalidAccountData);
    }

    if from_data.access_tokens < access_tokens {
        msg!("Insufficient access tokens");
        return Err(ProgramError::InsufficientFunds);
    }

    // SECURITY FIX: Recipient must have minimum stake
    if to_data.staked_amount < pool.min_stake_amount {
        msg!("Recipient must have at least minimum stake to receive tokens");
        msg!("Required: {} lamports", pool.min_stake_amount);
        return Err(ProgramError::InvalidAccountData);
    }

    // CRITICAL FIX: Additional verification - ensure to_data.staker matches provided pubkey
    if to_data.staker != *to_staker_pubkey.key {
        msg!("Recipient account staker field does not match provided pubkey");
        return Err(ProgramError::InvalidAccountData);
    }

    // Transfer tokens (note: this is NOT a sale, just delegation)
    from_data.access_tokens = from_data.access_tokens
        .checked_sub(access_tokens)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    from_data.voting_power = from_data.voting_power
        .checked_sub(access_tokens)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    
    to_data.access_tokens = to_data.access_tokens
        .checked_add(access_tokens)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    to_data.voting_power = to_data.voting_power
        .checked_add(access_tokens)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    from_data.serialize(&mut &mut from_account.data.borrow_mut()[..])?;
    to_data.serialize(&mut &mut to_account.data.borrow_mut()[..])?;

    msg!("Transferred {} access tokens", access_tokens);
    msg!("From: {}", from_data.staker);
    msg!("To: {}", to_data.staker);
    msg!("This is a delegation, not a sale!");

    Ok(())
}

fn activate_node_operator(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let staker = next_account_info(account_info_iter)?;
    let staker_account = next_account_info(account_info_iter)?;
    let pool_account = next_account_info(account_info_iter)?;

    if !staker.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Verify ownership
    if staker_account.owner != program_id {
        msg!("Staker account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    if pool_account.owner != program_id {
        msg!("Pool account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    // SECURITY FIX: Validate staker PDA
    let (staker_pda, _) = Pubkey::find_program_address(
        &[b"staker", staker.key.as_ref()],
        program_id,
    );

    if staker_pda != *staker_account.key {
        msg!("Invalid staker PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    let mut staker_data = StakerAccount::try_from_slice(&staker_account.data.borrow())?;
    let pool = StakingPool::try_from_slice(&pool_account.data.borrow())?;

    // SECURITY FIX: Check pool status
    if !pool.is_active {
        msg!("Pool is paused - cannot activate node operator");
        return Err(ProgramError::InvalidAccountData);
    }

    // Verify staker ownership
    if staker_data.staker != *staker.key {
        msg!("Staker account does not belong to signer");
        return Err(ProgramError::InvalidAccountData);
    }

    // SECURITY FIX: Require minimum ACTUAL STAKE, not just tokens
    // This prevents node operator status through delegation alone
    let min_node_stake = pool.min_stake_amount
        .checked_mul(10)
        .ok_or(ProgramError::ArithmeticOverflow)?;
        
    if staker_data.staked_amount < min_node_stake {
        msg!("Insufficient STAKE to become node operator");
        msg!("Required: {} lamports staked", min_node_stake);
        msg!("Current: {} lamports staked", staker_data.staked_amount);
        msg!("Note: Delegated tokens do not count - you must have actual stake");
        return Err(ProgramError::InsufficientFunds);
    }

    staker_data.node_operator = true;
    staker_data.serialize(&mut &mut staker_account.data.borrow_mut()[..])?;

    msg!("Node operator status activated!");
    msg!("Can now run encrypted data routing nodes");

    Ok(())
}

fn record_data_usage(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data_size: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let node_operator = next_account_info(account_info_iter)?;
    let staker_account = next_account_info(account_info_iter)?;

    if !node_operator.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // SECURITY FIX: Zero data size check
    if data_size == 0 {
        msg!("Cannot record zero data size");
        return Err(ProgramError::InvalidInstructionData);
    }

    // Verify ownership
    if staker_account.owner != program_id {
        msg!("Staker account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    // SECURITY FIX: Validate staker PDA
    let (staker_pda, _) = Pubkey::find_program_address(
        &[b"staker", node_operator.key.as_ref()],
        program_id,
    );

    if staker_pda != *staker_account.key {
        msg!("Invalid staker PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    let mut staker_data = StakerAccount::try_from_slice(&staker_account.data.borrow())?;

    // Verify staker ownership
    if staker_data.staker != *node_operator.key {
        msg!("Staker account does not belong to signer");
        return Err(ProgramError::InvalidAccountData);
    }

    if !staker_data.node_operator {
        msg!("Not a node operator");
        return Err(ProgramError::InvalidAccountData);
    }

    // NOTE: In production, this should require oracle/verifier signatures
    // to prevent self-reporting abuse. Consider implementing a challenge-response
    // system or requiring co-signatures from other nodes.

    // Record encrypted data handled
    staker_data.data_encrypted = staker_data.data_encrypted
        .checked_add(data_size)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    staker_data.serialize(&mut &mut staker_account.data.borrow_mut()[..])?;

    msg!("Recorded {} bytes of encrypted data", data_size);

    Ok(())
}

fn set_pool_status(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    is_active: bool,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let authority = next_account_info(account_info_iter)?;
    let pool_account = next_account_info(account_info_iter)?;

    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Verify ownership
    if pool_account.owner != program_id {
        msg!("Pool account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut pool = StakingPool::try_from_slice(&pool_account.data.borrow())?;

    // Verify authority
    if pool.authority != *authority.key {
        msg!("Not the pool authority");
        return Err(ProgramError::InvalidAccountData);
    }

    // SECURITY FIX: Validate pool PDA
    let (pool_pda, _) = Pubkey::find_program_address(
        &[b"staking_pool", pool.authority.as_ref()],
        program_id,
    );

    if pool_pda != *pool_account.key {
        msg!("Invalid pool PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    pool.is_active = is_active;
    pool.serialize(&mut &mut pool_account.data.borrow_mut()[..])?;

    msg!("Pool status set to: {}", is_active);

    Ok(())
}

fn lock_rate(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let authority = next_account_info(account_info_iter)?;
    let pool_account = next_account_info(account_info_iter)?;

    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Verify ownership
    if pool_account.owner != program_id {
        msg!("Pool account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut pool = StakingPool::try_from_slice(&pool_account.data.borrow())?;

    // Verify authority
    if pool.authority != *authority.key {
        msg!("Not the pool authority");
        return Err(ProgramError::InvalidAccountData);
    }

    // SECURITY FIX: Validate pool PDA
    let (pool_pda, _) = Pubkey::find_program_address(
        &[b"staking_pool", pool.authority.as_ref()],
        program_id,
    );

    if pool_pda != *pool_account.key {
        msg!("Invalid pool PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    if pool.rate_locked {
        msg!("Rate is already locked");
        return Err(ProgramError::InvalidAccountData);
    }

    pool.rate_locked = true;
    pool.serialize(&mut &mut pool_account.data.borrow_mut()[..])?;

    msg!("Token rate permanently locked at: {} tokens per SOL", pool.tokens_per_sol);
    msg!("Rate can no longer be changed - protects against manipulation");

    Ok(())
}

// ============= HELPER FUNCTIONS =============

pub fn get_access_tier(access_tokens: u64) -> AccessTier {
    if access_tokens >= 10001 {
        AccessTier::Elite
    } else if access_tokens >= 1001 {
        AccessTier::Premium
    } else {
        AccessTier::Basic
    }
}

// ============= NEW HANDLER FUNCTIONS =============

// Initialize payment vault for query payments
fn initialize_payment_vault(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let authority = next_account_info(account_info_iter)?;
    let payment_vault_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    let rent_sysvar = next_account_info(account_info_iter)?;

    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if !payment_vault_account.data_is_empty() {
        msg!("Payment vault already initialized");
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    let (vault_pda, bump) = Pubkey::find_program_address(
        &[b"payment_vault", authority.key.as_ref()],
        program_id,
    );

    if vault_pda != *payment_vault_account.key {
        msg!("Invalid payment vault PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    let rent = Rent::from_account_info(rent_sysvar)?;
    let space = std::mem::size_of::<PaymentVault>();
    let lamports = rent.minimum_balance(space);

    invoke_signed(
        &system_instruction::create_account(
            authority.key,
            payment_vault_account.key,
            lamports,
            space as u64,
            program_id,
        ),
        &[authority.clone(), payment_vault_account.clone(), system_program.clone()],
        &[&[b"payment_vault", authority.key.as_ref(), &[bump]]],
    )?;

    let clock = Clock::get()?;
    let vault = PaymentVault {
        authority: *authority.key,
        total_collected: 0,
        provider_pool: 0,
        bonus_pool: 0,
        treasury: 0,
        staker_rewards_pool: 0,
        last_distribution: clock.unix_timestamp,
        bump,
    };

    vault.serialize(&mut &mut payment_vault_account.data.borrow_mut()[..])?;

    msg!("Payment vault initialized!");
    Ok(())
}

// Register a new provider
fn register_provider(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    endpoint: String,
    bond_amount: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let provider = next_account_info(account_info_iter)?;
    let provider_account = next_account_info(account_info_iter)?;
    let provider_token_account = next_account_info(account_info_iter)?;
    let token_vault = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    let clock_sysvar = next_account_info(account_info_iter)?;

    if !provider.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if bond_amount < MIN_PROVIDER_BOND {
        msg!("Minimum bond is {} WHISTLE tokens", MIN_PROVIDER_BOND);
        return Err(ProgramError::InvalidInstructionData);
    }

    // SECURITY FIX: Validate endpoint length (min and max)
    if endpoint.len() < MIN_ENDPOINT_LENGTH || endpoint.len() > MAX_ENDPOINT_LENGTH {
        msg!("Endpoint URL invalid length (min: {}, max: {})", MIN_ENDPOINT_LENGTH, MAX_ENDPOINT_LENGTH);
        return Err(ProgramError::InvalidInstructionData);
    }

    let (provider_pda, bump) = Pubkey::find_program_address(
        &[b"provider", provider.key.as_ref()],
        program_id,
    );

    if provider_pda != *provider_account.key {
        msg!("Invalid provider PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // MEDIUM SECURITY FIX: Check if provider already registered
    if !provider_account.data_is_empty() {
        msg!("Provider already registered");
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    // Transfer bond to vault
    invoke(
        &token_instruction::transfer(
            token_program.key,
            provider_token_account.key,
            token_vault.key,
            provider.key,
            &[],
            bond_amount,
        )?,
        &[
            provider_token_account.clone(),
            token_vault.clone(),
            provider.clone(),
            token_program.clone(),
        ],
    )?;

    // Create provider account
    let rent = Rent::get()?;
    // CRITICAL SECURITY FIX: Correct space calculation for ProviderAccount with dynamic String
    // ProviderAccount fields: provider(32) + registered_at(8) + is_active(1) + stake_bond(8) +
    // total_earned(8) + pending_earnings(8) + queries_served(8) + reputation_score(8) +
    // uptime_percentage(8) + response_time_avg(8) + accuracy_score(8) + last_heartbeat(8) +
    // slashed_amount(8) + penalty_count(4) + bump(1)
    // = 32 + 8 + 1 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 4 + 1 = 122 bytes
    // String in Borsh: 4 bytes (length) + actual string bytes
    let base_size = 122;
    let space = base_size + 4 + endpoint.len(); // +4 for Borsh String length prefix
    let lamports = rent.minimum_balance(space);

    invoke_signed(
        &system_instruction::create_account(
            provider.key,
            provider_account.key,
            lamports,
            space as u64,
            program_id,
        ),
        &[provider.clone(), provider_account.clone(), system_program.clone()],
        &[&[b"provider", provider.key.as_ref(), &[bump]]],
    )?;

    let clock = Clock::from_account_info(clock_sysvar)?;
    let provider_data = ProviderAccount {
        provider: *provider.key,
        endpoint,
        registered_at: clock.unix_timestamp,
        is_active: true,
        stake_bond: bond_amount,
        total_earned: 0,
        pending_earnings: 0,
        queries_served: 0,
        reputation_score: 10000, // Start with perfect score
        uptime_percentage: 10000,
        response_time_avg: 100, // 100ms default
        accuracy_score: 10000,
        last_heartbeat: clock.unix_timestamp,
        slashed_amount: 0,
        penalty_count: 0,
        bump,
    };

    provider_data.serialize(&mut &mut provider_account.data.borrow_mut()[..])?;

    msg!("Provider registered: {}", provider.key);
    msg!("Endpoint: {}", provider_data.endpoint);
    msg!("Bond: {} WHISTLE", bond_amount);

    Ok(())
}

// Deregister provider and return bond
fn deregister_provider(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let provider = next_account_info(account_info_iter)?;
    let provider_account = next_account_info(account_info_iter)?;
    let pool_account = next_account_info(account_info_iter)?;
    let token_vault = next_account_info(account_info_iter)?;
    let provider_token_account = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;

    if !provider.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if provider_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    if pool_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let provider_data = ProviderAccount::try_from_slice(&provider_account.data.borrow())?;
    let pool = StakingPool::try_from_slice(&pool_account.data.borrow())?;

    if provider_data.provider != *provider.key {
        msg!("Not the provider owner");
        return Err(ProgramError::InvalidAccountData);
    }

    if provider_data.pending_earnings > 0 {
        msg!("Must claim earnings before deregistering");
        return Err(ProgramError::InvalidAccountData);
    }

    // Return bond minus any slashed amount
    let bond_to_return = provider_data.stake_bond
        .checked_sub(provider_data.slashed_amount)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    if bond_to_return > 0 {
        // CRITICAL SECURITY FIX: Use pool authority for vault PDA (shared vault for all)
        let (vault_pda, vault_bump) = Pubkey::find_program_address(
            &[b"token_vault", pool.authority.as_ref()],
            program_id,
        );

        if vault_pda != *token_vault.key {
            msg!("Invalid token vault PDA");
            return Err(ProgramError::InvalidSeeds);
        }

        invoke_signed(
            &token_instruction::transfer(
                token_program.key,
                token_vault.key,
                provider_token_account.key,
                &vault_pda,
                &[],
                bond_to_return,
            )?,
            &[
                token_vault.clone(),
                provider_token_account.clone(),
                token_program.clone(),
            ],
            &[&[b"token_vault", pool.authority.as_ref(), &[vault_bump]]],
        )?;
    }

    msg!("Provider deregistered: {}", provider.key);
    msg!("Bond returned: {} WHISTLE", bond_to_return);

    Ok(())
}

// Update provider endpoint
fn update_endpoint(program_id: &Pubkey, accounts: &[AccountInfo], new_endpoint: String) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let provider = next_account_info(account_info_iter)?;
    let provider_account = next_account_info(account_info_iter)?;

    if !provider.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if provider_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut provider_data = ProviderAccount::try_from_slice(&provider_account.data.borrow())?;

    if provider_data.provider != *provider.key {
        return Err(ProgramError::InvalidAccountData);
    }

    // SECURITY FIX: Validate endpoint length (min and max)
    if new_endpoint.len() < MIN_ENDPOINT_LENGTH || new_endpoint.len() > MAX_ENDPOINT_LENGTH {
        msg!("Endpoint URL invalid length (min: {}, max: {})", MIN_ENDPOINT_LENGTH, MAX_ENDPOINT_LENGTH);
        return Err(ProgramError::InvalidInstructionData);
    }

    provider_data.endpoint = new_endpoint.clone();
    provider_data.serialize(&mut &mut provider_account.data.borrow_mut()[..])?;

    msg!("Provider endpoint updated: {}", new_endpoint);
    Ok(())
}

// Record provider heartbeat
fn record_heartbeat(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let provider = next_account_info(account_info_iter)?;
    let provider_account = next_account_info(account_info_iter)?;
    let clock_sysvar = next_account_info(account_info_iter)?;

    if !provider.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if provider_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut provider_data = ProviderAccount::try_from_slice(&provider_account.data.borrow())?;

    if provider_data.provider != *provider.key {
        return Err(ProgramError::InvalidAccountData);
    }

    let clock = Clock::from_account_info(clock_sysvar)?;
    
    // MEDIUM SECURITY FIX: Rate limit heartbeats to prevent spam
    let time_since_last_heartbeat = clock.unix_timestamp - provider_data.last_heartbeat;
    if time_since_last_heartbeat < MIN_HEARTBEAT_INTERVAL {
        msg!("Heartbeat rate limit exceeded - minimum interval: {} seconds", MIN_HEARTBEAT_INTERVAL);
        return Err(ProgramError::InvalidInstructionData);
    }
    
    provider_data.last_heartbeat = clock.unix_timestamp;
    provider_data.serialize(&mut &mut provider_account.data.borrow_mut()[..])?;

    msg!("Provider heartbeat recorded at {}", clock.unix_timestamp);
    Ok(())
}

// Record query metrics
fn record_query_metrics(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    _provider: Pubkey,
    latency_ms: u64,
    success: bool,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let authority = next_account_info(account_info_iter)?;
    let provider_account = next_account_info(account_info_iter)?;

    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if provider_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut provider_data = ProviderAccount::try_from_slice(&provider_account.data.borrow())?;

    // Update rolling average for response time
    if success {
        provider_data.response_time_avg = (provider_data.response_time_avg + latency_ms) / 2;
    }

    provider_data.serialize(&mut &mut provider_account.data.borrow_mut()[..])?;

    Ok(())
}

// Update reputation metrics
fn update_reputation_metrics(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    _provider: Pubkey,
    uptime: u64,
    latency: u64,
    accuracy: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let authority = next_account_info(account_info_iter)?;
    let provider_account = next_account_info(account_info_iter)?;

    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if provider_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut provider_data = ProviderAccount::try_from_slice(&provider_account.data.borrow())?;

    provider_data.uptime_percentage = uptime;
    provider_data.response_time_avg = latency;
    provider_data.accuracy_score = accuracy;

    // Calculate reputation: (uptime × 0.4) + (speed × 0.3) + (accuracy × 0.3)
    // All values are in basis points (0-10000)
    let uptime_score = uptime.checked_mul(40).ok_or(ProgramError::ArithmeticOverflow)? / 100;
    let speed_score = if latency > 0 {
        // Lower latency = higher score (inverted, capped at 10000)
        let speed = 10000u64.saturating_sub(latency.min(10000));
        speed.checked_mul(30).ok_or(ProgramError::ArithmeticOverflow)? / 100
    } else {
        3000 // Perfect score
    };
    let accuracy_score = accuracy.checked_mul(30).ok_or(ProgramError::ArithmeticOverflow)? / 100;

    provider_data.reputation_score = uptime_score
        .checked_add(speed_score).ok_or(ProgramError::ArithmeticOverflow)?
        .checked_add(accuracy_score).ok_or(ProgramError::ArithmeticOverflow)?;

    provider_data.serialize(&mut &mut provider_account.data.borrow_mut()[..])?;

    msg!("Reputation updated: {}", provider_data.reputation_score);
    Ok(())
}

// Slash provider for violations
fn slash_provider(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    _provider: Pubkey,
    penalty: u64,
    reason: SlashReason,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let authority = next_account_info(account_info_iter)?;
    let provider_account = next_account_info(account_info_iter)?;
    let payment_vault = next_account_info(account_info_iter)?;

    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if provider_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    if payment_vault.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut provider_data = ProviderAccount::try_from_slice(&provider_account.data.borrow())?;
    let mut vault_data = PaymentVault::try_from_slice(&payment_vault.data.borrow())?;

    // Check if provider has enough bond
    if provider_data.stake_bond < provider_data.slashed_amount + penalty {
        msg!("Insufficient bond to slash");
        return Err(ProgramError::InsufficientFunds);
    }

    provider_data.slashed_amount = provider_data.slashed_amount
        .checked_add(penalty)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    provider_data.penalty_count = provider_data.penalty_count
        .checked_add(1)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    // Add slashed amount to bonus pool
    vault_data.bonus_pool = vault_data.bonus_pool
        .checked_add(penalty)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    // Deactivate if bond depleted
    if provider_data.slashed_amount >= provider_data.stake_bond {
        provider_data.is_active = false;
        msg!("Provider deactivated due to insufficient bond");
    }

    provider_data.serialize(&mut &mut provider_account.data.borrow_mut()[..])?;
    vault_data.serialize(&mut &mut payment_vault.data.borrow_mut()[..])?;

    msg!("Provider slashed {} for {:?}", penalty, reason);
    Ok(())
}
// Process query payment and route to pools (70/20/5/5)
fn process_query_payment(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    provider: Pubkey,
    query_cost: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let user = next_account_info(account_info_iter)?;
    let payment_vault = next_account_info(account_info_iter)?;
    let provider_account = next_account_info(account_info_iter)?;
    let staking_pool = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    if !user.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if payment_vault.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    if provider_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut vault_data = PaymentVault::try_from_slice(&payment_vault.data.borrow())?;
    let mut provider_data = ProviderAccount::try_from_slice(&provider_account.data.borrow())?;

    // SECURITY FIX: Verify payment vault PDA
    let (vault_pda, _) = Pubkey::find_program_address(
        &[b"payment_vault", vault_data.authority.as_ref()],
        program_id,
    );
    if vault_pda != *payment_vault.key {
        msg!("Invalid payment vault PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // SECURITY FIX: Verify provider PDA
    let (provider_pda, _) = Pubkey::find_program_address(
        &[b"provider", provider.as_ref()],
        program_id,
    );
    if provider_pda != *provider_account.key {
        msg!("Invalid provider PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    if provider_data.provider != provider {
        msg!("Provider mismatch");
        return Err(ProgramError::InvalidAccountData);
    }

    if !provider_data.is_active {
        msg!("Provider is not active");
        return Err(ProgramError::InvalidAccountData);
    }

    // SECURITY FIX: Validate query cost is reasonable
    if query_cost == 0 || query_cost > 1_000_000_000 { // Max 1 SOL per query
        msg!("Invalid query cost");
        return Err(ProgramError::InvalidInstructionData);
    }

    // Transfer SOL from user to payment vault
    invoke(
        &system_instruction::transfer(user.key, payment_vault.key, query_cost),
        &[user.clone(), payment_vault.clone(), system_program.clone()],
    )?;

    // Split payment: 70/20/5/5
    let provider_share = query_cost.checked_mul(70).ok_or(ProgramError::ArithmeticOverflow)? / 100;
    let bonus_share = query_cost.checked_mul(20).ok_or(ProgramError::ArithmeticOverflow)? / 100;
    let treasury_share = query_cost.checked_mul(5).ok_or(ProgramError::ArithmeticOverflow)? / 100;
    let staker_share = query_cost
        .checked_sub(provider_share)
        .ok_or(ProgramError::ArithmeticOverflow)?
        .checked_sub(bonus_share)
        .ok_or(ProgramError::ArithmeticOverflow)?
        .checked_sub(treasury_share)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    // Update vault pools
    vault_data.total_collected = vault_data.total_collected
        .checked_add(query_cost)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    vault_data.provider_pool = vault_data.provider_pool
        .checked_add(provider_share)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    vault_data.bonus_pool = vault_data.bonus_pool
        .checked_add(bonus_share)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    vault_data.treasury = vault_data.treasury
        .checked_add(treasury_share)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    vault_data.staker_rewards_pool = vault_data.staker_rewards_pool
        .checked_add(staker_share)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    // Credit provider
    provider_data.pending_earnings = provider_data.pending_earnings
        .checked_add(provider_share)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    provider_data.total_earned = provider_data.total_earned
        .checked_add(provider_share)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    provider_data.queries_served = provider_data.queries_served
        .checked_add(1)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    vault_data.serialize(&mut &mut payment_vault.data.borrow_mut()[..])?;
    provider_data.serialize(&mut &mut provider_account.data.borrow_mut()[..])?;

    msg!("Query payment processed: {} SOL", query_cost);
    msg!("Provider earned: {} SOL", provider_share);

    Ok(())
}

// Provider claims earnings
fn claim_provider_earnings(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let provider = next_account_info(account_info_iter)?;
    let provider_account = next_account_info(account_info_iter)?;
    let payment_vault = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    if !provider.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if provider_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    if payment_vault.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut provider_data = ProviderAccount::try_from_slice(&provider_account.data.borrow())?;
    let mut vault_data = PaymentVault::try_from_slice(&payment_vault.data.borrow())?;

    // HIGH SECURITY FIX: Verify payment vault PDA
    let (vault_pda, _) = Pubkey::find_program_address(
        &[b"payment_vault", vault_data.authority.as_ref()],
        program_id,
    );
    if vault_pda != *payment_vault.key {
        msg!("Invalid payment vault PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    if provider_data.provider != *provider.key {
        return Err(ProgramError::InvalidAccountData);
    }

    if provider_data.pending_earnings == 0 {
        msg!("No earnings to claim");
        return Err(ProgramError::InvalidAccountData);
    }

    let amount = provider_data.pending_earnings;

    // Transfer SOL from vault to provider
    **payment_vault.try_borrow_mut_lamports()? -= amount;
    **provider.try_borrow_mut_lamports()? += amount;

    // Update provider earnings
    provider_data.pending_earnings = 0;
    vault_data.provider_pool = vault_data.provider_pool
        .checked_sub(amount)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    provider_data.serialize(&mut &mut provider_account.data.borrow_mut()[..])?;
    vault_data.serialize(&mut &mut payment_vault.data.borrow_mut()[..])?;

    msg!("Provider claimed {} SOL", amount);
    Ok(())
}

// Distribute bonus pool to top providers
fn distribute_bonus_pool(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    top_providers: Vec<Pubkey>,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let authority = next_account_info(account_info_iter)?;
    let payment_vault = next_account_info(account_info_iter)?;

    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if payment_vault.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut vault_data = PaymentVault::try_from_slice(&payment_vault.data.borrow())?;

    // HIGH SECURITY FIX: Verify authority is the vault authority
    if vault_data.authority != *authority.key {
        msg!("Unauthorized: not vault authority");
        return Err(ProgramError::InvalidAccountData);
    }

    if vault_data.bonus_pool == 0 {
        msg!("Bonus pool is empty");
        return Ok(());
    }

    if top_providers.is_empty() {
        msg!("No providers to distribute to");
        return Ok(());
    }

    // HIGH SECURITY FIX: Limit maximum providers to prevent DoS
    if top_providers.len() > 100 {
        msg!("Too many providers (max: 100)");
        return Err(ProgramError::InvalidInstructionData);
    }

    // HIGH SECURITY FIX: Check for duplicate providers in the list
    let mut unique_providers = std::collections::HashSet::new();
    for provider in &top_providers {
        if !unique_providers.insert(provider) {
            msg!("Duplicate provider in distribution list");
            return Err(ProgramError::InvalidInstructionData);
        }
    }

    // Calculate total reputation of top providers
    let mut total_reputation: u64 = 0;
    let mut provider_accounts = Vec::new();

    for _ in 0..top_providers.len() {
        let provider_account = next_account_info(account_info_iter)?;
        if provider_account.owner != program_id {
            continue;
        }
        let provider_data = ProviderAccount::try_from_slice(&provider_account.data.borrow())?;
        total_reputation = total_reputation
            .checked_add(provider_data.reputation_score)
            .ok_or(ProgramError::ArithmeticOverflow)?;
        provider_accounts.push((provider_account, provider_data));
    }

    if total_reputation == 0 {
        return Ok(());
    }

    let bonus_pool = vault_data.bonus_pool;
    let mut total_distributed: u64 = 0;

    // Distribute proportionally by reputation
    for (provider_account, mut provider_data) in provider_accounts {
        // HIGH SECURITY FIX: Verify provider PDA
        let (provider_pda, _) = Pubkey::find_program_address(
            &[b"provider", provider_data.provider.as_ref()],
            program_id,
        );
        if provider_pda != *provider_account.key {
            msg!("Invalid provider PDA - skipping");
            continue; // Skip invalid provider rather than fail entire distribution
        }

        let share = bonus_pool
            .checked_mul(provider_data.reputation_score)
            .ok_or(ProgramError::ArithmeticOverflow)?
            .checked_div(total_reputation)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        provider_data.pending_earnings = provider_data.pending_earnings
            .checked_add(share)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        total_distributed = total_distributed
            .checked_add(share)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        provider_data.serialize(&mut &mut provider_account.data.borrow_mut()[..])?;
    }

    // HIGH SECURITY FIX: Ensure bonus pool is properly decremented
    vault_data.bonus_pool = vault_data.bonus_pool
        .checked_sub(total_distributed)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    let clock = Clock::get()?;
    vault_data.last_distribution = clock.unix_timestamp;
    vault_data.serialize(&mut &mut payment_vault.data.borrow_mut()[..])?;

    msg!("Bonus pool distributed: {} SOL", bonus_pool);
    Ok(())
}

// Distribute staker rewards
fn distribute_staker_rewards(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let authority = next_account_info(account_info_iter)?;
    let payment_vault = next_account_info(account_info_iter)?;
    let staking_pool = next_account_info(account_info_iter)?;

    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if payment_vault.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    if staking_pool.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let vault_data = PaymentVault::try_from_slice(&payment_vault.data.borrow())?;
    let pool = StakingPool::try_from_slice(&staking_pool.data.borrow())?;

    if vault_data.staker_rewards_pool == 0 {
        msg!("No staker rewards to distribute");
        return Ok(());
    }

    if pool.total_staked == 0 {
        msg!("No stakers to distribute to");
        return Ok(());
    }

    // Stakers will claim their proportional share individually via ClaimStakerRewards
    msg!("Staker rewards pool ready for distribution: {} SOL", vault_data.staker_rewards_pool);
    Ok(())
}

// Staker claims their share of rewards
fn claim_staker_rewards(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let staker = next_account_info(account_info_iter)?;
    let staker_account = next_account_info(account_info_iter)?;
    let staking_pool = next_account_info(account_info_iter)?;
    let payment_vault = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    if !staker.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if staker_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    if staking_pool.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    if payment_vault.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut staker_data = StakerAccount::try_from_slice(&staker_account.data.borrow())?;
    let pool = StakingPool::try_from_slice(&staking_pool.data.borrow())?;
    let mut vault_data = PaymentVault::try_from_slice(&payment_vault.data.borrow())?;

    // HIGH SECURITY FIX: Verify payment vault PDA
    let (vault_pda, _) = Pubkey::find_program_address(
        &[b"payment_vault", vault_data.authority.as_ref()],
        program_id,
    );
    if vault_pda != *payment_vault.key {
        msg!("Invalid payment vault PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    if staker_data.staker != *staker.key {
        return Err(ProgramError::InvalidAccountData);
    }

    // MEDIUM SECURITY FIX: Calculate proportional reward based on stake
    // If staker has no pending_rewards calculated yet, calculate from pool
    let amount = if staker_data.pending_rewards > 0 {
        staker_data.pending_rewards
    } else if pool.total_staked > 0 && vault_data.staker_rewards_pool > 0 {
        // Calculate proportional share: (staker_amount / total_staked) * staker_rewards_pool
        let share = (staker_data.staked_amount as u128)
            .checked_mul(vault_data.staker_rewards_pool as u128)
            .ok_or(ProgramError::ArithmeticOverflow)?
            .checked_div(pool.total_staked as u128)
            .ok_or(ProgramError::ArithmeticOverflow)?;
        
        u64::try_from(share).map_err(|_| ProgramError::ArithmeticOverflow)?
    } else {
        msg!("No rewards to claim");
        return Ok(());
    };

    if amount == 0 {
        msg!("No rewards to claim");
        return Ok(());
    }

    // Transfer SOL from vault to staker
    **payment_vault.try_borrow_mut_lamports()? -= amount;
    **staker.try_borrow_mut_lamports()? += amount;

    staker_data.pending_rewards = 0;
    vault_data.staker_rewards_pool = vault_data.staker_rewards_pool
        .checked_sub(amount)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    staker_data.serialize(&mut &mut staker_account.data.borrow_mut()[..])?;
    vault_data.serialize(&mut &mut payment_vault.data.borrow_mut()[..])?;

    msg!("Staker claimed {} SOL in rewards", amount);
    Ok(())
}

// Authorize query
fn authorize_query(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    user: Pubkey,
    provider: Pubkey,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let staker_account = next_account_info(account_info_iter)?;
    let provider_account = next_account_info(account_info_iter)?;
    let staking_pool = next_account_info(account_info_iter)?;

    if staker_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    if provider_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    if staking_pool.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let staker_data = StakerAccount::try_from_slice(&staker_account.data.borrow())?;
    let provider_data = ProviderAccount::try_from_slice(&provider_account.data.borrow())?;
    let pool = StakingPool::try_from_slice(&staking_pool.data.borrow())?;

    // SECURITY FIX: Verify staker PDA
    let (staker_pda, _) = Pubkey::find_program_address(
        &[b"staker", user.as_ref()],
        program_id,
    );
    if staker_pda != *staker_account.key {
        msg!("Invalid staker PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // SECURITY FIX: Verify provider PDA
    let (provider_pda, _) = Pubkey::find_program_address(
        &[b"provider", provider.as_ref()],
        program_id,
    );
    if provider_pda != *provider_account.key {
        msg!("Invalid provider PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    // Check user has staked
    if staker_data.staker != user {
        msg!("User mismatch");
        return Err(ProgramError::InvalidAccountData);
    }

    if staker_data.staked_amount == 0 {
        msg!("User has no stake");
        return Err(ProgramError::InvalidAccountData);
    }

    if staker_data.access_tokens == 0 {
        msg!("User has no access tokens");
        return Err(ProgramError::InvalidAccountData);
    }

    // Check provider is active
    if provider_data.provider != provider {
        msg!("Provider mismatch");
        return Err(ProgramError::InvalidAccountData);
    }

    if !provider_data.is_active {
        msg!("Provider is not active");
        return Err(ProgramError::InvalidAccountData);
    }

    // Check pool is active
    if !pool.is_active {
        msg!("Pool is not active");
        return Err(ProgramError::InvalidAccountData);
    }

    msg!("Query authorized");
    Ok(())
}

// Record query for metrics
fn record_query(program_id: &Pubkey, accounts: &[AccountInfo], _user: Pubkey) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let provider = next_account_info(account_info_iter)?;
    let provider_account = next_account_info(account_info_iter)?;

    if !provider.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if provider_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut provider_data = ProviderAccount::try_from_slice(&provider_account.data.borrow())?;

    // SECURITY FIX: Verify provider PDA
    let (provider_pda, _) = Pubkey::find_program_address(
        &[b"provider", provider.key.as_ref()],
        program_id,
    );
    if provider_pda != *provider_account.key {
        msg!("Invalid provider PDA");
        return Err(ProgramError::InvalidSeeds);
    }

    if provider_data.provider != *provider.key {
        return Err(ProgramError::InvalidAccountData);
    }

    provider_data.queries_served = provider_data.queries_served
        .checked_add(1)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    provider_data.serialize(&mut &mut provider_account.data.borrow_mut()[..])?;

    Ok(())
}

