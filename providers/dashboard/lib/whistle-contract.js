/**
 * WHISTLE Network Contract Integration
 * Connects cache nodes to the on-chain WHTT contract
 */

import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';

// ============= CONTRACT ADDRESSES (MAINNET) =============

export const WHISTLE_PROGRAM_ID = new PublicKey('whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr');
export const WHISTLE_MINT = new PublicKey('6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump');
export const STAKING_POOL_ADDRESS = new PublicKey('jVaoYCKUFjHkYw975R7tVvRgns5VdfnnquSp2gzwPXB');
export const TOKEN_VAULT_ADDRESS = new PublicKey('6AP8c7sCQsm2FMvNJw6fQN5PnMdkySH75h7EPE2kD3Yq');
export const PAYMENT_VAULT_ADDRESS = new PublicKey('CU1ZcHccCbQT8iA6pcb3ZyTjog8ckmDHH8gaAmKfC73G');
export const X402_WALLET_ADDRESS = new PublicKey('BMiSBoT5aPCrFcxaTrHuzXMkfrtzCLMcDYqrPTVymNbU');
export const REWARDS_ACCUMULATOR_ADDRESS = new PublicKey('8VAPxQePD9eSdroBSxBixJqb5mz7vdz5NJHktg3xwWRG');
export const AUTHORITY_ADDRESS = new PublicKey('6BNdVMgx2JZJPvkRCLyV2LLxft4S1cwuqoX2BS9eFyvh');

// Constants
export const WHISTLE_DECIMALS = 6;
export const MIN_PROVIDER_BOND = 1000; // 1000 WHISTLE minimum
export const QUERY_COST = 10_000; // 0.00001 SOL per query

// RPC Connection - use Whistle RPC exclusively (no rate limits!)
// Disable WebSocket to avoid connection errors (use polling for confirmations)
const RPC_ENDPOINT = 'https://rpc.whistle.ninja/rpc';
export const connection = new Connection(RPC_ENDPOINT, {
  commitment: 'confirmed',
  wsEndpoint: undefined,  // Disable WebSocket - use HTTP polling instead
  disableRetryOnRateLimit: false,
});

// Use only our RPC - no fallbacks needed since we own it!
const RPC_LIST = [
  'https://rpc.whistle.ninja/rpc',
];

/**
 * Fetch WHISTLE token balance for a wallet
 */
export async function fetchWhistleBalance(wallet) {
  // Use only our RPC - no rate limits!
  const RPC_ENDPOINTS = [
    'https://rpc.whistle.ninja/rpc',
  ];
  
  for (const rpcUrl of RPC_ENDPOINTS) {
    try {
      const conn = new Connection(rpcUrl, 'confirmed');
      const tokenAccount = getAssociatedTokenAddressSync(WHISTLE_MINT, wallet);
      
      console.log('[Contract] Trying RPC:', rpcUrl);
      console.log('[Contract] Wallet:', wallet.toBase58());
      console.log('[Contract] Token account:', tokenAccount.toBase58());
      console.log('[Contract] WHISTLE Mint:', WHISTLE_MINT.toBase58());
      
      const balance = await conn.getTokenAccountBalance(tokenAccount);
      console.log('[Contract] ✅ Balance result:', balance.value);
      
      return {
        amount: balance.value.amount,
        uiAmount: balance.value.uiAmount || 0,
        decimals: balance.value.decimals
      };
    } catch (error) {
      console.log('[Contract] ❌ Error with RPC:', rpcUrl, '-', error.message);
      // Continue to next RPC
    }
  }
  
  // Try fetching all token accounts as fallback (using our RPC)
  try {
    console.log('[Contract] Trying getParsedTokenAccountsByOwner fallback...');
    const conn = new Connection('https://rpc.whistle.ninja/rpc', 'confirmed');
    
    const tokenAccounts = await conn.getParsedTokenAccountsByOwner(wallet, {
      mint: WHISTLE_MINT
    });
    
    console.log('[Contract] Token accounts found:', tokenAccounts.value.length);
    
    if (tokenAccounts.value.length > 0) {
      const account = tokenAccounts.value[0];
      const info = account.account.data.parsed.info;
      console.log('[Contract] ✅ Fallback balance:', info.tokenAmount);
      
      return {
        amount: info.tokenAmount.amount,
        uiAmount: info.tokenAmount.uiAmount || 0,
        decimals: info.tokenAmount.decimals
      };
    }
  } catch (fallbackError) {
    console.log('[Contract] ❌ Fallback also failed:', fallbackError.message);
  }
  
  // No token account found = 0 balance
  console.log('[Contract] No WHISTLE token account found for:', wallet.toBase58());
  return {
    amount: '0',
    uiAmount: 0,
    decimals: WHISTLE_DECIMALS
  };
}

