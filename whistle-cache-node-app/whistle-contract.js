/**
 * WHISTLE Network Contract Integration for Cache Node Desktop App
 * Handles provider registration, heartbeats, and earnings claims
 */

const { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  ComputeBudgetProgram,
  Keypair,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} = require('@solana/web3.js');

const { 
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} = require('@solana/spl-token');

const bs58 = require('bs58').default;
const fs = require('fs');
const path = require('path');
const os = require('os');

// ============= CONTRACT ADDRESSES (MAINNET) =============

const WHISTLE_PROGRAM_ID = new PublicKey('whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr');
const WHISTLE_MINT = new PublicKey('6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump');
const STAKING_POOL_ADDRESS = new PublicKey('jVaoYCKUFjHkYw975R7tVvRgns5VdfnnquSp2gzwPXB');
const TOKEN_VAULT_ADDRESS = new PublicKey('6AP8c7sCQsm2FMvNJw6fQN5PnMdkySH75h7EPE2kD3Yq');
const PAYMENT_VAULT_ADDRESS = new PublicKey('CU1ZcHccCbQT8iA6pcb3ZyTjog8ckmDHH8gaAmKfC73G');
const AUTHORITY_ADDRESS = new PublicKey('6BNdVMgx2JZJPvkRCLyV2LLxft4S1cwuqoX2BS9eFyvh');

// Constants
const WHISTLE_DECIMALS = 6;
const MIN_PROVIDER_BOND = 1000; // 1000 WHISTLE minimum

// RPC Endpoints
const RPC_ENDPOINTS = [
  'https://rpc.whistle.ninja/rpc',
  'https://api.mainnet-beta.solana.com',
];

// Instruction discriminators - MUST match deployed contract
const Instructions = {
  InitializePool: 0,
  Stake: 1,
  Unstake: 2,
  TransferAccess: 3,
  ActivateNodeOperator: 4,
  RecordDataUsage: 5,
  SetPoolStatus: 6,
  LockRate: 7,
  InitializePaymentVault: 8,
  RegisterProvider: 9,
  DeregisterProvider: 10,
  UpdateEndpoint: 11,
  RecordHeartbeat: 12,
  RecordQueryMetrics: 13,
  UpdateReputationMetrics: 14,
  SlashProvider: 15,
  ProcessQueryPayment: 16,
  ClaimProviderEarnings: 17,
  DistributeBonusPool: 18,
  DistributeStakerRewards: 19,
  ClaimStakerRewards: 20,
};

class WhistleContract {
  constructor() {
    this.connection = null;
    this.keypair = null;
    this.walletPath = path.join(os.homedir(), '.whistle-cache-node', 'wallet.json');
  }

  // ============= CONNECTION =============

  async connect() {
    for (const rpc of RPC_ENDPOINTS) {
      try {
        this.connection = new Connection(rpc, 'confirmed');
        // Test connection
        await this.connection.getSlot();
        console.log('[Contract] Connected to RPC:', rpc);
        return true;
      } catch (error) {
        console.log('[Contract] Failed to connect to:', rpc);
      }
    }
    throw new Error('Failed to connect to any RPC endpoint');
  }

  // ============= WALLET MANAGEMENT =============

  hasWallet() {
    return fs.existsSync(this.walletPath);
  }

  getWalletAddress() {
    if (!this.keypair) return null;
    return this.keypair.publicKey.toBase58();
  }

  async loadWallet() {
    if (!this.hasWallet()) {
      throw new Error('No wallet found. Import or generate one first.');
    }

    try {
      const walletData = JSON.parse(fs.readFileSync(this.walletPath, 'utf-8'));
      this.keypair = Keypair.fromSecretKey(Uint8Array.from(walletData));
      console.log('[Contract] Wallet loaded:', this.keypair.publicKey.toBase58());
      return this.keypair.publicKey.toBase58();
    } catch (error) {
      throw new Error('Failed to load wallet: ' + error.message);
    }
  }

  async importWallet(privateKey) {
    try {
      // Support both JSON array and base58 formats
      let secretKey;
      
      if (privateKey.startsWith('[')) {
        // JSON array format
        secretKey = Uint8Array.from(JSON.parse(privateKey));
      } else {
        // Base58 format
        secretKey = bs58.decode(privateKey);
      }

      this.keypair = Keypair.fromSecretKey(secretKey);
      
      // Save to file
      const walletDir = path.dirname(this.walletPath);
      if (!fs.existsSync(walletDir)) {
        fs.mkdirSync(walletDir, { recursive: true });
      }
      fs.writeFileSync(this.walletPath, JSON.stringify(Array.from(secretKey)));
      
      console.log('[Contract] Wallet imported:', this.keypair.publicKey.toBase58());
      return this.keypair.publicKey.toBase58();
    } catch (error) {
      throw new Error('Failed to import wallet: ' + error.message);
    }
  }

