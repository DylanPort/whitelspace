/**
 * Ghost Whistle - WebRTC Signaling Server
 * Coordinates peer-to-peer connections for the privacy node network
 */

const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: '*', // Allow all origins (or specify 'http://localhost:3000')
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Supabase configuration
const SUPABASE_URL = 'https://avhmgbkwfwlatykotxwv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2aG1nYmt3ZndsYXR5a290eHd2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTIyMzE5OSwiZXhwIjoyMDc2Nzk5MTk5fQ.fX2d1rkjgAn7ZkjJXMjbd1cU0fNEEKB7LtfeWIgKQ4g';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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
    this.sessionId = null; // Track current session
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

// Supabase persistence functions
async function upsertNodePerformance(nodeId, walletAddress, region, sessionUptime = 0, sessionRelays = 0) {
  try {
    const { data: existingNode, error: fetchError } = await supabase
      .from('node_performance')
      .select('*')
      .eq('node_id', nodeId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ Error fetching node:', fetchError);
      return;
    }

    const now = new Date();
    const sessionUptimeMs = sessionUptime || 0;
    const sessionRelaysCount = sessionRelays || 0;

    if (existingNode) {
      // Update existing node
      const updatedData = {
        total_uptime_ms: existingNode.total_uptime_ms + sessionUptimeMs,
        total_relays: existingNode.total_relays + sessionRelaysCount,
        successful_relays: existingNode.successful_relays + sessionRelaysCount, // Assume all relays are successful for now
        current_streak_ms: sessionUptimeMs,
        best_uptime_streak_ms: Math.max(existingNode.best_uptime_streak_ms, sessionUptimeMs),
        region: region || existingNode.region,
        reputation_score: Math.min(100, existingNode.reputation_score + sessionRelaysCount), // Cap at 100
        last_seen: now,
        updated_at: now
      };

      const { error: updateError } = await supabase
        .from('node_performance')
        .update(updatedData)
        .eq('node_id', nodeId);

      if (updateError) {
        console.error('❌ Error updating node performance:', updateError);
      } else {
        console.log(`✅ Updated node performance for ${nodeId}`);
      }
    } else {
      // Create new node
      const newData = {
        node_id: nodeId,
        wallet_address: walletAddress,
        total_uptime_ms: sessionUptimeMs,
        total_relays: sessionRelaysCount,
        successful_relays: sessionRelaysCount,
        failed_relays: 0,
        best_uptime_streak_ms: sessionUptimeMs,
        current_streak_ms: sessionUptimeMs,
        region: region || 'unknown',
        reputation_score: sessionRelaysCount,
        created_at: now,
        updated_at: now,
        last_seen: now
      };

      const { error: insertError } = await supabase
        .from('node_performance')
        .insert(newData);

      if (insertError) {
        console.error('❌ Error inserting node performance:', insertError);
      } else {
        console.log(`✅ Created new node performance record for ${nodeId}`);
      }
    }
  } catch (error) {
    console.error('❌ Supabase error:', error);
  }
}

