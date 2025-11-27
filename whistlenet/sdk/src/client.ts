/**
 * WHISTLE Network SDK Client
 * Main class for interacting with WHISTLE Network
 * @module client
 */

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
  Keypair,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import BN from 'bn.js';
import axios from 'axios';

import {
  WHISTLE_MINT,
  PROGRAM_ID,
  PDA_SEEDS,
  NETWORK_CONSTANTS,
  NETWORK_ENDPOINTS,
  WHISTLE_DECIMALS,
} from './constants';

import type {
  WhistleConfig,
  Network,
  StakerAccount,
  ProviderAccount,
  StakingPool,
  PaymentVault,
  TransactionResult,
  QueryRequest,
  TransactionData,
  TokenBalance,
  NFTData,
  ProviderInfo,
  StakeParams,
  UnstakeParams,
  RegisterProviderParams,
  EventListener,
  WhistleEvent,
} from './types';

/**
 * Main WHISTLE Network SDK Client
 * @class WhistleClient
 */
export class WhistleClient {
  private connection: Connection;
  private programId: PublicKey;
  private whistleMint: PublicKey;
  private network: Network;
  private listeners: EventListener[] = [];

  constructor(config: WhistleConfig = {}) {
    this.network = config.network || 'mainnet';
    
    // Set up connection
    if (config.connection) {
      this.connection = config.connection;
    } else if (config.rpcEndpoint) {
      this.connection = new Connection(config.rpcEndpoint, 'confirmed');
    } else {
      const endpoint = NETWORK_ENDPOINTS[this.network.toUpperCase() as keyof typeof NETWORK_ENDPOINTS];
      this.connection = new Connection(endpoint, 'confirmed');
    }

    this.programId = config.programId || PROGRAM_ID;
    this.whistleMint = config.whistleMint || WHISTLE_MINT;
  }

  // ============= PDA Derivation =============

