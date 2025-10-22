# Ghost Whistle Mainnet Deployment Guide

## Prerequisites
- Solana CLI installed
- Wallet with SOL for deployment (~5-10 SOL)
- Anchor CLI installed

## Step 1: Prepare Your Wallet

```bash
# Create or use existing keypair
solana-keygen new --outfile ~/.config/solana/mainnet-deploy.json

# Set to mainnet
solana config set --url mainnet-beta

# Fund your wallet (you need ~5-10 SOL for deployment)
# Transfer SOL from your main wallet or exchange

# Check balance
solana balance
```

## Step 2: Update Anchor.toml

Your `Anchor.toml` should include mainnet cluster:

```toml
[programs.mainnet]
ghost_whistle = "YOUR_PROGRAM_ID_HERE"

[provider]
cluster = "mainnet"
wallet = "~/.config/solana/mainnet-deploy.json"
```

## Step 3: Build the Program

```bash
anchor build
```

## Step 4: Deploy to Mainnet

```bash
# Deploy the program
anchor deploy --provider.cluster mainnet

# Save the Program ID that's output
# Example: 2L7eYeRMq4kz8uc8PkQWy2THnz1SB8p4uyerXenmN3Sm
```

## Step 5: Initialize the Staking Pool

After deployment, you need to initialize the staking pool:

```bash
# Run the initialization script
anchor run initialize --provider.cluster mainnet
```

## Step 6: Update Frontend

Update the `GHOST_PROGRAM_ID` in `index.html` with your new mainnet program ID.

## Security Considerations

⚠️ **IMPORTANT**:
- Test thoroughly on Devnet first
- Have your contract audited before mainnet deployment
- Start with small amounts
- Monitor contract activity closely
- Consider using a multisig for the authority wallet

## Estimated Costs

- Program deployment: ~2-5 SOL
- Account rent: ~0.01 SOL per account
- Transaction fees: ~0.000005 SOL per transaction

## Current Status

Your contract is currently deployed on **Devnet** at:
`2L7eYeRMq4kz8uc8PkQWy2THnz1SB8p4uyerXenmN3Sm`

For mainnet deployment, you'll need to:
1. Build and deploy the program
2. Initialize the staking pool
3. Test all functions
4. Update the frontend with the new program ID

