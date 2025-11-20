import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Configuration - X402 Wallet PDA (for SOL payments)
// Mainnet Staking Program ID (ACTUAL DEPLOYED VERSION)
const STAKING_PROGRAM_ID_STRING = process.env.NEXT_PUBLIC_STAKING_PROGRAM_ID || 'whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr';

export const STAKING_PROGRAM_ID = new PublicKey(STAKING_PROGRAM_ID_STRING);

// Use the actual deployed Payment Vault address
export const getX402WalletPDA = () => {
  // This is the ACTUAL payment vault from the deployed contract
  const paymentVault = new PublicKey('CU1ZcHccCbQT8iA6pcb3ZyTjog8ckmDHH8gaAmKfC73G');
  return [paymentVault, 0];
};

// Package definitions
export interface RPCPackage {
  id: string;
  name: string;
  duration: string;
  rateLimit: string;
  maxQueries: string;
  priceSol: number;
  priceUsd: number;
  description: string;
  popular?: boolean;
  bestValue?: boolean;
}

export const RPC_PACKAGES: Record<string, RPCPackage> = {
  DAY: {
    id: 'DAY',
    name: 'Day Pass',
    duration: '24 hours',
    rateLimit: '50 req/min',
    maxQueries: '~72k queries',
    priceSol: 0.05,
    priceUsd: 10,
    description: 'Perfect for testing & development'
  },
  WEEK: {
    id: 'WEEK',
    name: 'Week Pass',
    duration: '7 days',
    rateLimit: '100 req/min',
    maxQueries: '~1M queries',
    priceSol: 0.15,
    priceUsd: 30,
    description: 'Great for small DApps & bots',
    popular: true
  },
  MONTH: {
    id: 'MONTH',
    name: 'Month Pass',
    duration: '30 days',
    rateLimit: '200 req/min',
    maxQueries: '~8.6M queries',
    priceSol: 0.5,
    priceUsd: 100,
    description: 'Production apps & wallets',
    bestValue: true
  }
};

/**
 * Create a payment transaction for RPC subscription (SOL payment to X402 wallet)
 */
export async function createRPCPaymentTransaction(
  connection: Connection,
  payer: PublicKey,
  packageId: string
): Promise<Transaction> {
  const pkg = RPC_PACKAGES[packageId];
  if (!pkg) {
    throw new Error('Invalid package ID');
  }

  // Get X402 wallet PDA (receives SOL)
  const [x402WalletPDA] = getX402WalletPDA();
  // Ensure it's a PublicKey for TypeScript
  const walletAddress = x402WalletPDA as PublicKey;

  // Amount in lamports
  const amountLamports = pkg.priceSol * LAMPORTS_PER_SOL;

  console.log('Creating RPC payment transaction (SOL):', {
    package: pkg.name,
    amountSol: pkg.priceSol,
    amountLamports,
    from: payer.toBase58(),
    to: walletAddress.toBase58()
  });

  // Create transaction
  const transaction = new Transaction();

  // Add SOL transfer instruction
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: walletAddress,
      lamports: amountLamports
    })
  );

  // Add memo instruction (for tracking)
  const memoProgram = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
  const memoData = Buffer.from(`WHISTLE_RPC:${packageId}:${Date.now()}`);
  transaction.add({
    keys: [],
    programId: memoProgram,
    data: memoData
  });

  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = payer;

  return transaction;
}

/**
 * Verify payment and activate subscription
 */
export async function verifyAndActivateSubscription(
  txSig: string,
  payer: string,
  packageId: string
): Promise<{
  ok: boolean;
  subscription?: any;
  error?: string;
}> {
  try {
    console.log('Verifying RPC subscription payment:', { txSig, payer, packageId });

    const response = await fetch('/.netlify/functions/rpc-subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        txSig,
        payer,
        package: packageId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        error: data.error || 'Subscription activation failed'
      };
    }

    console.log('✅ Subscription activated:', data);

    return {
      ok: true,
      subscription: data.subscription
    };

  } catch (error) {
    console.error('Subscription verification error:', error);
    return {
      ok: false,
      error: String(error)
    };
  }
}

/**
 * Get subscription status for a wallet
 */
export async function getSubscriptionStatus(
  walletAddress: string
): Promise<{
  ok: boolean;
  subscription?: any;
  error?: string;
}> {
  try {
    const response = await fetch(`/.netlify/functions/rpc-subscription?wallet=${walletAddress}`);
    
    if (!response.ok) {
      return {
        ok: false,
        error: 'Failed to fetch subscription'
      };
    }

    const data = await response.json();

    return {
      ok: true,
      subscription: data.subscription
    };

  } catch (error) {
    console.error('Failed to fetch subscription:', error);
    return {
      ok: false,
      error: String(error)
    };
  }
}

