// Find Raydium pool for the token
const { Connection, PublicKey } = require('@solana/web3.js');

const connection = new Connection('https://api.mainnet-beta.solana.com');
const tokenMint = '6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump';
const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

async function findRaydiumPool() {
  console.log('Finding Raydium pool for:', tokenMint);
  console.log('');
  
  try {
    const mint = new PublicKey(tokenMint);
    
    // Get all token accounts for this mint
    console.log('Fetching token accounts...');
    const accounts = await connection.getProgramAccounts(
      new PublicKey(TOKEN_PROGRAM_ID),
      {
        filters: [
          { dataSize: 165 }, // Token account size
          { memcmp: { offset: 0, bytes: mint.toBase58() } }, // Filter by mint
        ],
      }
    );
    
    console.log(`Found ${accounts.length} token accounts`);
    console.log('');
    
    // Look for accounts owned by Raydium program
    const RAYDIUM_V4 = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
    
    console.log('Checking for Raydium-owned accounts...');
    for (const account of accounts) {
      const data = account.account.data;
      
      // Owner is at bytes 32-64
      const owner = new PublicKey(data.slice(32, 64)).toBase58();
      
      // Amount is at bytes 64-72
      const amount = data.readBigUInt64LE(64);
      
      // Check if this is owned by Raydium program
      if (owner.includes('5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1')) { // Raydium authority
        console.log('');
        console.log('✅ Found potential Raydium pool account!');
        console.log('  Address:', account.pubkey.toBase58());
        console.log('  Owner:', owner);
        console.log('  Balance:', Number(amount) / 1e6);
        console.log('');
      }
    }
    
    // Also try to find the pool by checking recent transactions
    console.log('Checking recent transactions for pool creation...');
    const signatures = await connection.getSignaturesForAddress(mint, {
      limit: 50
    });
    
    console.log(`Found ${signatures.length} signatures`);
    
    // Look for Raydium program in transactions
    for (let i = 0; i < Math.min(10, signatures.length); i++) {
      const sig = signatures[i];
      
      try {
        const tx = await connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0
        });
        
        if (!tx || !tx.transaction.message.accountKeys) continue;
        
        // Check if Raydium is involved
        const hasRaydium = tx.transaction.message.accountKeys.some(key => 
          key.pubkey.toBase58() === RAYDIUM_V4
        );
        
        if (hasRaydium) {
          console.log('');
          console.log('✅ Found Raydium transaction!');
          console.log('  Signature:', sig.signature);
          console.log('  Block Time:', new Date(sig.blockTime * 1000).toISOString());
          console.log('');
          
          // Print all accounts involved
          console.log('  Accounts involved:');
          for (const key of tx.transaction.message.accountKeys.slice(0, 15)) {
            console.log('    -', key.pubkey.toBase58());
          }
          break;
        }
      } catch (e) {
        // Skip
      }
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

findRaydiumPool().then(() => process.exit(0));

