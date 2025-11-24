/**
 * Smart Contract Integration for Cache Nodes
 * Handles registration, query tracking, and payment distribution
 */

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import * as borsh from 'borsh';
import pino from 'pino';

const logger = pino();

// Contract configuration
const WHISTLE_PROGRAM_ID = new PublicKey('whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr');
const QUERY_COST_LAMPORTS = 0.0001 * LAMPORTS_PER_SOL; // 0.0001 SOL per query

// Payment split (matching contract)
const PAYMENT_SPLIT = {
  PROVIDER: 70,  // 70% to cache node operator
  BONUS: 20,     // 20% to top performers
  TREASURY: 5,   // 5% to treasury
  STAKERS: 5,    // 5% to stakers
};

// Instruction types
enum CacheNodeInstruction {
  RegisterCacheNode = 100,  // New instruction for cache nodes
  RecordCacheHit = 101,
  ClaimCacheEarnings = 102,
  UpdateCacheMetrics = 103,
}

// Cache node account structure
class CacheNodeAccount {
  nodeId: string;
  operator: PublicKey;
  endpoint: string;
  isActive: boolean;
  cacheHitsTotal: bigint;
  cacheHitsToday: bigint;
  pendingEarnings: bigint;
  totalEarned: bigint;
  lastHeartbeat: bigint;
  performanceScore: number;
  location: string;
  
  constructor(fields: any) {
    Object.assign(this, fields);
  }
  
  static schema = new Map([
    [CacheNodeAccount, {
      kind: 'struct',
      fields: [
        ['nodeId', 'string'],
        ['operator', [32]],
        ['endpoint', 'string'],
        ['isActive', 'u8'],
        ['cacheHitsTotal', 'u64'],
        ['cacheHitsToday', 'u64'],
        ['pendingEarnings', 'u64'],
        ['totalEarned', 'u64'],
        ['lastHeartbeat', 'i64'],
        ['performanceScore', 'u32'],
        ['location', 'string'],
      ],
    }],
  ]);
}

export class ContractIntegration {
  private connection: Connection;
  private operatorKeypair: Keypair | null = null;
  private cacheNodePDA: PublicKey | null = null;
  private paymentVaultPDA: PublicKey | null = null;
  
  constructor(
    rpcUrl: string,
    private nodeId: string,
    private operatorWallet?: string
  ) {
    this.connection = new Connection(rpcUrl, 'confirmed');
  }
  
  /**
   * Initialize with operator keypair
   */
  async initialize(keypairPath?: string) {
    try {
      if (keypairPath) {
        // Load keypair from file
        const fs = await import('fs');
        const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
        this.operatorKeypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
      } else if (this.operatorWallet) {
        // Use wallet address (read-only mode)
        logger.info(`Initialized in read-only mode with wallet: ${this.operatorWallet}`);
      } else {
        throw new Error('No operator wallet or keypair provided');
      }
      
      // Derive PDAs
      await this.derivePDAs();
      
      logger.info('Contract integration initialized');
    } catch (error) {
      logger.error('Failed to initialize contract integration:', error);
      throw error;
    }
  }
  
  /**
   * Derive Program Derived Addresses
   */
  private async derivePDAs() {
    const operatorPubkey = this.operatorKeypair 
      ? this.operatorKeypair.publicKey 
      : new PublicKey(this.operatorWallet!);
    
    // Cache node PDA
    [this.cacheNodePDA] = await PublicKey.findProgramAddress(
      [Buffer.from('cache_node'), Buffer.from(this.nodeId)],
      WHISTLE_PROGRAM_ID
    );
    
    // Payment vault PDA
    [this.paymentVaultPDA] = await PublicKey.findProgramAddress(
      [Buffer.from('payment_vault'), operatorPubkey.toBuffer()],
      WHISTLE_PROGRAM_ID
    );
  }
  
  /**
   * Register cache node on-chain
   */
  async registerCacheNode(endpoint: string, location: string): Promise<string> {
    if (!this.operatorKeypair) {
      throw new Error('Keypair required for registration');
    }
    
    try {
      const instruction = this.createRegisterInstruction(endpoint, location);
      const transaction = new Transaction().add(instruction);
      
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.operatorKeypair]
      );
      
