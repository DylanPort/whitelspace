const WebSocket = require('ws');
const { Keypair, Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { AnchorProvider, Program, Wallet } = require('@coral-xyz/anchor');
const { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const nacl = require('tweetnacl');
const fs = require('fs');
const path = require('path');

// Environment configuration
const NODE_ID = process.env.NODE_ID || `node-${Date.now()}`;
const NODE_REGION = process.env.NODE_REGION || 'US-East';
const SIGNALING_SERVER = process.env.SIGNALING_SERVER || 'ws://localhost:8080';
const RPC_URL = process.env.RPC_URL || 'https://rpc.whistle.ninja'; // Use our proxy, not direct Helius
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, 'node-storage', NODE_ID);

// 🔒 SECURITY: Only bootstrap nodes can handle SOL relay transactions
const IS_BOOTSTRAP_NODE = NODE_ID && NODE_ID.includes('bootstrap-node');
console.log(`\n🔒 Node Type: ${IS_BOOTSTRAP_NODE ? '💰 BOOTSTRAP (Can handle SOL)' : '👤 USER (No SOL handling)'}`);
console.log(`   Node ID: ${NODE_ID}`);
console.log(`   Region: ${NODE_REGION}\n`);

// Solana Program Constants
const PROGRAM_ID = new PublicKey('2uZWi6wC6CumhcCDCuNZcBaDSd7UJKf4BKreWdx1Pyaq');
const WHISTLE_MINT = new PublicKey('6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump');

let ws;
let nodeKeypair;
let connection;
let program;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 60000; // 1 minute
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
let heartbeatInterval;

// Track active relay participation
const activeRelays = new Map(); // requestId -> relay info

// Create storage directory
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  console.log(`📁 Created storage directory: ${STORAGE_DIR}`);
}

async function initNode() {
  // Load or generate node keypair (persistent)
  const keypairPath = path.join(__dirname, 'node-keys', `${NODE_ID}-keypair.json`);
  
  if (fs.existsSync(keypairPath)) {
    console.log(`🔑 Loading existing keypair from ${keypairPath}`);
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
    nodeKeypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
  } else {
    console.log(`🔑 Generating new keypair for ${NODE_ID}`);
    nodeKeypair = Keypair.generate();
    
    // Save keypair
    const keysDir = path.join(__dirname, 'node-keys');
    if (!fs.existsSync(keysDir)) {
      fs.mkdirSync(keysDir, { recursive: true });
    }
    fs.writeFileSync(keypairPath, JSON.stringify(Array.from(nodeKeypair.secretKey)));
    console.log(`💾 Keypair saved to ${keypairPath}`);
  }
  
  connection = new Connection(RPC_URL, 'confirmed');
  
  // Load IDL and initialize Anchor program
  try {
    const idl = JSON.parse(fs.readFileSync(path.join(__dirname, 'ghost-whistle-idl.json'), 'utf8'));
    const wallet = new Wallet(nodeKeypair);
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    program = new Program(idl, PROGRAM_ID, provider);
    console.log(`✅ Anchor program initialized`);
  } catch (err) {
    console.warn(`⚠️  Could not load IDL:`, err.message);
    console.warn(`⚠️  Relay execution will be disabled`);
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🟢 Ghost Whistle Node Starting`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📛 Node ID: ${NODE_ID}`);
  console.log(`📍 Region: ${NODE_REGION}`);
  console.log(`🔑 Wallet: ${nodeKeypair.publicKey.toBase58()}`);
  console.log(`💾 Storage: ${STORAGE_DIR}`);
  console.log(`🌐 Signaling: ${SIGNALING_SERVER}`);
  console.log(`${'='.repeat(60)}\n`);
  
  connectToSignalingServer();
}

function connectToSignalingServer() {
  console.log(`🔄 Connecting to signaling server...`);
  
  ws = new WebSocket(SIGNALING_SERVER);
  
  ws.on('open', () => {
    console.log(`✅ Connected to signaling server at ${new Date().toISOString()}`);
    reconnectAttempts = 0;
    
    // Register this node
    const registrationMessage = {
      type: 'REGISTER_NODE',
      nodeId: NODE_ID,
      walletAddress: nodeKeypair.publicKey.toBase58(),
      region: NODE_REGION,
      capabilities: ['relay', 'storage'],
      staked: true, // Bootstrap nodes always available
      online: true,
      timestamp: Date.now()
    };
    
    ws.send(JSON.stringify(registrationMessage));
    console.log(`📡 Registered with signaling server`);
    
    // Start heartbeat
    startHeartbeat();
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(message);
    } catch (err) {
      console.error('❌ Failed to parse message:', err.message);
    }
  });
  
  ws.on('close', (code, reason) => {
    console.log(`❌ Disconnected from signaling server (${code}: ${reason})`);
    stopHeartbeat();
    reconnect();
  });
  
  ws.on('error', (err) => {
    console.error(`⚠️  WebSocket error: ${err.message}`);
  });
}

function startHeartbeat() {
  stopHeartbeat(); // Clear any existing interval
  
  heartbeatInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'HEARTBEAT',
        nodeId: NODE_ID,
        timestamp: Date.now()
      }));
      console.log(`💓 Heartbeat sent`);
    }
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

function handleMessage(message) {
  const { type } = message;
  
  switch (type) {
    case 'relay_request':
    case 'RELAY_REQUEST_AVAILABLE':
      handleRelayRequest(message);
      break;
    
    case 'relay_forward':
      // Handle forwarded relay from previous node
      handleRelayForward(message);
      break;
    
    case 'STORE_CHUNK':
      handleStoreChunk(message);
      break;
    
    case 'REQUEST_CHUNK':
      handleRequestChunk(message);
      break;
    
    case 'PING':
      handlePing(message);
      break;
    
    case 'NODE_REGISTERED':
      console.log(`✅ Node registration confirmed by server`);
      break;
    
    default:
      console.log(`📨 Unknown message type: ${type}`);
  }
}

