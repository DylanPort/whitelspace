// Real-time price calculator from blockchain data (no mock data)
import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';

const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
const SOL = 'So11111111111111111111111111111111111111112';

interface SwapData {
  sourceMint: string;
  sourceAmount: number;
  destMint: string;
  destAmount: number;
  timestamp: number;
}

// Parse swap from transaction using token balance changes
function parseSwapFromTransaction(tx: ParsedTransactionWithMeta, targetMint: string): SwapData | null {
  if (!tx.meta || !tx.meta.preTokenBalances || !tx.meta.postTokenBalances) {
    return null;
  }

  const preBalances = tx.meta.preTokenBalances;
  const postBalances = tx.meta.postTokenBalances;

  // Find token balance changes
  const changes = new Map<string, { mint: string; change: number; decimals: number }>();

  for (const post of postBalances) {
    const pre = preBalances.find(p => p.accountIndex === post.accountIndex);
    if (!pre || !post.mint) continue;

    const preAmount = parseFloat(pre.uiTokenAmount.uiAmountString || '0');
    const postAmount = parseFloat(post.uiTokenAmount.uiAmountString || '0');
    const change = postAmount - preAmount;

    if (Math.abs(change) > 0.000001) { // Ignore dust
      const key = `${post.mint}-${post.owner}`;
      changes.set(key, {
        mint: post.mint,
        change: change,
        decimals: post.uiTokenAmount.decimals,
      });
    }
  }

  // Look for a swap pattern: one token decreased, another increased
  const decreases: { mint: string; amount: number }[] = [];
  const increases: { mint: string; amount: number }[] = [];

  for (const [key, data] of changes.entries()) {
    if (data.change < 0) {
      decreases.push({ mint: data.mint, amount: Math.abs(data.change) });
    } else if (data.change > 0) {
      increases.push({ mint: data.mint, amount: data.change });
    }
  }

  // Find swap involving target mint and stablecoin
  for (const dec of decreases) {
    for (const inc of increases) {
      // Swap: targetMint -> stablecoin
      if (dec.mint === targetMint && (inc.mint === USDC || inc.mint === USDT)) {
        return {
          sourceMint: dec.mint,
          sourceAmount: dec.amount,
          destMint: inc.mint,
          destAmount: inc.amount,
          timestamp: tx.blockTime || 0,
        };
      }
      // Swap: stablecoin -> targetMint
      if ((dec.mint === USDC || dec.mint === USDT) && inc.mint === targetMint) {
        return {
          sourceMint: dec.mint,
          sourceAmount: dec.amount,
          destMint: inc.mint,
          destAmount: inc.amount,
          timestamp: tx.blockTime || 0,
        };
      }
    }
  }

  return null;
}

// Get real-time price from blockchain
export async function getRealTimePrice(
  connection: Connection,
  mintAddress: string,
  supply: string,
  decimals: number
): Promise<{ price: number | null; marketCap: number | null; swapCount: number }> {
  try {
    // Stablecoins have fixed price
    if (mintAddress === USDC || mintAddress === USDT) {
      const supplyNumber = parseFloat(supply) / Math.pow(10, decimals);
      return {
        price: 1.0,
        marketCap: supplyNumber,
        swapCount: 0,
      };
    }

    const mint = new PublicKey(mintAddress);
    const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

    // Get token accounts for this mint
    const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
      filters: [
        { dataSize: 165 },
        { memcmp: { offset: 0, bytes: mint.toBase58() } },
      ],
    });

    if (accounts.length === 0) {
      return { price: null, marketCap: null, swapCount: 0 };
    }

    // Get recent signatures for top holders (likely includes swaps)
    const signatures: string[] = [];
    const uniqueSigs = new Set<string>();

    // Sample first 10 accounts to find recent swaps
    for (let i = 0; i < Math.min(10, accounts.length); i++) {
      try {
        const accountSigs = await connection.getSignaturesForAddress(
          accounts[i].pubkey,
          { limit: 5 }
        );
        
        for (const sig of accountSigs) {
          if (!uniqueSigs.has(sig.signature)) {
            uniqueSigs.add(sig.signature);
            signatures.push(sig.signature);
          }
        }
      } catch (e) {
        // Skip if can't get signatures
      }
    }

    if (signatures.length === 0) {
      return { price: null, marketCap: null, swapCount: 0 };
    }

    // Fetch and parse transactions
    const prices: number[] = [];
    let swapCount = 0;

    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < Math.min(signatures.length, 50); i += batchSize) {
      const batch = signatures.slice(i, i + batchSize);
      
      try {
        const txs = await connection.getParsedTransactions(batch, {
          maxSupportedTransactionVersion: 0,
        });

        for (const tx of txs) {
          if (!tx) continue;

          const swap = parseSwapFromTransaction(tx, mintAddress);
          if (swap) {
            swapCount++;
            
            // Calculate price from this swap
            let price: number | null = null;
            
            if (swap.sourceMint === mintAddress && 
                (swap.destMint === USDC || swap.destMint === USDT)) {
              // Token sold for stablecoin
              price = swap.destAmount / swap.sourceAmount;
            } else if ((swap.sourceMint === USDC || swap.sourceMint === USDT) && 
                       swap.destMint === mintAddress) {
              // Token bought with stablecoin
              price = swap.sourceAmount / swap.destAmount;
            }

            if (price && price > 0 && price < 1000000) { // Sanity check
              prices.push(price);
            }
          }
        }
      } catch (e) {
        // Skip batch on error
      }
    }

    if (prices.length === 0) {
      return { price: null, marketCap: null, swapCount };
    }

    // Calculate median price (more robust than average)
    prices.sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    const price = prices.length % 2 === 0
      ? (prices[mid - 1] + prices[mid]) / 2
      : prices[mid];

    // Calculate market cap
    const supplyNumber = parseFloat(supply) / Math.pow(10, decimals);
    const marketCap = supplyNumber * price;

    return { price, marketCap, swapCount };

  } catch (error) {
    console.error('Error calculating real-time price:', error);
    return { price: null, marketCap: null, swapCount: 0 };
  }
}