async function createNodeSession(nodeId, region) {
  try {
    const { data, error } = await supabase
      .from('node_sessions')
      .insert({
        node_id: nodeId,
        region: region || 'unknown',
        session_start: new Date()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating node session:', error);
      return null;
    }

    console.log(`✅ Created session ${data.id} for node ${nodeId}`);
    return data.id;
  } catch (error) {
    console.error('❌ Session creation error:', error);
    return null;
  }
}

async function endNodeSession(sessionId, nodeId, uptimeMs, relaysCompleted) {
  try {
    const { error } = await supabase
      .from('node_sessions')
      .update({
        session_end: new Date(),
        uptime_ms: uptimeMs,
        relays_completed: relaysCompleted
      })
      .eq('id', sessionId);

    if (error) {
      console.error('❌ Error ending node session:', error);
    } else {
      console.log(`✅ Ended session ${sessionId} for node ${nodeId}`);
    }
  } catch (error) {
    console.error('❌ Session end error:', error);
  }
}

async function createLeaderboardSnapshot() {
  try {
    const { error } = await supabase.rpc('create_leaderboard_snapshot');
    if (error) {
      console.error('❌ Error creating leaderboard snapshot:', error);
    } else {
      console.log('✅ Created leaderboard snapshot');
    }
  } catch (error) {
    console.error('❌ Snapshot error:', error);
  }
}

async function loadNodeHistoricalData(nodeId) {
  try {
    const { data, error } = await supabase
      .from('node_performance')
      .select('*')
      .eq('node_id', nodeId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error loading historical data:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Historical data error:', error);
    return null;
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
        
        case 'broadcast_relay_request':
          handleBroadcastRelayRequest(message);
          break;
        
        case 'relay_forward':
          handleRelayForwardMessage(message);
          break;
        
        case 'relay_to_node':
          handleRelayToNode(message);
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
      
      // Persist session data before removing
      const sessionUptime = Date.now() - currentNode.connectedAt;
      if (currentNode.sessionId) {
        endNodeSession(currentNode.sessionId, currentNode.id, sessionUptime, currentNode.relayCount);
        upsertNodePerformance(currentNode.id, currentNode.walletAddress, currentNode.region, sessionUptime, currentNode.relayCount);
      }
      
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
    
    // Create session in database
    createNodeSession(nodeId, region).then(sessionId => {
      currentNode.sessionId = sessionId;
    });
    
    // Load historical data from database
    loadNodeHistoricalData(nodeId).then(historicalData => {
      if (historicalData) {
        currentNode.reputation = historicalData.reputation_score || 0;
        console.log(`📊 Loaded historical data for ${nodeId}: ${historicalData.total_relays} relays, ${historicalData.reputation_score} reputation`);
      }
    });
    
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
      // Persist session data before removing
      const sessionUptime = Date.now() - node.connectedAt;
      if (node.sessionId) {
        endNodeSession(node.sessionId, node.id, sessionUptime, node.relayCount);
        upsertNodePerformance(node.id, node.walletAddress, node.region, sessionUptime, node.relayCount);
      }
      
      activeNodes.delete(nodeId);
      console.log(`👋 Node ${nodeId} gracefully disconnected`);
      broadcastNodeList();
    }
  }

  function handleBroadcastRelayRequest(message) {
    const relayData = message.data;
    console.log(`🔒 Broadcasting relay request ${relayData.requestId} to selected nodes`);
    
    // Send relay request to each selected node
    relayData.nodes.forEach(targetNode => {
      // Find node by wallet address
      for (const [id, node] of activeNodes) {
        if (node.walletAddress === targetNode.wallet && node.ws.readyState === WebSocket.OPEN) {
          console.log(`  → Sending to node ${id}`);
          node.ws.send(JSON.stringify({
            type: 'relay_request',
            data: relayData
          }));
          break;
        }
      }
    });
  }

  function handleRelayForwardMessage(message) {
    const { to, data } = message;
    console.log(`🔄 Forwarding relay ${data.requestId} to ${to?.slice(0, 8)}`);
    
    // Find target node by wallet address
    for (const [id, node] of activeNodes) {
      if (node.walletAddress === to && node.ws.readyState === WebSocket.OPEN) {
        node.ws.send(JSON.stringify({
          type: 'relay_forward',
          data: data
        }));
        console.log(`  ✅ Forwarded to ${id}`);
        return;
      }
    }
    
    console.log(`  ⚠️ Target node not found: ${to?.slice(0, 8)}`);
  }

  function handleRelayToNode(message) {
    const { targetNode, data } = message;
    const node = activeNodes.get(targetNode);
    
    if (node && node.ws.readyState === WebSocket.OPEN) {
      node.ws.send(JSON.stringify({
        type: 'relay_message',
        data: data
      }));
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
      deadNodes.push({ id, node });
    }
  });
  
  deadNodes.forEach(({ id, node }) => {
    console.log(`💀 Removing dead node: ${id}`);
    
    // Persist session data before removing
    const sessionUptime = Date.now() - node.connectedAt;
    if (node.sessionId) {
      endNodeSession(node.sessionId, node.id, sessionUptime, node.relayCount);
      upsertNodePerformance(node.id, node.walletAddress, node.region, sessionUptime, node.relayCount);
    }
    
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

// Leaderboard API endpoints
app.get('/api/leaderboard', async (req, res) => {
  try {
    // Immediately save active nodes to database before fetching leaderboard
    console.log('💾 Saving active nodes before leaderboard fetch...');
    const savePromises = [];
    activeNodes.forEach((node, nodeId) => {
      const currentUptime = Date.now() - node.connectedAt;
      savePromises.push(upsertNodePerformance(nodeId, node.walletAddress, node.region, 0, node.relayCount));
    });
    await Promise.all(savePromises);

    // Get data from database
    const { data: dbNodes, error } = await supabase
      .from('node_performance')
      .select('node_id, wallet_address, total_uptime_ms, total_relays, reputation_score, region, current_streak_ms, best_uptime_streak_ms, last_seen')
      .order('reputation_score', { ascending: false })
      .order('total_uptime_ms', { ascending: false })
      .limit(50);

    if (error) {
      console.error('❌ Error fetching leaderboard from database:', error);
    }

    // Create a map of active nodes for quick lookup
    const activeNodesMap = new Map();
    activeNodes.forEach((node, nodeId) => {
      activeNodesMap.set(nodeId, node);
    });

    // Combine database data with active node data
    const combinedLeaderboard = [];
    
    // Add active nodes that might not be in database yet
    activeNodes.forEach((node, nodeId) => {
      const currentUptime = Date.now() - node.connectedAt;
      const dbNode = dbNodes?.find(n => n.node_id === nodeId);
      
      if (dbNode) {
        // Node exists in database, use database data but mark as online
        combinedLeaderboard.push({
          nodeId: nodeId,
          walletAddress: node.walletAddress,
          totalUptime: Math.floor((dbNode.total_uptime_ms + currentUptime) / 1000), // Add current session
          totalRelays: dbNode.total_relays + node.relayCount,
          reputation: dbNode.reputation_score,
          region: node.region,
          currentStreak: Math.floor(currentUptime / 1000),
          bestStreak: Math.floor(dbNode.best_uptime_streak_ms / 1000),
          lastSeen: new Date().toISOString(),
          isOnline: true,
          isActive: true
        });
      } else {
        // New node not in database yet, add with current session data
        combinedLeaderboard.push({
          nodeId: nodeId,
          walletAddress: node.walletAddress,
          totalUptime: Math.floor(currentUptime / 1000),
          totalRelays: node.relayCount,
          reputation: node.relayCount, // Start with relay count as reputation
          region: node.region,
          currentStreak: Math.floor(currentUptime / 1000),
          bestStreak: Math.floor(currentUptime / 1000),
          lastSeen: new Date().toISOString(),
          isOnline: true,
          isActive: true
        });
      }
    });

    // Add database nodes that are not currently active
    if (dbNodes) {
      dbNodes.forEach(dbNode => {
        const isActive = activeNodesMap.has(dbNode.node_id);
        if (!isActive) {
          combinedLeaderboard.push({
            nodeId: dbNode.node_id,
            walletAddress: dbNode.wallet_address,
            totalUptime: Math.floor(dbNode.total_uptime_ms / 1000),
            totalRelays: dbNode.total_relays,
            reputation: dbNode.reputation_score,
            region: dbNode.region,
            currentStreak: Math.floor(dbNode.current_streak_ms / 1000),
            bestStreak: Math.floor(dbNode.best_uptime_streak_ms / 1000),
            lastSeen: dbNode.last_seen,
            isOnline: false,
            isActive: false
          });
        }
      });
    }

    // Sort by uptime (descending) then by reputation
    combinedLeaderboard.sort((a, b) => {
      if (b.totalUptime !== a.totalUptime) {
        return b.totalUptime - a.totalUptime;
      }
      return b.reputation - a.reputation;
    });

    // Add rank numbers
    const leaderboard = combinedLeaderboard.map((node, index) => ({
      rank: index + 1,
      ...node
    }));

    res.json({ leaderboard, totalNodes: combinedLeaderboard.length });
  } catch (error) {
    console.error('❌ Leaderboard API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/leaderboard/snapshots', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leaderboard_snapshots')
      .select('*')
      .order('snapshot_time', { ascending: false })
      .limit(100);

    if (error) {
      console.error('❌ Error fetching snapshots:', error);
      return res.status(500).json({ error: 'Failed to fetch snapshots' });
    }

    res.json({ snapshots: data });
  } catch (error) {
    console.error('❌ Snapshots API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manual endpoint to populate leaderboard with test data
app.post('/api/leaderboard/populate', async (req, res) => {
  try {
    console.log('🏆 Manually populating leaderboard with test data...');
    
    // Insert test nodes with realistic uptime data
    const testNodes = [
      {
        node_id: 'Gw-HbcwM1Kw-1761216513608',
        wallet_address: '7NFFKUqmQCXHps19XxFkB9qh7AX52UZE8HJVdUu8W6XF',
        total_uptime_ms: 7920000, // 132 minutes = 2.2 hours
        total_relays: 0,
        successful_relays: 0,
        region: 'Africa/Johannesburg',
        reputation_score: 0,
        current_streak_ms: 7920000,
        best_uptime_streak_ms: 7920000
      },
      {
        node_id: 'test_node_002',
        wallet_address: '9K8mN2pQrS5tUvWxYzA1bC3dE4fG6hI7jK8lM9nO0pQ',
        total_uptime_ms: 7200000, // 2 hours
        total_relays: 5,
        successful_relays: 5,
        region: 'US-East',
        reputation_score: 5,
        current_streak_ms: 7200000,
        best_uptime_streak_ms: 7200000
      },
      {
        node_id: 'test_node_003',
        wallet_address: '2B3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV3wX4yZ5aB6c',
        total_uptime_ms: 5400000, // 1.5 hours
        total_relays: 3,
        successful_relays: 3,
        region: 'EU-West',
        reputation_score: 3,
        current_streak_ms: 5400000,
        best_uptime_streak_ms: 5400000
      },
      {
        node_id: 'test_node_004',
        wallet_address: '4D5eF6gH7iJ8kL9mN0oP1qR2sT3uV4wX5yZ6aB7cD8e',
        total_uptime_ms: 3600000, // 1 hour
        total_relays: 2,
        successful_relays: 2,
        region: 'Asia-Pacific',
        reputation_score: 2,
        current_streak_ms: 3600000,
        best_uptime_streak_ms: 3600000
      }
    ];

    // Insert or update each test node
    for (const node of testNodes) {
      const { error } = await supabase
        .from('node_performance')
        .upsert(node, { onConflict: 'node_id' });

      if (error) {
        console.error(`❌ Error inserting node ${node.node_id}:`, error);
      } else {
        console.log(`✅ Inserted/updated node ${node.node_id}`);
      }
    }

    // Create leaderboard snapshot
    await createLeaderboardSnapshot();

    res.json({ 
      success: true, 
      message: 'Leaderboard populated with test data',
      nodesInserted: testNodes.length
    });
  } catch (error) {
    console.error('❌ Error populating leaderboard:', error);
    res.status(500).json({ error: 'Failed to populate leaderboard' });
  }
});

// Periodic node data update (every 10 seconds)
setInterval(async () => {
  try {
    console.log('💾 Updating active nodes to database...');
    const updatePromises = [];
    activeNodes.forEach((node, nodeId) => {
      const currentUptime = Date.now() - node.connectedAt;
      updatePromises.push(upsertNodePerformance(nodeId, node.walletAddress, node.region, currentUptime, node.relayCount));
    });
    await Promise.all(updatePromises);
    console.log(`✅ Updated ${activeNodes.size} active nodes to database`);
  } catch (error) {
    console.error('❌ Error updating active nodes:', error);
  }
}, 10000); // Every 10 seconds

// Create leaderboard snapshot every hour
setInterval(() => {
  createLeaderboardSnapshot();
}, 3600000); // 1 hour

// Periodically save active nodes to database (every 5 minutes)
setInterval(() => {
  console.log('💾 Saving active nodes to database...');
  activeNodes.forEach((node, nodeId) => {
    const currentUptime = Date.now() - node.connectedAt;
    upsertNodePerformance(nodeId, node.walletAddress, node.region, 0, node.relayCount);
  });
}, 300000); // 5 minutes

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Ghost Whistle Signaling Server running on port ${PORT}`);
  console.log(`📊 Stats API: http://localhost:${PORT}/api/stats`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
});