// ============================================================================
// RELAY EXECUTION FUNCTIONS
// ============================================================================

/**
 * Join a relay request on-chain
 */
async function joinRelayOnChain(relayData) {
  if (!program) {
    throw new Error('Anchor program not initialized');
  }

  const { requestId, selectedNodes } = relayData;
  
  // Derive PDAs
  const creatorWallet = new PublicKey(selectedNodes[0]); // First node is creator's wallet selection
  
  const [relayRequestPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('relay'),
      creatorWallet.toBuffer(),
      Buffer.from(new BigUint64Array([BigInt(requestId)]).buffer)
    ],
    PROGRAM_ID
  );
  
  const [nodeAccountPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('node'), nodeKeypair.publicKey.toBuffer()],
    PROGRAM_ID
  );
  
  console.log(`   📍 Joining relay on-chain...`);
  console.log(`      Relay PDA: ${relayRequestPDA.toBase58()}`);
  console.log(`      Node PDA: ${nodeAccountPDA.toBase58()}`);
  
  try {
    const tx = await program.methods.joinRelay()
      .accounts({
        relayRequest: relayRequestPDA,
        nodeAccount: nodeAccountPDA,
        user: nodeKeypair.publicKey
      })
      .rpc();
    
    console.log(`   ✅ Joined relay on-chain: ${tx}`);
    return { success: true, signature: tx };
  } catch (err) {
    console.error(`   ❌ Failed to join relay:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Decrypt one layer of the encrypted payload
 */
function decryptRelayLayer(encryptedHex, nodeKeypair) {
  try {
    // Convert hex to buffer
    const encryptedData = Buffer.from(encryptedHex, 'hex');
    
    // Extract nonce (first 24 bytes) and ciphertext (rest)
    const nonce = encryptedData.slice(0, nacl.box.nonceLength);
    const ciphertext = encryptedData.slice(nacl.box.nonceLength);
    
    // For now, since we don't have the full encryption scheme implemented,
    // we'll extract the data from the message directly
    console.log(`   🔓 Decrypting relay layer...`);
    
    return {
      success: true,
      recipient: null, // Will be provided in message
      amount: null,    // Will be provided in message
      nextHop: null    // Will be determined by hop index
    };
  } catch (err) {
    console.error(`   ❌ Decryption failed:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Execute the relay - either forward to next hop or send to final recipient
 */
async function executeRelayTransfer(relayData) {
  const { recipient, amount, selectedNodes, requestId } = relayData;
  
  // Find this node's position in the relay chain
  const myWallet = nodeKeypair.publicKey.toBase58();
  const myIndex = selectedNodes.findIndex(addr => addr === myWallet);
  
  if (myIndex === -1) {
    console.error(`   ❌ This node is not in the selected nodes list`);
    return { success: false, error: 'Node not in relay' };
  }
  
  const isLastHop = myIndex === selectedNodes.length - 1;
  
  console.log(`   🔄 Executing relay transfer (hop ${myIndex + 1}/${selectedNodes.length})...`);
  
  if (isLastHop) {
    // FINAL HOP: Send to actual recipient
    return await sendToFinalRecipient(recipient, amount, requestId);
  } else {
    // MIDDLE HOP: Forward to next node in chain
    const nextNodeWallet = selectedNodes[myIndex + 1];
    return await forwardToNextNode(nextNodeWallet, amount, requestId);
  }
}

/**
 * Send SOL to final recipient (last hop)
 */
async function sendToFinalRecipient(recipientAddress, amountSOL, requestId) {
  try {
    console.log(`   💸 Sending ${amountSOL} SOL to final recipient: ${recipientAddress.slice(0,8)}...`);
    
    const recipient = new PublicKey(recipientAddress);
    const lamports = Math.floor(parseFloat(amountSOL) * LAMPORTS_PER_SOL);
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: nodeKeypair.publicKey,
        toPubkey: recipient,
        lamports
      })
    );
    
    const signature = await connection.sendTransaction(transaction, [nodeKeypair]);
    await connection.confirmTransaction(signature, 'confirmed');
    
    console.log(`   ✅ Sent to final recipient: ${signature}`);
    
    return { success: true, signature, isFinal: true };
  } catch (err) {
    console.error(`   ❌ Failed to send to recipient:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Forward SOL to next node in relay chain
 */
async function forwardToNextNode(nextNodeAddress, amountSOL, requestId) {
  try {
    console.log(`   ➡️  Forwarding ${amountSOL} SOL to next node: ${nextNodeAddress.slice(0,8)}...`);
    
    const nextNode = new PublicKey(nextNodeAddress);
    const lamports = Math.floor(parseFloat(amountSOL) * LAMPORTS_PER_SOL);
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: nodeKeypair.publicKey,
        toPubkey: nextNode,
        lamports
      })
    );
    
    const signature = await connection.sendTransaction(transaction, [nodeKeypair]);
    await connection.confirmTransaction(signature, 'confirmed');
    
    console.log(`   ✅ Forwarded to next hop: ${signature}`);
    
    // Notify next node to continue the relay
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'relay_forward',
        to: nextNodeAddress,
        data: {
          requestId,
          fromNode: nodeKeypair.publicKey.toBase58(),
          signature
        }
      }));
    }
    
    return { success: true, signature, isFinal: false };
  } catch (err) {
    console.error(`   ❌ Failed to forward to next node:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Complete the relay on-chain (called by last node after successful transfer)
 */
async function completeRelayOnChain(relayData) {
  if (!program) {
    throw new Error('Anchor program not initialized');
  }

  const { requestId, selectedNodes, transactionHash } = relayData;
  
  console.log(`   ✅ Completing relay on-chain...`);
  
  // Note: complete_relay requires authority (original creator)
  // For now, nodes can't call this - it needs to be called by the backend
  // or we need to update the smart contract to allow nodes to complete
  
  console.log(`   ⚠️  complete_relay requires authority - skipping for now`);
  return { success: true, note: 'Completion requires authority' };
}

/**
 * Claim relay payment for this node
 */
async function claimRelayPayment(relayData) {
  if (!program) {
    throw new Error('Anchor program not initialized');
  }

  const { requestId, selectedNodes } = relayData;
  
  console.log(`   💰 Claiming relay payment...`);
  
  // Derive PDAs
  const creatorWallet = new PublicKey(selectedNodes[0]);
  
  const [relayRequestPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('relay'),
      creatorWallet.toBuffer(),
      Buffer.from(new BigUint64Array([BigInt(requestId)]).buffer)
    ],
    PROGRAM_ID
  );
  
  const [nodeAccountPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('node'), nodeKeypair.publicKey.toBuffer()],
    PROGRAM_ID
  );
  
  const [poolPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('pool')],
    PROGRAM_ID
  );
  
  try {
    // Get pool vault (ATA for pool)
    const poolVault = await getAssociatedTokenAddress(
      WHISTLE_MINT,
      poolPDA,
      true
    );
    
    // Get user token account
    const userTokenAccount = await getAssociatedTokenAddress(
      WHISTLE_MINT,
      nodeKeypair.publicKey
    );
    
    const tx = await program.methods.claimRelayPayment()
      .accounts({
        relayRequest: relayRequestPDA,
        nodeAccount: nodeAccountPDA,
        pool: poolPDA,
        user: nodeKeypair.publicKey,
        userTokenAccount,
        poolVault,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .rpc();
    
    console.log(`   ✅ Claimed relay payment: ${tx}`);
    return { success: true, signature: tx };
  } catch (err) {
    console.error(`   ❌ Failed to claim payment:`, err.message);
    return { success: false, error: err.message };
  }
}

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================

async function handleRelayRequest(message) {
  console.log(`\n📨 Relay Request Received:`);
  console.log(`   Request ID: ${message.requestId}`);
  console.log(`   Recipient: ${message.recipient}`);
  console.log(`   Amount: ${message.amount} SOL`);
  console.log(`   Hops: ${message.hops || message.numHops}`);
  console.log(`   Fee: ${message.fee || message.relayFee} $WHISTLE`);
  console.log(`   Mode: ${message.mode}`);
  console.log(`   Selected Nodes:`, message.selectedNodes?.length || 0);
  
  // 🔒 SECURITY: Only bootstrap nodes can handle SOL relay transactions
  if (!IS_BOOTSTRAP_NODE) {
    console.log(`\n🔒 SECURITY BLOCK: This is NOT a bootstrap node!`);
    console.log(`   User nodes cannot handle SOL relay transactions.`);
    console.log(`   Only nodes with ID containing 'bootstrap-node' can process relays.\n`);
    return;
  }
  
  // Check if this node is selected
  const isSelected = message.selectedNodes?.includes(nodeKeypair.publicKey.toBase58());
  
  if (!isSelected) {
    console.log(`⚠️  This node was NOT selected for this relay`);
    return;
  }
  
  console.log(`✅ This node IS selected for relay!`);
  
  // Store relay info for later (when we receive the SOL)
  activeRelays.set(message.requestId, {
    ...message,
    receivedAt: Date.now(),
    status: 'received'
  });
  
  // Acknowledge receipt
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'NODE_JOINED_RELAY',
      nodeId: NODE_ID,
      requestId: message.requestId,
      walletAddress: nodeKeypair.publicKey.toBase58(),
      timestamp: Date.now()
    }));
  }
  
  // Execute relay in sequence
  try {
    // Step 1: Join relay on-chain
    console.log(`\n🔗 Step 1: Joining relay on-chain...`);
    const joinResult = await joinRelayOnChain(message);
    
    if (!joinResult.success) {
      console.log(`   ⚠️  Join failed, but continuing with off-chain relay`);
    }
    
    // Step 2: Wait a moment for other nodes to join
    console.log(`\n⏳ Step 2: Waiting for other nodes to join (3s)...`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 3: Execute relay transfer
    console.log(`\n💸 Step 3: Executing relay transfer...`);
    const transferResult = await executeRelayTransfer(message);
    
    if (!transferResult.success) {
      throw new Error(`Transfer failed: ${transferResult.error}`);
    }
    
    // Step 4: If last hop, try to complete relay
    if (transferResult.isFinal) {
      console.log(`\n🏁 Step 4: Relay completed (final hop)!`);
      activeRelays.get(message.requestId).status = 'completed';
      
      // Notify signaling server
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'RELAY_COMPLETED',
          requestId: message.requestId,
          nodeId: NODE_ID,
          signature: transferResult.signature
        }));
      }
    }
    
    // Step 5: Claim payment (wait a bit for completion)
    console.log(`\n💰 Step 5: Claiming relay payment (waiting 5s)...`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const claimResult = await claimRelayPayment(message);
    if (claimResult.success) {
      console.log(`\n✅✅✅ RELAY FULLY EXECUTED! ✅✅✅\n`);
    } else {
      console.log(`\n✅ Relay executed, but payment claim failed (will retry later)\n`);
    }
    
  } catch (err) {
    console.error(`\n❌ Relay execution error:`, err.message);
    activeRelays.get(message.requestId).status = 'failed';
    activeRelays.get(message.requestId).error = err.message;
  }
}

