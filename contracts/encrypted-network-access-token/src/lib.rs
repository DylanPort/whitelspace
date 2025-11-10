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

// Program ID (to be replaced when deployed)
solana_program::declare_id!("ENATkxyz123456789ABCDEFGHJKLMNPQRSTUVWXYZabc");

entrypoint!(process_instruction);

// ============= CONSTANTS =============

const MAX_STAKE_PER_USER: u64 = 100_000_000_000_000; // 100k SOL max per user

// ============= DATA STRUCTURES =============

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct StakingPool {
    pub authority: Pubkey,           // Pool authority
    pub total_staked: u64,            // Total tokens staked
    pub total_access_tokens: u64,     // Total access tokens minted
    pub min_stake_amount: u64,        // Minimum stake to participate
    pub tokens_per_sol: u64,          // Access tokens per SOL staked
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
    pub bump: u8,                     // PDA bump seed
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone, PartialEq)]
pub enum AccessTier {
    Basic,      // 100-1000 tokens staked
    Premium,    // 1001-10000 tokens staked
    Elite,      // 10001+ tokens staked
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum StakingInstruction {
    /// Initialize the staking pool
    /// Accounts:
    /// 0. `[writable, signer]` Authority
    /// 1. `[writable]` Staking pool account (PDA)
    /// 2. `[writable]` Pool vault (PDA)
    /// 3. `[]` System program
    /// 4. `[]` Rent sysvar
    InitializePool {
        min_stake_amount: u64,
        tokens_per_sol: u64,
        cooldown_period: i64,
    },

    /// Stake tokens to mint access tokens
    /// Accounts:
    /// 0. `[writable, signer]` Staker
    /// 1. `[writable]` Staking pool
    /// 2. `[writable]` Staker account (PDA)
    /// 3. `[writable]` Pool vault (PDA)
    /// 4. `[]` System program
    /// 5. `[]` Clock sysvar
    Stake {
        amount: u64,
    },

    /// Unstake tokens (burns access tokens)
    /// Accounts:
    /// 0. `[writable, signer]` Staker
    /// 1. `[writable]` Staking pool
    /// 2. `[writable]` Staker account (PDA)
    /// 3. `[writable]` Pool vault (PDA)
    /// 4. `[]` System program
    /// 5. `[]` Clock sysvar
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
            tokens_per_sol,
            cooldown_period,
        } => initialize_pool(program_id, accounts, min_stake_amount, tokens_per_sol, cooldown_period),

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
    }
}

// ============= INSTRUCTION HANDLERS =============

fn initialize_pool(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    min_stake_amount: u64,
    tokens_per_sol: u64,
    cooldown_period: i64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let authority = next_account_info(account_info_iter)?;
    let pool_account = next_account_info(account_info_iter)?;
    let pool_vault = next_account_info(account_info_iter)?;
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
    if !pool_vault.data_is_empty() || pool_vault.lamports() > 0 {
        msg!("Vault already exists - cannot re-initialize");
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    // Validate parameters
    if tokens_per_sol == 0 {
        msg!("Tokens per SOL must be greater than 0");
        return Err(ProgramError::InvalidInstructionData);
    }

    // HIGH SEVERITY FIX: Validate cooldown period is not negative
    if cooldown_period < 0 {
        msg!("Cooldown period cannot be negative");
        return Err(ProgramError::InvalidInstructionData);
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

    // Derive PDA for vault
    let (vault_pda, vault_bump) = Pubkey::find_program_address(
        &[b"vault", authority.key.as_ref()],
        program_id,
    );

    if vault_pda != *pool_vault.key {
        msg!("Invalid vault PDA");
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

    // Create vault account
    let vault_lamports = rent.minimum_balance(0);

    invoke_signed(
        &system_instruction::create_account(
            authority.key,
            pool_vault.key,
            vault_lamports,
            0,
            program_id,
        ),
        &[authority.clone(), pool_vault.clone(), system_program.clone()],
        &[&[b"vault", authority.key.as_ref(), &[vault_bump]]],
    )?;

    let clock = Clock::get()?;
    let pool = StakingPool {
        authority: *authority.key,
        total_staked: 0,
        total_access_tokens: 0,
        min_stake_amount,
        tokens_per_sol,
        is_active: true,
        created_at: clock.unix_timestamp,
        cooldown_period,
        max_stake_per_user: MAX_STAKE_PER_USER,
        rate_locked: false,
        bump,
    };

    pool.serialize(&mut &mut pool_account.data.borrow_mut()[..])?;

    msg!("Staking pool initialized!");
    msg!("Min stake: {} lamports", min_stake_amount);
    msg!("Tokens per SOL: {}", tokens_per_sol);
    msg!("Cooldown period: {} seconds", cooldown_period);

    Ok(())
}

fn stake(program_id: &Pubkey, accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let staker = next_account_info(account_info_iter)?;
    let pool_account = next_account_info(account_info_iter)?;
    let staker_account = next_account_info(account_info_iter)?;
    let pool_vault = next_account_info(account_info_iter)?;
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

    // Verify vault PDA
    let (vault_pda, _) = Pubkey::find_program_address(
        &[b"vault", pool.authority.as_ref()],
        program_id,
    );

    if vault_pda != *pool_vault.key {
        msg!("Invalid vault PDA");
        return Err(ProgramError::InvalidSeeds);
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

    // Use checked arithmetic to prevent overflow
    let access_tokens = amount
        .checked_mul(pool.tokens_per_sol)
        .ok_or(ProgramError::ArithmeticOverflow)?
        .checked_div(1_000_000_000)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    // SECURITY FIX: Ensure user gets at least some tokens
    if access_tokens == 0 {
        msg!("Stake amount too small to generate tokens");
        return Err(ProgramError::InvalidInstructionData);
    }

    // Transfer SOL to vault
    invoke(
        &system_instruction::transfer(staker.key, pool_vault.key, amount),
        &[staker.clone(), pool_vault.clone(), system_program.clone()],
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
    let pool_vault = next_account_info(account_info_iter)?;
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

    // Verify vault PDA
    let (vault_pda, vault_bump) = Pubkey::find_program_address(
        &[b"vault", pool.authority.as_ref()],
        program_id,
    );

    if vault_pda != *pool_vault.key {
        msg!("Invalid vault PDA");
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

    // HIGH SEVERITY FIX: Check vault has sufficient funds before transfer
    if pool_vault.lamports() < amount {
        msg!("Insufficient funds in vault");
        msg!("Vault balance: {} lamports, Requested: {} lamports", pool_vault.lamports(), amount);
        msg!("This indicates an accounting error - please contact support");
        return Err(ProgramError::InsufficientFunds);
    }

    // Transfer SOL back from vault using invoke_signed
    invoke_signed(
        &system_instruction::transfer(pool_vault.key, staker.key, amount),
        &[pool_vault.clone(), staker.clone(), system_program.clone()],
        &[&[b"vault", pool.authority.as_ref(), &[vault_bump]]],
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
