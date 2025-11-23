import { Connection, PublicKey } from '@solana/web3.js';
import { WHISTLE_PROGRAM_ID } from './contract';

export interface ClaimHistory {
  lastClaimTime: Date | null;
  lastClaimAmount: number; // in SOL
  totalClaimed: number; // in SOL
  claimCount: number;
}

/**
 * Query on-chain transaction history to find claim transactions
 */
export async function fetchClaimHistory(
  staker: PublicKey,
  connection: Connection
): Promise<ClaimHistory> {
  try {
    // Get staker account PDA to check transactions for that account too
    const [stakerPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('staker'), staker.toBuffer()],
      WHISTLE_PROGRAM_ID
    );

    // Get transactions for both staker wallet and staker PDA (more efficient)
    const [walletSigs, pdaSigs] = await Promise.all([
      connection.getSignaturesForAddress(staker, { limit: 50 }),
      connection.getSignaturesForAddress(stakerPDA, { limit: 50 }),
    ]);

    // Combine and deduplicate signatures
    const allSigs = new Map<string, typeof walletSigs[0]>();
    walletSigs.forEach(sig => allSigs.set(sig.signature, sig));
    pdaSigs.forEach(sig => allSigs.set(sig.signature, sig));

    // Sort by block time (most recent first)
    const signatures = Array.from(allSigs.values()).sort((a, b) => 
      (b.blockTime || 0) - (a.blockTime || 0)
    );

    let lastClaimTime: Date | null = null;
    let lastClaimAmount = 0;
    let totalClaimed = 0;
    let claimCount = 0;

    // Check transactions in batches with delays to avoid rate limits
    const BATCH_SIZE = 5;
    const DELAY_MS = 200;

    for (let i = 0; i < Math.min(signatures.length, 20); i += BATCH_SIZE) {
      const batch = signatures.slice(i, i + BATCH_SIZE);
      
      const txPromises = batch.map(async (sigInfo) => {
        try {
          const tx = await connection.getTransaction(sigInfo.signature, {
            maxSupportedTransactionVersion: 0,
            commitment: 'confirmed',
          });
          return { tx, sigInfo };
        } catch (err) {
          return null;
        }
      });

      const results = await Promise.all(txPromises);

      for (const result of results) {
        if (!result) continue;
        const { tx, sigInfo } = result;

        if (!tx || !tx.meta || tx.meta.err) continue;

        // Check if this transaction involves the WHISTLE program
        const involvesProgram = tx.transaction.message.accountKeys.some(
          (key) => key.equals(WHISTLE_PROGRAM_ID)
        );

        if (!involvesProgram) continue;

        // Check if transaction logs contain "Staker claimed"
        const isClaimTx = tx.meta.logMessages?.some((log) =>
          log.includes('Staker claimed')
        );

        if (isClaimTx) {
          const stakerIndex = tx.transaction.message.accountKeys.findIndex(
            (key) => key.equals(staker)
          );

          if (stakerIndex >= 0 && stakerIndex < tx.meta.preBalances.length) {
            const preBalance = tx.meta.preBalances[stakerIndex];
            const postBalance = tx.meta.postBalances[stakerIndex];
            const solReceived = (postBalance - preBalance) / 1e9;

            // Subtract transaction fee to get net received
            const netReceived = solReceived - (tx.meta.fee || 0) / 1e9;

            if (netReceived > 0.000001) {
              totalClaimed += netReceived;
              claimCount++;

              const txTime = sigInfo.blockTime ? new Date(sigInfo.blockTime * 1000) : null;
              if (!lastClaimTime || (txTime && txTime > lastClaimTime)) {
                lastClaimTime = txTime;
                lastClaimAmount = netReceived;
              }
            }
          }
        }
      }

      // Add delay between batches to avoid rate limits
      if (i + BATCH_SIZE < signatures.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    return {
      lastClaimTime,
      lastClaimAmount,
      totalClaimed,
      claimCount,
    };
  } catch (error) {
    console.error('Error fetching claim history:', error);
    // Return empty history on error (non-blocking)
    return {
      lastClaimTime: null,
      lastClaimAmount: 0,
      totalClaimed: 0,
      claimCount: 0,
    };
  }
}

