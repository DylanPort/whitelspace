const { Connection, PublicKey, Transaction, TransactionInstruction, Keypair, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const crypto = require('crypto');

// Configuration
const PROGRAM_ID = new PublicKey('whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr');
const AUTHORITY_ADDRESS = new PublicKey('6BNdVMgx2JZJPvkRCLyV2LLxft4S1cwuqoX2BS9eFyvh');
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://rpc.whistle.ninja';
const MIN_THRESHOLD_SOL = parseFloat(process.env.X402_MIN_THRESHOLD || '0.01');
const RESERVE_SOL = parseFloat(process.env.X402_RESERVE || '0.001');

// Derive PDAs (X402 wallet uses seeds: ["x402_payment_wallet"] only, no authority)
function deriveX402WalletPDA() {
  const seeds = [
    Buffer.from('x402_payment_wallet')
  ];
  const [pda] = PublicKey.findProgramAddressSync(seeds, PROGRAM_ID);
  return pda;
}

function derivePaymentVaultPDA() {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('payment_vault'), AUTHORITY_ADDRESS.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

function deriveStakingPoolPDA() {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('staking_pool'), AUTHORITY_ADDRESS.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

// Calculate Anchor discriminator
function getAnchorDiscriminator(instructionName) {
  const preimage = `global:${instructionName}`;
  const hash = crypto.createHash('sha256').update(preimage).digest();
  return hash.slice(0, 8);
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { paymentTxSig, payer } = JSON.parse(event.body || '{}');
    
    if (!paymentTxSig) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'missing_payment_tx_sig' })
      };
    }

    console.log(`🔍 Checking if distribution needed after payment: ${paymentTxSig}`);

    const connection = new Connection(RPC_URL, 'confirmed');
    
    // Check X402 wallet balance
    const x402Wallet = deriveX402WalletPDA();
    const balance = await connection.getBalance(x402Wallet);
    const solBalance = balance / LAMPORTS_PER_SOL;
    
    console.log(`X402 Wallet Balance: ${solBalance} SOL (threshold: ${MIN_THRESHOLD_SOL} SOL)`);
    
    // Check if threshold met
    const reserveLamports = RESERVE_SOL * LAMPORTS_PER_SOL;
    const distributableLamports = Math.max(0, balance - reserveLamports);
    const distributableSol = distributableLamports / LAMPORTS_PER_SOL;
    
    if (distributableSol < MIN_THRESHOLD_SOL) {
      console.log(`ℹ️ Balance below threshold, skipping distribution`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          triggered: false,
          reason: 'below_threshold',
          balance: solBalance,
          threshold: MIN_THRESHOLD_SOL
        })
      };
    }

    // Load authority keypair from environment
    const authorityKeypairBase64 = process.env.AUTHORITY_KEYPAIR_BASE64;
    if (!authorityKeypairBase64) {
      console.error('❌ AUTHORITY_KEYPAIR_BASE64 not set in environment');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'authority_keypair_not_configured' })
      };
    }

    const authorityKeypairArray = JSON.parse(Buffer.from(authorityKeypairBase64, 'base64').toString());
    const authority = Keypair.fromSecretKey(new Uint8Array(authorityKeypairArray));
    
    // Verify authority matches
    if (!authority.publicKey.equals(AUTHORITY_ADDRESS)) {
      console.error(`❌ Authority mismatch! Expected ${AUTHORITY_ADDRESS.toBase58()}, got ${authority.publicKey.toBase58()}`);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'authority_mismatch' })
      };
    }

    console.log(`✅ Authority verified: ${authority.publicKey.toBase58()}`);
    console.log(`🚀 Triggering distribution of ${distributableSol.toFixed(6)} SOL...`);

    // Get PDAs
    const paymentVault = derivePaymentVaultPDA();
    const stakingPool = deriveStakingPoolPDA();

    // Build distribution instruction
    const discriminator = getAnchorDiscriminator('process_x402_payment');
    const instructionData = Buffer.alloc(16);
    discriminator.copy(instructionData, 0);
    instructionData.writeBigUInt64LE(BigInt(distributableLamports), 8);

    const instruction = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: authority.publicKey, isSigner: true, isWritable: false },
        { pubkey: x402Wallet, isSigner: false, isWritable: true },
        { pubkey: paymentVault, isSigner: false, isWritable: true },
        { pubkey: stakingPool, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: instructionData,
    });

    const transaction = new Transaction().add(instruction);
    
    // Get latest blockhash
    const { blockhash } = await connection.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = authority.publicKey;

    // Sign and send
    transaction.sign(authority);
    const distributionTxSig = await connection.sendRawTransaction(transaction.serialize());
    
    console.log(`✅ Distribution transaction sent: ${distributionTxSig}`);
    
    // Wait for confirmation (with timeout)
    try {
      await Promise.race([
        connection.confirmTransaction(distributionTxSig, 'confirmed'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000))
      ]);
      console.log(`✅ Distribution confirmed!`);
    } catch (confirmErr) {
      console.warn(`⚠️ Distribution sent but confirmation timeout: ${confirmErr.message}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        triggered: true,
        distributionTxSig,
        amount: distributableSol,
        stakerShare: distributableSol * 0.9,
        treasuryShare: distributableSol * 0.1,
        x402Wallet: x402Wallet.toBase58()
      })
    };

  } catch (err) {
    console.error('❌ x402-trigger-distribution error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'distribution_failed', 
        detail: err.message 
      })
    };
  }
};

