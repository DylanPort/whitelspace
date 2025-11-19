#!/usr/bin/env node
/**
 * WHISTLE Provider Heartbeat Agent
 * Reports uptime and metrics to the smart contract every 60 seconds
 */

const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { Program, AnchorProvider, web3 } = require('@project-serum/anchor');
const fs = require('fs');

// Configuration
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8899';
const PROGRAM_ID = new PublicKey('YOUR_WHISTLE_CONTRACT_PROGRAM_ID');
const PROVIDER_KEYPAIR_PATH = process.env.PROVIDER_KEYPAIR || '/root/.config/solana/id.json';

// Load provider keypair
let providerKeypair;
try {
  const keypairData = JSON.parse(fs.readFileSync(PROVIDER_KEYPAIR_PATH, 'utf8'));
  providerKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  console.log('✅ Provider keypair loaded:', providerKeypair.publicKey.toBase58());
} catch (error) {
  console.error('❌ Failed to load provider keypair:', error.message);
  console.error('Create one with: solana-keygen new -o', PROVIDER_KEYPAIR_PATH);
  process.exit(1);
}

const connection = new Connection(RPC_URL, 'confirmed');

/**
 * Check RPC health
 */
async function checkRPCHealth() {
  try {
    const startTime = Date.now();
    const health = await connection.getHealth();
    const latency = Date.now() - startTime;
    
    return {
      healthy: health === 'ok',
      latency,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      healthy: false,
      latency: 999999,
      error: error.message,
      timestamp: Date.now(),
    };
  }
}

/**
 * Get provider stats from local database
 */
async function getProviderStats() {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      user: 'whistle',
      host: 'localhost',
      database: 'whistle_rpc',
      password: 'whistle_secure_password_change_me',
      port: 5432,
    });
    
    const result = await pool.query('SELECT * FROM provider_stats LIMIT 1');
    await pool.end();
    
    return result.rows[0] || {};
  } catch (error) {
    console.error('Failed to get stats:', error.message);
    return {};
  }
}

/**
 * Report heartbeat to smart contract
 */
async function reportHeartbeat() {
  try {
    const health = await checkRPCHealth();
    const stats = await getProviderStats();
    
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⏰ Heartbeat Report', new Date().toISOString());
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Provider:', providerKeypair.publicKey.toBase58());
    console.log('RPC Health:', health.healthy ? '✅ Healthy' : '❌ Unhealthy');
    console.log('Latency:', health.latency + 'ms');
    console.log('Queries Served:', stats.queries_served || 0);
    console.log('Avg Response Time:', (stats.avg_response_time_ms || 0) + 'ms');
    console.log('Uptime:', (stats.uptime_percentage || 100) + '%');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // TODO: Send transaction to smart contract
    // For now, just log locally
    // When smart contract is deployed, uncomment this:
    
    /*
    const tx = await program.methods
      .recordHeartbeat()
      .accounts({
        provider: providerKeypair.publicKey,
        providerAccount: providerPDA,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([providerKeypair])
      .rpc();
    
    console.log('✅ Heartbeat sent to contract:', tx);
    */
    
    // Update local database
    const { Pool } = require('pg');
    const pool = new Pool({
      user: 'whistle',
      host: 'localhost',
      database: 'whistle_rpc',
      password: 'whistle_secure_password_change_me',
      port: 5432,
    });
    
    await pool.query(
      'UPDATE provider_stats SET last_heartbeat = NOW(), updated_at = NOW()'
    );
    await pool.end();
    
    console.log('✅ Heartbeat logged locally');
    
  } catch (error) {
    console.error('❌ Heartbeat failed:', error.message);
  }
}

/**
 * Main loop - report every 60 seconds
 */
async function main() {
  console.log('');
  console.log('🚀 WHISTLE Heartbeat Agent Started');
  console.log('Provider:', providerKeypair.publicKey.toBase58());
  console.log('RPC:', RPC_URL);
  console.log('Reporting every 60 seconds...');
  console.log('');
  
  // Initial heartbeat
  await reportHeartbeat();
  
  // Then every 60 seconds
  setInterval(async () => {
    await reportHeartbeat();
  }, 60 * 1000);
}

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down heartbeat agent...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down heartbeat agent...');
  process.exit(0);
});

// Start
main().catch(console.error);

