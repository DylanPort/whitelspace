// Find Raydium pool address for graduated Pump.fun token
// by analyzing recent transactions
const { Connection, PublicKey } = require('@solana/web3.js');

const connection = new Connection('https://api.mainnet-beta.solana.com');
const tokenMint = '6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump';
const RAYDIUM_V4 = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';

async function findGraduatedPool() {
  console.log('Finding Raydium pool for graduated token...\n');
  console.log('Token:', tokenMint);
  console.log('');
  
  try {
    const mint = new PublicKey(tokenMint);
    
    // Get recent signatures (graduation should be recent)
    console.log('Fetching recent transactions...');
    const signatures = await connection.getSignaturesForAddress(mint, {
      limit: 100,
    });
    
    console.log(`Found ${signatures.length} transactions\n`);
    
    // Look for Raydium program involvement
    console.log('Searching for Raydium pool creation...\n');
    
    for (let i = 0; i < Math.min(20, signatures.length); i++) {
      const sig = signatures[i];
      
      try {
        const tx = await connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });
        
        if (!tx || !tx.transaction.message.accountKeys) {
          await sleep(100);
          continue;
        }
        
        // Check if Raydium is involved
        const hasRaydium = tx.transaction.message.accountKeys.some(key =>
          key.pubkey.toBase58() === RAYDIUM_V4
        );
        
        if (hasRaydium) {
          console.log('✅ Found Raydium transaction!');
          console.log(`   Signature: ${sig.signature}`);
          console.log(`   Time: ${new Date(sig.blockTime * 1000).toISOString()}`);
          console.log('');
          console.log('   Accounts involved:');
          
          // Look for pool-like accounts (should have large amounts)
          for (const key of tx.transaction.message.accountKeys.slice(0, 20)) {
            console.log(`   - ${key.pubkey.toBase58()}`);
          }
          
          console.log('');
          console.log('   ℹ️  The Raydium pool is likely one of these addresses.');
          console.log('      Look for an account that is NOT:');
          console.log('      - The token mint');
          console.log('      - A user wallet');
          console.log('      - System/token programs');
          console.log('');
          
          break;
        }
        
        await sleep(100);
      } catch (e) {
        // Skip
        await sleep(100);
      }
    }
    
  } catch (error) {
    console.log('Error:', error.message);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

findGraduatedPool().then(() => process.exit(0));

