/**
 * Solana Integration - x402 micropayments and wallet interaction
 */

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { PaymentParams, X402Payment } from '../types';

export interface SolanaConfig {
  wallet?: any;
  rpcUrl: string;
}

export class SolanaIntegration {
  private connection: Connection;
  private wallet: any;
  private config: SolanaConfig;

  constructor(config: SolanaConfig) {
    this.config = config;
    this.wallet = config.wallet;
    this.connection = new Connection(config.rpcUrl, 'confirmed');
  }

  /**
   * Create a payment transaction (x402 protocol)
   */
  async createPayment(params: PaymentParams | { amount: number; recipient: string }): Promise<X402Payment> {
    if (!this.wallet) {
      throw new Error('Wallet not connected');
    }

    const recipientKey = typeof params.recipient === 'string'
      ? new PublicKey(params.recipient)
      : params.recipient;

    // Create transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.wallet.publicKey,
        toPubkey: recipientKey,
        lamports: Math.floor(params.amount * LAMPORTS_PER_SOL)
      })
    );

    // Add x402 metadata if provided
    if ('metadata' in params && params.metadata) {
      // Add memo instruction for x402 protocol
      const memoData = JSON.stringify({
        protocol: 'x402',
        ...params.metadata
      });
      
      // Note: In production, use actual Memo program
      // This is simplified for demonstration
      transaction.add({
        keys: [],
        programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
        data: Buffer.from(memoData)
      } as any);
    }

    // Get recent blockhash
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.wallet.publicKey;

    return {
      transaction,
      signature: '', // Will be filled after sending
      amount: params.amount,
      timestamp: Date.now()
    };
  }

  /**
   * Send payment transaction
   */
  async sendPayment(payment: X402Payment): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not connected');
    }

    // Sign and send transaction
    const signed = await this.wallet.signTransaction(payment.transaction);
    const signature = await this.connection.sendRawTransaction(signed.serialize());
    
    // Confirm transaction
    await this.connection.confirmTransaction(signature, 'confirmed');
    
    payment.signature = signature;
    return signature;
  }

  /**
   * Check if wallet has sufficient balance
   */
  async hasBalance(amount: number): Promise<boolean> {
    if (!this.wallet) return false;
    
    const balance = await this.connection.getBalance(this.wallet.publicKey);
    return balance >= amount * LAMPORTS_PER_SOL;
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<number> {
    if (!this.wallet) return 0;
    
    const balance = await this.connection.getBalance(this.wallet.publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  /**
   * Verify stake (for stake-gated access)
   */
  async verifyStake(minStake: number): Promise<boolean> {
    if (!this.wallet) return false;
    
    // In production, check actual staking account
    // This is simplified
    const balance = await this.getBalance();
    return balance >= minStake;
  }

  /**
   * Update wallet connection
   */
  updateWallet(wallet: any): void {
    this.wallet = wallet;
  }

  /**
   * Get wallet address
   */
  getAddress(): string | null {
    return this.wallet?.publicKey?.toString() || null;
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return !!this.wallet && !!this.wallet.publicKey;
  }
}