      logger.info(`Cache node registered: ${signature}`);
      return signature;
    } catch (error) {
      logger.error('Failed to register cache node:', error);
      throw error;
    }
  }
  
  /**
   * Record cache hit on-chain (batched for efficiency)
   */
  async recordCacheHit(
    queryId: string,
    userPubkey: PublicKey,
    responseTime: number
  ): Promise<void> {
    if (!this.cacheNodePDA) {
      logger.warn('Cache node not registered on-chain');
      return;
    }
    
    try {
      // In production, batch these and submit periodically
      // For now, just track locally and submit summary
      await this.updateLocalMetrics(queryId, responseTime);
    } catch (error) {
      logger.error('Failed to record cache hit:', error);
    }
  }
  
  /**
   * Submit batched metrics to chain
   */
  async submitMetricsBatch(
    cacheHits: number,
    avgResponseTime: number,
    successRate: number
  ): Promise<string> {
    if (!this.operatorKeypair) {
      throw new Error('Keypair required for metric submission');
    }
    
    try {
      const instruction = this.createUpdateMetricsInstruction(
        cacheHits,
        avgResponseTime,
        successRate
      );
      
      const transaction = new Transaction().add(instruction);
      
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.operatorKeypair]
      );
      
      logger.info(`Metrics submitted: ${signature}`);
      return signature;
    } catch (error) {
      logger.error('Failed to submit metrics:', error);
      throw error;
    }
  }
  
  /**
   * Claim accumulated earnings
   */
  async claimEarnings(): Promise<{ amount: number; signature: string }> {
    if (!this.operatorKeypair) {
      throw new Error('Keypair required to claim earnings');
    }
    
    try {
      // Get current earnings
      const earnings = await this.getPendingEarnings();
      
      if (earnings === 0) {
        logger.info('No earnings to claim');
        return { amount: 0, signature: '' };
      }
      
      const instruction = this.createClaimInstruction();
      const transaction = new Transaction().add(instruction);
      
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.operatorKeypair]
      );
      
      logger.info(`Claimed ${earnings / LAMPORTS_PER_SOL} SOL: ${signature}`);
      return { 
        amount: earnings / LAMPORTS_PER_SOL, 
        signature 
      };
    } catch (error) {
      logger.error('Failed to claim earnings:', error);
      throw error;
    }
  }
  
  /**
   * Get pending earnings
   */
  async getPendingEarnings(): Promise<number> {
    if (!this.cacheNodePDA) {
      return 0;
    }
    
    try {
      const accountInfo = await this.connection.getAccountInfo(this.cacheNodePDA);
      if (!accountInfo) {
        return 0;
      }
      
      const cacheNode = borsh.deserialize(
        CacheNodeAccount.schema,
        CacheNodeAccount,
        accountInfo.data
      );
      
      return Number(cacheNode.pendingEarnings);
    } catch (error) {
      logger.error('Failed to get pending earnings:', error);
      return 0;
    }
  }
  
  /**
   * Get cache node stats
   */
  async getCacheNodeStats(): Promise<{
    cacheHitsTotal: number;
    cacheHitsToday: number;
    totalEarned: number;
    pendingEarnings: number;
    performanceScore: number;
  }> {
    if (!this.cacheNodePDA) {
      return {
        cacheHitsTotal: 0,
        cacheHitsToday: 0,
        totalEarned: 0,
        pendingEarnings: 0,
        performanceScore: 0,
      };
    }
    
    try {
      const accountInfo = await this.connection.getAccountInfo(this.cacheNodePDA);
      if (!accountInfo) {
        return {
          cacheHitsTotal: 0,
          cacheHitsToday: 0,
          totalEarned: 0,
          pendingEarnings: 0,
          performanceScore: 0,
        };
      }
      
      const cacheNode = borsh.deserialize(
        CacheNodeAccount.schema,
        CacheNodeAccount,
        accountInfo.data
      );
      
      return {
        cacheHitsTotal: Number(cacheNode.cacheHitsTotal),
        cacheHitsToday: Number(cacheNode.cacheHitsToday),
        totalEarned: Number(cacheNode.totalEarned) / LAMPORTS_PER_SOL,
        pendingEarnings: Number(cacheNode.pendingEarnings) / LAMPORTS_PER_SOL,
        performanceScore: cacheNode.performanceScore,
      };
    } catch (error) {
      logger.error('Failed to get cache node stats:', error);
      return {
        cacheHitsTotal: 0,
        cacheHitsToday: 0,
        totalEarned: 0,
        pendingEarnings: 0,
        performanceScore: 0,
      };
    }
  }
  
  /**
   * Calculate earnings for cache hits
   */
  calculateEarnings(cacheHits: number): {
    total: number;
    provider: number;
    bonus: number;
    treasury: number;
    stakers: number;
  } {
    const totalEarnings = cacheHits * QUERY_COST_LAMPORTS;
    
    return {
      total: totalEarnings / LAMPORTS_PER_SOL,
      provider: (totalEarnings * PAYMENT_SPLIT.PROVIDER / 100) / LAMPORTS_PER_SOL,
      bonus: (totalEarnings * PAYMENT_SPLIT.BONUS / 100) / LAMPORTS_PER_SOL,
      treasury: (totalEarnings * PAYMENT_SPLIT.TREASURY / 100) / LAMPORTS_PER_SOL,
      stakers: (totalEarnings * PAYMENT_SPLIT.STAKERS / 100) / LAMPORTS_PER_SOL,
    };
  }
  
  // Private helper methods
  
  private createRegisterInstruction(endpoint: string, location: string): any {
    // Implementation would create the actual instruction
    // This is a placeholder - actual implementation needs proper serialization
    return SystemProgram.transfer({
      fromPubkey: this.operatorKeypair!.publicKey,
      toPubkey: this.cacheNodePDA!,
      lamports: 0,
    });
  }
  
  private createUpdateMetricsInstruction(
    cacheHits: number,
    avgResponseTime: number,
    successRate: number
  ): any {
    // Placeholder for actual instruction
    return SystemProgram.transfer({
      fromPubkey: this.operatorKeypair!.publicKey,
      toPubkey: this.cacheNodePDA!,
      lamports: 0,
    });
  }
  
  private createClaimInstruction(): any {
    // Placeholder for actual instruction
    return SystemProgram.transfer({
      fromPubkey: this.cacheNodePDA!,
      toPubkey: this.operatorKeypair!.publicKey,
      lamports: 0,
    });
  }
  
  private async updateLocalMetrics(queryId: string, responseTime: number) {
    // Track metrics locally for batching
    // In production, use a proper database
  }
}

