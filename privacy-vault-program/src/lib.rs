use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    program_pack::Pack,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
    clock::Clock,
};
use spl_token::state::Account as TokenAccount;

// Program entrypoint
entrypoint!(process_instruction);

// Instruction types
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum VaultInstruction {
    /// Initialize the vault
    /// Accounts:
    /// 0. `[writable, signer]` Vault authority (admin)
    /// 1. `[writable]` Vault state account
    /// 2. `[writable]` Vault token account (holds deposited WHISTLE)
    /// 3. `[]` WHISTLE token mint
    /// 4. `[]` System program
    /// 5. `[]` Token program
    /// 6. `[]` Rent sysvar
    InitializeVault {
        weekly_performance_target: i16, // Basis points (4500 = 45%)
        max_loss_cap: u16, // Basis points (2500 = 25%)
    },

    /// Deposit WHISTLE tokens into vault
    /// Accounts:
    /// 0. `[writable, signer]` User account
    /// 1. `[writable]` User's WHISTLE token account
    /// 2. `[writable]` Vault state account
    /// 3. `[writable]` Vault token account
    /// 4. `[writable]` User vault position account (PDA)
    /// 5. `[]` Token program
    /// 6. `[]` Clock sysvar
    Deposit {
        amount: u64,
    },

    /// Withdraw WHISTLE tokens from vault with returns
    /// Accounts:
    /// 0. `[writable, signer]` User account
    /// 1. `[writable]` User's WHISTLE token account
    /// 2. `[writable]` Vault state account
    /// 3. `[writable]` Vault token account
    /// 4. `[writable]` User vault position account (PDA)
    /// 5. `[]` Vault authority (PDA for signing)
    /// 6. `[]` Token program
    /// 7. `[]` Clock sysvar
    Withdraw,

    /// Update weekly performance (oracle/admin only)
    /// Accounts:
    /// 0. `[signer]` Vault authority
    /// 1. `[writable]` Vault state account
    UpdatePerformance {
        performance_bps: i16, // Can be negative (loss) or positive (gain)
    },
}

// Vault state - stored on-chain
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct VaultState {
    pub authority: Pubkey,
    pub token_mint: Pubkey,
    pub vault_token_account: Pubkey,
    pub total_deposited: u64,
    pub total_shares: u64,
    pub current_performance_bps: i16,
    pub last_performance_update: i64,
    pub weekly_performance_target: i16,
    pub max_loss_cap: u16,
    pub total_depositors: u32,
    pub is_initialized: bool,
}

// User position - stored on-chain per user
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct UserPosition {
    pub owner: Pubkey,
    pub shares: u64,
    pub deposited_amount: u64,
    pub deposit_timestamp: i64,
    pub last_claim_timestamp: i64,
}

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = VaultInstruction::try_from_slice(instruction_data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;

    match instruction {
        VaultInstruction::InitializeVault {
            weekly_performance_target,
            max_loss_cap,
        } => {
            msg!("Instruction: InitializeVault");
            initialize_vault(
                program_id,
                accounts,
                weekly_performance_target,
                max_loss_cap,
            )
        }
        VaultInstruction::Deposit { amount } => {
            msg!("Instruction: Deposit");
            deposit(program_id, accounts, amount)
        }
        VaultInstruction::Withdraw => {
            msg!("Instruction: Withdraw");
            withdraw(program_id, accounts)
        }
        VaultInstruction::UpdatePerformance { performance_bps } => {
            msg!("Instruction: UpdatePerformance");
            update_performance(program_id, accounts, performance_bps)
        }
    }
}

