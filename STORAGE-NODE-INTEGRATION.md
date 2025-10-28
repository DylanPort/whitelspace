# Decentralized Storage - Node Integration Guide

## ✅ What's Been Implemented

### 1. **Frontend Storage System** (`index.html`)
- ✅ File upload/download interface
- ✅ Chunk creation (10 data + 5 parity = 15 total)
- ✅ Encryption (AES-256-GCM)
- ✅ Socket connection to signaling server
- ✅ Chunks sent to real nodes via WebSocket
- ✅ File persistence (survives browser refresh)

### 2. **Signaling Server** (`signaling-server.js`)
- ✅ Added `STORE_CHUNK` handler
- ✅ Added `REQUEST_CHUNK` handler  
- ✅ Forwards chunks to target nodes
- ✅ Confirmation messages back to clients

---

## 🎯 What Nodes Need to Implement

### Add This to Your Node Client:

```javascript
// Example WebSocket message handlers for nodes

ws.on('message', (data) => {
  const message = JSON.parse(data);
  
  switch (message.type) {
    // NEW: Handle chunk storage
    case 'RECEIVE_CHUNK':
      handleReceiveChunk(message);
      break;
      
    // NEW: Handle chunk retrieval
    case 'GET_CHUNK':
      handleGetChunk(message, ws);
      break;
      
    // ... your existing handlers
  }
});

// Storage handlers
let storedChunks = new Map();

function handleReceiveChunk(message) {
  const { chunkId, chunkData, metadata } = message;
  
  console.log(`📥 Storing chunk: ${chunkId}`);
  
  // Store in memory (replace with disk storage)
  storedChunks.set(chunkId, {
    data: chunkData,
    metadata: metadata,
    storedAt: Date.now()
  });
  
  console.log(`✅ Chunk ${chunkId} stored successfully`);
}

function handleGetChunk(message, ws) {
  const { chunkId } = message;
  
  console.log(`📤 Retrieving chunk: ${chunkId}`);
  
  const chunk = storedChunks.get(chunkId);
  
  if (chunk) {
    console.log(`✅ Chunk ${chunkId} found`);
    
    ws.send(JSON.stringify({
      type: 'CHUNK_DATA',
      chunkId,
      chunkData: chunk.data,
      metadata: chunk.metadata
    }));
  } else {
    console.log(`❌ Chunk ${chunkId} not found`);
    
    ws.send(JSON.stringify({
      type: 'CHUNK_NOT_FOUND',
      chunkId
    }));
  }
}
```

---

## 🔄 How It Works

### Upload Flow:
1. User uploads file in browser
2. Frontend encrypts file → creates 15 chunks
3. Connects to signaling server
4. Sends chunks to 15 different nodes:
   ```javascript
   socket.emit('STORE_CHUNK', {
     nodeId: 'node-xyz',
     chunkId: 'file-123-chunk-0',
     chunkData: [...bytes],
     metadata: { fileId, index, type }
   });
   ```
5. Signaling server forwards to target node
6. Node stores chunk and sends confirmation

### Download Flow:
1. User clicks download
2. Frontend requests chunks from nodes:
   ```javascript
   socket.emit('REQUEST_CHUNK', {
     nodeId: 'node-xyz',
     chunkId: 'file-123-chunk-0'
   });
   ```
3. Node sends chunk back
4. Frontend reconstructs file from 10 data chunks

---

## 📦 Storage Requirements

### Node Storage Options:

**Option 1: In-Memory (Fast, Temporary)**
```javascript
const storedChunks = new Map();
```

**Option 2: Filesystem (Persistent)**
```javascript
const fs = require('fs');
const path = require('path');

async function storeChunk(chunkId, data) {
  const filePath = path.join('./storage', `${chunkId}.json`);
  await fs.promises.writeFile(filePath, JSON.stringify({
    data,
    storedAt: Date.now()
  }));
}
```

**Option 3: Database (Recommended)**
```javascript
// Use SQLite, PostgreSQL, MongoDB, etc.
await db.chunks.insertOne({
  chunkId,
  data: Buffer.from(chunkData),
  metadata,
  storedAt: new Date()
});
```

---

## 🎁 Example Node Implementation

See `node-storage-handler-example.js` for a complete working example.

### Integration Steps:

1. **Copy the handler code** into your node client
2. **Set up storage backend** (filesystem or database)
3. **Add WebSocket handlers** for `RECEIVE_CHUNK` and `GET_CHUNK`
4. **Test chunk storage/retrieval**

---

## 🚀 Testing

### Test Chunk Storage:

```javascript
// In your node console:
ws.send(JSON.stringify({
  type: 'RECEIVE_CHUNK',
  chunkId: 'test-chunk-1',
  chunkData: [1, 2, 3, 4, 5],
  metadata: { test: true }
}));

// Check if stored:
ws.send(JSON.stringify({
  type: 'GET_CHUNK',
  chunkId: 'test-chunk-1'
}));
```

### Test from Frontend:

1. Go to Cloud Storage section
2. Upload a test file
3. Check browser console for logs
4. Check your node console for storage logs

---

## 🔧 Configuration

### Signaling Server URL:
In `index.html`, the storage connects to:
```javascript
const signalUrl = 'https://ghost-whistle-signaling.onrender.com';
```

### Storage Path (for file-based storage):
```javascript
const storagePath = './node_storage'; // Customize this
```

---

## 💰 Future Enhancements

### 1. **Storage Rewards**
- Pay nodes per GB stored
- Track storage on-chain
- Monthly storage fees

### 2. **Health Monitoring**
- Check chunk availability
- Auto-repair missing chunks
- Redistribute to new nodes

### 3. **Compression**
- Compress chunks before storage
- Reduce network bandwidth
- Lower storage costs

### 4. **Deduplication**
- Hash-based chunk deduplication
- Store once, reference many
- Reduce storage costs

---

## ❓ Troubleshooting

### Chunks not storing:
- Check node console for `RECEIVE_CHUNK` messages
- Verify WebSocket connection is active
- Check storage directory permissions

### Chunks not retrieving:
- Verify chunk exists in storage
- Check chunkId matches exactly
- Test with a known stored chunk

### Signaling server errors:
- Check server logs
- Verify node is registered
- Test direct WebSocket connection

---

## 📊 Stats to Track

Nodes should track:
- Total chunks stored
- Storage space used
- Successful retrievals
- Failed retrievals
- Storage uptime

---

## 🎉 Summary

**Frontend:** ✅ DONE - Uploads and sends chunks  
**Signaling:** ✅ DONE - Routes chunks to nodes  
**Nodes:** ⚠️ TODO - Add storage handlers  

**Next Step:** Add `RECEIVE_CHUNK` and `GET_CHUNK` handlers to your node clients!