// Export for use in cache node
export default ContractIntegration;

 * Smart Contract Integration for Cache Nodes
 * Handles registration, query tracking, and payment distribution
 */

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import * as borsh from 'borsh';
import pino from 'pino';

const logger = pino();

// Contract configuration
const WHISTLE_PROGRAM_ID = new PublicKey('whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr');
const QUERY_COST_LAMPORTS = 0.0001 * LAMPORTS_PER_SOL; // 0.0001 SOL per query

// Payment split (matching contract)
const PAYMENT_SPLIT = {
  PROVIDER: 70,  // 70% to cache node operator
  BONUS: 20,     // 20% to top performers
  TREASURY: 5,   // 5% to treasury
  STAKERS: 5,    // 5% to stakers
};

// Instruction types
enum CacheNodeInstruction {
  RegisterCacheNode = 100,  // New instruction for cache nodes
  RecordCacheHit = 101,
  ClaimCacheEarnings = 102,
  UpdateCacheMetrics = 103,
}

// Cache node account structure
class CacheNodeAccount {
  nodeId: string;
  operator: PublicKey;
  endpoint: string;
  isActive: boolean;
  cacheHitsTotal: bigint;
  cacheHitsToday: bigint;
  pendingEarnings: bigint;
  totalEarned: bigint;
  lastHeartbeat: bigint;
  performanceScore: number;
  location: string;
  
  constructor(fields: any) {
    Object.assign(this, fields);
  }
  
  static schema = new Map([
    [CacheNodeAccount, {
      kind: 'struct',
      fields: [
        ['nodeId', 'string'],
        ['operator', [32]],
        ['endpoint', 'string'],
        ['isActive', 'u8'],
        ['cacheHitsTotal', 'u64'],
        ['cacheHitsToday', 'u64'],
        ['pendingEarnings', 'u64'],
        ['totalEarned', 'u64'],
        ['lastHeartbeat', 'i64'],
        ['performanceScore', 'u32'],
        ['location', 'string'],
      ],
    }],
  ]);
}

export class ContractIntegration {
  private connection: Connection;
  private operatorKeypair: Keypair | null = null;
  private cacheNodePDA: PublicKey | null = null;
  private paymentVaultPDA: PublicKey | null = null;
  
