/**
 * Simple ENAT Test
 * Run this to verify your deployment works
 */

import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

async function runTests() {
  log('\n🧪 ENAT Simple Test Suite\n', 'blue');

  let passed = 0;
  let failed = 0;

  // Test 1: Connection
  try {
    log('Test 1: Connect to Solana...', 'yellow');
    const connection = new Connection('http://localhost:8899', 'confirmed');
    await connection.getVersion();
    log('✅ Connection successful', 'green');
    passed++;
  } catch (error) {
    log('❌ Connection failed: ' + error.message, 'red');
    log('   Make sure solana-test-validator is running!', 'yellow');
    failed++;
    return;
  }

  // Test 2: Generate Keypair
  try {
    log('\nTest 2: Generate test keypair...', 'yellow');
    const keypair = Keypair.generate();
    if (keypair.publicKey && keypair.secretKey) {
      log('✅ Keypair generated', 'green');
      log(`   Address: ${keypair.publicKey.toString().substring(0, 8)}...`, 'blue');
      passed++;
    }
  } catch (error) {
    log('❌ Keypair generation failed: ' + error.message, 'red');
    failed++;
  }

  // Test 3: Airdrop (if on localnet)
  try {
    log('\nTest 3: Request airdrop...', 'yellow');
    const connection = new Connection('http://localhost:8899', 'confirmed');
    const testWallet = Keypair.generate();
    
    const signature = await connection.requestAirdrop(
      testWallet.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    
    await connection.confirmTransaction(signature);
    
    const balance = await connection.getBalance(testWallet.publicKey);
    if (balance > 0) {
      log('✅ Airdrop successful', 'green');
      log(`   Balance: ${balance / LAMPORTS_PER_SOL} SOL`, 'blue');
      passed++;
    }
  } catch (error) {
    log('❌ Airdrop failed: ' + error.message, 'red');
    log('   This is normal on devnet/mainnet', 'yellow');
    failed++;
  }

  // Test 4: Check for deployed program
  try {
    log('\nTest 4: Check for ENAT program...', 'yellow');
    
    // Try to read .program_id file
    try {
      const fs = await import('fs');
      const programId = fs.readFileSync('.program_id', 'utf8').trim();
      log('✅ Program ID found in .program_id', 'green');
      log(`   Program ID: ${programId.substring(0, 8)}...`, 'blue');
      passed++;
    } catch {
      log('⚠️  .program_id file not found', 'yellow');
      log('   Deploy the contract first: solana program deploy target/deploy/encrypted_network_access_token.so', 'yellow');
      failed++;
    }
  } catch (error) {
    log('❌ Program check failed: ' + error.message, 'red');
    failed++;
  }

  // Test 5: Import client SDK
  try {
    log('\nTest 5: Import ENAT client SDK...', 'yellow');
    const { createENATClient } = await import('../client/enat-client.js');
    
    if (typeof createENATClient === 'function') {
      log('✅ Client SDK imported successfully', 'green');
      passed++;
      
      // Try to create client
      const client = createENATClient('http://localhost:8899');
      if (client) {
        log('✅ Client instance created', 'green');
        passed++;
      }
    }
  } catch (error) {
    log('❌ SDK import failed: ' + error.message, 'red');
    log('   Make sure to run: cd client && npm install', 'yellow');
    failed++;
  }

  // Summary
  log('\n' + '='.repeat(50), 'blue');
  log(`\n📊 Test Results:`, 'blue');
  log(`   Passed: ${passed}`, 'green');
  log(`   Failed: ${failed}`, 'red');
  log(`   Total:  ${passed + failed}\n`, 'blue');

  if (failed === 0) {
    log('🎉 All tests passed! Your ENAT setup is working!', 'green');
    log('\nNext steps:', 'blue');
    log('  1. Run full example: node examples/usage-example.js', 'yellow');
    log('  2. Open web UI: apps/web/enat-integration.html', 'yellow');
    log('  3. Integrate with your app (see INTEGRATION_GUIDE.md)', 'yellow');
  } else {
    log('⚠️  Some tests failed. Check the errors above.', 'yellow');
    log('\nCommon fixes:', 'blue');
    log('  - Start validator: solana-test-validator', 'yellow');
    log('  - Deploy contract: solana program deploy target/deploy/encrypted_network_access_token.so', 'yellow');
    log('  - Install deps: cd client && npm install', 'yellow');
  }

  log('\n');
}

// Run tests
runTests().catch(error => {
  log('\n❌ Test suite crashed: ' + error.message, 'red');
  process.exit(1);
});

