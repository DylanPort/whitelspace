/**
 * Privacy Vault Client Integration
 * Use this code in your frontend (index.html)
 */

// Copy this into your React component or index.html <script> section

const PRIVACY_VAULT_CONFIG = {
  // UPDATE THESE AFTER DEPLOYMENT
  PROGRAM_ID: 'YOUR_PROGRAM_ID_HERE',
  VAULT_STATE: 'YOUR_VAULT_STATE_HERE',
  VAULT_TOKEN_ACCOUNT: 'YOUR_VAULT_TOKEN_ACCOUNT_HERE',
  WHISTLE_MINT: '6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump',
};

// ===== DEPOSIT FUNCTION =====
async function depositToVault(amount) {
  if (!window.solana) {
    alert('Please install Phantom wallet');
    return;
  }

  try {
    const { Connection, PublicKey, Transaction, SystemProgram } = solanaWeb3;
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    
    // Get user wallet
    const wallet = await window.solana.connect();
    const userPubkey = wallet.publicKey;

    // Get user's WHISTLE token account
    const userTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(PRIVACY_VAULT_CONFIG.WHISTLE_MINT),
      userPubkey
    );

    // Find user position PDA
    const [userPositionPDA] = await PublicKey.findProgramAddress(
      [
        Buffer.from('user-position'),
        userPubkey.toBuffer(),
        new PublicKey(PRIVACY_VAULT_CONFIG.VAULT_STATE).toBuffer(),
      ],
      new PublicKey(PRIVACY_VAULT_CONFIG.PROGRAM_ID)
    );

    // Check if user position account exists, create if not
    const userPositionInfo = await connection.getAccountInfo(userPositionPDA);
    const transaction = new Transaction();

    if (!userPositionInfo) {
      // Create user position account
      const rentExemption = await connection.getMinimumBalanceForRentExemption(1000);
      transaction.add(
        SystemProgram.createAccount({
          fromPubkey: userPubkey,
          newAccountPubkey: userPositionPDA,
          lamports: rentExemption,
          space: 1000,
          programId: new PublicKey(PRIVACY_VAULT_CONFIG.PROGRAM_ID),
        })
      );
    }

    // Create deposit instruction
    const depositInstructionData = Buffer.concat([
      Buffer.from([1]), // Instruction discriminator for Deposit
      Buffer.from(new BigUint64Array([BigInt(amount * 1e9)]).buffer), // Amount in lamports
    ]);

    const depositInstruction = new solanaWeb3.TransactionInstruction({
      keys: [
        { pubkey: userPubkey, isSigner: true, isWritable: true },
        { pubkey: userTokenAccount, isSigner: false, isWritable: true },
        { pubkey: new PublicKey(PRIVACY_VAULT_CONFIG.VAULT_STATE), isSigner: false, isWritable: true },
        { pubkey: new PublicKey(PRIVACY_VAULT_CONFIG.VAULT_TOKEN_ACCOUNT), isSigner: false, isWritable: true },
        { pubkey: userPositionPDA, isSigner: false, isWritable: true },
        { pubkey: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), isSigner: false, isWritable: false },
        { pubkey: new PublicKey('SysvarC1ock11111111111111111111111111111111'), isSigner: false, isWritable: false },
      ],
      programId: new PublicKey(PRIVACY_VAULT_CONFIG.PROGRAM_ID),
      data: depositInstructionData,
    });

    transaction.add(depositInstruction);

    // Send transaction
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPubkey;

    const signed = await window.solana.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(signature, 'confirmed');

    console.log('Deposit successful:', signature);
    return signature;
    
  } catch (error) {
    console.error('Deposit failed:', error);
    throw error;
  }
}