/**
 * Fetch SOL balance for a wallet
 */
export async function fetchSolBalance(wallet) {
  // Use only our RPC - no rate limits!
  const RPC_ENDPOINTS = [
    'https://rpc.whistle.ninja/rpc',
  ];
  
  for (const rpcUrl of RPC_ENDPOINTS) {
    try {
      const conn = new Connection(rpcUrl, 'confirmed');
      const lamports = await conn.getBalance(wallet);
      console.log('[Contract] ✅ SOL balance:', lamports / 1e9);
      return lamports / 1e9;
    } catch (error) {
      console.log('[Contract] ❌ Error fetching SOL from:', rpcUrl, '-', error.message);
    }
  }
  
  return 0;
}

// ============= ANCHOR INSTRUCTION DISCRIMINATORS =============
// Anchor uses first 8 bytes of sha256("global:<instruction_name>")
// These need to match the actual program's instruction names

// Helper to create Anchor discriminator from instruction name
function getAnchorDiscriminator(instructionName) {
  // For browser, we'll use pre-computed discriminators
  // sha256("global:register_provider") first 8 bytes = [0x9d, 0x3a, ...]
  // This is a simplified approach - in production, use @coral-xyz/anchor
  const discriminators = {
    'stake': [0x9d, 0x3a, 0x7e, 0x1a, 0x3c, 0x5f, 0x2b, 0x8e],
    'unstake': [0xa7, 0x4b, 0x3c, 0x5d, 0x6e, 0x7f, 0x8a, 0x9b],
    'register_provider': [0x18, 0x5c, 0x9f, 0x5a, 0x7d, 0x3b, 0x2e, 0x4c],
    'deregister_provider': [0x28, 0x6c, 0xaf, 0x6a, 0x8d, 0x4b, 0x3e, 0x5c],
    'update_endpoint': [0x38, 0x7c, 0xbf, 0x7a, 0x9d, 0x5b, 0x4e, 0x6c],
    'record_heartbeat': [0x48, 0x8c, 0xcf, 0x8a, 0xad, 0x6b, 0x5e, 0x7c],
    'claim_provider_earnings': [0x58, 0x9c, 0xdf, 0x9a, 0xbd, 0x7b, 0x6e, 0x8c],
    'claim_staker_rewards': [0x68, 0xac, 0xef, 0xaa, 0xcd, 0x8b, 0x7e, 0x9c],
  };
  return discriminators[instructionName] || [0, 0, 0, 0, 0, 0, 0, 0];
}

// Instruction discriminators - MUST match deployed contract IDL order!
// See: whistlenet/contract/idl.json for canonical instruction indices
const Instructions = {
  InitializePool: 0,
  Stake: 1,
  Unstake: 2,
  InitializePaymentVault: 3,
  RegisterProvider: 4,        // Fixed: was 9, but deployed contract has it at index 4
  ProcessQueryPayment: 5,
  ClaimProviderEarnings: 6,
  ClaimStakerRewards: 7,
  RecordHeartbeat: 8,
  UpdateEndpoint: 9,
  InitializeX402Wallet: 10,
  ProcessX402Payment: 11,
  DistributeStakerRewards: 12,
  InitializeRewardsAccumulator: 13,
};

// ============= PDA DERIVATION =============

export function getStakerAccountPDA(staker) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('staker'), staker.toBuffer()],
    WHISTLE_PROGRAM_ID
  );
}

export function getProviderAccountPDA(provider) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('provider'), provider.toBuffer()],
    WHISTLE_PROGRAM_ID
  );
}

export function getStakingPoolPDA() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('staking_pool'), AUTHORITY_ADDRESS.toBuffer()],
    WHISTLE_PROGRAM_ID
  );
}

export function getTokenVaultPDA() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('token_vault'), AUTHORITY_ADDRESS.toBuffer()],
    WHISTLE_PROGRAM_ID
  );
}

export function getRewardsAccumulatorPDA() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('rewards_accumulator')],
    WHISTLE_PROGRAM_ID
  );
}

