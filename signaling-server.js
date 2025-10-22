/**
 * Ghost Whistle - WebRTC Signaling Server
 * Coordinates peer-to-peer connections for the privacy node network
 */

const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');

const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: '*', // Allow all origins (or specify 'http://localhost:3000')
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store active nodes
const activeNodes = new Map();
const nodesByRegion = new Map();

// Heartbeat interval
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const NODE_TIMEOUT = 60000; // 1 minute

class Node {
  constructor(ws, id, walletAddress) {
    this.ws = ws;
    this.id = id;
    this.walletAddress = walletAddress;
    this.connectedAt = Date.now();
    this.lastSeen = Date.now();
    this.relayCount = 0;
    this.region = 'unknown';
    this.reputation = 0;
    this.connections = new Set();
  }

  updateLastSeen() {
    this.lastSeen = Date.now();
  }

  isAlive() {
    return Date.now() - this.lastSeen < NODE_TIMEOUT;
  }

  toJSON() {
    return {
      id: this.id,
      walletAddress: this.walletAddress,
      connectedAt: this.connectedAt,
      uptime: Date.now() - this.connectedAt,
      relayCount: this.relayCount,
      region: this.region,
      reputation: this.reputation,
      connectionCount: this.connections.size
    };
  }
}

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('🔌 New WebSocket connection');
  
  let currentNode = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'register':
          handleRegister(ws, message);
          break;
        
        case 'offer':
          handleOffer(message);
          break;
        
        case 'answer':
          handleAnswer(message);
          break;
        
        case 'ice-candidate':
          handleIceCandidate(message);
          break;
        
        case 'relay-request':
          handleRelayRequest(message);
          break;
        
        case 'heartbeat':
          handleHeartbeat(message);
          break;
        
        case 'disconnect':
          handleDisconnect(message);
          break;
        
        default:
          console.log('⚠️ Unknown message type:', message.type);
      }
    } catch (err) {
      console.error('❌ Error processing message:', err);
    }
  });

  ws.on('close', () => {
    if (currentNode) {
      console.log(`👋 Node ${currentNode.id} disconnected`);
      activeNodes.delete(currentNode.id);
      broadcastNodeList();
    }
  });

  ws.on('error', (err) => {
    console.error('❌ WebSocket error:', err);
  });

  function handleRegister(ws, message) {
    const { nodeId, walletAddress, region } = message;
    
    currentNode = new Node(ws, nodeId, walletAddress);
    currentNode.region = region || 'unknown';
    
    activeNodes.set(nodeId, currentNode);
    
    // Add to region map
    if (!nodesByRegion.has(region)) {
      nodesByRegion.set(region, new Set());
    }
    nodesByRegion.get(region).add(nodeId);
    
    console.log(`✅ Node registered: ${nodeId} (${walletAddress})`);
    
    // Send current node list to the new node
    ws.send(JSON.stringify({
      type: 'registered',
      nodeId: nodeId,
      nodes: getNodeList(nodeId)
    }));
    
    // Broadcast updated node list to all
    broadcastNodeList();
  }

  function handleOffer(message) {
    const { from, to, offer } = message;
    const targetNode = activeNodes.get(to);
    
    if (targetNode && targetNode.ws.readyState === WebSocket.OPEN) {
      targetNode.ws.send(JSON.stringify({
        type: 'offer',
        from: from,
        offer: offer
      }));
      
      // Track connection
      const sourceNode = activeNodes.get(from);
      if (sourceNode) {
        sourceNode.connections.add(to);
      }
    }
  }

  function handleAnswer(message) {
    const { from, to, answer } = message;
    const targetNode = activeNodes.get(to);
    
    if (targetNode && targetNode.ws.readyState === WebSocket.OPEN) {
      targetNode.ws.send(JSON.stringify({
        type: 'answer',
        from: from,
        answer: answer
      }));
      
      // Track bidirectional connection
      const sourceNode = activeNodes.get(from);
      if (sourceNode) {
        sourceNode.connections.add(to);
      }
      targetNode.connections.add(from);
    }
  }

  function handleIceCandidate(message) {
    const { from, to, candidate } = message;
    const targetNode = activeNodes.get(to);
    
    if (targetNode && targetNode.ws.readyState === WebSocket.OPEN) {
      targetNode.ws.send(JSON.stringify({
        type: 'ice-candidate',
        from: from,
        candidate: candidate
      }));
    }
  }

  function handleRelayRequest(message) {
    const { nodeId, txHash } = message;
    const node = activeNodes.get(nodeId);
    
    if (node) {
      node.relayCount++;
      node.updateLastSeen();
      
      console.log(`📡 Relay recorded for ${nodeId}: ${txHash}`);
      
      // Broadcast relay stats
      broadcastRelayStats(nodeId, node.relayCount);
    }
  }

  function handleHeartbeat(message) {
    const { nodeId } = message;
    const node = activeNodes.get(nodeId);
    
    if (node) {
      node.updateLastSeen();
    }
  }

  function handleDisconnect(message) {
    const { nodeId } = message;
    const node = activeNodes.get(nodeId);
    
    if (node) {
      activeNodes.delete(nodeId);
      console.log(`👋 Node ${nodeId} gracefully disconnected`);
      broadcastNodeList();
    }
  }
});