  async generateWallet() {
    this.keypair = Keypair.generate();
    
    // Save to file
    const walletDir = path.dirname(this.walletPath);
    if (!fs.existsSync(walletDir)) {
      fs.mkdirSync(walletDir, { recursive: true });
    }
    fs.writeFileSync(
      this.walletPath, 
      JSON.stringify(Array.from(this.keypair.secretKey))
    );
    
    console.log('[Contract] New wallet generated:', this.keypair.publicKey.toBase58());
    return {
      publicKey: this.keypair.publicKey.toBase58(),
      privateKey: bs58.encode(this.keypair.secretKey),
    };
  }

  exportPrivateKey() {
    if (!this.keypair) {
      throw new Error('No wallet loaded');
    }
    return bs58.encode(this.keypair.secretKey);
  }

  // ============= PDA DERIVATION =============

  getProviderAccountPDA(provider) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('provider'), provider.toBuffer()],
      WHISTLE_PROGRAM_ID
    );
  }

  getStakingPoolPDA() {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('staking_pool'), AUTHORITY_ADDRESS.toBuffer()],
      WHISTLE_PROGRAM_ID
    );
  }

  // ============= BALANCE FETCHING =============

  async getBalances() {
    if (!this.keypair || !this.connection) {
      return { sol: 0, whistle: 0 };
    }

    try {
      // Get SOL balance
      const solBalance = await this.connection.getBalance(this.keypair.publicKey);
      
      // Get WHISTLE balance
      let whistleBalance = 0;
      try {
        const tokenAccount = getAssociatedTokenAddressSync(
          WHISTLE_MINT, 
          this.keypair.publicKey
        );
        const balance = await this.connection.getTokenAccountBalance(tokenAccount);
        whistleBalance = balance.value.uiAmount || 0;
      } catch {
        // No token account = 0 balance
      }

      return {
        sol: solBalance / LAMPORTS_PER_SOL,
        whistle: whistleBalance,
      };
    } catch (error) {
      console.error('[Contract] Error fetching balances:', error);
      return { sol: 0, whistle: 0 };
    }
  }

  // ============= PROVIDER STATUS =============

  async getProviderStatusByAddress(walletAddress) {
    if (!this.connection) {
      await this.connect();
    }

    try {
      const providerPubkey = new PublicKey(walletAddress);
      const [providerPDA] = this.getProviderAccountPDA(providerPubkey);
      
      console.log('[Contract] Checking provider PDA:', providerPDA.toBase58());
      
      const accountInfo = await this.connection.getAccountInfo(providerPDA);
      
      if (!accountInfo || !accountInfo.data) {
        console.log('[Contract] No provider account found');
        return null; // Not registered
      }

      const data = accountInfo.data;
      
      // Parse provider account
      const provider = new PublicKey(data.slice(0, 32));
      const endpointLen = data.readUInt32LE(32);
      const endpoint = new TextDecoder().decode(data.slice(36, 36 + endpointLen));
      
      let offset = 36 + endpointLen;
      
      return {
        provider: provider.toBase58(),
        endpoint,
        registeredAt: Number(data.readBigInt64LE(offset)),
        isActive: data.readUInt8(offset + 8) === 1,
        stakeBond: Number(data.readBigUInt64LE(offset + 9)) / 10 ** WHISTLE_DECIMALS,
        totalEarned: Number(data.readBigUInt64LE(offset + 17)) / LAMPORTS_PER_SOL,
        pendingEarnings: Number(data.readBigUInt64LE(offset + 25)) / LAMPORTS_PER_SOL,
        queriesServed: Number(data.readBigUInt64LE(offset + 33)),
        reputationScore: Number(data.readBigUInt64LE(offset + 41)),
        uptimePercentage: Number(data.readBigUInt64LE(offset + 49)),
        responseTimeAvg: Number(data.readBigUInt64LE(offset + 57)),
        lastHeartbeat: Number(data.readBigInt64LE(offset + 73)),
      };
    } catch (error) {
      console.error('[Contract] Error fetching provider status:', error);
      return null;
    }
  }

  // ============= REGISTER PROVIDER =============

  async registerProvider(endpoint, bondAmount = MIN_PROVIDER_BOND) {
    if (!this.keypair || !this.connection) {
      throw new Error('Wallet not connected');
    }

    console.log('[Contract] Registering provider...');
    console.log('[Contract] Endpoint:', endpoint);
    console.log('[Contract] Bond:', bondAmount, 'WHISTLE');

    const transaction = new Transaction();
    
    // Add compute budget
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 })
    );
    transaction.add(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 })
    );

    const [providerAccountPDA] = this.getProviderAccountPDA(this.keypair.publicKey);
    const providerTokenAccount = getAssociatedTokenAddressSync(
      WHISTLE_MINT, 
      this.keypair.publicKey
    );

    // Check if token account exists
    const tokenAccountInfo = await this.connection.getAccountInfo(providerTokenAccount);
    if (!tokenAccountInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          this.keypair.publicKey,
          providerTokenAccount,
          this.keypair.publicKey,
          WHISTLE_MINT
        )
      );
    }

    // Build instruction data
    const endpointBytes = new TextEncoder().encode(endpoint);
    const bondLamports = BigInt(Math.floor(bondAmount * 10 ** WHISTLE_DECIMALS));
    
    const instructionData = new Uint8Array(1 + 4 + endpointBytes.length + 8);
    const view = new DataView(instructionData.buffer);
    
    instructionData[0] = Instructions.RegisterProvider;
    view.setUint32(1, endpointBytes.length, true);
    instructionData.set(endpointBytes, 5);
    view.setBigUint64(5 + endpointBytes.length, bondLamports, true);

    const registerIx = new TransactionInstruction({
      programId: WHISTLE_PROGRAM_ID,
      keys: [
        { pubkey: this.keypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: providerAccountPDA, isSigner: false, isWritable: true },
        { pubkey: providerTokenAccount, isSigner: false, isWritable: true },
        { pubkey: TOKEN_VAULT_ADDRESS, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
      ],
      data: Buffer.from(instructionData),
    });

    transaction.add(registerIx);

    // Send transaction
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.keypair.publicKey;

    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [this.keypair]
    );

    console.log('[Contract] Provider registered! Signature:', signature);
    return signature;
  }

  // ============= RECORD HEARTBEAT =============

  async recordHeartbeat() {
    if (!this.keypair || !this.connection) {
      throw new Error('Wallet not connected');
    }

    const transaction = new Transaction();
    const [providerAccountPDA] = this.getProviderAccountPDA(this.keypair.publicKey);

    const heartbeatIx = new TransactionInstruction({
      programId: WHISTLE_PROGRAM_ID,
      keys: [
        { pubkey: this.keypair.publicKey, isSigner: true, isWritable: false },
        { pubkey: providerAccountPDA, isSigner: false, isWritable: true },
        { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
      ],
      data: Buffer.from([Instructions.RecordHeartbeat]),
    });

    transaction.add(heartbeatIx);

    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.keypair.publicKey;

    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [this.keypair]
    );

    console.log('[Contract] Heartbeat recorded! Signature:', signature);
    return signature;
  }

  // ============= CLAIM EARNINGS =============

  async claimEarnings() {
    if (!this.keypair || !this.connection) {
      throw new Error('Wallet not connected');
    }

    const transaction = new Transaction();
    
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 150_000 })
    );
    transaction.add(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 })
    );

    const [providerAccountPDA] = this.getProviderAccountPDA(this.keypair.publicKey);

    const claimIx = new TransactionInstruction({
      programId: WHISTLE_PROGRAM_ID,
      keys: [
        { pubkey: this.keypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: providerAccountPDA, isSigner: false, isWritable: true },
        { pubkey: PAYMENT_VAULT_ADDRESS, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.from([Instructions.ClaimProviderEarnings]),
    });

    transaction.add(claimIx);

    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.keypair.publicKey;

    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [this.keypair]
    );

    console.log('[Contract] Earnings claimed! Signature:', signature);
    return signature;
  }

  // ============= UPDATE ENDPOINT =============

  async updateEndpoint(newEndpoint) {
    if (!this.keypair || !this.connection) {
      throw new Error('Wallet not connected');
    }

    const transaction = new Transaction();
    const [providerAccountPDA] = this.getProviderAccountPDA(this.keypair.publicKey);
    
    const endpointBytes = new TextEncoder().encode(newEndpoint);
    const instructionData = new Uint8Array(1 + 4 + endpointBytes.length);
    const view = new DataView(instructionData.buffer);
    
    instructionData[0] = Instructions.UpdateEndpoint;
    view.setUint32(1, endpointBytes.length, true);
    instructionData.set(endpointBytes, 5);

    const updateIx = new TransactionInstruction({
      programId: WHISTLE_PROGRAM_ID,
      keys: [
        { pubkey: this.keypair.publicKey, isSigner: true, isWritable: false },
        { pubkey: providerAccountPDA, isSigner: false, isWritable: true },
      ],
      data: Buffer.from(instructionData),
    });

    transaction.add(updateIx);

    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.keypair.publicKey;

    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [this.keypair]
    );

    console.log('[Contract] Endpoint updated! Signature:', signature);
    return signature;
  }
}

module.exports = WhistleContract;
module.exports.MIN_PROVIDER_BOND = MIN_PROVIDER_BOND;
module.exports.WHISTLE_DECIMALS = WHISTLE_DECIMALS;