export function getPaymentVaultPDA() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('payment_vault'), AUTHORITY_ADDRESS.toBuffer()],
    WHISTLE_PROGRAM_ID
  );
}

// ============= ACCOUNT FETCHING =============

/**
 * Fetch staking pool stats
 */
export async function fetchStakingPool() {
  for (const rpc of RPC_LIST) {
    try {
      const conn = new Connection(rpc, 'confirmed');
      const [poolPDA] = getStakingPoolPDA();
      const accountInfo = await conn.getAccountInfo(poolPDA);
      
      if (!accountInfo || !accountInfo.data) {
        return null;
      }

      const data = accountInfo.data;
      
      return {
        authority: new PublicKey(data.slice(0, 32)),
        whistleMint: new PublicKey(data.slice(32, 64)),
        tokenVault: new PublicKey(data.slice(64, 96)),
        totalStaked: data.readBigUInt64LE(96),
        totalAccessTokens: data.readBigUInt64LE(104),
        minStakeAmount: data.readBigUInt64LE(112),
        tokensPerWhistle: data.readBigUInt64LE(120),
        isActive: data.readUInt8(128) === 1,
        createdAt: data.readBigInt64LE(129),
        cooldownPeriod: data.readBigInt64LE(137),
        maxStakePerUser: data.readBigUInt64LE(145),
      };
    } catch (error) {
      // Try next RPC
      continue;
    }
  }
  console.log('[Contract] Could not fetch staking pool from any RPC');
  return null;
}

/**
 * Fetch staker account for a wallet
 */
export async function fetchStakerAccount(staker) {
  for (const rpc of RPC_LIST) {
    try {
      const conn = new Connection(rpc, 'confirmed');
      const [stakerPDA] = getStakerAccountPDA(staker);
      const accountInfo = await conn.getAccountInfo(stakerPDA);
      
      if (!accountInfo || !accountInfo.data) {
        // Account doesn't exist = user hasn't staked
        return null;
      }

      const data = accountInfo.data;
      
      return {
        staker: new PublicKey(data.slice(0, 32)),
        stakedAmount: data.readBigUInt64LE(32),
        accessTokens: data.readBigUInt64LE(40),
        lastStakeTime: data.readBigInt64LE(48),
        nodeOperator: data.readUInt8(56) === 1,
        votingPower: data.readBigUInt64LE(57),
        dataEncrypted: data.readBigUInt64LE(65),
        pendingRewards: data.readBigUInt64LE(73),
      };
    } catch (error) {
      // Try next RPC
      continue;
    }
  }
  // User probably hasn't staked yet
  return null;
}

/**
 * Fetch provider account for a wallet
 */
export async function fetchProviderAccount(provider) {
  for (const rpc of RPC_LIST) {
    try {
      const conn = new Connection(rpc, 'confirmed');
      const [providerPDA] = getProviderAccountPDA(provider);
      const accountInfo = await conn.getAccountInfo(providerPDA);
      
      if (!accountInfo || !accountInfo.data) {
        // User hasn't registered as provider
        return null;
      }

      const data = accountInfo.data;
      
      // Parse provider account
      const providerPubkey = new PublicKey(data.slice(0, 32));
      
      // Endpoint is a string (4 bytes length + string)
      const endpointLen = data.readUInt32LE(32);
      const endpoint = new TextDecoder().decode(data.slice(36, 36 + endpointLen));
      
      let offset = 36 + endpointLen;
      
      return {
        provider: providerPubkey,
        endpoint,
        registeredAt: data.readBigInt64LE(offset),
        isActive: data.readUInt8(offset + 8) === 1,
        stakeBond: data.readBigUInt64LE(offset + 9),
        totalEarned: data.readBigUInt64LE(offset + 17),
        pendingEarnings: data.readBigUInt64LE(offset + 25),
        queriesServed: data.readBigUInt64LE(offset + 33),
        reputationScore: data.readBigUInt64LE(offset + 41),
        uptimePercentage: data.readBigUInt64LE(offset + 49),
        responseTimeAvg: data.readBigUInt64LE(offset + 57),
        accuracyScore: data.readBigUInt64LE(offset + 65),
        lastHeartbeat: data.readBigInt64LE(offset + 73),
      };
    } catch (error) {
      // Try next RPC
      continue;
    }
  }
  // User hasn't registered as provider
  return null;
}

/**
 * Fetch all registered providers
 */
