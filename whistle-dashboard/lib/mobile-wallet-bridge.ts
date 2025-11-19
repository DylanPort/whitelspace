/**
 * Mobile Wallet Bridge
 * Detects and connects to the in-app wallet created in main.html
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

export interface MobileWalletInfo {
  publicKey: string;
  hasWallet: boolean;
}

/**
 * Check if device is mobile
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const smallViewport = window.innerWidth < 768;
  
  return uaMobile || smallViewport;
}

/**
 * Check if there's an existing wallet from main.html
 */
export function getMobileWalletInfo(): MobileWalletInfo | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const hasWallet = localStorage.getItem('ghost_mobile_wallet');
    const savedAddress = localStorage.getItem('ghost_mobile_address');
    const wasConnected = localStorage.getItem('walletConnected');

    if (hasWallet && savedAddress && wasConnected === 'true') {
      return {
        publicKey: savedAddress,
        hasWallet: true,
      };
    }

    return null;
  } catch (error) {
    console.error('Error checking mobile wallet:', error);
    return null;
  }
}

/**
 * Get the Keypair from stored mobile wallet
 */
export async function getMobileWalletKeypair(): Promise<Keypair | null> {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const encryptedKey = localStorage.getItem('ghost_mobile_wallet');
    if (!encryptedKey) return null;

    // Try to decode the private key (stored in bs58 format)
    try {
      const secretKey = bs58.decode(encryptedKey);
      return Keypair.fromSecretKey(secretKey);
    } catch (e) {
      console.error('Failed to decode mobile wallet key:', e);
      return null;
    }
  } catch (error) {
    console.error('Error getting mobile wallet keypair:', error);
    return null;
  }
}

/**
 * Create a simple wallet adapter for mobile wallet
 */
export class MobileWalletAdapter {
  private _publicKey: PublicKey | null = null;
  private _connected: boolean = false;
  private _connecting: boolean = false;

  get publicKey(): PublicKey | null {
    return this._publicKey;
  }

  get connected(): boolean {
    return this._connected;
  }

  get connecting(): boolean {
    return this._connecting;
  }

  async connect(): Promise<void> {
    if (this._connected) return;

    this._connecting = true;

    try {
      const walletInfo = getMobileWalletInfo();
      if (!walletInfo) {
        throw new Error('No mobile wallet found');
      }

      this._publicKey = new PublicKey(walletInfo.publicKey);
      this._connected = true;
      
      console.log('✅ Connected to mobile wallet:', walletInfo.publicKey.slice(0, 8) + '...');
    } catch (error) {
      console.error('Failed to connect mobile wallet:', error);
      throw error;
    } finally {
      this._connecting = false;
    }
  }

  async disconnect(): Promise<void> {
    this._publicKey = null;
    this._connected = false;
  }

  async signTransaction(transaction: any): Promise<any> {
    const keypair = await getMobileWalletKeypair();
    if (!keypair) {
      throw new Error('Mobile wallet keypair not available');
    }

    transaction.partialSign(keypair);
    return transaction;
  }

  async signAllTransactions(transactions: any[]): Promise<any[]> {
    const keypair = await getMobileWalletKeypair();
    if (!keypair) {
      throw new Error('Mobile wallet keypair not available');
    }

    return transactions.map(tx => {
      tx.partialSign(keypair);
      return tx;
    });
  }
}