// Utility functions
function getNodeList(excludeId = null) {
  const nodes = [];
  for (const [id, node] of activeNodes) {
    if (id !== excludeId && node.isAlive()) {
      nodes.push(node.toJSON());
    }
  }
  return nodes;
}

function broadcastNodeList() {
  const message = JSON.stringify({
    type: 'node-list',
    nodes: getNodeList(),
    totalNodes: activeNodes.size
  });
  
  activeNodes.forEach((node) => {
    if (node.ws.readyState === WebSocket.OPEN) {
      node.ws.send(message);
    }
  });
}

function broadcastRelayStats(nodeId, relayCount) {
  const message = JSON.stringify({
    type: 'relay-stats',
    nodeId: nodeId,
    relayCount: relayCount
  });
  
  activeNodes.forEach((node) => {
    if (node.ws.readyState === WebSocket.OPEN) {
      node.ws.send(message);
    }
  });
}

// Clean up dead nodes
setInterval(() => {
  const deadNodes = [];
  
  activeNodes.forEach((node, id) => {
    if (!node.isAlive()) {
      deadNodes.push(id);
    }
  });
  
  deadNodes.forEach((id) => {
    console.log(`💀 Removing dead node: ${id}`);
    activeNodes.delete(id);
  });
  
  if (deadNodes.length > 0) {
    broadcastNodeList();
  }
}, HEARTBEAT_INTERVAL);

// REST API endpoints
app.get('/api/stats', (req, res) => {
  const stats = {
    totalNodes: activeNodes.size,
    totalRelays: Array.from(activeNodes.values()).reduce((sum, node) => sum + node.relayCount, 0),
    nodesByRegion: {},
    averageUptime: 0
  };
  
  // Calculate regional stats
  nodesByRegion.forEach((nodes, region) => {
    stats.nodesByRegion[region] = nodes.size;
  });
  
  // Calculate average uptime
  if (activeNodes.size > 0) {
    const totalUptime = Array.from(activeNodes.values()).reduce((sum, node) => {
      return sum + (Date.now() - node.connectedAt);
    }, 0);
    stats.averageUptime = totalUptime / activeNodes.size;
  }
  
  res.json(stats);
});

app.get('/api/nodes', (req, res) => {
  res.json({
    nodes: getNodeList(),
    totalNodes: activeNodes.size
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', nodes: activeNodes.size });
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Ghost Whistle Signaling Server running on port ${PORT}`);
  console.log(`📊 Stats API: http://localhost:${PORT}/api/stats`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
});