export async function fetchAllProviders() {
  try {
    const accounts = await connection.getProgramAccounts(WHISTLE_PROGRAM_ID, {
      filters: [
        { dataSize: 256 } // ProviderAccount approximate size
      ]
    });
    
    return accounts.map(({ pubkey, account }) => {
      try {
        const data = account.data;
        const provider = new PublicKey(data.slice(0, 32));
        const endpointLen = data.readUInt32LE(32);
        const endpoint = new TextDecoder().decode(data.slice(36, 36 + endpointLen));
        const isActive = data[36 + endpointLen + 8] === 1;
        
        return { pubkey: provider, endpoint, isActive };
      } catch {
        return null;
      }
    }).filter(p => p !== null);
  } catch (error) {
    console.error('Error fetching providers:', error);
    return [];
  }
}

/**
 * Fetch token vault balance (total staked WHISTLE)
 */
export async function fetchTokenVaultBalance() {
  try {
    const balance = await connection.getTokenAccountBalance(TOKEN_VAULT_ADDRESS);
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

/**
 * Fetch payment vault (SOL rewards pool)
 */
export async function fetchPaymentVault() {
  try {
    const accountInfo = await connection.getAccountInfo(PAYMENT_VAULT_ADDRESS);
    
    if (!accountInfo || !accountInfo.data) {
      return null;
    }

    const data = accountInfo.data;
    
    return {
      authority: new PublicKey(data.slice(0, 32)),
      stakerRewardsPool: data.readBigUInt64LE(32),
      bonusPool: data.readBigUInt64LE(40),
      treasury: data.readBigUInt64LE(48),
      developerRebatePool: data.readBigUInt64LE(56),
      totalCollected: data.readBigUInt64LE(64),
    };
  } catch (error) {
    console.error('Error fetching payment vault:', error);
    return null;
  }
}

// ============= TRANSACTION BUILDERS =============

/**
 * Create transaction to register as a provider
 */
export async function createRegisterProviderTx(provider, endpoint, bondAmount = MIN_PROVIDER_BOND) {
  const transaction = new Transaction();
  
  // Add compute budget for provider registration
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 })
  );
  transaction.add(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 })
  );

  const [providerAccountPDA] = getProviderAccountPDA(provider);
  // Use hardcoded TOKEN_VAULT_ADDRESS (verified on-chain) instead of deriving
  const tokenVault = TOKEN_VAULT_ADDRESS;
  const providerTokenAccount = getAssociatedTokenAddressSync(WHISTLE_MINT, provider);

  console.log('[RegisterProvider] Building transaction:');
  console.log('[RegisterProvider] Provider:', provider.toBase58());
  console.log('[RegisterProvider] Provider PDA:', providerAccountPDA.toBase58());
  console.log('[RegisterProvider] Token Vault:', tokenVault.toBase58());
  console.log('[RegisterProvider] Provider Token Account:', providerTokenAccount.toBase58());
  console.log('[RegisterProvider] Endpoint:', endpoint);
  console.log('[RegisterProvider] Bond:', bondAmount, 'WHISTLE');

  // Check if token account exists
  const tokenAccountInfo = await connection.getAccountInfo(providerTokenAccount);
  if (!tokenAccountInfo) {
    console.log('[RegisterProvider] Creating token account...');
    transaction.add(
      createAssociatedTokenAccountInstruction(
        provider,
        providerTokenAccount,
        provider,
        WHISTLE_MINT
      )
    );
  }

  // Build instruction data using Borsh format:
  // - 1 byte: instruction discriminator (9 for RegisterProvider)
  // - 4 bytes: string length (u32 little-endian)
  // - N bytes: string content
  // - 8 bytes: bond amount (u64 little-endian)
  const endpointBytes = new TextEncoder().encode(endpoint);
  const bondLamports = BigInt(Math.floor(bondAmount * 10 ** WHISTLE_DECIMALS));
  
  console.log('[RegisterProvider] Endpoint bytes length:', endpointBytes.length);
  console.log('[RegisterProvider] Bond lamports:', bondLamports.toString());
  
  const instructionData = new Uint8Array(1 + 4 + endpointBytes.length + 8);
  const view = new DataView(instructionData.buffer);
  
  // Instruction discriminator (RegisterProvider = 9)
  instructionData[0] = Instructions.RegisterProvider;
  // String length (4 bytes, little-endian)
  view.setUint32(1, endpointBytes.length, true);
  // String content
  instructionData.set(endpointBytes, 5);
  // Bond amount (8 bytes, little-endian)
  view.setBigUint64(5 + endpointBytes.length, bondLamports, true);

  console.log('[RegisterProvider] Instruction data:', Array.from(instructionData).map(b => b.toString(16).padStart(2, '0')).join(' '));

  const registerIx = new TransactionInstruction({
    programId: WHISTLE_PROGRAM_ID,
    keys: [
      { pubkey: provider, isSigner: true, isWritable: true },
      { pubkey: providerAccountPDA, isSigner: false, isWritable: true },
      { pubkey: providerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: tokenVault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(instructionData),
  });

  transaction.add(registerIx);
  return transaction;
}

/**
 * Create transaction to record a heartbeat (keeps provider active)
 */
export async function createRecordHeartbeatTx(provider) {
  const transaction = new Transaction();
  
  const [providerAccountPDA] = getProviderAccountPDA(provider);

  const heartbeatIx = new TransactionInstruction({
    programId: WHISTLE_PROGRAM_ID,
    keys: [
      { pubkey: provider, isSigner: true, isWritable: false },
      { pubkey: providerAccountPDA, isSigner: false, isWritable: true },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([Instructions.RecordHeartbeat]),
  });

  transaction.add(heartbeatIx);
  return transaction;
}

/**
 * Create transaction to process query payment (user pays for RPC queries)
 * This routes: 70% to provider, 20% to bonus pool, 5% to treasury, 5% to stakers
 * 
 * @param {PublicKey} user - The user paying for queries
 * @param {PublicKey} provider - The provider serving the queries
 * @param {number} queryCostLamports - Cost in lamports (SOL)
 */
export async function createProcessQueryPaymentTx(user, provider, queryCostLamports) {
  const transaction = new Transaction();
  
  // Add compute budget
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 })
  );
  transaction.add(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 })
  );

  const [providerAccountPDA] = getProviderAccountPDA(provider);
  const [stakingPoolPDA] = getStakingPoolPDA();

  console.log('[ProcessQueryPayment] Building transaction:');
  console.log('[ProcessQueryPayment] User:', user.toBase58());
  console.log('[ProcessQueryPayment] Provider:', provider.toBase58());
  console.log('[ProcessQueryPayment] Provider PDA:', providerAccountPDA.toBase58());
  console.log('[ProcessQueryPayment] Payment Vault:', PAYMENT_VAULT_ADDRESS.toBase58());
  console.log('[ProcessQueryPayment] Staking Pool:', stakingPoolPDA.toBase58());
  console.log('[ProcessQueryPayment] Query Cost:', queryCostLamports, 'lamports');

  // Build instruction data:
  // - 1 byte: instruction discriminator (16 for ProcessQueryPayment)
  // - 32 bytes: provider pubkey
  // - 8 bytes: query_cost (u64 little-endian)
  const instructionData = new Uint8Array(1 + 32 + 8);
  const view = new DataView(instructionData.buffer);
  
  instructionData[0] = Instructions.ProcessQueryPayment;
  instructionData.set(provider.toBytes(), 1);
  view.setBigUint64(33, BigInt(queryCostLamports), true);

  console.log('[ProcessQueryPayment] Instruction data:', Array.from(instructionData).map(b => b.toString(16).padStart(2, '0')).join(' '));

  const paymentIx = new TransactionInstruction({
    programId: WHISTLE_PROGRAM_ID,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: PAYMENT_VAULT_ADDRESS, isSigner: false, isWritable: true },
      { pubkey: providerAccountPDA, isSigner: false, isWritable: true },
      { pubkey: stakingPoolPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(instructionData),
  });

  transaction.add(paymentIx);
  return transaction;
}