/**
 * Handle relay forward notification from previous node
 * This is called when the previous node has forwarded SOL to this node
 */
async function handleRelayForward(message) {
  const { requestId, fromNode, signature } = message.data || message;
  
  console.log(`\n➡️  Relay Forward Notification:`);
  console.log(`   Request ID: ${requestId}`);
  console.log(`   From Node: ${fromNode ? fromNode.slice(0,8) + '...' : 'unknown'}`);
  console.log(`   TX Signature: ${signature ? signature.slice(0,8) + '...' : 'unknown'}`);
  
  // 🔒 SECURITY: Only bootstrap nodes can continue relay forwards
  if (!IS_BOOTSTRAP_NODE) {
    console.log(`\n🔒 SECURITY BLOCK: This is NOT a bootstrap node!`);
    console.log(`   Cannot continue relay forward - user nodes don't handle SOL.\n`);
    return;
  }
  
  // Get the stored relay info
  const relayInfo = activeRelays.get(requestId);
  
  if (!relayInfo) {
    console.error(`   ❌ No relay info found for request ${requestId}`);
    return;
  }
  
  console.log(`   ✅ Found stored relay info, continuing relay...`);
  
  // Wait a moment for SOL to arrive, then continue the relay
  setTimeout(async () => {
    try {
      console.log(`\n💸 Continuing relay execution...`);
      const transferResult = await executeRelayTransfer(relayInfo);
      
      if (!transferResult.success) {
        throw new Error(`Transfer failed: ${transferResult.error}`);
      }
      
      console.log(`   ✅ Relay forwarding complete!`);
      
      // Update status
      relayInfo.status = transferResult.isFinal ? 'completed' : 'forwarded';
      
      // If this was the final hop, try to claim payment
      if (transferResult.isFinal) {
        console.log(`\n💰 Final hop - claiming relay payment (waiting 5s)...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const claimResult = await claimRelayPayment(relayInfo);
        if (claimResult.success) {
          console.log(`\n✅✅✅ RELAY FULLY EXECUTED! ✅✅✅\n`);
        }
      }
      
    } catch (err) {
      console.error(`\n❌ Relay forward error:`, err.message);
      relayInfo.status = 'failed';
      relayInfo.error = err.message;
    }
  }, 2000); // Wait 2 seconds for SOL to arrive
}

async function handleStoreChunk(message) {
  const { chunkId, data, fileId } = message;
  
  console.log(`\n💾 Storing Chunk:`);
  console.log(`   File ID: ${fileId}`);
  console.log(`   Chunk ID: ${chunkId}`);
  console.log(`   Size: ${data ? Buffer.from(data, 'base64').length : 0} bytes`);
  
  try {
    // Create file directory
    const fileDir = path.join(STORAGE_DIR, fileId);
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }
    
    // Save chunk to disk
    const chunkPath = path.join(fileDir, `${chunkId}.chunk`);
    const chunkData = Buffer.from(data, 'base64');
    fs.writeFileSync(chunkPath, chunkData);
    
    // Save metadata
    const metaPath = path.join(fileDir, `${chunkId}.meta.json`);
    fs.writeFileSync(metaPath, JSON.stringify({
      chunkId,
      fileId,
      size: chunkData.length,
      storedAt: Date.now(),
      nodeId: NODE_ID
    }));
    
    console.log(`✅ Chunk stored successfully at ${chunkPath}`);
    
    // Confirm storage
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'CHUNK_STORED',
        nodeId: NODE_ID,
        chunkId,
        fileId,
        success: true,
        timestamp: Date.now()
      }));
    }
  } catch (err) {
    console.error(`❌ Failed to store chunk: ${err.message}`);
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'CHUNK_STORED',
        nodeId: NODE_ID,
        chunkId,
        fileId,
        success: false,
        error: err.message,
        timestamp: Date.now()
      }));
    }
  }
}

async function handleRequestChunk(message) {
  const { chunkId, fileId, requestId } = message;
  
  console.log(`\n📤 Chunk Requested:`);
  console.log(`   File ID: ${fileId}`);
  console.log(`   Chunk ID: ${chunkId}`);
  
  try {
    const chunkPath = path.join(STORAGE_DIR, fileId, `${chunkId}.chunk`);
    
    if (!fs.existsSync(chunkPath)) {
      throw new Error('Chunk not found');
    }
    
    const chunkData = fs.readFileSync(chunkPath);
    const base64Data = chunkData.toString('base64');
    
    console.log(`✅ Chunk retrieved (${chunkData.length} bytes)`);
    
    // Send chunk data
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'CHUNK_DATA',
        nodeId: NODE_ID,
        chunkId,
        fileId,
        requestId,
        data: base64Data,
        success: true,
        timestamp: Date.now()
      }));
    }
  } catch (err) {
    console.error(`❌ Failed to retrieve chunk: ${err.message}`);
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'CHUNK_DATA',
        nodeId: NODE_ID,
        chunkId,
        fileId,
        requestId,
        success: false,
        error: err.message,
        timestamp: Date.now()
      }));
    }
  }
}

function handlePing(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'PONG',
      nodeId: NODE_ID,
      timestamp: Date.now()
    }));
  }
}

function reconnect() {
  reconnectAttempts++;
  const delay = Math.min(reconnectAttempts * 5000, MAX_RECONNECT_DELAY);
  
  console.log(`🔄 Reconnecting in ${delay/1000}s (attempt ${reconnectAttempts})...`);
  
  setTimeout(() => {
    connectToSignalingServer();
  }, delay);
}

// Graceful shutdown
function shutdown() {
  console.log(`\n🛑 Shutting down ${NODE_ID}...`);
  
  stopHeartbeat();
  
  if (ws) {
    ws.send(JSON.stringify({
      type: 'NODE_OFFLINE',
      nodeId: NODE_ID,
      timestamp: Date.now()
    }));
    ws.close();
  }
  
  console.log(`✅ Node stopped cleanly`);
  process.exit(0);
}

// Handle process signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the node
console.log('🚀 Starting Ghost Whistle Node...\n');
initNode().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});


const WebSocket = require('ws');
const { Keypair, Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { AnchorProvider, Program, Wallet } = require('@coral-xyz/anchor');
const { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const nacl = require('tweetnacl');
const fs = require('fs');
const path = require('path');

// Environment configuration
const NODE_ID = process.env.NODE_ID || `node-${Date.now()}`;
const NODE_REGION = process.env.NODE_REGION || 'US-East';
const SIGNALING_SERVER = process.env.SIGNALING_SERVER || 'ws://localhost:8080';
const RPC_URL = process.env.RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=413dfeef-84d4-4a37-98a7-1e0716bfc4ba';
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, 'node-storage', NODE_ID);

// 🔒 SECURITY: Only bootstrap nodes can handle SOL relay transactions
const IS_BOOTSTRAP_NODE = NODE_ID && NODE_ID.includes('bootstrap-node');
console.log(`\n🔒 Node Type: ${IS_BOOTSTRAP_NODE ? '💰 BOOTSTRAP (Can handle SOL)' : '👤 USER (No SOL handling)'}`);
console.log(`   Node ID: ${NODE_ID}`);
console.log(`   Region: ${NODE_REGION}\n`);

// Solana Program Constants
const PROGRAM_ID = new PublicKey('2uZWi6wC6CumhcCDCuNZcBaDSd7UJKf4BKreWdx1Pyaq');
const WHISTLE_MINT = new PublicKey('6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump');

let ws;
let nodeKeypair;
let connection;
let program;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 60000; // 1 minute
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
let heartbeatInterval;

// Track active relay participation
const activeRelays = new Map(); // requestId -> relay info

// Create storage directory
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  console.log(`📁 Created storage directory: ${STORAGE_DIR}`);
}

async function initNode() {
  // Load or generate node keypair (persistent)
  const keypairPath = path.join(__dirname, 'node-keys', `${NODE_ID}-keypair.json`);
  
  if (fs.existsSync(keypairPath)) {
    console.log(`🔑 Loading existing keypair from ${keypairPath}`);
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
    nodeKeypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
  } else {
    console.log(`🔑 Generating new keypair for ${NODE_ID}`);
    nodeKeypair = Keypair.generate();
    
    // Save keypair
    const keysDir = path.join(__dirname, 'node-keys');
    if (!fs.existsSync(keysDir)) {
      fs.mkdirSync(keysDir, { recursive: true });
    }
    fs.writeFileSync(keypairPath, JSON.stringify(Array.from(nodeKeypair.secretKey)));
    console.log(`💾 Keypair saved to ${keypairPath}`);
  }
  
  connection = new Connection(RPC_URL, 'confirmed');
  
  // Load IDL and initialize Anchor program
  try {
    const idl = JSON.parse(fs.readFileSync(path.join(__dirname, 'ghost-whistle-idl.json'), 'utf8'));
    const wallet = new Wallet(nodeKeypair);
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    program = new Program(idl, PROGRAM_ID, provider);
    console.log(`✅ Anchor program initialized`);
  } catch (err) {
    console.warn(`⚠️  Could not load IDL:`, err.message);
    console.warn(`⚠️  Relay execution will be disabled`);
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🟢 Ghost Whistle Node Starting`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📛 Node ID: ${NODE_ID}`);
  console.log(`📍 Region: ${NODE_REGION}`);
  console.log(`🔑 Wallet: ${nodeKeypair.publicKey.toBase58()}`);
  console.log(`💾 Storage: ${STORAGE_DIR}`);
  console.log(`🌐 Signaling: ${SIGNALING_SERVER}`);
  console.log(`${'='.repeat(60)}\n`);
  
  connectToSignalingServer();
}

function connectToSignalingServer() {
  console.log(`🔄 Connecting to signaling server...`);
  
  ws = new WebSocket(SIGNALING_SERVER);
  
  ws.on('open', () => {
    console.log(`✅ Connected to signaling server at ${new Date().toISOString()}`);
    reconnectAttempts = 0;
    
    // Register this node
    const registrationMessage = {
      type: 'REGISTER_NODE',
      nodeId: NODE_ID,
      walletAddress: nodeKeypair.publicKey.toBase58(),
      region: NODE_REGION,
      capabilities: ['relay', 'storage'],
      staked: true, // Bootstrap nodes always available
      online: true,
      timestamp: Date.now()
    };
    
    ws.send(JSON.stringify(registrationMessage));
    console.log(`📡 Registered with signaling server`);
    
    // Start heartbeat
    startHeartbeat();
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(message);
    } catch (err) {
      console.error('❌ Failed to parse message:', err.message);
    }
  });
  
  ws.on('close', (code, reason) => {
    console.log(`❌ Disconnected from signaling server (${code}: ${reason})`);
    stopHeartbeat();
    reconnect();
  });
  
  ws.on('error', (err) => {
    console.error(`⚠️  WebSocket error: ${err.message}`);
  });
}

function startHeartbeat() {
  stopHeartbeat(); // Clear any existing interval
  
  heartbeatInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'HEARTBEAT',
        nodeId: NODE_ID,
        timestamp: Date.now()
      }));
      console.log(`💓 Heartbeat sent`);
    }
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

function handleMessage(message) {
  const { type } = message;
  
  switch (type) {
    case 'relay_request':
    case 'RELAY_REQUEST_AVAILABLE':
      handleRelayRequest(message);
      break;
    
    case 'relay_forward':
      // Handle forwarded relay from previous node
      handleRelayForward(message);
      break;
    
    case 'STORE_CHUNK':
      handleStoreChunk(message);
      break;
    
    case 'REQUEST_CHUNK':
      handleRequestChunk(message);
      break;
    
    case 'PING':
      handlePing(message);
      break;
    
    case 'NODE_REGISTERED':
      console.log(`✅ Node registration confirmed by server`);
      break;
    
    default:
      console.log(`📨 Unknown message type: ${type}`);
  }
}

// ============================================================================
// RELAY EXECUTION FUNCTIONS
// ============================================================================

/**
 * Join a relay request on-chain
 */
async function joinRelayOnChain(relayData) {
  if (!program) {
    throw new Error('Anchor program not initialized');
  }

  const { requestId, selectedNodes } = relayData;
  
  // Derive PDAs
  const creatorWallet = new PublicKey(selectedNodes[0]); // First node is creator's wallet selection
  
  const [relayRequestPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('relay'),
      creatorWallet.toBuffer(),
      Buffer.from(new BigUint64Array([BigInt(requestId)]).buffer)
    ],
    PROGRAM_ID
  );
  
  const [nodeAccountPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('node'), nodeKeypair.publicKey.toBuffer()],
    PROGRAM_ID
  );
  
  console.log(`   📍 Joining relay on-chain...`);
  console.log(`      Relay PDA: ${relayRequestPDA.toBase58()}`);
  console.log(`      Node PDA: ${nodeAccountPDA.toBase58()}`);
  
  try {
    const tx = await program.methods.joinRelay()
      .accounts({
        relayRequest: relayRequestPDA,
        nodeAccount: nodeAccountPDA,
        user: nodeKeypair.publicKey
      })
      .rpc();
    
    console.log(`   ✅ Joined relay on-chain: ${tx}`);
    return { success: true, signature: tx };
  } catch (err) {
    console.error(`   ❌ Failed to join relay:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Decrypt one layer of the encrypted payload
 */
function decryptRelayLayer(encryptedHex, nodeKeypair) {
  try {
    // Convert hex to buffer
    const encryptedData = Buffer.from(encryptedHex, 'hex');
    
    // Extract nonce (first 24 bytes) and ciphertext (rest)
    const nonce = encryptedData.slice(0, nacl.box.nonceLength);
    const ciphertext = encryptedData.slice(nacl.box.nonceLength);
    
    // For now, since we don't have the full encryption scheme implemented,
    // we'll extract the data from the message directly
    console.log(`   🔓 Decrypting relay layer...`);
    
    return {
      success: true,
      recipient: null, // Will be provided in message
      amount: null,    // Will be provided in message
      nextHop: null    // Will be determined by hop index
    };
  } catch (err) {
    console.error(`   ❌ Decryption failed:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Execute the relay - either forward to next hop or send to final recipient
 */
async function executeRelayTransfer(relayData) {
  const { recipient, amount, selectedNodes, requestId } = relayData;
  
  // Find this node's position in the relay chain
  const myWallet = nodeKeypair.publicKey.toBase58();
  const myIndex = selectedNodes.findIndex(addr => addr === myWallet);
  
  if (myIndex === -1) {
    console.error(`   ❌ This node is not in the selected nodes list`);
    return { success: false, error: 'Node not in relay' };
  }
  
  const isLastHop = myIndex === selectedNodes.length - 1;
  
  console.log(`   🔄 Executing relay transfer (hop ${myIndex + 1}/${selectedNodes.length})...`);
  
  if (isLastHop) {
    // FINAL HOP: Send to actual recipient
    return await sendToFinalRecipient(recipient, amount, requestId);
  } else {
    // MIDDLE HOP: Forward to next node in chain
    const nextNodeWallet = selectedNodes[myIndex + 1];
    return await forwardToNextNode(nextNodeWallet, amount, requestId);
  }
}

/**
 * Send SOL to final recipient (last hop)
 */
async function sendToFinalRecipient(recipientAddress, amountSOL, requestId) {
  try {
    console.log(`   💸 Sending ${amountSOL} SOL to final recipient: ${recipientAddress.slice(0,8)}...`);
    
    const recipient = new PublicKey(recipientAddress);
    const lamports = Math.floor(parseFloat(amountSOL) * LAMPORTS_PER_SOL);
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: nodeKeypair.publicKey,
        toPubkey: recipient,
        lamports
      })
    );
    
    const signature = await connection.sendTransaction(transaction, [nodeKeypair]);
    await connection.confirmTransaction(signature, 'confirmed');
    
    console.log(`   ✅ Sent to final recipient: ${signature}`);
    
    return { success: true, signature, isFinal: true };
  } catch (err) {
    console.error(`   ❌ Failed to send to recipient:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Forward SOL to next node in relay chain
 */
async function forwardToNextNode(nextNodeAddress, amountSOL, requestId) {
  try {
    console.log(`   ➡️  Forwarding ${amountSOL} SOL to next node: ${nextNodeAddress.slice(0,8)}...`);
    
    const nextNode = new PublicKey(nextNodeAddress);
    const lamports = Math.floor(parseFloat(amountSOL) * LAMPORTS_PER_SOL);
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: nodeKeypair.publicKey,
        toPubkey: nextNode,
        lamports
      })
    );
    
    const signature = await connection.sendTransaction(transaction, [nodeKeypair]);
    await connection.confirmTransaction(signature, 'confirmed');
    
    console.log(`   ✅ Forwarded to next hop: ${signature}`);
    
    // Notify next node to continue the relay
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'relay_forward',
        to: nextNodeAddress,
        data: {
          requestId,
          fromNode: nodeKeypair.publicKey.toBase58(),
          signature
        }
      }));
    }
    
    return { success: true, signature, isFinal: false };
  } catch (err) {
    console.error(`   ❌ Failed to forward to next node:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Complete the relay on-chain (called by last node after successful transfer)
 */
async function completeRelayOnChain(relayData) {
  if (!program) {
    throw new Error('Anchor program not initialized');
  }

  const { requestId, selectedNodes, transactionHash } = relayData;
  
  console.log(`   ✅ Completing relay on-chain...`);
  
  // Note: complete_relay requires authority (original creator)
  // For now, nodes can't call this - it needs to be called by the backend
  // or we need to update the smart contract to allow nodes to complete
  
  console.log(`   ⚠️  complete_relay requires authority - skipping for now`);
  return { success: true, note: 'Completion requires authority' };
}

/**
 * Claim relay payment for this node
 */
async function claimRelayPayment(relayData) {
  if (!program) {
    throw new Error('Anchor program not initialized');
  }

  const { requestId, selectedNodes } = relayData;
  
  console.log(`   💰 Claiming relay payment...`);
  
  // Derive PDAs
  const creatorWallet = new PublicKey(selectedNodes[0]);
  
  const [relayRequestPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('relay'),
      creatorWallet.toBuffer(),
      Buffer.from(new BigUint64Array([BigInt(requestId)]).buffer)
    ],
    PROGRAM_ID
  );
  
  const [nodeAccountPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('node'), nodeKeypair.publicKey.toBuffer()],
    PROGRAM_ID
  );
  
  const [poolPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('pool')],
    PROGRAM_ID
  );
  
  try {
    // Get pool vault (ATA for pool)
    const poolVault = await getAssociatedTokenAddress(
      WHISTLE_MINT,
      poolPDA,
      true
    );
    
    // Get user token account
    const userTokenAccount = await getAssociatedTokenAddress(
      WHISTLE_MINT,
      nodeKeypair.publicKey
    );
    
    const tx = await program.methods.claimRelayPayment()
      .accounts({
        relayRequest: relayRequestPDA,
        nodeAccount: nodeAccountPDA,
        pool: poolPDA,
        user: nodeKeypair.publicKey,
        userTokenAccount,
        poolVault,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .rpc();
    
    console.log(`   ✅ Claimed relay payment: ${tx}`);
    return { success: true, signature: tx };
  } catch (err) {
    console.error(`   ❌ Failed to claim payment:`, err.message);
    return { success: false, error: err.message };
  }
}

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================

async function handleRelayRequest(message) {
  console.log(`\n📨 Relay Request Received:`);
  console.log(`   Request ID: ${message.requestId}`);
  console.log(`   Recipient: ${message.recipient}`);
  console.log(`   Amount: ${message.amount} SOL`);
  console.log(`   Hops: ${message.hops || message.numHops}`);
  console.log(`   Fee: ${message.fee || message.relayFee} $WHISTLE`);
  console.log(`   Mode: ${message.mode}`);
  console.log(`   Selected Nodes:`, message.selectedNodes?.length || 0);
  
  // 🔒 SECURITY: Only bootstrap nodes can handle SOL relay transactions
  if (!IS_BOOTSTRAP_NODE) {
    console.log(`\n🔒 SECURITY BLOCK: This is NOT a bootstrap node!`);
    console.log(`   User nodes cannot handle SOL relay transactions.`);
    console.log(`   Only nodes with ID containing 'bootstrap-node' can process relays.\n`);
    return;
  }
  
  // Check if this node is selected
  const isSelected = message.selectedNodes?.includes(nodeKeypair.publicKey.toBase58());
  
  if (!isSelected) {
    console.log(`⚠️  This node was NOT selected for this relay`);
    return;
  }
  
  console.log(`✅ This node IS selected for relay!`);
  
  // Store relay info for later (when we receive the SOL)
  activeRelays.set(message.requestId, {
    ...message,
    receivedAt: Date.now(),
    status: 'received'
  });
  
  // Acknowledge receipt
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'NODE_JOINED_RELAY',
      nodeId: NODE_ID,
      requestId: message.requestId,
      walletAddress: nodeKeypair.publicKey.toBase58(),
      timestamp: Date.now()
    }));
  }
  
  // Execute relay in sequence
  try {
    // Step 1: Join relay on-chain
    console.log(`\n🔗 Step 1: Joining relay on-chain...`);
    const joinResult = await joinRelayOnChain(message);
    
    if (!joinResult.success) {
      console.log(`   ⚠️  Join failed, but continuing with off-chain relay`);
    }
    
    // Step 2: Wait a moment for other nodes to join
    console.log(`\n⏳ Step 2: Waiting for other nodes to join (3s)...`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 3: Execute relay transfer
    console.log(`\n💸 Step 3: Executing relay transfer...`);
    const transferResult = await executeRelayTransfer(message);
    
    if (!transferResult.success) {
      throw new Error(`Transfer failed: ${transferResult.error}`);
    }
    
    // Step 4: If last hop, try to complete relay
    if (transferResult.isFinal) {
      console.log(`\n🏁 Step 4: Relay completed (final hop)!`);
      activeRelays.get(message.requestId).status = 'completed';
      
      // Notify signaling server
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'RELAY_COMPLETED',
          requestId: message.requestId,
          nodeId: NODE_ID,
          signature: transferResult.signature
        }));
      }
    }
    
    // Step 5: Claim payment (wait a bit for completion)
    console.log(`\n💰 Step 5: Claiming relay payment (waiting 5s)...`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const claimResult = await claimRelayPayment(message);
    if (claimResult.success) {
      console.log(`\n✅✅✅ RELAY FULLY EXECUTED! ✅✅✅\n`);
    } else {
      console.log(`\n✅ Relay executed, but payment claim failed (will retry later)\n`);
    }
    
  } catch (err) {
    console.error(`\n❌ Relay execution error:`, err.message);
    activeRelays.get(message.requestId).status = 'failed';
    activeRelays.get(message.requestId).error = err.message;
  }
}

/**
 * Handle relay forward notification from previous node
 * This is called when the previous node has forwarded SOL to this node
 */
async function handleRelayForward(message) {
  const { requestId, fromNode, signature } = message.data || message;
  
  console.log(`\n➡️  Relay Forward Notification:`);
  console.log(`   Request ID: ${requestId}`);
  console.log(`   From Node: ${fromNode ? fromNode.slice(0,8) + '...' : 'unknown'}`);
  console.log(`   TX Signature: ${signature ? signature.slice(0,8) + '...' : 'unknown'}`);
  
  // 🔒 SECURITY: Only bootstrap nodes can continue relay forwards
  if (!IS_BOOTSTRAP_NODE) {
    console.log(`\n🔒 SECURITY BLOCK: This is NOT a bootstrap node!`);
    console.log(`   Cannot continue relay forward - user nodes don't handle SOL.\n`);
    return;
  }
  
  // Get the stored relay info
  const relayInfo = activeRelays.get(requestId);
  
  if (!relayInfo) {
    console.error(`   ❌ No relay info found for request ${requestId}`);
    return;
  }
  
  console.log(`   ✅ Found stored relay info, continuing relay...`);
  
  // Wait a moment for SOL to arrive, then continue the relay
  setTimeout(async () => {
    try {
      console.log(`\n💸 Continuing relay execution...`);
      const transferResult = await executeRelayTransfer(relayInfo);
      
      if (!transferResult.success) {
        throw new Error(`Transfer failed: ${transferResult.error}`);
      }
      
      console.log(`   ✅ Relay forwarding complete!`);
      
      // Update status
      relayInfo.status = transferResult.isFinal ? 'completed' : 'forwarded';
      
      // If this was the final hop, try to claim payment
      if (transferResult.isFinal) {
        console.log(`\n💰 Final hop - claiming relay payment (waiting 5s)...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const claimResult = await claimRelayPayment(relayInfo);
        if (claimResult.success) {
          console.log(`\n✅✅✅ RELAY FULLY EXECUTED! ✅✅✅\n`);
        }
      }
      
    } catch (err) {
      console.error(`\n❌ Relay forward error:`, err.message);
      relayInfo.status = 'failed';
      relayInfo.error = err.message;
    }
  }, 2000); // Wait 2 seconds for SOL to arrive
}

async function handleStoreChunk(message) {
  const { chunkId, data, fileId } = message;
  
  console.log(`\n💾 Storing Chunk:`);
  console.log(`   File ID: ${fileId}`);
  console.log(`   Chunk ID: ${chunkId}`);
  console.log(`   Size: ${data ? Buffer.from(data, 'base64').length : 0} bytes`);
  
  try {
    // Create file directory
    const fileDir = path.join(STORAGE_DIR, fileId);
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }
    
    // Save chunk to disk
    const chunkPath = path.join(fileDir, `${chunkId}.chunk`);
    const chunkData = Buffer.from(data, 'base64');
    fs.writeFileSync(chunkPath, chunkData);
    
    // Save metadata
    const metaPath = path.join(fileDir, `${chunkId}.meta.json`);
    fs.writeFileSync(metaPath, JSON.stringify({
      chunkId,
      fileId,
      size: chunkData.length,
      storedAt: Date.now(),
      nodeId: NODE_ID
    }));
    
    console.log(`✅ Chunk stored successfully at ${chunkPath}`);
    
    // Confirm storage
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'CHUNK_STORED',
        nodeId: NODE_ID,
        chunkId,
        fileId,
        success: true,
        timestamp: Date.now()
      }));
    }
  } catch (err) {
    console.error(`❌ Failed to store chunk: ${err.message}`);
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'CHUNK_STORED',
        nodeId: NODE_ID,
        chunkId,
        fileId,
        success: false,
        error: err.message,
        timestamp: Date.now()
      }));
    }
  }
}

async function handleRequestChunk(message) {
  const { chunkId, fileId, requestId } = message;
  
  console.log(`\n📤 Chunk Requested:`);
  console.log(`   File ID: ${fileId}`);
  console.log(`   Chunk ID: ${chunkId}`);
  
  try {
    const chunkPath = path.join(STORAGE_DIR, fileId, `${chunkId}.chunk`);
    
    if (!fs.existsSync(chunkPath)) {
      throw new Error('Chunk not found');
    }
    
    const chunkData = fs.readFileSync(chunkPath);
    const base64Data = chunkData.toString('base64');
    
    console.log(`✅ Chunk retrieved (${chunkData.length} bytes)`);
    
    // Send chunk data
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'CHUNK_DATA',
        nodeId: NODE_ID,
        chunkId,
        fileId,
        requestId,
        data: base64Data,
        success: true,
        timestamp: Date.now()
      }));
    }
  } catch (err) {
    console.error(`❌ Failed to retrieve chunk: ${err.message}`);
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'CHUNK_DATA',
        nodeId: NODE_ID,
        chunkId,
        fileId,
        requestId,
        success: false,
        error: err.message,
        timestamp: Date.now()
      }));
    }
  }
}

function handlePing(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'PONG',
      nodeId: NODE_ID,
      timestamp: Date.now()
    }));
  }
}

function reconnect() {
  reconnectAttempts++;
  const delay = Math.min(reconnectAttempts * 5000, MAX_RECONNECT_DELAY);
  
  console.log(`🔄 Reconnecting in ${delay/1000}s (attempt ${reconnectAttempts})...`);
  
  setTimeout(() => {
    connectToSignalingServer();
  }, delay);
}

// Graceful shutdown
function shutdown() {
  console.log(`\n🛑 Shutting down ${NODE_ID}...`);
  
  stopHeartbeat();
  
  if (ws) {
    ws.send(JSON.stringify({
      type: 'NODE_OFFLINE',
      nodeId: NODE_ID,
      timestamp: Date.now()
    }));
    ws.close();
  }
  
  console.log(`✅ Node stopped cleanly`);
  process.exit(0);
}

// Handle process signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the node
console.log('🚀 Starting Ghost Whistle Node...\n');
initNode().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

