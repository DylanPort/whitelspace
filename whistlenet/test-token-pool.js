// Test if we can find pool for the token
const { Connection, PublicKey } = require('@solana/web3.js');

const connection = new Connection('https://api.mainnet-beta.solana.com');
const PUMP_FUN_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const tokenMint = '6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump';

async function test() {
  console.log('Testing pool discovery for:', tokenMint);
  console.log('');
  
  try {
    const mint = new PublicKey(tokenMint);
    const program = new PublicKey(PUMP_FUN_PROGRAM);
    
    // Derive bonding curve PDA
    const [bondingCurve, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from('bonding-curve'), mint.toBuffer()],
      program
    );
    
    console.log('Bonding curve PDA:', bondingCurve.toBase58());
    console.log('Bump:', bump);
    console.log('');
    
    // Check if it exists
    console.log('Fetching account info...');
    const account = await connection.getAccountInfo(bondingCurve);
    
    if (!account) {
      console.log('❌ Bonding curve account does NOT exist');
      console.log('');
      console.log('This means:');
      console.log('  1. Token did not launch on Pump.fun, OR');
      console.log('  2. Token graduated to Raydium');
      console.log('');
      console.log('Need to check Raydium pools instead.');
      return;
    }
    
    console.log('✅ Bonding curve account EXISTS!');
    console.log('Owner:', account.owner.toBase58());
    console.log('Data length:', account.data.length);
    console.log('');
    
    // Parse the data
    const data = account.data;
    console.log('First 100 bytes:', data.slice(0, 100).toString('hex'));
    console.log('');
    
    // Try to parse reserves
    try {
      const virtualTokenReserves = Number(data.readBigUInt64LE(8)) / 1e6;
      const virtualSolReserves = Number(data.readBigUInt64LE(16)) / 1e9;
      const realTokenReserves = Number(data.readBigUInt64LE(24)) / 1e6;
      const realSolReserves = Number(data.readBigUInt64LE(32)) / 1e9;
      
      console.log('Bonding curve state:');
      console.log('  Virtual Token Reserves:', virtualTokenReserves);
      console.log('  Virtual SOL Reserves:', virtualSolReserves);
      console.log('  Real Token Reserves:', realTokenReserves);
      console.log('  Real SOL Reserves:', realSolReserves);
      console.log('');
      
      if (virtualTokenReserves > 0 && virtualSolReserves > 0) {
        const priceInSol = virtualSolReserves / virtualTokenReserves;
        console.log('✅ Price in SOL:', priceInSol);
        console.log('  (Need SOL price to convert to USD)');
      } else {
        console.log('❌ Invalid reserves (zeros)');
      }
    } catch (e) {
      console.log('❌ Error parsing bonding curve:', e.message);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

test().then(() => process.exit(0));