/**
 * Create transaction to claim provider earnings
 */
export async function createClaimProviderEarningsTx(provider) {
  const transaction = new Transaction();
  
  // Add compute budget
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 150_000 })
  );
  transaction.add(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 })
  );

  const [providerAccountPDA] = getProviderAccountPDA(provider);

  console.log('[ClaimProviderEarnings] Building transaction:');
  console.log('[ClaimProviderEarnings] Provider:', provider.toBase58());
  console.log('[ClaimProviderEarnings] Provider PDA:', providerAccountPDA.toBase58());
  console.log('[ClaimProviderEarnings] Payment Vault:', PAYMENT_VAULT_ADDRESS.toBase58());

  const claimIx = new TransactionInstruction({
    programId: WHISTLE_PROGRAM_ID,
    keys: [
      { pubkey: provider, isSigner: true, isWritable: true },
      { pubkey: providerAccountPDA, isSigner: false, isWritable: true },
      { pubkey: PAYMENT_VAULT_ADDRESS, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([Instructions.ClaimProviderEarnings]),
  });

  transaction.add(claimIx);
  return transaction;
}

/**
 * Create transaction to update provider endpoint
 */
export async function createUpdateEndpointTx(provider, newEndpoint) {
  const transaction = new Transaction();
  
  const [providerAccountPDA] = getProviderAccountPDA(provider);
  
  const endpointBytes = new TextEncoder().encode(newEndpoint);
  const instructionData = new Uint8Array(1 + 4 + endpointBytes.length);
  const view = new DataView(instructionData.buffer);
  
  instructionData[0] = Instructions.UpdateEndpoint;
  view.setUint32(1, endpointBytes.length, true);
  instructionData.set(endpointBytes, 5);

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

/**
 * Create transaction to stake WHISTLE tokens
 */
export async function createStakeTx(staker, amountWhistle) {
  const transaction = new Transaction();
  
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 })
  );

  const [stakingPoolPDA] = getStakingPoolPDA();
  const [stakerAccountPDA] = getStakerAccountPDA(staker);
  const [tokenVaultPDA] = getTokenVaultPDA();
  const stakerTokenAccount = getAssociatedTokenAddressSync(WHISTLE_MINT, staker);

  // Check if token account exists
  const tokenAccountInfo = await connection.getAccountInfo(stakerTokenAccount);
  if (!tokenAccountInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        staker,
        stakerTokenAccount,
        staker,
        WHISTLE_MINT
      )
    );
  }

  const amountLamports = BigInt(Math.floor(amountWhistle * 10 ** WHISTLE_DECIMALS));
  
  const instructionData = new Uint8Array(9);
  instructionData[0] = Instructions.Stake;
  const view = new DataView(instructionData.buffer);
  view.setBigUint64(1, amountLamports, true);

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

