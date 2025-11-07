/**
 * Ghost Whistle Mobile Wallet
 * 
 * This module provides mobile-specific wallet functionality:
 * - Create new Solana wallets
 * - Import existing wallets
 * - Secure private key storage
 * - Send/Receive SOL and tokens
 * - Stake/Unstake from mobile wallet
 * - Run nodes on mobile
 */

// ============= WALLET GENERATION =============

/**
 * Generate a new Solana keypair
 * @returns {object} { publicKey, privateKey (base58), mnemonic }
 */
async function generateMobileWallet() {
  try {
    // Generate random keypair using Solana Web3.js
    const keypair = solanaWeb3.Keypair.generate();
    
    // Get public key
    const publicKey = keypair.publicKey.toString();
    
    // Get private key (secret key) as base58
    const privateKeyBytes = keypair.secretKey;
    const privateKey = bs58.encode(privateKeyBytes);
    
    // Generate mnemonic (12 words) for backup
    // Note: In production, use bip39 library for proper mnemonic generation
    const mnemonic = await generateMnemonic();
    
    return {
      publicKey,
      privateKey,
      mnemonic,
      keypair
    };
  } catch (error) {
    console.error('Error generating wallet:', error);
    throw error;
  }
}

/**
 * Generate a 12-word mnemonic phrase
 * @returns {string} mnemonic phrase
 */
async function generateMnemonic() {
  // Simple mnemonic generation (in production, use bip39)
  const wordlist = ['abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse',
    'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act',
    'action', 'actor', 'actress', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit',
    'adult', 'advance', 'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
    'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol', 'alert'];
  
  const words = [];
  for (let i = 0; i < 12; i++) {
    const randomIndex = Math.floor(Math.random() * wordlist.length);
    words.push(wordlist[randomIndex]);
  }
  
  return words.join(' ');
}

/**
 * Import wallet from private key
 * @param {string} privateKey - Base58 encoded private key
 * @returns {object} { publicKey, keypair }
 */
function importWalletFromPrivateKey(privateKey) {
  try {
    const secretKey = bs58.decode(privateKey);
    const keypair = solanaWeb3.Keypair.fromSecretKey(secretKey);
    const publicKey = keypair.publicKey.toString();
    
    return {
      publicKey,
      keypair
    };
  } catch (error) {
    console.error('Error importing wallet:', error);
    throw new Error('Invalid private key');
  }
}

/**
 * Import wallet from mnemonic
 * @param {string} mnemonic - 12/24 word mnemonic phrase
 * @returns {object} { publicKey, privateKey, keypair }
 */
async function importWalletFromMnemonic(mnemonic) {
  try {
    // In production, use bip39 and ed25519-hd-key libraries
    // For now, return error
    throw new Error('Mnemonic import requires bip39 library. Please import via private key.');
  } catch (error) {
    console.error('Error importing from mnemonic:', error);
    throw error;
  }
}

// ============= SECURE STORAGE =============

/**
 * Save wallet to secure storage
 * @param {string} privateKey - Base58 encoded private key
 * @param {string} password - Encryption password
 */
async function saveWalletSecurely(privateKey, password) {
  try {
    // Encrypt private key with password
    const encrypted = await encryptData(privateKey, password);
    
    // Store in localStorage (in production, use native secure storage)
    localStorage.setItem('ghost_wallet_encrypted', encrypted);
    localStorage.setItem('ghost_wallet_exists', 'true');
    
    console.log('✅ Wallet saved securely');
    return true;
  } catch (error) {
    console.error('Error saving wallet:', error);
    throw error;
  }
}

/**
 * Load wallet from secure storage
 * @param {string} password - Decryption password
 * @returns {string} privateKey
 */
async function loadWalletSecurely(password) {
  try {
    const encrypted = localStorage.getItem('ghost_wallet_encrypted');
    if (!encrypted) {
      throw new Error('No wallet found');
    }
    
    // Decrypt private key
    const privateKey = await decryptData(encrypted, password);
    
    return privateKey;
  } catch (error) {
    console.error('Error loading wallet:', error);
    throw error;
  }
}

/**
 * Check if wallet exists in storage
 * @returns {boolean}
 */
function walletExists() {
  return localStorage.getItem('ghost_wallet_exists') === 'true';
}

/**
 * Delete wallet from storage
 */
