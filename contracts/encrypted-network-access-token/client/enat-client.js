/**
 * Encrypted Network Access Token (ENAT) Client SDK - FINAL SECURE VERSION
 * 
 * This SDK provides easy interaction with the ENAT staking smart contract.
 * 
 * ALL CRITICAL SECURITY FIXES APPLIED:
 * - Proportional token burning (fixes stake_rate issue)
 * - Transfer requires recipient to have minimum stake
 * - Node operator requires actual stake, not just tokens
 * - Pool status checked in all operations
 * - Zero amount validations
 * - Node operator auto-revoked if stake drops
 * - Rate can be locked to prevent manipulation
 */

import * as borsh from 'borsh';
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
  Keypair,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import BN from 'bn.js';

// Replace with your deployed program ID
const PROGRAM_ID = new PublicKey('ENATkxyz123456789ABCDEFGHJKLMNPQRSTUVWXYZabc');

// ============= SCHEMAS =============

class StakingPool {
  constructor(fields) {
    this.authority = fields.authority;
    this.total_staked = fields.total_staked;
    this.total_access_tokens = fields.total_access_tokens;
    this.min_stake_amount = fields.min_stake_amount;
    this.tokens_per_sol = fields.tokens_per_sol;
    this.is_active = fields.is_active;
    this.created_at = fields.created_at;
    this.cooldown_period = fields.cooldown_period;
    this.max_stake_per_user = fields.max_stake_per_user;
    this.rate_locked = fields.rate_locked;
    this.bump = fields.bump;
  }
}

class StakerAccount {
  constructor(fields) {
    this.staker = fields.staker;
    this.staked_amount = fields.staked_amount;
    this.access_tokens = fields.access_tokens;
    this.last_stake_time = fields.last_stake_time;
    this.node_operator = fields.node_operator;
    this.voting_power = fields.voting_power;
    this.data_encrypted = fields.data_encrypted;
    this.bump = fields.bump;
  }
}

const StakingPoolSchema = new Map([
  [StakingPool, {
    kind: 'struct',
    fields: [
      ['authority', [32]],
      ['total_staked', 'u64'],
      ['total_access_tokens', 'u64'],
      ['min_stake_amount', 'u64'],
      ['tokens_per_sol', 'u64'],
      ['is_active', 'u8'],
      ['created_at', 'i64'],
      ['cooldown_period', 'i64'],
      ['max_stake_per_user', 'u64'],
      ['rate_locked', 'u8'],
      ['bump', 'u8'],
    ]
  }]
]);

const StakerAccountSchema = new Map([
  [StakerAccount, {
    kind: 'struct',
    fields: [
      ['staker', [32]],
      ['staked_amount', 'u64'],
      ['access_tokens', 'u64'],
      ['last_stake_time', 'i64'],
      ['node_operator', 'u8'],
      ['voting_power', 'u64'],
      ['data_encrypted', 'u64'],
      ['bump', 'u8'],
    ]
  }]
]);

// ============= CLIENT CLASS =============

export class ENATClient {
  constructor(connection, programId = PROGRAM_ID) {
    this.connection = connection;
    this.programId = programId;
  }

  /**
   * Find PDA for staking pool
   */
  async findPoolAddress(poolAuthority) {
    return await PublicKey.findProgramAddress(
      [Buffer.from('staking_pool'), poolAuthority.toBuffer()],
      this.programId
    );
  }

  /**
   * Find PDA for staker account
   */
  async findStakerAddress(staker) {
    return await PublicKey.findProgramAddress(
      [Buffer.from('staker'), staker.toBuffer()],
      this.programId
    );
  }

  /**
   * Find PDA for pool vault
   */
  async findVaultAddress(poolAuthority) {
    return await PublicKey.findProgramAddress(
      [Buffer.from('vault'), poolAuthority.toBuffer()],
      this.programId
    );
  }

