/**
 * Ghost Whistle - User Node Client
 * 
 * This is a lightweight node that users can run without handling SOL.
 * User nodes:
 * - Participate in the relay network
 * - Help with routing and discovery
 * - Earn reputation (future feature)
 * - DO NOT handle SOL transactions
 * - DO NOT need wallet keypairs
 * 
 * Deploy this on Render, Heroku, or run locally!
 */

const WebSocket = require('ws');
const { PublicKey } = require('@solana/web3.js');

// Environment configuration
const NODE_ID = process.env.NODE_ID || `user-node-${Date.now()}`;
const NODE_REGION = process.env.NODE_REGION || 'Cloud-User';
const SIGNALING_SERVER = process.env.SIGNALING_SERVER || 'ws://localhost:8080';

let ws;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 60000; // 1 minute
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
let heartbeatInterval;

console.log(`
╔═══════════════════════════════════════════════════════╗
║        GHOST WHISTLE - USER NODE CLIENT               ║
║        (No SOL handling - Participation only)         ║
╚═══════════════════════════════════════════════════════╝

👤 Node Type: USER NODE (Cannot handle SOL)
🆔 Node ID: ${NODE_ID}
🌍 Region: ${NODE_REGION}
📡 Signaling Server: ${SIGNALING_SERVER}

ℹ️  This node participates in the network but does NOT
   handle SOL relay transactions. Only bootstrap nodes
   controlled by the network operator handle SOL.

`);

function connectToSignalingServer() {
  console.log(`\n🔌 Connecting to signaling server...`);
  
  ws = new WebSocket(SIGNALING_SERVER);
  
  ws.on('open', () => {
    console.log(`✅ Connected to signaling server!`);
    reconnectAttempts = 0;
    
    // Register as user node
    ws.send(JSON.stringify({
      type: 'REGISTER_NODE',
      nodeId: NODE_ID,
      nodeType: 'USER_NODE',  // Important: Mark as user node
      region: NODE_REGION,
      capabilities: ['routing', 'discovery'],  // No 'relay' capability
      timestamp: Date.now()
    }));
    
    // Start heartbeat
    startHeartbeat();
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(message);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });
  
  ws.on('error', (error) => {
    console.error(`❌ WebSocket error:`, error.message);
  });
  
  ws.on('close', () => {
    console.log(`\n⚠️  Disconnected from signaling server`);
    stopHeartbeat();
    scheduleReconnect();
  });
}

function handleMessage(message) {
  const { type } = message;
  
  switch (type) {
    case 'WELCOME':
      console.log(`👋 Welcome message received`);
      console.log(`   Server: ${message.serverInfo || 'Ghost Whistle Signaling'}`);
      break;
      
    case 'NODE_LIST':
      console.log(`📋 Node list updated: ${message.nodes?.length || 0} nodes online`);
      break;
      
    case 'relay_request':
    case 'RELAY_REQUEST_AVAILABLE':
      console.log(`\n📨 Relay request broadcast received`);
      console.log(`   ℹ️  User nodes cannot participate in SOL relays`);
      console.log(`   Only bootstrap nodes handle SOL transactions`);
      // User nodes can see relay requests but cannot participate
      break;
      
    case 'PING':
      // Respond to ping
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'PONG',
          nodeId: NODE_ID,
          timestamp: Date.now()
        }));
      }
      break;
      
    case 'NODE_STATUS_REQUEST':
      // Report our status
      reportStatus();
      break;
      
    default:
      // console.log(`📬 Received: ${type}`);
      break;
  }
}

function reportStatus() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'NODE_STATUS',
      nodeId: NODE_ID,
      nodeType: 'USER_NODE',
      region: NODE_REGION,
      status: 'online',
      uptime: process.uptime(),
      capabilities: ['routing', 'discovery'],
      timestamp: Date.now()
    }));
  }
}

function startHeartbeat() {
  heartbeatInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'HEARTBEAT',
        nodeId: NODE_ID,
        timestamp: Date.now()
      }));
    }
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

function scheduleReconnect() {
  const delay = Math.min(
    1000 * Math.pow(2, reconnectAttempts),
    MAX_RECONNECT_DELAY
  );
  
  reconnectAttempts++;
  
  console.log(`🔄 Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts})...`);
  
  setTimeout(() => {
    connectToSignalingServer();
  }, delay);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n\n👋 Shutting down user node gracefully...`);
  
  stopHeartbeat();
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'NODE_DISCONNECT',
      nodeId: NODE_ID,
      timestamp: Date.now()
    }));
    
    ws.close();
  }
  
  console.log(`✅ User node stopped\n`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`\n\n👋 Received SIGTERM, shutting down...`);
  process.exit(0);
});

// Start the user node
console.log(`🚀 Starting user node...\n`);
connectToSignalingServer();

// Keep process alive
setInterval(() => {
  // Report status every 5 minutes
  reportStatus();
}, 5 * 60 * 1000);

console.log(`✅ User node is running!`);
console.log(`   Press Ctrl+C to stop\n`);