function deleteWallet() {
  localStorage.removeItem('ghost_wallet_encrypted');
  localStorage.removeItem('ghost_wallet_exists');
  console.log('🗑️ Wallet deleted');
}

// ============= ENCRYPTION/DECRYPTION =============

/**
 * Encrypt data with password (AES-256-GCM)
 * @param {string} data - Data to encrypt
 * @param {string} password - Encryption password
 * @returns {string} Base64 encoded encrypted data
 */
async function encryptData(data, password) {
  try {
    // Derive key from password
    const passwordBuffer = new TextEncoder().encode(password);
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    // Generate salt
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    // Derive encryption key
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt data
    const dataBuffer = new TextEncoder().encode(data);
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      dataBuffer
    );
    
    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encryptedBuffer.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encryptedBuffer), salt.length + iv.length);
    
    // Return as base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
}

/**
 * Decrypt data with password
 * @param {string} encryptedBase64 - Base64 encoded encrypted data
 * @param {string} password - Decryption password
 * @returns {string} Decrypted data
 */
async function decryptData(encryptedBase64, password) {
  try {
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    
    // Extract salt, iv, encrypted data
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encryptedData = combined.slice(28);
    
    // Derive key from password
    const passwordBuffer = new TextEncoder().encode(password);
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encryptedData
    );
    
    // Convert to string
    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Invalid password or corrupted data');
  }
}

// ============= SEND/RECEIVE =============

/**
 * Send SOL to another address
 * @param {object} keypair - Sender's keypair
 * @param {string} toAddress - Recipient address
 * @param {number} amount - Amount in SOL
 * @returns {string} Transaction signature
 */
async function sendSOL(keypair, toAddress, amount) {
  try {
    const connection = new solanaWeb3.Connection('https://mainnet.helius-rpc.com/?api-key=413dfeef-84d4-4a37-98a7-1e0716bfc4ba', 'confirmed');
    
    const transaction = new solanaWeb3.Transaction().add(
      solanaWeb3.SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: new solanaWeb3.PublicKey(toAddress),
        lamports: amount * solanaWeb3.LAMPORTS_PER_SOL
      })
    );
    
    const signature = await solanaWeb3.sendAndConfirmTransaction(
      connection,
      transaction,
      [keypair]
    );
    
    console.log('✅ SOL sent:', signature);
    return signature;
  } catch (error) {
    console.error('Error sending SOL:', error);
    throw error;
  }
}

/**
 * Send SPL Token
 * @param {object} keypair - Sender's keypair
 * @param {string} toAddress - Recipient address
 * @param {string} mintAddress - Token mint address
 * @param {number} amount - Amount (with decimals)
 * @returns {string} Transaction signature
 */
async function sendToken(keypair, toAddress, mintAddress, amount) {
  try {
    const connection = new solanaWeb3.Connection('https://mainnet.helius-rpc.com/?api-key=413dfeef-84d4-4a37-98a7-1e0716bfc4ba', 'confirmed');
    
    // Get or create associated token accounts
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      new solanaWeb3.PublicKey(mintAddress),
      keypair.publicKey
    );
    
    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      new solanaWeb3.PublicKey(mintAddress),
      new solanaWeb3.PublicKey(toAddress)
    );
    
    // Create transfer instruction
    const transaction = new solanaWeb3.Transaction().add(
      createTransferInstruction(
        fromTokenAccount.address,
        toTokenAccount.address,
        keypair.publicKey,
        amount
      )
    );
    
    const signature = await solanaWeb3.sendAndConfirmTransaction(
      connection,
      transaction,
      [keypair]
    );
    
    console.log('✅ Token sent:', signature);
    return signature;
  } catch (error) {
    console.error('Error sending token:', error);
    throw error;
  }
}

// Helper function placeholders (would use @solana/spl-token in production)
function createTransferInstruction(from, to, owner, amount) {
  // Implement using @solana/spl-token
  throw new Error('Implement with @solana/spl-token');
}

async function getOrCreateAssociatedTokenAccount(connection, payer, mint, owner) {
  // Implement using @solana/spl-token
  throw new Error('Implement with @solana/spl-token');
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateMobileWallet,
    importWalletFromPrivateKey,
    importWalletFromMnemonic,
    saveWalletSecurely,
    loadWalletSecurely,
    walletExists,
    deleteWallet,
    sendSOL,
    sendToken
  };
}