  /**
   * Initialize a new staking pool
   */
  async initializePool(authority, minStakeAmount, tokensPerSol, cooldownPeriod = 0) {
    if (tokensPerSol === 0) {
      throw new Error('Tokens per SOL must be greater than 0');
    }

    const [poolPDA, _] = await this.findPoolAddress(authority.publicKey);
    const [vaultPDA, __] = await this.findVaultAddress(authority.publicKey);

    // Create instruction data
    const instructionData = Buffer.alloc(25);
    instructionData.writeUInt8(0, 0); // Instruction index for InitializePool
    instructionData.writeBigUInt64LE(BigInt(minStakeAmount), 1);
    instructionData.writeBigUInt64LE(BigInt(tokensPerSol), 9);
    instructionData.writeBigInt64LE(BigInt(cooldownPeriod), 17);

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: authority.publicKey, isSigner: true, isWritable: true },
        { pubkey: poolPDA, isSigner: false, isWritable: true },
        { pubkey: vaultPDA, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: instructionData,
    });

    const transaction = new Transaction().add(instruction);
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [authority]
    );

    console.log('Pool initialized:', signature);
    return { signature, poolAddress: poolPDA, vaultAddress: vaultPDA };
  }

  /**
   * Stake SOL to mint access tokens
   */
  async stake(staker, poolAuthority, amount) {
    if (amount === 0) {
      throw new Error('Cannot stake zero amount');
    }

    const [poolPDA, _] = await this.findPoolAddress(poolAuthority);
    const [stakerPDA, __] = await this.findStakerAddress(staker.publicKey);
    const [vaultPDA, ___] = await this.findVaultAddress(poolAuthority);

    // Create instruction data
    const instructionData = Buffer.alloc(9);
    instructionData.writeUInt8(1, 0); // Instruction index for Stake
    instructionData.writeBigUInt64LE(BigInt(amount), 1);

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: staker.publicKey, isSigner: true, isWritable: true },
        { pubkey: poolPDA, isSigner: false, isWritable: true },
        { pubkey: stakerPDA, isSigner: false, isWritable: true },
        { pubkey: vaultPDA, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: instructionData,
    });

    const transaction = new Transaction().add(instruction);
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [staker]
    );

    console.log('Staked successfully:', signature);
    return signature;
  }

  /**
   * Unstake SOL and burn access tokens (proportionally)
   */
  async unstake(staker, poolAuthority, amount) {
    if (amount === 0) {
      throw new Error('Cannot unstake zero amount');
    }

    const [poolPDA, _] = await this.findPoolAddress(poolAuthority);
    const [stakerPDA, __] = await this.findStakerAddress(staker.publicKey);
    const [vaultPDA, ___] = await this.findVaultAddress(poolAuthority);

    // Create instruction data
    const instructionData = Buffer.alloc(9);
    instructionData.writeUInt8(2, 0); // Instruction index for Unstake
    instructionData.writeBigUInt64LE(BigInt(amount), 1);

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: staker.publicKey, isSigner: true, isWritable: true },
        { pubkey: poolPDA, isSigner: false, isWritable: true },
        { pubkey: stakerPDA, isSigner: false, isWritable: true },
        { pubkey: vaultPDA, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: instructionData,
    });

    const transaction = new Transaction().add(instruction);
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [staker]
    );

    console.log('Unstaked successfully:', signature);
    return signature;
  }

  /**
   * Transfer access tokens (delegation, not sale)
   * SECURITY: Recipient MUST already have minimum stake
   * CRITICAL FIX: Now validates recipient PDA in smart contract
   */
  async transferAccess(owner, poolAuthority, toAddress, accessTokens) {
    // Validate amount
    if (accessTokens === 0) {
      throw new Error('Cannot transfer zero tokens');
    }

    // SECURITY: Check if recipient has minimum stake
    try {
      const recipientInfo = await this.getStakerInfo(toAddress);
      const poolInfo = await this.getPoolInfo(poolAuthority);
      
      if (Number(recipientInfo.stakedAmount) < Number(poolInfo.minStakeAmount)) {
        throw new Error(
          `Recipient must have at least ${poolInfo.minStakeAmount} lamports staked to receive tokens. ` +
          `This ensures all token holders have economic commitment.`
        );
      }
    } catch (error) {
      if (error.message.includes('Staker account not found')) {
        throw new Error('Recipient must stake before receiving delegated tokens. They need skin in the game!');
      }
      throw error;
    }

    const [poolPDA, _] = await this.findPoolAddress(poolAuthority);
    const [fromStakerPDA, __] = await this.findStakerAddress(owner.publicKey);
    const [toStakerPDA, ___] = await this.findStakerAddress(toAddress);

    // Create instruction data
    const instructionData = Buffer.alloc(9);
    instructionData.writeUInt8(3, 0); // Instruction index for TransferAccess
    instructionData.writeBigUInt64LE(BigInt(accessTokens), 1);

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: owner.publicKey, isSigner: true, isWritable: true },
        { pubkey: fromStakerPDA, isSigner: false, isWritable: true },
        { pubkey: toStakerPDA, isSigner: false, isWritable: true },
        { pubkey: poolPDA, isSigner: false, isWritable: false },
        { pubkey: toAddress, isSigner: false, isWritable: false }, // CRITICAL FIX: Added recipient pubkey for PDA validation
      ],
      programId: this.programId,
      data: instructionData,
    });

    const transaction = new Transaction().add(instruction);
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [owner]
    );

    console.log('Access tokens transferred:', signature);
    console.log('⚠️  This is a delegation, not a sale!');
    return signature;
  }

  /**
   * Activate node operator status
   * SECURITY: Requires actual stake, not just delegated tokens
   */
  async activateNodeOperator(staker, poolAuthority) {
    // Check if user has sufficient STAKE (not just tokens)
    const stakerInfo = await this.getStakerInfo(staker.publicKey);
    const poolInfo = await this.getPoolInfo(poolAuthority);
    
    const minNodeStake = Number(poolInfo.minStakeAmount) * 10;
    const actualStake = Number(stakerInfo.stakedAmount);
    
    if (actualStake < minNodeStake) {
      throw new Error(
        `Insufficient STAKE to become node operator.\n` +
        `Required: ${minNodeStake} lamports staked\n` +
        `Current: ${actualStake} lamports staked\n` +
        `Note: Delegated tokens do not count - you must have actual stake!`
      );
    }

    const [poolPDA, _] = await this.findPoolAddress(poolAuthority);
    const [stakerPDA, __] = await this.findStakerAddress(staker.publicKey);

    // Create instruction data
    const instructionData = Buffer.alloc(1);
    instructionData.writeUInt8(4, 0); // Instruction index for ActivateNodeOperator

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: staker.publicKey, isSigner: true, isWritable: false },
        { pubkey: stakerPDA, isSigner: false, isWritable: true },
        { pubkey: poolPDA, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: instructionData,
    });

    const transaction = new Transaction().add(instruction);
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [staker]
    );

    console.log('Node operator activated:', signature);
    return signature;
  }

  /**
   * Record encrypted data usage (for node operators)
   */
  async recordDataUsage(nodeOperator, dataSize) {
    const [stakerPDA, _] = await this.findStakerAddress(nodeOperator.publicKey);

    // Create instruction data
    const instructionData = Buffer.alloc(9);
    instructionData.writeUInt8(5, 0); // Instruction index for RecordDataUsage
    instructionData.writeBigUInt64LE(BigInt(dataSize), 1);

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: nodeOperator.publicKey, isSigner: true, isWritable: false },
        { pubkey: stakerPDA, isSigner: false, isWritable: true },
      ],
      programId: this.programId,
      data: instructionData,
    });

    const transaction = new Transaction().add(instruction);
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [nodeOperator]
    );

    console.log('Data usage recorded:', signature);
    return signature;
  }

  /**
   * Set pool active status (emergency pause)
   */
  async setPoolStatus(authority, isActive) {
    const [poolPDA, _] = await this.findPoolAddress(authority.publicKey);

    // Create instruction data
    const instructionData = Buffer.alloc(2);
    instructionData.writeUInt8(6, 0); // Instruction index for SetPoolStatus
    instructionData.writeUInt8(isActive ? 1 : 0, 1);

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: authority.publicKey, isSigner: true, isWritable: false },
        { pubkey: poolPDA, isSigner: false, isWritable: true },
      ],
      programId: this.programId,
      data: instructionData,
    });

    const transaction = new Transaction().add(instruction);
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [authority]
    );

    console.log('Pool status set:', isActive ? 'Active' : 'Paused');
    return signature;
  }

  /**
   * Lock the token rate (prevents manipulation)
   * This is a one-way operation - cannot be unlocked!
   */
  async lockRate(authority) {
    const poolInfo = await this.getPoolInfo(authority.publicKey);
    
    if (poolInfo.rateLocked) {
      throw new Error('Rate is already locked');
    }

    const [poolPDA, _] = await this.findPoolAddress(authority.publicKey);

    // Create instruction data
    const instructionData = Buffer.alloc(1);
    instructionData.writeUInt8(7, 0); // Instruction index for LockRate

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: authority.publicKey, isSigner: true, isWritable: false },
        { pubkey: poolPDA, isSigner: false, isWritable: true },
      ],
      programId: this.programId,
      data: instructionData,
    });

    const transaction = new Transaction().add(instruction);
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [authority]
    );

    console.log('✅ Token rate permanently locked at:', poolInfo.tokensPerSol, 'tokens per SOL');
    console.log('⚠️  Rate can NEVER be changed - protects against manipulation');
    return signature;
  }

  /**
   * Get staking pool info
   */
  async getPoolInfo(poolAuthority) {
    const [poolPDA, _] = await this.findPoolAddress(poolAuthority);
    const accountInfo = await this.connection.getAccountInfo(poolPDA);
    
    if (!accountInfo) {
      throw new Error('Pool not found');
    }

    const pool = borsh.deserialize(StakingPoolSchema, StakingPool, accountInfo.data);
    return {
      authority: new PublicKey(pool.authority),
      totalStaked: pool.total_staked.toString(),
      totalAccessTokens: pool.total_access_tokens.toString(),
      minStakeAmount: pool.min_stake_amount.toString(),
      tokensPerSol: pool.tokens_per_sol.toString(),
      isActive: pool.is_active === 1,
      createdAt: new Date(Number(pool.created_at) * 1000),
      cooldownPeriod: Number(pool.cooldown_period),
      maxStakePerUser: pool.max_stake_per_user.toString(),
      rateLocked: pool.rate_locked === 1,
    };
  }

  /**
   * Get staker account info
   */
  async getStakerInfo(stakerAddress) {
    const [stakerPDA, _] = await this.findStakerAddress(stakerAddress);
    const accountInfo = await this.connection.getAccountInfo(stakerPDA);
    
    if (!accountInfo) {
      throw new Error('Staker account not found');
    }

    const staker = borsh.deserialize(StakerAccountSchema, StakerAccount, accountInfo.data);
    return {
      staker: new PublicKey(staker.staker),
      stakedAmount: staker.staked_amount.toString(),
      accessTokens: staker.access_tokens.toString(),
      lastStakeTime: new Date(Number(staker.last_stake_time) * 1000),
      isNodeOperator: staker.node_operator === 1,
      votingPower: staker.voting_power.toString(),
      dataEncrypted: staker.data_encrypted.toString(),
      tier: this.getAccessTier(Number(staker.access_tokens)),
    };
  }

  /**
   * Check if cooldown period has passed for unstaking
   */
  async canUnstake(stakerAddress, poolAuthority) {
    try {
      const [stakerInfo, poolInfo] = await Promise.all([
        this.getStakerInfo(stakerAddress),
        this.getPoolInfo(poolAuthority),
      ]);

      const cooldownPeriod = poolInfo.cooldownPeriod;
      const timeSinceStake = Math.floor(Date.now() / 1000) - Math.floor(stakerInfo.lastStakeTime.getTime() / 1000);

      return {
        canUnstake: timeSinceStake >= cooldownPeriod,
        timeRemaining: Math.max(0, cooldownPeriod - timeSinceStake),
        cooldownPeriod,
      };
    } catch (error) {
      throw new Error(`Cannot check unstake eligibility: ${error.message}`);
    }
  }

  /**
   * Calculate how many tokens will be burned on unstake (proportional)
   */
  async calculateUnstakeTokenBurn(stakerAddress, unstakeAmount) {
    const stakerInfo = await this.getStakerInfo(stakerAddress);
    
    const stakedAmount = Number(stakerInfo.stakedAmount);
    const accessTokens = Number(stakerInfo.accessTokens);
    
    if (unstakeAmount >= stakedAmount) {
      // Unstaking everything
      return accessTokens;
    }
    
    // Proportional burn: (unstake_amount / total_staked) * total_tokens
    return Math.floor((unstakeAmount * accessTokens) / stakedAmount);
  }

  /**
   * Calculate access tier based on token amount
   */
  getAccessTier(accessTokens) {
    if (accessTokens >= 10001) return 'Elite';
    if (accessTokens >= 1001) return 'Premium';
    return 'Basic';
  }

  /**
   * Calculate expected access tokens for a stake amount
   */
  calculateAccessTokens(stakeAmount, tokensPerSol) {
    const LAMPORTS_PER_SOL = 1_000_000_000;
    return Math.floor((stakeAmount * tokensPerSol) / LAMPORTS_PER_SOL);
  }

  /**
   * Validate stake amount against pool limits
   */
  async validateStakeAmount(stakerAddress, poolAuthority, amount) {
    const poolInfo = await this.getPoolInfo(poolAuthority);
    
    // Check minimum
    if (amount < Number(poolInfo.minStakeAmount)) {
      return {
        valid: false,
        reason: `Amount below minimum stake of ${poolInfo.minStakeAmount} lamports`,
      };
    }

    // Check if tokens will be generated
    const expectedTokens = this.calculateAccessTokens(amount, Number(poolInfo.tokensPerSol));
    if (expectedTokens === 0) {
      return {
        valid: false,
        reason: `Stake amount too small to generate tokens. Need at least ${Math.ceil(Number(poolInfo.minStakeAmount))} lamports.`,
      };
    }

    // Check maximum per user
    try {
      const stakerInfo = await this.getStakerInfo(stakerAddress);
      const currentStake = Number(stakerInfo.stakedAmount);
      const newTotal = currentStake + amount;
      
      if (newTotal > Number(poolInfo.maxStakePerUser)) {
        return {
          valid: false,
          reason: `Total stake would exceed maximum of ${poolInfo.maxStakePerUser} lamports`,
        };
      }
    } catch (error) {
      // Staker doesn't exist yet, just check against max
      if (amount > Number(poolInfo.maxStakePerUser)) {
        return {
          valid: false,
          reason: `Amount exceeds maximum per user of ${poolInfo.maxStakePerUser} lamports`,
        };
      }
    }

    return { valid: true };
  }
}

// ============= CONVENIENCE FUNCTIONS =============

/**
 * Create a new ENAT client
 */
export function createENATClient(rpcUrl = 'http://localhost:8899', programId) {
  const connection = new Connection(rpcUrl, 'confirmed');
  return new ENATClient(connection, programId);
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol) {
  return Math.floor(sol * 1_000_000_000);
}

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports) {
  return lamports / 1_000_000_000;
}

// Export for use in other modules
export default ENATClient;