  constructor(
    rpcUrl: string,
    private nodeId: string,
    private operatorWallet?: string
  ) {
    this.connection = new Connection(rpcUrl, 'confirmed');
  }
  
  /**
   * Initialize with operator keypair
   */
  async initialize(keypairPath?: string) {
    try {
      if (keypairPath) {
        // Load keypair from file
        const fs = await import('fs');
        const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
        this.operatorKeypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
      } else if (this.operatorWallet) {
        // Use wallet address (read-only mode)
        logger.info(`Initialized in read-only mode with wallet: ${this.operatorWallet}`);
      } else {
        throw new Error('No operator wallet or keypair provided');
      }
      
      // Derive PDAs
      await this.derivePDAs();
      
      logger.info('Contract integration initialized');
    } catch (error) {
      logger.error('Failed to initialize contract integration:', error);
      throw error;
    }
  }
  
  /**
   * Derive Program Derived Addresses
   */
  private async derivePDAs() {
    const operatorPubkey = this.operatorKeypair 
      ? this.operatorKeypair.publicKey 
      : new PublicKey(this.operatorWallet!);
    
    // Cache node PDA
    [this.cacheNodePDA] = await PublicKey.findProgramAddress(
      [Buffer.from('cache_node'), Buffer.from(this.nodeId)],
      WHISTLE_PROGRAM_ID
    );
    
    // Payment vault PDA
    [this.paymentVaultPDA] = await PublicKey.findProgramAddress(
      [Buffer.from('payment_vault'), operatorPubkey.toBuffer()],
      WHISTLE_PROGRAM_ID
    );
  }
  
  /**
   * Register cache node on-chain
   */
  async registerCacheNode(endpoint: string, location: string): Promise<string> {
    if (!this.operatorKeypair) {
      throw new Error('Keypair required for registration');
    }
    
    try {
      const instruction = this.createRegisterInstruction(endpoint, location);
      const transaction = new Transaction().add(instruction);
      
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.operatorKeypair]
      );
      
