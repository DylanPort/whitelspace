const { Connection, PublicKey } = require('@solana/web3.js');

const RPC_URL = 'https://rpc.whistle.ninja';
const STAKER = new PublicKey('7BZQtBPn2yotP2vAWNi3Vf2SPNq7Ffrs1Ti5FVUAEkHr');
const PROGRAM_ID = new PublicKey('whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr');

async function checkStaker() {
  const conn = new Connection(RPC_URL, 'confirmed');
  
  const [stakerPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('staker'), STAKER.toBuffer()],
    PROGRAM_ID
  );
  
  console.log('Staker PDA:', stakerPDA.toBase58());
  
  const acc = await conn.getAccountInfo(stakerPDA);
  
  if (!acc || acc.data.length < 88) {
    console.log('Account not found or too small');
    return;
  }
  
  // Parse StakerAccount struct
  // Offset 0: staker (32 bytes)
  // Offset 32: staked_amount (8 bytes)
  // Offset 40: access_tokens (8 bytes)
  // Offset 48: last_stake_time (8 bytes)
  // Offset 56: node_operator (1 byte)
  // Offset 57: voting_power (8 bytes) - repurposed as reward_debt
  // Offset 65: data_encrypted (8 bytes)
  // Offset 73: pending_rewards (8 bytes)
  // Offset 81: bump (1 byte)
  
  const stakedAmount = acc.data.readBigUInt64LE(32);
  const accessTokens = acc.data.readBigUInt64LE(40);
  const votingPower = acc.data.readBigUInt64LE(57); // reward_debt
  const pendingRewards = acc.data.readBigUInt64LE(73);
  
  console.log('\n=== ON-CHAIN STAKER ACCOUNT ===');
  console.log('Staked Amount:', stakedAmount.toString(), 'lamports =', Number(stakedAmount) / 1e6, 'WHISTLE');
  console.log('Access Tokens:', accessTokens.toString());
  console.log('Voting Power (reward_debt):', votingPower.toString(), 'lamports =', Number(votingPower) / 1e9, 'SOL');
  console.log('Pending Rewards:', pendingRewards.toString(), 'lamports =', Number(pendingRewards) / 1e9, 'SOL');
  
  // Check recent transactions
  console.log('\n=== RECENT CLAIM TRANSACTIONS ===');
  const sigs = await conn.getSignaturesForAddress(stakerPDA, { limit: 5 });
  for (const sig of sigs) {
    const tx = await conn.getTransaction(sig.signature, { maxSupportedTransactionVersion: 0 });
    if (tx && tx.meta && !tx.meta.err) {
      const hasClaim = tx.meta.logMessages?.some(log => log.includes('Staker claimed'));
      if (hasClaim) {
        console.log(`\n${sig.signature.substring(0, 20)}...`);
        console.log('  Status: SUCCESS');
        console.log('  Time:', sig.blockTime ? new Date(sig.blockTime * 1000).toISOString() : 'N/A');
        const claimLog = tx.meta.logMessages?.find(log => log.includes('Staker claimed'));
        if (claimLog) {
          console.log('  ', claimLog);
        }
      }
    }
  }
}

checkStaker().catch(console.error);

