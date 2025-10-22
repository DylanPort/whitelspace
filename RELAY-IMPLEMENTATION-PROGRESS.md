# Anonymous Relay Implementation Progress

## Status: IN PROGRESS

## Phase 1: Smart Contract Integration ✅ STARTING

### Files to Modify:
- `index.html` - Lines 9932-10062 (createRelayRequest function)
- `signaling-server.js` - Add relay coordination endpoints

### Key Smart Contract Functions to Call:

1. **create_relay_request(num_hops: u8, relay_fee: u64)**
   - Creates RelayRequest PDA
   - Transfers fee to pool
   - Returns request_id

2. **join_relay()**
   - Nodes register as relay participants
   - Auto-called by selected nodes

3. **complete_relay(transaction_hash: String)**
   - Final node marks relay complete
   - Enables payment claims

4. **claim_relay_payment()**
   - Each node claims their share
   - Includes reputation bonus

### Implementation Steps:

#### Step 1.1: Add Smart Contract Helper Functions
```javascript
// Get Relay Request PDA
const getRelayRequestPDA = async (requestId) => {
  const [pda] = await solanaWeb3.PublicKey.findProgramAddress(
    [
      Buffer.from('relay_request'),
      new anchor.BN(requestId).toArrayLike(Buffer, 'le', 8)
    ],
    GHOST_PROGRAM_ID
  );
  return pda;
};

// Build create_relay_request instruction
const buildCreateRelayInstruction = async (wallet, numHops, relayFee) => {
  // Implementation
};
```

#### Step 1.2: Replace createRelayRequest Function
- Remove old mock implementation
- Add real smart contract call
- Create on-chain relay request
- Get relay request ID
- Store request data

#### Step 1.3: Add Node Selection
- Query active nodes from API
- Filter by stake >= 10,000 $WHISTLE
- Sort by reputation
- Select numHops nodes
- Broadcast relay request to selected nodes

#### Step 1.4: Implement Node Auto-Join
- Nodes receive relay request
- Call join_relay() automatically
- Wait for all nodes to join

## Phase 2: Multi-Layer Encryption (NEXT)
- Implement onion routing encryption
- Layer encryption for each hop
- Secure key exchange

## Phase 3: WebSocket Relay Protocol (NEXT)
- Node-to-node forwarding
- Encrypted payload passing
- Progress tracking

## Phase 4: Transaction Submission (NEXT)
- Final node decrypts
- Submits to Solana
- Calls complete_relay()

## Phase 5: Payment Distribution (NEXT)
- All nodes claim payment
- Automatic reputation updates
- Fee distribution

## Current Focus:
Implementing Phase 1 - Smart Contract Integration

