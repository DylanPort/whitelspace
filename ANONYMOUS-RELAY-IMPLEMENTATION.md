# Anonymous Relay Implementation Plan

## Smart Contract Flow:
1. **create_relay_request()** - User pays fee upfront, stored in pool
2. **join_relay()** - Nodes join as relay hops (up to num_hops)
3. **complete_relay()** - Mark relay as completed with transaction hash
4. **claim_relay_payment()** - Each node claims their share of the fee

## Frontend Implementation:

### Step 1: Create Relay Request (On-Chain)
- User selects: recipient, amount, privacy level (num_hops: 1-3)
- Calculate fee: base_fee * num_hops
- Call `create_relay_request(num_hops, relay_fee)` instruction
- Transfer fee to pool vault
- Get relay_request PDA and ID

### Step 2: Select Relay Nodes
- Query active nodes from signaling server
- Filter by reputation and stake (>= 10,000 $WHISTLE)
- Select num_hops nodes based on:
  - Geographic diversity
  - High reputation
  - Active status
- Nodes call `join_relay()` to register on-chain

### Step 3: Multi-Hop Encryption
- Layer 1: Encrypt transaction for final node (Hop 3)
- Layer 2: Encrypt Layer 1 + Hop 3 address for Hop 2
- Layer 3: Encrypt Layer 2 + Hop 2 address for Hop 1
- Send encrypted package to Hop 1

### Step 4: Relay Execution
- Hop 1: Decrypts Layer 3, forwards to Hop 2
- Hop 2: Decrypts Layer 2, forwards to Hop 3
- Hop 3: Decrypts Layer 1, submits transaction to Solana

### Step 5: Complete & Pay
- Final node calls `complete_relay(transaction_hash)`
- All nodes call `claim_relay_payment()` to get paid
- Payment split: base_fee / num_nodes + reputation bonus

## Key Components Needed:

1. **Relay Request Creator UI** (in Anonymous Relay section)
2. **Node Selection Algorithm** (select best nodes)
3. **Encryption Layer** (use libsodium for onion routing)
4. **WebSocket Relay Protocol** (node-to-node communication)
5. **On-Chain Integration** (call smart contract instructions)
6. **Transaction Builder** (create Solana transactions)
7. **Payment Distribution** (automatic claim for nodes)

## Security Features:
- Multi-hop prevents any single node from knowing sender + recipient
- Encrypted at each layer
- On-chain escrow prevents fraud
- Reputation system ensures quality nodes
- Geographic diversity prevents collusion

