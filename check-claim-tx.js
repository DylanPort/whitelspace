const { Connection } = require('@solana/web3.js');

const TX_SIG = '2r5HbGNu9dadtpPUW5jNa7PreSXZBuf7fUYyGb7xRTErdi39L3rRf85KbnpsKMkzHbE88BMZVtRFccPRFK3Z8hW6';

async function checkTx() {
  const conn = new Connection('https://rpc.whistle.ninja', 'confirmed');
  const tx = await conn.getTransaction(TX_SIG, { maxSupportedTransactionVersion: 0 });
  
  if (!tx || !tx.meta) {
    console.log('Transaction not found');
    return;
  }
  
  console.log('Transaction Status:', tx.meta.err ? 'FAILED' : 'SUCCESS');
  console.log('\nAccount Keys:');
  tx.transaction.message.accountKeys.forEach((key, i) => {
    const isWritable = tx.transaction.message.header.numRequiredSigners + i < tx.transaction.message.header.numRequiredSigners + tx.transaction.message.header.numReadonlySignedAccounts + tx.transaction.message.header.numReadonlyUnsignedAccounts ? false : i < tx.transaction.message.header.numRequiredSigners + tx.transaction.message.header.numReadonlySignedAccounts;
    const isSigner = i < tx.transaction.message.header.numRequiredSigners;
    console.log(`  ${i}. ${key.toBase58().substring(0, 20)}... (signer: ${isSigner}, writable: ${!isWritable})`);
  });
  
  console.log('\nBalance Changes:');
  tx.meta.preBalances.forEach((pre, i) => {
    const post = tx.meta.postBalances[i];
    const change = post - pre;
    if (change !== 0) {
      const key = tx.transaction.message.accountKeys[i];
      console.log(`  Account ${i} (${key.toBase58().substring(0, 20)}...): ${change / 1e9} SOL`);
    }
  });
  
  console.log('\nTransaction Logs:');
  tx.meta.logMessages?.forEach(log => {
    if (log.includes('Staker claimed') || log.includes('pending') || log.includes('reward')) {
      console.log('  ', log);
    }
  });
}

checkTx().catch(console.error);