fn initialize_vault(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    weekly_performance_target: i16,
    max_loss_cap: u16,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let authority = next_account_info(account_info_iter)?;
    let vault_state_account = next_account_info(account_info_iter)?;
    let vault_token_account = next_account_info(account_info_iter)?;
    let token_mint = next_account_info(account_info_iter)?;

    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let mut vault_state = VaultState::try_from_slice(&vault_state_account.data.borrow())?;
    
    if vault_state.is_initialized {
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    vault_state.authority = *authority.key;
    vault_state.token_mint = *token_mint.key;
    vault_state.vault_token_account = *vault_token_account.key;
    vault_state.total_deposited = 0;
    vault_state.total_shares = 0;
    vault_state.current_performance_bps = 0;
    vault_state.weekly_performance_target = weekly_performance_target;
    vault_state.max_loss_cap = max_loss_cap;
    vault_state.total_depositors = 0;
    vault_state.is_initialized = true;
    
    let clock = Clock::get()?;
    vault_state.last_performance_update = clock.unix_timestamp;

    vault_state.serialize(&mut &mut vault_state_account.data.borrow_mut()[..])?;

    msg!("Vault initialized successfully");
    Ok(())
}

fn deposit(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let user = next_account_info(account_info_iter)?;
    let user_token_account = next_account_info(account_info_iter)?;
    let vault_state_account = next_account_info(account_info_iter)?;
    let vault_token_account = next_account_info(account_info_iter)?;
    let user_position_account = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;

    if !user.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let mut vault_state = VaultState::try_from_slice(&vault_state_account.data.borrow())?;
    
    if !vault_state.is_initialized {
        return Err(ProgramError::UninitializedAccount);
    }

    // Transfer tokens from user to vault
    let transfer_instruction = spl_token::instruction::transfer(
        token_program.key,
        user_token_account.key,
        vault_token_account.key,
        user.key,
        &[],
        amount,
    )?;

    invoke(
        &transfer_instruction,
        &[
            user_token_account.clone(),
            vault_token_account.clone(),
            user.clone(),
            token_program.clone(),
        ],
    )?;

    // Calculate shares (1:1 for now, can be adjusted based on performance)
    let shares = if vault_state.total_shares == 0 {
        amount // First depositor gets 1:1
    } else {
        // shares = amount * (total_shares / total_deposited)
        amount
            .checked_mul(vault_state.total_shares)
            .ok_or(ProgramError::ArithmeticOverflow)?
            .checked_div(vault_state.total_deposited)
            .ok_or(ProgramError::ArithmeticOverflow)?
    };

    // Update or create user position
    let mut user_position = if user_position_account.data_is_empty() {
        UserPosition {
            owner: *user.key,
            shares: 0,
            deposited_amount: 0,
            deposit_timestamp: 0,
            last_claim_timestamp: 0,
        }
    } else {
        UserPosition::try_from_slice(&user_position_account.data.borrow())?
    };

    let clock = Clock::get()?;
    
    if user_position.shares == 0 {
        vault_state.total_depositors += 1;
        user_position.deposit_timestamp = clock.unix_timestamp;
    }

    user_position.shares += shares;
    user_position.deposited_amount += amount;
    user_position.last_claim_timestamp = clock.unix_timestamp;

    // Update vault state
    vault_state.total_deposited += amount;
    vault_state.total_shares += shares;

    // Save states
    vault_state.serialize(&mut &mut vault_state_account.data.borrow_mut()[..])?;
    user_position.serialize(&mut &mut user_position_account.data.borrow_mut()[..])?;

    msg!("Deposited {} tokens, received {} shares", amount, shares);
    Ok(())
}

fn withdraw(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let user = next_account_info(account_info_iter)?;
    let user_token_account = next_account_info(account_info_iter)?;
    let vault_state_account = next_account_info(account_info_iter)?;
    let vault_token_account = next_account_info(account_info_iter)?;
    let user_position_account = next_account_info(account_info_iter)?;
    let vault_authority = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;

    if !user.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let mut vault_state = VaultState::try_from_slice(&vault_state_account.data.borrow())?;
    let mut user_position = UserPosition::try_from_slice(&user_position_account.data.borrow())?;

    if user_position.owner != *user.key {
        return Err(ProgramError::InvalidAccountData);
    }

    if user_position.shares == 0 {
        return Err(ProgramError::InsufficientFunds);
    }

    // Calculate withdrawal amount based on current performance
    // withdrawal_amount = (user_shares / total_shares) * total_deposited
    let withdrawal_amount = user_position
        .shares
        .checked_mul(vault_state.total_deposited)
        .ok_or(ProgramError::ArithmeticOverflow)?
        .checked_div(vault_state.total_shares)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    // Apply performance multiplier
    let performance_multiplier = 10000i32 + vault_state.current_performance_bps as i32;
    let final_amount = (withdrawal_amount as u128)
        .checked_mul(performance_multiplier as u128)
        .ok_or(ProgramError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(ProgramError::ArithmeticOverflow)? as u64;

    // Transfer tokens from vault to user (using PDA signing)
    let (vault_pda, bump_seed) = Pubkey::find_program_address(
        &[b"vault-authority", vault_state_account.key.as_ref()],
        program_id,
    );

    if vault_pda != *vault_authority.key {
        return Err(ProgramError::InvalidSeeds);
    }

    let transfer_instruction = spl_token::instruction::transfer(
        token_program.key,
        vault_token_account.key,
        user_token_account.key,
        vault_authority.key,
        &[],
        final_amount,
    )?;

    let signer_seeds: &[&[&[u8]]] = &[&[
        b"vault-authority",
        vault_state_account.key.as_ref(),
        &[bump_seed],
    ]];

    invoke_signed(
        &transfer_instruction,
        &[
            vault_token_account.clone(),
            user_token_account.clone(),
            vault_authority.clone(),
            token_program.clone(),
        ],
        signer_seeds,
    )?;

    // Update vault state
    vault_state.total_deposited = vault_state
        .total_deposited
        .checked_sub(withdrawal_amount)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    vault_state.total_shares = vault_state
        .total_shares
        .checked_sub(user_position.shares)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    vault_state.total_depositors -= 1;

    // Clear user position
    user_position.shares = 0;
    user_position.deposited_amount = 0;

    // Save states
    vault_state.serialize(&mut &mut vault_state_account.data.borrow_mut()[..])?;
    user_position.serialize(&mut &mut user_position_account.data.borrow_mut()[..])?;

    msg!(
        "Withdrew {} tokens (performance applied: {} bps)",
        final_amount,
        vault_state.current_performance_bps
    );
    Ok(())
}

fn update_performance(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    performance_bps: i16,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let authority = next_account_info(account_info_iter)?;
    let vault_state_account = next_account_info(account_info_iter)?;

    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let mut vault_state = VaultState::try_from_slice(&vault_state_account.data.borrow())?;

    if vault_state.authority != *authority.key {
        return Err(ProgramError::InvalidAccountData);
    }

    // Cap losses to max_loss_cap
    let capped_performance = if performance_bps < 0 {
        performance_bps.max(-(vault_state.max_loss_cap as i16))
    } else {
        performance_bps
    };

    vault_state.current_performance_bps = capped_performance;
    
    let clock = Clock::get()?;
    vault_state.last_performance_update = clock.unix_timestamp;

    vault_state.serialize(&mut &mut vault_state_account.data.borrow_mut()[..])?;

    msg!("Performance updated to {} bps", capped_performance);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_performance_calculation() {
        // Test 45% gain
        let deposit = 1000u64;
        let performance_bps = 4500i16; // 45%
        let multiplier = 10000i32 + performance_bps as i32;
        let result = (deposit as u128 * multiplier as u128 / 10000) as u64;
        assert_eq!(result, 1450);

        // Test 25% loss
        let performance_bps = -2500i16; // -25%
        let multiplier = 10000i32 + performance_bps as i32;
        let result = (deposit as u128 * multiplier as u128 / 10000) as u64;
        assert_eq!(result, 750);
    }
}