  /**
   * Derive staking pool PDA
   */
  async getStakingPoolAddress(authority: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [PDA_SEEDS.STAKING_POOL, authority.toBuffer()],
      this.programId
    );
  }

  /**
   * Derive token vault PDA
   */
  async getTokenVaultAddress(authority: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [PDA_SEEDS.TOKEN_VAULT, authority.toBuffer()],
      this.programId
    );
  }

  /**
   * Derive payment vault PDA
   */
  async getPaymentVaultAddress(authority: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [PDA_SEEDS.PAYMENT_VAULT, authority.toBuffer()],
      this.programId
    );
  }

  /**
   * Derive staker account PDA
   */
  async getStakerAddress(wallet: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [PDA_SEEDS.STAKER, wallet.toBuffer()],
      this.programId
    );
  }

  /**
   * Derive provider account PDA
   */
  async getProviderAddress(provider: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [PDA_SEEDS.PROVIDER, provider.toBuffer()],
      this.programId
    );
  }

  // ============= Account Fetching =============

  /**
   * Fetch staker account data
   */
  async getStakerAccount(wallet: PublicKey): Promise<StakerAccount | null> {
    try {
      const [stakerPDA] = await this.getStakerAddress(wallet);
      const accountInfo = await this.connection.getAccountInfo(stakerPDA);
      
      if (!accountInfo) return null;
      
      // TODO: Deserialize using Borsh
      // For now, return placeholder
      return {
        staker: wallet,
        stakedAmount: BigInt(0),
        accessTokens: BigInt(0),
        lastStakeTime: BigInt(0),
        nodeOperator: false,
        votingPower: BigInt(0),
        dataEncrypted: BigInt(0),
        pendingRewards: BigInt(0),
        bump: 0,
      };
    } catch (error) {
      console.error('Error fetching staker account:', error);
      return null;
    }
  }

  /**
   * Fetch provider account data
   */
  async getProviderAccount(provider: PublicKey): Promise<ProviderAccount | null> {
    try {
      const [providerPDA] = await this.getProviderAddress(provider);
      const accountInfo = await this.connection.getAccountInfo(providerPDA);
      
      if (!accountInfo) return null;
      
      // TODO: Deserialize using Borsh
      return null;
    } catch (error) {
      console.error('Error fetching provider account:', error);
      return null;
    }
  }

  /**
   * Get user's WHISTLE token balance
   */
  async getWhistleBalance(wallet: PublicKey): Promise<number> {
    try {
      const tokenAccount = await getAssociatedTokenAddress(
        this.whistleMint,
        wallet
      );
      
      const balance = await this.connection.getTokenAccountBalance(tokenAccount);
      return Number(balance.value.uiAmount) || 0;
    } catch (error) {
      console.error('Error fetching WHISTLE balance:', error);
      return 0;
    }
  }

  // ============= Staking Operations =============

  /**
   * Stake WHISTLE tokens
   * @param params Staking parameters
   * @param signer Keypair to sign the transaction
   */
  async stake(params: StakeParams, signer: Keypair): Promise<TransactionResult> {
    try {
      const { amount, wallet } = params;
      
      // Convert amount to base units
      const amountBN = new BN(amount * Math.pow(10, WHISTLE_DECIMALS));
      
      // Derive PDAs
      const [poolPDA] = await this.getStakingPoolAddress(wallet);
      const [stakerPDA] = await this.getStakerAddress(wallet);
      const [tokenVaultPDA] = await this.getTokenVaultAddress(wallet);
      
      // Get user's token account
      const userTokenAccount = await getAssociatedTokenAddress(
        this.whistleMint,
        wallet
      );
      
      // TODO: Build instruction
      // This is a placeholder - need to serialize instruction data properly
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: wallet, isSigner: true, isWritable: true },
          { pubkey: poolPDA, isSigner: false, isWritable: true },
          { pubkey: stakerPDA, isSigner: false, isWritable: true },
          { pubkey: userTokenAccount, isSigner: false, isWritable: true },
          { pubkey: tokenVaultPDA, isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: this.programId,
        data: Buffer.from([]), // TODO: Serialize instruction data
      });
      
      const transaction = new Transaction().add(instruction);
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [signer]
      );
      
      this.emitEvent({
        type: 'staked',
        data: { user: wallet, amount: BigInt(amountBN.toString()) },
      });
      
      return { signature, confirmed: true };
    } catch (error: any) {
      console.error('Stake error:', error);
      return {
        signature: '',
        confirmed: false,
        error: error.message,
      };
    }
  }

  /**
   * Unstake WHISTLE tokens
   * @param params Unstaking parameters
   * @param signer Keypair to sign the transaction
   */
  async unstake(params: UnstakeParams, signer: Keypair): Promise<TransactionResult> {
    try {
      const { amount, wallet } = params;
      
      // Check cooldown period
      const stakerAccount = await this.getStakerAccount(wallet);
      if (stakerAccount) {
        const currentTime = Math.floor(Date.now() / 1000);
        const cooldownEnd = Number(stakerAccount.lastStakeTime) + NETWORK_CONSTANTS.COOLDOWN_PERIOD;
        
        if (currentTime < cooldownEnd) {
          throw new Error(`Cooldown period not met. Can unstake after ${new Date(cooldownEnd * 1000).toLocaleString()}`);
        }
      }
      
      // Convert amount to base units
      const amountBN = new BN(amount * Math.pow(10, WHISTLE_DECIMALS));
      
      // TODO: Build and send transaction (similar to stake)
      
      this.emitEvent({
        type: 'unstaked',
        data: { user: wallet, amount: BigInt(amountBN.toString()) },
      });
      
      return { signature: 'TODO', confirmed: true };
    } catch (error: any) {
      console.error('Unstake error:', error);
      return {
        signature: '',
        confirmed: false,
        error: error.message,
      };
    }
  }

  // ============= Provider Operations =============

  /**
   * Register as a provider
   */
  async registerProvider(
    params: RegisterProviderParams,
    signer: Keypair
  ): Promise<TransactionResult> {
    try {
      // TODO: Implement provider registration
      
      this.emitEvent({
        type: 'provider-registered',
        data: { provider: params.provider, endpoint: params.endpoint },
      });
      
      return { signature: 'TODO', confirmed: true };
    } catch (error: any) {
      console.error('Register provider error:', error);
      return {
        signature: '',
        confirmed: false,
        error: error.message,
      };
    }
  }

  /**
   * Get list of active providers
   */
  async getActiveProviders(): Promise<ProviderInfo[]> {
    try {
      // TODO: Fetch all provider accounts
      // This would scan the blockchain for provider PDAs
      return [];
    } catch (error) {
      console.error('Error fetching providers:', error);
      return [];
    }
  }

  /**
   * Select best provider based on reputation and latency
   */
  async selectProvider(): Promise<ProviderInfo | null> {
    const providers = await this.getActiveProviders();
    
    if (providers.length === 0) return null;
    
    // Sort by reputation score (descending)
    providers.sort((a, b) => b.reputationScore - a.reputationScore);
    
    // Return top provider
    return providers[0];
  }

  // ============= Query Operations =============

  /**
   * Query transactions for a wallet
   */
  async queryTransactions(
    request: QueryRequest
  ): Promise<TransactionData[]> {
    try {
      // Select provider
      const provider = await this.selectProvider();
      if (!provider) {
        throw new Error('No active providers available');
      }
      
      // Make API request to provider
      const response = await axios.get(`${provider.endpoint}/api/transactions`, {
        params: request,
      });
      
      return response.data;
    } catch (error) {
      console.error('Query error:', error);
      return [];
    }
  }

  /**
   * Get token balances for a wallet
   */
  async getTokenBalances(wallet: string): Promise<TokenBalance[]> {
    try {
      const provider = await this.selectProvider();
      if (!provider) {
        throw new Error('No active providers available');
      }
      
      const response = await axios.get(`${provider.endpoint}/api/balances`, {
        params: { wallet },
      });
      
      return response.data;
    } catch (error) {
      console.error('Get balances error:', error);
      return [];
    }
  }

  /**
   * Get NFTs for a wallet
   */
  async getNFTs(wallet: string): Promise<NFTData[]> {
    try {
      const provider = await this.selectProvider();
      if (!provider) {
        throw new Error('No active providers available');
      }
      
      const response = await axios.get(`${provider.endpoint}/api/nfts`, {
        params: { wallet },
      });
      
      return response.data;
    } catch (error) {
      console.error('Get NFTs error:', error);
      return [];
    }
  }

  // ============= Rewards Operations =============

  /**
   * Claim staker rewards (5% pool)
   */
  async claimRewards(wallet: PublicKey, signer: Keypair): Promise<TransactionResult> {
    try {
      // TODO: Build claim transaction
      
      this.emitEvent({
        type: 'rewards-claimed',
        data: { user: wallet, amount: BigInt(0) },
      });
      
      return { signature: 'TODO', confirmed: true };
    } catch (error: any) {
      console.error('Claim rewards error:', error);
      return {
        signature: '',
        confirmed: false,
        error: error.message,
      };
    }
  }

  // ============= Event System =============

  /**
   * Subscribe to SDK events
   */
  on(listener: EventListener): void {
    this.listeners.push(listener);
  }

  /**
   * Unsubscribe from SDK events
   */
  off(listener: EventListener): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: WhistleEvent): void {
    this.listeners.forEach(listener => listener(event));
  }

  // ============= Utility Methods =============

  /**
   * Convert WHISTLE tokens to base units
   */
  toBaseUnits(amount: number): bigint {
    return BigInt(Math.floor(amount * Math.pow(10, WHISTLE_DECIMALS)));
  }

  /**
   * Convert base units to WHISTLE tokens
   */
  fromBaseUnits(amount: bigint): number {
    return Number(amount) / Math.pow(10, WHISTLE_DECIMALS);
  }

  /**
   * Get network connection
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Get program ID
   */
  getProgramId(): PublicKey {
    return this.programId;
  }
}