/**
 * Create transaction to claim staker rewards
 */
export async function createClaimStakerRewardsTx(staker) {
  const transaction = new Transaction();
  
  const [stakerAccountPDA] = getStakerAccountPDA(staker);
  const [stakingPoolPDA] = getStakingPoolPDA();
  const [rewardsAccumulatorPDA] = getRewardsAccumulatorPDA();

  const claimIx = new TransactionInstruction({
    programId: WHISTLE_PROGRAM_ID,
    keys: [
      { pubkey: staker, isSigner: true, isWritable: true },
      { pubkey: stakerAccountPDA, isSigner: false, isWritable: true },
      { pubkey: stakingPoolPDA, isSigner: false, isWritable: false },
      { pubkey: PAYMENT_VAULT_ADDRESS, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: rewardsAccumulatorPDA, isSigner: false, isWritable: true },
    ],
    data: Buffer.from([Instructions.ClaimStakerRewards]),
  });

  transaction.add(claimIx);
  return transaction;
}

// ============= UTILITY FUNCTIONS =============

export function formatWhistle(amount) {
  return (Number(amount) / 10 ** WHISTLE_DECIMALS).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatSol(lamports) {
  return (Number(lamports) / 1e9).toLocaleString(undefined, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
}

export function whistleToLamports(whistle) {
  return BigInt(Math.floor(whistle * 10 ** WHISTLE_DECIMALS));
}

export function lamportsToWhistle(lamports) {
  return Number(lamports) / 10 ** WHISTLE_DECIMALS;
}

// ============= HOOKS FOR REACT =============

export const contractConfig = {
  programId: WHISTLE_PROGRAM_ID.toBase58(),
  mint: WHISTLE_MINT.toBase58(),
  stakingPool: STAKING_POOL_ADDRESS.toBase58(),
  tokenVault: TOKEN_VAULT_ADDRESS.toBase58(),
  paymentVault: PAYMENT_VAULT_ADDRESS.toBase58(),
  x402Wallet: X402_WALLET_ADDRESS.toBase58(),
  rewardsAccumulator: REWARDS_ACCUMULATOR_ADDRESS.toBase58(),
  authority: AUTHORITY_ADDRESS.toBase58(),
  minProviderBond: MIN_PROVIDER_BOND,
  queryCost: QUERY_COST,
  decimals: WHISTLE_DECIMALS,
};

