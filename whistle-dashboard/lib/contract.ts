/**
 * WHISTLE Smart Contract Integration
 * Full implementation of staking, provider registration, and earnings
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import * as borsh from 'borsh';

// ============= CONSTANTS =============

// 🎉 WHISTLENET MAINNET - CORRECT PROGRAM!
export const WHISTLE_PROGRAM_ID = new PublicKey('whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr');
export const WHISTLE_MINT = new PublicKey('6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump');

// From contract - MAINNET DEPLOYMENT
export const MIN_PROVIDER_BOND = 1_000_000_000; // 1000 WHISTLE (6 decimals)
export const QUERY_COST = 10_000; // 0.00001 SOL
export const WHISTLE_DECIMALS = 6;

// Deployed Account Addresses - CORRECT WHISTLENET PROGRAM
export const AUTHORITY_ADDRESS = new PublicKey('6BNdVMgx2JZJPvkRCLyV2LLxft4S1cwuqoX2BS9eFyvh'); // Actual vault authority
export const STAKING_POOL_ADDRESS = new PublicKey('6Ls9QVrP3K35TdQ8dbSJAp1L48tsYFvcbixsXXL9KDAB'); // Correct pool PDA
export const TOKEN_VAULT_ADDRESS = new PublicKey('6AP8c7sCQsm2FMvNJw6fQN5PnMdkySH75h7EPE2kD3Yq');
export const PAYMENT_VAULT_ADDRESS = new PublicKey('CU1ZcHccCbQT8iA6pcb3ZyTjog8ckmDHH8gaAmKfC73G');

// RPC connection - Whistle Network (our own validator!)
const RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://rpc.whistle.ninja';
export const connection = new Connection(RPC_ENDPOINT, 'confirmed');

// ============= PDA DERIVATION =============

export function getStakingPoolPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('staking_pool'), AUTHORITY_ADDRESS.toBuffer()],
    WHISTLE_PROGRAM_ID
  );
}

export function getTokenVaultPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('token_vault'), AUTHORITY_ADDRESS.toBuffer()],
    WHISTLE_PROGRAM_ID
  );
}

export function getStakerAccountPDA(staker: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('staker'), staker.toBuffer()],
    WHISTLE_PROGRAM_ID
  );
}

export function getProviderAccountPDA(provider: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('provider'), provider.toBuffer()],
    WHISTLE_PROGRAM_ID
  );
}

export function getPaymentVaultPDA(): [PublicKey, number] {
  // Use the actual deployed payment vault address
  const paymentVault = new PublicKey('CU1ZcHccCbQT8iA6pcb3ZyTjog8ckmDHH8gaAmKfC73G');
  return [paymentVault, 0];
}

// X402 Payment Wallet PDA
export function getX402WalletPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('x402_payment_wallet')],
    WHISTLE_PROGRAM_ID
  );
}

// Rewards Accumulator PDA (for fair staker distribution)
export function getRewardsAccumulatorPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('rewards_accumulator')],
    WHISTLE_PROGRAM_ID
  );
}

// Deployed X402 wallet (for reference)
export const X402_WALLET_ADDRESS = new PublicKey('BMiSBoT5aPCrFcxaTrHuzXMkfrtzCLMcDYqrPTVymNbU');

// Deployed Rewards Accumulator (for reference)
export const REWARDS_ACCUMULATOR_ADDRESS = new PublicKey('8VAPxQePD9eSdroBSxBixJqb5mz7vdz5NJHktg3xwWRG');

// ============= DATA STRUCTURES =============

export class StakingPool {
  authority!: Uint8Array;
  whistleMint!: Uint8Array;
  tokenVault!: Uint8Array;
  totalStaked!: bigint;
  totalAccessTokens!: bigint;
  minStakeAmount!: bigint;
  tokensPerWhistle!: bigint;
  isActive!: number;
  createdAt!: bigint;
  cooldownPeriod!: bigint;
  maxStakePerUser!: bigint;
  rateLocked!: number;
  bump!: number;

  constructor(fields?: Partial<StakingPool>) {
    if (fields) {
      Object.assign(this, fields);
    }
  }

  static schema = new Map([
    [
      StakingPool,
      {
        kind: 'struct',
        fields: [
          ['authority', [32]],
          ['whistleMint', [32]],
          ['tokenVault', [32]],
          ['totalStaked', 'u64'],
          ['totalAccessTokens', 'u64'],
          ['minStakeAmount', 'u64'],
          ['tokensPerWhistle', 'u64'],
          ['isActive', 'u8'],
          ['createdAt', 'i64'],
          ['cooldownPeriod', 'i64'],
          ['maxStakePerUser', 'u64'],
          ['rateLocked', 'u8'],
          ['bump', 'u8'],
        ],
      },
    ],
  ]);
}

export class StakerAccount {
  staker!: Uint8Array;
  stakedAmount!: bigint;
  accessTokens!: bigint;
  lastStakeTime!: bigint;
  nodeOperator!: number;
  votingPower!: bigint;
  dataEncrypted!: bigint;
  pendingRewards!: bigint;
  bump!: number;

  constructor(fields?: Partial<StakerAccount>) {
    if (fields) {
      Object.assign(this, fields);
    }
  }

  static schema = new Map([
    [
      StakerAccount,
      {
        kind: 'struct',
        fields: [
          ['staker', [32]],
          ['stakedAmount', 'u64'],
          ['accessTokens', 'u64'],
          ['lastStakeTime', 'i64'],
          ['nodeOperator', 'u8'],
          ['votingPower', 'u64'],
          ['dataEncrypted', 'u64'],
          ['pendingRewards', 'u64'],
          ['bump', 'u8'],
        ],
      },
    ],
  ]);
}

export class ProviderAccount {
  provider!: Uint8Array;
  endpoint!: string;
  registeredAt!: bigint;
  isActive!: number;
  stakeBond!: bigint;
  totalEarned!: bigint;
  pendingEarnings!: bigint;
  queriesServed!: bigint;
  reputationScore!: bigint;
  uptimePercentage!: bigint;
  responseTimeAvg!: bigint;
  accuracyScore!: bigint;
  lastHeartbeat!: bigint;
  slashedAmount!: bigint;
  penaltyCount!: number;
  bump!: number;

  constructor(fields?: Partial<ProviderAccount>) {
    if (fields) {
      Object.assign(this, fields);
    }
  }

  static schema = new Map([
    [
      ProviderAccount,
      {
        kind: 'struct',
        fields: [
          ['provider', [32]],
          ['endpoint', 'string'],
          ['registeredAt', 'i64'],
          ['isActive', 'u8'],
          ['stakeBond', 'u64'],
          ['totalEarned', 'u64'],
          ['pendingEarnings', 'u64'],
          ['queriesServed', 'u64'],
          ['reputationScore', 'u64'],
          ['uptimePercentage', 'u64'],
          ['responseTimeAvg', 'u64'],
          ['accuracyScore', 'u64'],
          ['lastHeartbeat', 'i64'],
          ['slashedAmount', 'u64'],
          ['penaltyCount', 'u32'],
          ['bump', 'u8'],
        ],
      },
    ],
  ]);
}

export class RewardsAccumulator {
  accumulatedPerToken!: bigint;  // u128 stored as bigint (cumulative rewards per staked token, scaled by 1e18)
  totalDistributed!: bigint;      // u64
  lastUpdate!: bigint;            // i64
  bump!: number;                   // u8

  constructor(fields?: Partial<RewardsAccumulator>) {
    if (fields) {
      Object.assign(this, fields);
    }
  }
}

export class PaymentVault {
  authority!: Uint8Array;
  totalCollected!: bigint;
  providerPool!: bigint;
  bonusPool!: bigint;
  treasury!: bigint;
  stakerRewardsPool!: bigint;
  developerRebatePool!: bigint;
  lastDistribution!: bigint;
  bump!: number;

  constructor(fields?: Partial<PaymentVault>) {
    if (fields) {
      Object.assign(this, fields);
    }
  }

  static schema = new Map([
    [
      PaymentVault,
      {
        kind: 'struct',
        fields: [
          ['authority', [32]],
          ['totalCollected', 'u64'],
          ['providerPool', 'u64'],
          ['bonusPool', 'u64'],
          ['treasury', 'u64'],
          ['stakerRewardsPool', 'u64'],
          ['developerRebatePool', 'u64'],
          ['lastDistribution', 'i64'],
          ['bump', 'u8'],
        ],
      },
    ],
  ]);
}

// ============= INSTRUCTION ENUM =============
// CRITICAL: MUST match the DEPLOYED contract source code!
// See: C:\Users\salva\Downloads\whistle\whistlenet\contract\src\lib.rs
// The IDL file is outdated - use the actual source code enum order

enum StakingInstruction {
  InitializePool = 0,
  Stake = 1,
  Unstake = 2,
  TransferAccess = 3,
  ActivateNodeOperator = 4,
  RecordDataUsage = 5,
  SetPoolStatus = 6,
  LockRate = 7,
  InitializePaymentVault = 8,
  RegisterProvider = 9,        // Correct: index 9 in deployed contract
  DeregisterProvider = 10,
  UpdateEndpoint = 11,
  RecordHeartbeat = 12,
  RecordQueryMetrics = 13,
  UpdateReputationMetrics = 14,
  SlashProvider = 15,
  ProcessQueryPayment = 16,
  ClaimProviderEarnings = 17,
  DistributeBonusPool = 18,
  DistributeStakerRewards = 19,
  ClaimStakerRewards = 20,
}

// ============= ACCOUNT FETCHING =============

export async function fetchStakingPool(): Promise<StakingPool | null> {
  try {
    const [poolPDA] = getStakingPoolPDA();
    const accountInfo = await connection.getAccountInfo(poolPDA);

    if (!accountInfo || !accountInfo.data) {
      return null;
    }

    // Manual deserialization to avoid borsh library issues
    const data = accountInfo.data;
    let offset = 0;

    // Parse StakingPool struct: 32+32+32+8+8+8+8+1+8+8+8+1+1 = 155 bytes
    const pool = new StakingPool({
      authority: new Uint8Array(data.slice(offset, offset + 32)),
      whistleMint: new Uint8Array(data.slice(offset + 32, offset + 64)),
      tokenVault: new Uint8Array(data.slice(offset + 64, offset + 96)),
      totalStaked: data.readBigUInt64LE(offset + 96),
      totalAccessTokens: data.readBigUInt64LE(offset + 104),
      minStakeAmount: data.readBigUInt64LE(offset + 112),
      tokensPerWhistle: data.readBigUInt64LE(offset + 120),
      isActive: data.readUInt8(offset + 128),
      createdAt: data.readBigInt64LE(offset + 129),
      cooldownPeriod: data.readBigInt64LE(offset + 137),
      maxStakePerUser: data.readBigUInt64LE(offset + 145),
      rateLocked: data.readUInt8(offset + 153),
      bump: data.readUInt8(offset + 154),
    });

    return pool;
  } catch (error) {
    console.error('Error fetching staking pool:', error);
    return null;
  }
}

// Fetch REAL staker count from blockchain (no estimation!)
export async function fetchStakerCount(): Promise<number> {
  try {
    const accounts = await connection.getProgramAccounts(WHISTLE_PROGRAM_ID, {
      filters: [
        {
          dataSize: 82, // StakerAccount size
        }
      ]
    });
    return accounts.length;
  } catch (error) {
    console.error('Error fetching staker count:', error);
    return 0;
  }
}

// Fetch all registered providers
export async function fetchAllProviders(): Promise<Array<{ pubkey: PublicKey; isActive: boolean; endpoint: string }>> {
  try {
    const accounts = await connection.getProgramAccounts(WHISTLE_PROGRAM_ID, {
      filters: [
        {
          dataSize: 256, // ProviderAccount size (approximate)
        }
      ]
    });
    
    return accounts.map(({ pubkey, account }) => {
      try {
        // Manual deserialization (simplified)
        const data = account.data;
        const provider = new PublicKey(data.slice(0, 32));
        // endpoint starts at byte 32, is a string (4 bytes length + string data)
        const endpointLenView = new DataView(data.buffer, data.byteOffset + 32, 4);
        const endpointLen = endpointLenView.getUint32(0, true);
        const endpoint = new TextDecoder().decode(data.slice(36, 36 + endpointLen));
        // is_active is at a known offset (after endpoint and timestamps)
        const isActive = data[36 + endpointLen + 8] === 1; // +8 for registered_at i64
        
        return {
          pubkey: provider,
          isActive,
          endpoint
        };
      } catch (err) {
        return null;
      }
    }).filter((p): p is { pubkey: PublicKey; isActive: boolean; endpoint: string } => p !== null);
  } catch (error: any) {
    // RPC endpoint doesn't support getProgramAccounts for this program
    // This is expected - return empty array gracefully
    if (error?.message?.includes('excluded from account secondary indexes') || 
        error?.message?.includes('RPC method unavailable')) {
      console.warn('getProgramAccounts not supported by RPC endpoint, returning empty provider list');
      return [];
    }
    console.error('Error fetching providers:', error);
    return [];
  }
}

export async function fetchStakerAccount(staker: PublicKey): Promise<StakerAccount | null> {
  try {
    const [stakerPDA] = getStakerAccountPDA(staker);
    const accountInfo = await connection.getAccountInfo(stakerPDA);

    if (!accountInfo || !accountInfo.data) {
      return null;
    }

    // Manual deserialization to avoid borsh library issues
    const data = accountInfo.data;
    let offset = 0;

    // Parse StakerAccount struct: 32+8+8+8+1+8+8+8+1 = 82 bytes
    const account = new StakerAccount({
      staker: new Uint8Array(data.slice(offset, offset + 32)),
      stakedAmount: data.readBigUInt64LE(offset + 32),
      accessTokens: data.readBigUInt64LE(offset + 40),
      lastStakeTime: data.readBigInt64LE(offset + 48),
      nodeOperator: data.readUInt8(offset + 56),
      votingPower: data.readBigUInt64LE(offset + 57),
      dataEncrypted: data.readBigUInt64LE(offset + 65),
      pendingRewards: data.readBigUInt64LE(offset + 73),
      bump: data.readUInt8(offset + 81),
    });

    return account;
  } catch (error) {
    console.error('Error fetching staker account:', error);
    return null;
  }
}

export async function fetchProviderAccount(provider: PublicKey): Promise<ProviderAccount | null> {
  try {
    const [providerPDA] = getProviderAccountPDA(provider);
    const accountInfo = await connection.getAccountInfo(providerPDA);

    if (!accountInfo || !accountInfo.data) {
      return null;
    }

    const account = borsh.deserialize(
      ProviderAccount.schema as any,
      ProviderAccount,
      accountInfo.data
    ) as unknown as ProviderAccount;
    return account;
  } catch (error) {
    console.error('Error fetching provider account:', error);
    return null;
  }
}

// Fetch rewards accumulator for fair distribution calculation
export async function fetchRewardsAccumulator(): Promise<RewardsAccumulator | null> {
  try {
    const [accumulatorPDA] = getRewardsAccumulatorPDA();
    const accountInfo = await connection.getAccountInfo(accumulatorPDA);

    if (!accountInfo || !accountInfo.data) {
      console.warn('Rewards accumulator account not found');
      return null;
    }

    // Manual deserialization: u128(16) + u64(8) + i64(8) + u8(1) = 33 bytes
    const data = accountInfo.data;
    
    if (data.length < 33) {
      console.warn('Rewards accumulator data too small:', data.length);
      return null;
    }

    // Parse RewardsAccumulator struct
    // accumulated_per_token: u128 (16 bytes, little-endian) - stored as two u64s
    const low64 = data.readBigUInt64LE(0);
    const high64 = data.readBigUInt64LE(8);
    const accumulatedPerToken = low64 + (high64 << BigInt(64));
    // total_distributed: u64 (8 bytes, offset 16)
    const totalDistributed = data.readBigUInt64LE(16);
    // last_update: i64 (8 bytes, offset 24) - read as u64 then convert
    const lastUpdateRaw = data.readBigUInt64LE(24);
    const lastUpdate = BigInt.asIntN(64, lastUpdateRaw);
    // bump: u8 (1 byte, offset 32)
    const bump = data[32];

    return {
      accumulatedPerToken,
      totalDistributed,
      lastUpdate,
      bump,
    };
  } catch (error) {
    console.error('Error fetching rewards accumulator:', error);
    return null;
  }
}

// Fetch token vault balance (REAL total staked in WHISTLE tokens)
export async function fetchTokenVault() {
  try {
    const tokenVaultAddress = TOKEN_VAULT_ADDRESS;
    const balance = await connection.getTokenAccountBalance(tokenVaultAddress);
    return {
      amount: balance.value.amount,
      uiAmount: balance.value.uiAmount,
      decimals: balance.value.decimals
    };
  } catch (error) {
    console.error('Error fetching token vault:', error);
    return null;
  }
}

export async function fetchPaymentVault(): Promise<PaymentVault | null> {
  try {
    const [vaultPDA, bump] = getPaymentVaultPDA();
    const accountInfo = await connection.getAccountInfo(vaultPDA);

    if (!accountInfo || !accountInfo.data) {
      console.warn('Payment vault account not found');
      return null;
    }

    // Parse the ACTUAL vault data from your deployed contract
    // PaymentVault layout: authority(32) + staker_rewards_pool(8) + bonus_pool(8) + treasury(8) + total_collected(8) = 64+ bytes
    const data = accountInfo.data;
    
    if (data.length < 64) {
      console.warn('Payment vault data too small:', data.length);
      return null;
    }
    
    const stakerRewardsPool = data.readBigUInt64LE(32); // Offset 32
    const bonusPool = data.readBigUInt64LE(40);         // Offset 40
    const treasury = data.readBigUInt64LE(48);          // Offset 48
    const developerRebatePool = data.readBigUInt64LE(56); // Offset 56
    const totalCollected = data.readBigUInt64LE(64);     // Offset 64
    
    console.log('✅ Payment Vault Data:');
    console.log('  Staker Pool:', Number(stakerRewardsPool) / 1e9, 'SOL');
    console.log('  Bonus Pool:', Number(bonusPool) / 1e9, 'SOL');
    console.log('  Treasury:', Number(treasury) / 1e9, 'SOL');
    console.log('  Developer Rebate Pool:', Number(developerRebatePool) / 1e9, 'SOL');
    console.log('  Total Collected:', Number(totalCollected) / 1e9, 'SOL');
    
    return {
      authority: new Uint8Array(data.slice(0, 32)),
      stakerRewardsPool,
      bonusPool,
      treasury,
      developerRebatePool,
      totalCollected,
      providerPool: BigInt(0),
      lastDistribution: BigInt(0),
      bump, // PDA bump from derivation
    };
  } catch (error) {
    console.error('Error fetching payment vault:', error);
    return null;
  }
}

// ============= INSTRUCTION BUILDERS =============

export async function createStakeTransaction(
  staker: PublicKey,
  amountWhistle: number
): Promise<Transaction> {
  const transaction = new Transaction();

  // Add compute budget to prevent simulation errors
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 })
  );

  const [stakingPoolPDA] = getStakingPoolPDA();
  const [stakerAccountPDA] = getStakerAccountPDA(staker);
  const [tokenVaultPDA] = getTokenVaultPDA();

  // Get staker's WHISTLE token account
  const stakerTokenAccount = getAssociatedTokenAddressSync(WHISTLE_MINT, staker);

  // Check if staker's token account exists, create if needed
  const stakerTokenAccountInfo = await connection.getAccountInfo(stakerTokenAccount);
  if (!stakerTokenAccountInfo) {
    console.log('Creating associated token account for staker...');
    const createATAIx = createAssociatedTokenAccountInstruction(
      staker, // payer
      stakerTokenAccount, // ata
      staker, // owner
      WHISTLE_MINT // mint
    );
    transaction.add(createATAIx);
  }

  // Convert amount to token units (6 decimals)
  const amountLamports = BigInt(Math.floor(amountWhistle * 10 ** WHISTLE_DECIMALS));

  // Build instruction data: [instruction_discriminator (1 byte), amount (8 bytes)]
  const instructionData = new Uint8Array(9);
  instructionData[0] = StakingInstruction.Stake;
  
  // Write amount as BigInt (8 bytes, little-endian) - browser compatible
  const view = new DataView(instructionData.buffer);
  view.setBigUint64(1, amountLamports, true); // true = little-endian

  const stakeIx = new TransactionInstruction({
    programId: WHISTLE_PROGRAM_ID,
    keys: [
      { pubkey: staker, isSigner: true, isWritable: true },
      { pubkey: stakingPoolPDA, isSigner: false, isWritable: true },
      { pubkey: stakerAccountPDA, isSigner: false, isWritable: true },
      { pubkey: stakerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: tokenVaultPDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(instructionData),
  });

  transaction.add(stakeIx);
  return transaction;
}

export async function createUnstakeTransaction(
  staker: PublicKey,
  amountWhistle: number
): Promise<Transaction> {
  const transaction = new Transaction();

  // Add compute budget to prevent simulation errors
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 })
  );

  const [stakingPoolPDA] = getStakingPoolPDA();
  const [stakerAccountPDA] = getStakerAccountPDA(staker);
  const [tokenVaultPDA] = getTokenVaultPDA();

  const stakerTokenAccount = getAssociatedTokenAddressSync(WHISTLE_MINT, staker);

  const amountLamports = BigInt(Math.floor(amountWhistle * 10 ** WHISTLE_DECIMALS));

  const instructionData = new Uint8Array(9);
  instructionData[0] = StakingInstruction.Unstake;
  
  // Write amount as BigInt (8 bytes, little-endian) - browser compatible
  const view = new DataView(instructionData.buffer);
  view.setBigUint64(1, amountLamports, true); // true = little-endian

  const unstakeIx = new TransactionInstruction({
    programId: WHISTLE_PROGRAM_ID,
    keys: [
      { pubkey: staker, isSigner: true, isWritable: true },
      { pubkey: stakingPoolPDA, isSigner: false, isWritable: true },
      { pubkey: stakerAccountPDA, isSigner: false, isWritable: true },
      { pubkey: stakerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: tokenVaultPDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(instructionData),
  });

  transaction.add(unstakeIx);
  return transaction;
}

export async function createRegisterProviderTransaction(
  provider: PublicKey,
  endpoint: string,
  bondAmountWhistle: number
): Promise<Transaction> {
  const transaction = new Transaction();

  const [providerAccountPDA] = getProviderAccountPDA(provider);
  const [tokenVaultPDA] = getTokenVaultPDA();

  const providerTokenAccount = getAssociatedTokenAddressSync(WHISTLE_MINT, provider);

  const bondAmount = BigInt(Math.floor(bondAmountWhistle * 10 ** WHISTLE_DECIMALS));

  // ORIGINAL field order: endpoint first, then bond_amount
  // Testing with discriminator 3 (might match deployed contract)
  // Serialize: instruction (1) + endpoint length (4) + endpoint + bond amount (8)
  const endpointBytes = new TextEncoder().encode(endpoint);
  const instructionData = new Uint8Array(1 + 4 + endpointBytes.length + 8);
  const view = new DataView(instructionData.buffer);
  
  let offset = 0;
  
  // Instruction type - RegisterProvider = 9 in deployed contract
  instructionData[offset] = StakingInstruction.RegisterProvider;  // = 9
  offset += 1;

  // Endpoint length (4 bytes, little-endian)
  view.setUint32(offset, endpointBytes.length, true);
  offset += 4;

  // Endpoint string
  instructionData.set(endpointBytes, offset);
  offset += endpointBytes.length;

  // Bond amount (8 bytes, little-endian)
  view.setBigUint64(offset, bondAmount, true);
  
  console.log('[RegisterProvider] instruction data:', Array.from(instructionData).map(b => b.toString(16).padStart(2, '0')).join(' '));

  const registerIx = new TransactionInstruction({
    programId: WHISTLE_PROGRAM_ID,
    keys: [
      { pubkey: provider, isSigner: true, isWritable: true },
      { pubkey: providerAccountPDA, isSigner: false, isWritable: true },
      { pubkey: providerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: tokenVaultPDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(instructionData),
  });

  transaction.add(registerIx);
  return transaction;
}

export async function createClaimProviderEarningsTransaction(
  provider: PublicKey
): Promise<Transaction> {
  const transaction = new Transaction();

  const [providerAccountPDA] = getProviderAccountPDA(provider);
  const [paymentVaultPDA] = getPaymentVaultPDA();

  const instructionData = new Uint8Array([StakingInstruction.ClaimProviderEarnings]);

  const claimIx = new TransactionInstruction({
    programId: WHISTLE_PROGRAM_ID,
    keys: [
      { pubkey: provider, isSigner: true, isWritable: true },
      { pubkey: providerAccountPDA, isSigner: false, isWritable: true },
      { pubkey: paymentVaultPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(instructionData),
  });

  transaction.add(claimIx);
  return transaction;
}

export async function createProcessQueryPaymentTransaction(
  user: PublicKey,
  provider: PublicKey,
  queryCost: number = QUERY_COST
): Promise<Transaction> {
  const transaction = new Transaction();

  const [paymentVaultPDA] = getPaymentVaultPDA();
  const [providerAccountPDA] = getProviderAccountPDA(provider);
  const [stakingPoolPDA] = getStakingPoolPDA();

  // Instruction data: [discriminator(1), provider(32), query_cost(8)]
  const instructionData = new Uint8Array(1 + 32 + 8);
  instructionData[0] = StakingInstruction.ProcessQueryPayment;
  
  // Provider pubkey
  instructionData.set(provider.toBytes(), 1);
  
  // Query cost as u64 little endian
  const costView = new DataView(instructionData.buffer, 33, 8);
  costView.setBigUint64(0, BigInt(queryCost), true);

  const processQueryIx = new TransactionInstruction({
    programId: WHISTLE_PROGRAM_ID,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: paymentVaultPDA, isSigner: false, isWritable: true },
      { pubkey: providerAccountPDA, isSigner: false, isWritable: true },
      { pubkey: stakingPoolPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(instructionData),
  });

  transaction.add(processQueryIx);
  return transaction;
}

export async function createDistributeStakerRewardsTransaction(
  authority: PublicKey
): Promise<Transaction> {
  const transaction = new Transaction();

  const [stakingPoolPDA] = getStakingPoolPDA();
  const [paymentVaultPDA] = getPaymentVaultPDA();

  const instructionData = new Uint8Array([StakingInstruction.DistributeStakerRewards]);

  const distributeIx = new TransactionInstruction({
    programId: WHISTLE_PROGRAM_ID,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: stakingPoolPDA, isSigner: false, isWritable: true },
      { pubkey: paymentVaultPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(instructionData),
  });

  transaction.add(distributeIx);
  return transaction;
}

export async function createClaimStakerRewardsTransaction(
  staker: PublicKey
): Promise<Transaction> {
  const transaction = new Transaction();

  // Add compute budget to prevent simulation errors
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 })
  );
  transaction.add(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 })
  );

  const [stakerAccountPDA] = getStakerAccountPDA(staker);
  const [stakingPoolPDA] = getStakingPoolPDA();
  const [paymentVaultPDA] = getPaymentVaultPDA();
  const [rewardsAccumulatorPDA] = getRewardsAccumulatorPDA();

  const instructionData = new Uint8Array([StakingInstruction.ClaimStakerRewards]);

  const claimIx = new TransactionInstruction({
    programId: WHISTLE_PROGRAM_ID,
    keys: [
      { pubkey: staker, isSigner: true, isWritable: true }, // Staker wallet (receives SOL)
      { pubkey: stakerAccountPDA, isSigner: false, isWritable: true }, // Staker account (MUST be writable to update pending_rewards and reward_debt)
      { pubkey: stakingPoolPDA, isSigner: false, isWritable: false },
      { pubkey: paymentVaultPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: rewardsAccumulatorPDA, isSigner: false, isWritable: true }, // REQUIRED: Fair distribution
    ],
    data: Buffer.from(instructionData),
  });

  transaction.add(claimIx);
  return transaction;
}

export async function createUpdateEndpointTransaction(
  provider: PublicKey,
  newEndpoint: string
): Promise<Transaction> {
  const transaction = new Transaction();

  const [providerAccountPDA] = getProviderAccountPDA(provider);

  const endpointBytes = new TextEncoder().encode(newEndpoint);
  const instructionData = new Uint8Array(1 + 4 + endpointBytes.length);
  const view = new DataView(instructionData.buffer);
  
  let offset = 0;

  // Instruction type
  instructionData[offset] = StakingInstruction.UpdateEndpoint;
  offset += 1;

  // Endpoint length (4 bytes, little-endian)
  view.setUint32(offset, endpointBytes.length, true);
  offset += 4;

  // Endpoint string
  instructionData.set(endpointBytes, offset);

  const updateIx = new TransactionInstruction({
    programId: WHISTLE_PROGRAM_ID,
    keys: [
      { pubkey: provider, isSigner: true, isWritable: false },
      { pubkey: providerAccountPDA, isSigner: false, isWritable: true },
    ],
    data: Buffer.from(instructionData),
  });

  transaction.add(updateIx);
  return transaction;
}

// ============= UTILITY FUNCTIONS =============

export function lamportsToSol(lamports: bigint | number): number {
  return Number(lamports) / LAMPORTS_PER_SOL;
}

export function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * LAMPORTS_PER_SOL));
}

export function whistleToTokens(whistle: number): bigint {
  return BigInt(Math.floor(whistle * 10 ** WHISTLE_DECIMALS));
}

export function tokensToWhistle(tokens: bigint | number): number {
  return Number(tokens) / 10 ** WHISTLE_DECIMALS;
}
