# Next Steps for Anonymous Relay Implementation

## ✅ COMPLETED:
1. Added relay PDA helper functions:
   - `getRelayRequestPDA(requestId)` - Get relay request account
   - `getNodePDA(walletPubkey)` - Get any node's PDA

## 🚧 IN PROGRESS - Phase 1: Smart Contract Integration

### Next Immediate Steps:

#### 1. Replace `createRelayRequest()` function (lines 9932-10062)
Need to:
- Call smart contract `create_relay_request` instruction
- Transfer relay fee to pool
- Get relay request ID from on-chain
- Select relay nodes based on reputation
- Broadcast to selected nodes via WebSocket

#### 2. Add `buildCreateRelayInstruction()` helper
```javascript
const buildCreateRelayInstruction = async (wallet, numHops, relayFee) => {
  const connection = new solanaWeb3.Connection(MAINNET_RPC);
  const programId = new solanaWeb3.PublicKey(GHOST_PROGRAM_ID);
  const userPubkey = wallet.publicKey;
  
  // Get PDAs
  const poolPDA = await getPoolPDA();
  const poolVault = await getPoolVaultPDA();
  
  // Get user's token account
  const userTokenAccount = await getAssociatedTokenAddress(...);
  
  // Build instruction data
  const instructionData = Buffer.concat([
    Buffer.from([3]), // Instruction index for create_relay_request
    Buffer.from([numHops]), // u8
    Buffer.alloc(8) // u64 relay_fee (little-endian)
  ]);
  
  // Write relay fee to buffer
  new DataView(instructionData.buffer, 1, 8).setBigUint64(1, BigInt(relayFee), true);
  
  // Build accounts array
  const accounts = [
    { pubkey: userPubkey, isSigner: true, isWritable: true },
    { pubkey: poolPDA, isSigner: false, isWritable: true },
    { pubkey: relayRequestPDA, isSigner: false, isWritable: true },
    { pubkey: userTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolVault, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
  ];
  
  return new solanaWeb3.TransactionInstruction({
    keys: accounts,
    programId,
    data: instructionData
  });
};
```

#### 3. Implement Node Selection Algorithm
```javascript
const selectRelayNodes = async (numHops, excludeWallet) => {
  // Fetch active nodes from API
  const response = await fetch('http://localhost:8080/api/nodes');
  const { nodes } = await response.json();
  
  // Filter nodes:
  // - Has >= 10,000 $WHISTLE staked
  // - Active status
  // - Not the sender
  // - Sort by reputation (highest first)
  
  const eligibleNodes = nodes
    .filter(node => 
      node.wallet !== excludeWallet &&
      node.status === 'active' &&
      node.staked >= 10000
    )
    .sort((a, b) => b.reputation - a.reputation);
  
  // Select top N nodes
  return eligibleNodes.slice(0, numHops);
};
```

#### 4. Add WebSocket Relay Request Broadcasting
```javascript
const broadcastRelayRequest = async (relayRequestId, selectedNodes, encryptedPayload) => {
  // Send to each selected node via WebSocket
  for (const node of selectedNodes) {
    const message = {
      type: 'relay_request',
      requestId: relayRequestId,
      payload: encryptedPayload,
      timestamp: Date.now()
    };
    
    // Send via signaling server
    if (signalServer && signalServer.readyState === WebSocket.OPEN) {
      signalServer.send(JSON.stringify({
        type: 'relay_to_node',
        targetNode: node.id,
        data: message
      }));
    }
  }
};
```

#### 5. Update `signaling-server.js` 
Add relay coordination:
- Store active relay requests
- Route relay messages between nodes
- Track relay progress
- Handle join_relay notifications

#### 6. Implement Node-Side `join_relay()` Call
Nodes automatically call smart contract when they receive relay request:
```javascript
const handleRelayRequest = async (relayRequestData) => {
  // Node receives relay request
  // Automatically call join_relay() on smart contract
  // Forward to next hop after joining
};
```

## Phase 2-5 Coming Next:
- Multi-layer encryption (onion routing)
- Node-to-node encrypted forwarding
- Final node transaction submission
- Payment claims and distribution

## Critical Dependencies:
1. Anchor JS or raw Solana Web3 instruction building
2. Encryption library (libsodium/tweetnacl)
3. WebSocket protocol extensions
4. Smart contract ABI/IDL (if using Anchor)

## Estimated Remaining Work:
- Phase 1: 200-300 lines of code
- Phase 2-5: 500-700 lines of code
- Total: ~1000 lines for production-ready relay system

## Current Blocker:
Need to implement the complete `createRelayRequest` function replacement.
This is the most critical piece that ties everything together.