      logger.info(`Cache node registered: ${signature}`);
      return signature;
    } catch (error) {
      logger.error('Failed to register cache node:', error);
      throw error;
    }
  }
  
  /**
   * Record cache hit on-chain (batched for efficiency)
   */
  async recordCacheHit(
    queryId: string,
    userPubkey: PublicKey,
    responseTime: number
  ): Promise<void> {
    if (!this.cacheNodePDA) {
      logger.warn('Cache node not registered on-chain');
      return;
    }
    
    try {
      // In production, batch these and submit periodically
      // For now, just track locally and submit summary
      await this.updateLocalMetrics(queryId, responseTime);
    } catch (error) {
      logger.error('Failed to record cache hit:', error);
    }
  }
  
  /**
   * Submit batched metrics to chain
   */
  async submitMetricsBatch(
    cacheHits: number,
    avgResponseTime: number,
    successRate: number
  ): Promise<string> {
    if (!this.operatorKeypair) {
      throw new Error('Keypair required for metric submission');
    }
    
    try {
      const instruction = this.createUpdateMetricsInstruction(
        cacheHits,
        avgResponseTime,
        successRate
      );
      
      const transaction = new Transaction().add(instruction);
      
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.operatorKeypair]
      );
      
      logger.info(`Metrics submitted: ${signature}`);
      return signature;
    } catch (error) {
      logger.error('Failed to submit metrics:', error);
      throw error;
    }
  }
  
  /**
   * Claim accumulated earnings
   */
  async claimEarnings(): Promise<{ amount: number; signature: string }> {
    if (!this.operatorKeypair) {
      throw new Error('Keypair required to claim earnings');
    }
    
    try {
      // Get current earnings
      const earnings = await this.getPendingEarnings();
      
      if (earnings === 0) {
        logger.info('No earnings to claim');
        return { amount: 0, signature: '' };
      }
      
      const instruction = this.createClaimInstruction();
      const transaction = new Transaction().add(instruction);
      
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.operatorKeypair]
      );
      
      logger.info(`Claimed ${earnings / LAMPORTS_PER_SOL} SOL: ${signature}`);
      return { 
        amount: earnings / LAMPORTS_PER_SOL, 
        signature 
      };
    } catch (error) {
      logger.error('Failed to claim earnings:', error);
      throw error;
    }
  }
  
  /**
   * Get pending earnings
   */
  async getPendingEarnings(): Promise<number> {
    if (!this.cacheNodePDA) {
      return 0;
    }
    
    try {
      const accountInfo = await this.connection.getAccountInfo(this.cacheNodePDA);
      if (!accountInfo) {
        return 0;
      }
      
      const cacheNode = borsh.deserialize(
        CacheNodeAccount.schema,
        CacheNodeAccount,
        accountInfo.data
      );
      
      return Number(cacheNode.pendingEarnings);
    } catch (error) {
      logger.error('Failed to get pending earnings:', error);
      return 0;
    }
  }
  
  /**
   * Get cache node stats
   */
  async getCacheNodeStats(): Promise<{
    cacheHitsTotal: number;
    cacheHitsToday: number;
    totalEarned: number;
    pendingEarnings: number;
    performanceScore: number;
  }> {
    if (!this.cacheNodePDA) {
      return {
        cacheHitsTotal: 0,
        cacheHitsToday: 0,
        totalEarned: 0,
        pendingEarnings: 0,
        performanceScore: 0,
      };
    }
    
    try {
      const accountInfo = await this.connection.getAccountInfo(this.cacheNodePDA);
      if (!accountInfo) {
        return {
          cacheHitsTotal: 0,
          cacheHitsToday: 0,
          totalEarned: 0,
          pendingEarnings: 0,
          performanceScore: 0,
        };
      }
      
      const cacheNode = borsh.deserialize(
        CacheNodeAccount.schema,
        CacheNodeAccount,
        accountInfo.data
      );
      
      return {
        cacheHitsTotal: Number(cacheNode.cacheHitsTotal),
        cacheHitsToday: Number(cacheNode.cacheHitsToday),
        totalEarned: Number(cacheNode.totalEarned) / LAMPORTS_PER_SOL,
        pendingEarnings: Number(cacheNode.pendingEarnings) / LAMPORTS_PER_SOL,
        performanceScore: cacheNode.performanceScore,
      };
    } catch (error) {
      logger.error('Failed to get cache node stats:', error);
      return {
        cacheHitsTotal: 0,
        cacheHitsToday: 0,
        totalEarned: 0,
        pendingEarnings: 0,
        performanceScore: 0,
      };
    }
  }
  
  /**
   * Calculate earnings for cache hits
   */
  calculateEarnings(cacheHits: number): {
    total: number;
    provider: number;
    bonus: number;
    treasury: number;
    stakers: number;
  } {
    const totalEarnings = cacheHits * QUERY_COST_LAMPORTS;
    
    return {
      total: totalEarnings / LAMPORTS_PER_SOL,
      provider: (totalEarnings * PAYMENT_SPLIT.PROVIDER / 100) / LAMPORTS_PER_SOL,
      bonus: (totalEarnings * PAYMENT_SPLIT.BONUS / 100) / LAMPORTS_PER_SOL,
      treasury: (totalEarnings * PAYMENT_SPLIT.TREASURY / 100) / LAMPORTS_PER_SOL,
      stakers: (totalEarnings * PAYMENT_SPLIT.STAKERS / 100) / LAMPORTS_PER_SOL,
    };
  }
  
  // Private helper methods
  
  private createRegisterInstruction(endpoint: string, location: string): any {
    // Implementation would create the actual instruction
    // This is a placeholder - actual implementation needs proper serialization
    return SystemProgram.transfer({
      fromPubkey: this.operatorKeypair!.publicKey,
      toPubkey: this.cacheNodePDA!,
      lamports: 0,
    });
  }
  
  private createUpdateMetricsInstruction(
    cacheHits: number,
    avgResponseTime: number,
    successRate: number
  ): any {
    // Placeholder for actual instruction
    return SystemProgram.transfer({
      fromPubkey: this.operatorKeypair!.publicKey,
      toPubkey: this.cacheNodePDA!,
      lamports: 0,
    });
  }
  
  private createClaimInstruction(): any {
    // Placeholder for actual instruction
    return SystemProgram.transfer({
      fromPubkey: this.cacheNodePDA!,
      toPubkey: this.operatorKeypair!.publicKey,
      lamports: 0,
    });
  }
  
  private async updateLocalMetrics(queryId: string, responseTime: number) {
    // Track metrics locally for batching
    // In production, use a proper database
  }
}

// Export for use in cache node
export default ContractIntegration;
