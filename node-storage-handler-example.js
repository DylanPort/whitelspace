/**
 * Example Node Client - Storage Handler
 * Add this to your Ghost Whistle node client to handle chunk storage
 */

// Example: Storage handler for nodes
class NodeStorageHandler {
  constructor(nodeId, storagePath = './storage') {
    this.nodeId = nodeId;
    this.storagePath = storagePath;
    this.storedChunks = new Map(); // In-memory storage (replace with filesystem or DB)
    this.fs = require('fs');
    this.path = require('path');
    
    // Create storage directory if it doesn't exist
    if (!this.fs.existsSync(storagePath)) {
      this.fs.mkdirSync(storagePath, { recursive: true });
    }
  }

  // Handle incoming chunks from signaling server
  handleIncomingChunk(ws, message) {
    try {
      const { chunkId, chunkData, metadata } = message;
      
      console.log(`📥 Node ${this.nodeId} received chunk: ${chunkId}`);
      
      // Validate chunk data
      if (!chunkId || !chunkData) {
        console.error('❌ Invalid chunk data');
        return;
      }
      
      // Store chunk locally
      this.storeChunk(chunkId, chunkData, metadata)
        .then(() => {
          console.log(`✅ Chunk ${chunkId} stored successfully`);
          
          // Notify signaling server
          ws.send(JSON.stringify({
            type: 'CHUNK_STORED',
            chunkId,
            nodeId: this.nodeId,
            success: true
          }));
        })
        .catch(error => {
          console.error(`❌ Failed to store chunk ${chunkId}:`, error);
          
          ws.send(JSON.stringify({
            type: 'STORAGE_ERROR',
            chunkId,
            error: error.message
          }));
        });
      
    } catch (error) {
      console.error('❌ Error handling incoming chunk:', error);
    }
  }

  // Store chunk to disk
  async storeChunk(chunkId, chunkData, metadata) {
    try {
      // Store to in-memory map (fast)
      this.storedChunks.set(chunkId, {
        data: chunkData,
        metadata: metadata,
        storedAt: Date.now()
      });
      
      // Optionally: Store to filesystem for persistence
      const filePath = this.path.join(this.storagePath, `${chunkId}.json`);
      const chunkRecord = {
        id: chunkId,
        data: chunkData,
        metadata: metadata,
        storedAt: Date.now(),
        nodeId: this.nodeId
      };
      
      await this.fs.promises.writeFile(
        filePath,
        JSON.stringify(chunkRecord, null, 2),
        'utf8'
      );
      
      console.log(`💾 Chunk ${chunkId} saved to ${filePath}`);
      
    } catch (error) {
      console.error(`❌ Error storing chunk ${chunkId}:`, error);
      throw error;
    }
  }

  // Retrieve chunk from storage
  async retrieveChunk(chunkId) {
    try {
      // Check in-memory first
      if (this.storedChunks.has(chunkId)) {
        return this.storedChunks.get(chunkId);
      }
      
      // Check filesystem
      const filePath = this.path.join(this.storagePath, `${chunkId}.json`);
      
      if (this.fs.existsSync(filePath)) {
        const data = await this.fs.promises.readFile(filePath, 'utf8');
        const chunkRecord = JSON.parse(data);
        
        // Cache in memory
        this.storedChunks.set(chunkId, chunkRecord);
        
        return chunkRecord;
      }
      
      return null;
      
    } catch (error) {
      console.error(`❌ Error retrieving chunk ${chunkId}:`, error);
      return null;
    }
  }

  // Handle chunk retrieval request
  handleGetChunk(ws, message) {
    try {
      const { chunkId } = message;
      
      console.log(`📤 Node ${this.nodeId} retrieving chunk: ${chunkId}`);
      
      this.retrieveChunk(chunkId)
        .then(chunk => {
          if (chunk) {
            console.log(`✅ Chunk ${chunkId} retrieved`);
            
            // Send chunk back to signaling server
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
        })
        .catch(error => {
          console.error(`❌ Error retrieving chunk ${chunkId}:`, error);
          
          ws.send(JSON.stringify({
            type: 'STORAGE_ERROR',
            chunkId,
            error: error.message
          }));
        });
      
    } catch (error) {
      console.error('❌ Error handling get chunk:', error);
    }
  }

  // Get storage stats
  getStorageStats() {
    return {
      totalChunks: this.storedChunks.size,
      storagePath: this.storagePath,
      nodeId: this.nodeId
    };
  }
}

// Example usage in your node WebSocket handler
function setupStorageForNode(nodeId, ws) {
  const storageHandler = new NodeStorageHandler(nodeId);
  
  // Handle RECEIVE_CHUNK events from signaling server
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'RECEIVE_CHUNK':
          storageHandler.handleIncomingChunk(ws, message);
          break;
          
        case 'GET_CHUNK':
          storageHandler.handleGetChunk(ws, message);
          break;
          
        // Add other message types...
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  return storageHandler;
}

module.exports = { NodeStorageHandler, setupStorageForNode };

