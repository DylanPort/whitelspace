/**
 * Ghost Whistle - Signaling Server for Ghost Calls
 * Dedicated WebSocket server for WebRTC call signaling
 */

const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store active calls
const activeCalls = new Map(); // callId -> { initiator: ws, participants: Set<ws> }

console.log(`
╔════════════════════════════════════════════════════════╗
║   GHOST CALLS - WebRTC Signaling Server               ║
║   Anonymous Voice/Video Calling                       ║
╚════════════════════════════════════════════════════════╝
`);

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('🔌 New Ghost Calls connection');
  let currentCallId = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('📨 Message:', message.type, 'for call:', message.callId);

      switch (message.type) {
        case 'join':
          // User joining a call room
          currentCallId = message.callId;
          
          if (!activeCalls.has(currentCallId)) {
            // First person (initiator)
            activeCalls.set(currentCallId, {
              initiator: ws,
              participants: new Set()
            });
            console.log(`📞 Call created: ${currentCallId}`);
            
            ws.send(JSON.stringify({
              type: 'joined',
              role: 'initiator'
            }));
          } else {
            // Second person joining
            const call = activeCalls.get(currentCallId);
            call.participants.add(ws);
            console.log(`👤 Peer joined call: ${currentCallId}`);
            
            // Notify initiator that peer joined
            if (call.initiator.readyState === WebSocket.OPEN) {
              call.initiator.send(JSON.stringify({
                type: 'peer-joined'
              }));
            }
            
            ws.send(JSON.stringify({
              type: 'joined',
              role: 'participant'
            }));
          }
          break;

        case 'offer':
          // Forward offer to all participants
          if (activeCalls.has(message.callId)) {
            const call = activeCalls.get(message.callId);
            call.participants.forEach(participant => {
              if (participant.readyState === WebSocket.OPEN) {
                participant.send(JSON.stringify({
                  type: 'offer',
                  offer: message.offer
                }));
              }
            });
            console.log(`📤 Forwarded offer for call: ${message.callId}`);
          }
          break;

        case 'answer':
          // Forward answer to initiator
          if (activeCalls.has(message.callId)) {
            const call = activeCalls.get(message.callId);
            if (call.initiator.readyState === WebSocket.OPEN) {
              call.initiator.send(JSON.stringify({
                type: 'answer',
                answer: message.answer
              }));
            }
            console.log(`📤 Forwarded answer for call: ${message.callId}`);
          }
          break;

        case 'ice-candidate':
          // Forward ICE candidate to other peer
          if (activeCalls.has(message.callId)) {
            const call = activeCalls.get(message.callId);
            
            // If this is from initiator, send to participants
            if (ws === call.initiator) {
              call.participants.forEach(participant => {
                if (participant.readyState === WebSocket.OPEN) {
                  participant.send(JSON.stringify({
                    type: 'ice-candidate',
                    candidate: message.candidate
                  }));
                }
              });
            } else {
              // From participant, send to initiator
              if (call.initiator.readyState === WebSocket.OPEN) {
                call.initiator.send(JSON.stringify({
                  type: 'ice-candidate',
                  candidate: message.candidate
                }));
              }
            }
            console.log(`🧊 Forwarded ICE candidate for call: ${message.callId}`);
          }
          break;

        case 'leave':
          // User leaving call
          if (activeCalls.has(message.callId)) {
            const call = activeCalls.get(message.callId);
            
            if (ws === call.initiator) {
              // Initiator left, notify all participants
              call.participants.forEach(participant => {
                if (participant.readyState === WebSocket.OPEN) {
                  participant.send(JSON.stringify({
                    type: 'call-ended',
                    reason: 'initiator-left'
                  }));
                }
              });
              activeCalls.delete(message.callId);
              console.log(`📞 Call ended by initiator: ${message.callId}`);
            } else {
              // Participant left
              call.participants.delete(ws);
              console.log(`👤 Participant left call: ${message.callId}`);
            }
          }
          break;

        default:
          console.warn('⚠️ Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Message handling error:', error);
    }
  });

  ws.on('close', () => {
    console.log('🔌 Connection closed');
    
    // Clean up call if connection drops
    if (currentCallId && activeCalls.has(currentCallId)) {
      const call = activeCalls.get(currentCallId);
      
      if (ws === call.initiator) {
        // Initiator disconnected
        call.participants.forEach(participant => {
          if (participant.readyState === WebSocket.OPEN) {
            participant.send(JSON.stringify({
              type: 'call-ended',
              reason: 'initiator-disconnected'
            }));
          }
        });
        activeCalls.delete(currentCallId);
        console.log(`📞 Call ended (initiator disconnected): ${currentCallId}`);
      } else {
        // Participant disconnected
        call.participants.delete(ws);
        console.log(`👤 Participant disconnected from call: ${currentCallId}`);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    activeCalls: activeCalls.size,
    timestamp: new Date().toISOString()
  });
});

// Stats endpoint
app.get('/stats', (req, res) => {
  const calls = [];
  activeCalls.forEach((call, callId) => {
    calls.push({
      callId,
      participants: call.participants.size + 1 // +1 for initiator
    });
  });
  
  res.json({
    totalCalls: activeCalls.size,
    calls
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`
✅ Ghost Calls Signaling Server running!
📡 Port: ${PORT}
🌐 WebSocket: ws://localhost:${PORT}
📊 Health: http://localhost:${PORT}/health
📈 Stats: http://localhost:${PORT}/stats
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Shutting down gracefully...');
  wss.clients.forEach(client => {
    client.close();
  });
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

