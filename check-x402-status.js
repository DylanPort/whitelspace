const { Connection, PublicKey } = require('@solana/web3.js');

const RPC_URL = 'https://rpc.whistle.ninja';
const X402_WALLET = new PublicKey('BMiSBoT5aPCrFcxaTrHuzXMkfrtzCLMcDYqrPTVymNbU');
const PAYMENT_VAULT = new PublicKey('CU1ZcHccCbQT8iA6pcb3ZyTjog8ckmDHH8gaAmKfC73G');
const REWARDS_ACCUMULATOR = new PublicKey('8VAPxQePD9eSdroBSxBixJqb5mz7vdz5NJHktg3xwWRG');
const PROGRAM_ID = new PublicKey('whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr');

async function checkStatus() {
  const conn = new Connection(RPC_URL, 'confirmed');
  
  console.log('=== ON-CHAIN STATUS CHECK ===\n');
  
  // Check X402 wallet
  const x402Balance = await conn.getBalance(X402_WALLET);
  console.log('X402 Wallet:', X402_WALLET.toBase58());
  console.log('  Balance:', x402Balance / 1e9, 'SOL');
  
  // Check recent transactions
  const x402Sigs = await conn.getSignaturesForAddress(X402_WALLET, { limit: 5 });
  console.log('\nRecent X402 Wallet Transactions:');
  x402Sigs.forEach((sig, i) => {
    const date = sig.blockTime ? new Date(sig.blockTime * 1000).toISOString() : 'N/A';
    console.log(`  ${i+1}. ${sig.signature.substring(0, 20)}... - ${sig.err ? 'FAILED' : 'SUCCESS'} - ${date}`);
  });
  
  // Check payment vault
  const vaultAcc = await conn.getAccountInfo(PAYMENT_VAULT);
  if (vaultAcc && vaultAcc.data.length >= 64) {
    const stakerPool = vaultAcc.data.readBigUInt64LE(32);
    const treasury = vaultAcc.data.readBigUInt64LE(48);
    console.log('\nPayment Vault:', PAYMENT_VAULT.toBase58());
    console.log('  Staker Rewards Pool:', Number(stakerPool) / 1e9, 'SOL');
    console.log('  Treasury:', Number(treasury) / 1e9, 'SOL');
  }
  
  // Check accumulator
  const accInfo = await conn.getAccountInfo(REWARDS_ACCUMULATOR);
  if (accInfo && accInfo.data.length >= 33) {
    const low64 = accInfo.data.readBigUInt64LE(0);
    const high64 = accInfo.data.readBigUInt64LE(8);
    const accumulated = low64 + (high64 << 64n);
    const totalDist = accInfo.data.readBigUInt64LE(16);
    const lastUpdate = accInfo.data.readBigUInt64LE(24);
    console.log('\nRewards Accumulator:', REWARDS_ACCUMULATOR.toBase58());
    console.log('  accumulated_per_token:', accumulated.toString());
    console.log('  total_distributed:', Number(totalDist) / 1e9, 'SOL');
    console.log('  last_update:', lastUpdate ? new Date(Number(lastUpdate) * 1000).toISOString() : 'Never');
  } else {
    console.log('\nRewards Accumulator: NOT FOUND or INVALID');
  }
  
  // Check for ProcessX402Payment transactions
  console.log('\n=== CHECKING FOR ProcessX402Payment CALLS ===');
  const programSigs = await conn.getSignaturesForAddress(PROGRAM_ID, { limit: 20 });
  let foundProcessX402 = false;
  for (const sig of programSigs) {
    try {
      const tx = await conn.getTransaction(sig.signature, { maxSupportedTransactionVersion: 0 });
      if (tx && tx.transaction && tx.transaction.message) {
        const accounts = tx.transaction.message.accountKeys;
        const hasX402Wallet = accounts.some(a => a.toBase58() === X402_WALLET.toBase58());
        const hasPaymentVault = accounts.some(a => a.toBase58() === PAYMENT_VAULT.toBase58());
        if (hasX402Wallet && hasPaymentVault) {
          console.log(`\nFound ProcessX402Payment transaction: ${sig.signature}`);
          console.log(`  Status: ${sig.err ? 'FAILED' : 'SUCCESS'}`);
          console.log(`  Block: ${sig.blockTime ? new Date(sig.blockTime * 1000).toISOString() : 'N/A'}`);
          foundProcessX402 = true;
        }
      }
    } catch (e) {
      // Skip if can't parse
    }
  }
  
  if (!foundProcessX402) {
    console.log('\n❌ NO ProcessX402Payment transactions found!');
    console.log('   This means the distribution was NEVER triggered.');
  }
  
  console.log('\n=== SUMMARY ===');
  console.log(`X402 Wallet has ${x402Balance / 1e9} SOL but accumulator is at 0`);
  console.log('This means ProcessX402Payment was never called with the accumulator account.');
  console.log('Run trigger-x402-distribution.js to process the funds.');
}

checkStatus().catch(console.error);