// ===== WITHDRAW FUNCTION =====
async function withdrawFromVault() {
  if (!window.solana) {
    alert('Please install Phantom wallet');
    return;
  }

  try {
    const { Connection, PublicKey, Transaction } = solanaWeb3;
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    
    // Get user wallet
    const wallet = await window.solana.connect();
    const userPubkey = wallet.publicKey;

    // Get user's WHISTLE token account
    const userTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(PRIVACY_VAULT_CONFIG.WHISTLE_MINT),
      userPubkey
    );

    // Find user position PDA
    const [userPositionPDA] = await PublicKey.findProgramAddress(
      [
        Buffer.from('user-position'),
        userPubkey.toBuffer(),
        new PublicKey(PRIVACY_VAULT_CONFIG.VAULT_STATE).toBuffer(),
      ],
      new PublicKey(PRIVACY_VAULT_CONFIG.PROGRAM_ID)
    );

    // Find vault authority PDA
    const [vaultAuthorityPDA] = await PublicKey.findProgramAddress(
      [
        Buffer.from('vault-authority'),
        new PublicKey(PRIVACY_VAULT_CONFIG.VAULT_STATE).toBuffer(),
      ],
      new PublicKey(PRIVACY_VAULT_CONFIG.PROGRAM_ID)
    );

    // Create withdraw instruction
    const withdrawInstructionData = Buffer.from([2]); // Instruction discriminator

    const withdrawInstruction = new solanaWeb3.TransactionInstruction({
      keys: [
        { pubkey: userPubkey, isSigner: true, isWritable: true },
        { pubkey: userTokenAccount, isSigner: false, isWritable: true },
        { pubkey: new PublicKey(PRIVACY_VAULT_CONFIG.VAULT_STATE), isSigner: false, isWritable: true },
        { pubkey: new PublicKey(PRIVACY_VAULT_CONFIG.VAULT_TOKEN_ACCOUNT), isSigner: false, isWritable: true },
        { pubkey: userPositionPDA, isSigner: false, isWritable: true },
        { pubkey: vaultAuthorityPDA, isSigner: false, isWritable: false },
        { pubkey: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), isSigner: false, isWritable: false },
        { pubkey: new PublicKey('SysvarC1ock11111111111111111111111111111111'), isSigner: false, isWritable: false },
      ],
      programId: new PublicKey(PRIVACY_VAULT_CONFIG.PROGRAM_ID),
      data: withdrawInstructionData,
    });

    const transaction = new Transaction().add(withdrawInstruction);

    // Send transaction
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPubkey;

    const signed = await window.solana.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(signature, 'confirmed');

    console.log('Withdrawal successful:', signature);
    return signature;
    
  } catch (error) {
    console.error('Withdrawal failed:', error);
    throw error;
  }
}

// ===== GET USER POSITION =====
async function getUserPosition(userPubkey) {
  try {
    const { Connection, PublicKey } = solanaWeb3;
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

    const [userPositionPDA] = await PublicKey.findProgramAddress(
      [
        Buffer.from('user-position'),
        new PublicKey(userPubkey).toBuffer(),
        new PublicKey(PRIVACY_VAULT_CONFIG.VAULT_STATE).toBuffer(),
      ],
      new PublicKey(PRIVACY_VAULT_CONFIG.PROGRAM_ID)
    );

    const accountInfo = await connection.getAccountInfo(userPositionPDA);
    
    if (!accountInfo) {
      return { shares: 0, deposited: 0 };
    }

    // Parse account data (simplified - use borsh in production)
    const data = accountInfo.data;
    // You'll need to properly deserialize based on your struct layout
    
    return {
      shares: 0, // Parse from data
      deposited: 0, // Parse from data
    };
  } catch (error) {
    console.error('Failed to get user position:', error);
    return { shares: 0, deposited: 0 };
  }
}

// ===== GET VAULT STATS =====
async function getVaultStats() {
  try {
    const { Connection, PublicKey } = solanaWeb3;
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

    const vaultStateInfo = await connection.getAccountInfo(
      new PublicKey(PRIVACY_VAULT_CONFIG.VAULT_STATE)
    );

    if (!vaultStateInfo) {
      return null;
    }

    // Parse vault state (simplified)
    // In production, use borsh.deserialize with proper schema
    
    return {
      totalDeposited: 0, // Parse from data
      totalShares: 0,
      totalDepositors: 0,
      currentPerformance: 0,
    };
  } catch (error) {
    console.error('Failed to get vault stats:', error);
    return null;
  }
}

// Helper: Get Associated Token Address
async function getAssociatedTokenAddress(mint, owner, allowOwnerOffCurve = false) {
  const { PublicKey } = solanaWeb3;
  const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
  const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

  const [address] = await PublicKey.findProgramAddress(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  return address;
}

// Export for use in index.html
if (typeof window !== 'undefined') {
  window.PrivacyVault = {
    deposit: depositToVault,
    withdraw: withdrawFromVault,
    getUserPosition,
    getVaultStats,
  };
}

