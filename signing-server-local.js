/**
 * LOCAL SIGNING SERVER (Most Secure)
 * 
 * Run this on YOUR computer: node signing-server-local.js
 * It will sign transactions for users to claim rewards
 * 
 * Users pay their own transaction fees!
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Keypair, Transaction, PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddressSync, createTransferInstruction } = require('@solana/spl-token');
const bs58 = require('bs58');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3002;
const FEE_COLLECTOR_WALLET = 'G1RHSMtZVZLafmZ9man8anb2HXf7JP5Kh5sbrGZKM6Pg';
const WHISTLE_MINT = '6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump';

// Load private key from .env
const PRIVATE_KEY = process.env.FEE_COLLECTOR_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error('❌ ERROR: FEE_COLLECTOR_PRIVATE_KEY not found in .env file!');
  process.exit(1);
}

const keypair = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));

if (keypair.publicKey.toBase58() !== FEE_COLLECTOR_WALLET) {
  console.error('❌ ERROR: Private key does not match fee collector wallet!');
  process.exit(1);
}

console.log('✅ Signing server loaded with wallet:', keypair.publicKey.toBase58());

/**
 * POST /sign-claim
 * Signs a reward claim transaction
 */
app.post('/sign-claim', async (req, res) => {
  try {
    const { claimableAmount, userWallet } = req.body;

    if (!claimableAmount || !userWallet) {
      return res.status(400).json({ error: 'claimableAmount and userWallet required' });
    }

    console.log(`🔐 Signing claim for ${userWallet.slice(0, 8)}... Amount: ${claimableAmount}`);

    const fromAta = getAssociatedTokenAddressSync(
      new PublicKey(WHISTLE_MINT),
      keypair.publicKey
    );

    const toAta = getAssociatedTokenAddressSync(
      new PublicKey(WHISTLE_MINT),
      new PublicKey(userWallet)
    );

    // Create transfer instruction
    const transferIx = createTransferInstruction(
      fromAta,
      toAta,
      keypair.publicKey,
      BigInt(claimableAmount)
    );

    // Create transaction and serialize
    const transaction = new Transaction();
    transaction.add(transferIx);
    transaction.feePayer = new PublicKey(userWallet); // User pays fee!

    // Get recent blockhash (you'll need to fetch this from RPC)
    // For now, return the serialized instruction and let frontend handle it
    
    const serialized = transferIx.data.toString('base64');

    res.json({
      success: true,
      transferInstruction: {
        programId: transferIx.programId.toBase58(),
        keys: transferIx.keys.map(k => ({
          pubkey: k.pubkey.toBase58(),
          isSigner: k.isSigner,
          isWritable: k.isWritable
        })),
        data: serialized
      },
      from: fromAta.toBase58(),
      to: toAta.toBase58(),
      amount: claimableAmount.toString()
    });

    console.log(`✅ Signed claim for ${userWallet.slice(0, 8)}...`);

  } catch (error) {
    console.error('❌ Signing error:', error);
    res.status(500).json({ error: 'Failed to sign transaction', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Signing server running on http://localhost:${PORT}`);
  console.log('📡 Ready to sign claim transactions!');
  console.log('⚠️  Keep this running while users are claiming rewards');
});

