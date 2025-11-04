# Import Your Private Key (TEMPORARY USE ONLY)

⚠️ **WARNING: This wallet is compromised. Use only for this submission, then abandon it.**

---

## Convert Base58 Key to Keypair JSON

Your key needs to be converted from base58 format to a JSON array of bytes.

### Method 1: Using Solana CLI (Recommended)

```bash
# Install Solana CLI if not already installed
# Download from: https://docs.solana.com/cli/install-solana-cli-tools

# Import your private key
echo "4m4frpx3VJpDDFvDoJJP9dVvNdyb32S4dKxWXCrrqQUS17Uz4Gya4qz8zthcrPMVUojdQLn3RoZvbbueSEUc5dhh" | solana-keygen recover 'prompt:' --outfile C:\Users\salva\.config\solana\temp-keypair.json

# Or create directory first
mkdir -p C:\Users\salva\.config\solana
```

### Method 2: Manual Creation (if Solana CLI not available)

The key needs to be decoded from base58 to a byte array. This requires a tool or script.

**Using Node.js:**

```javascript
const bs58 = require('bs58');
const fs = require('fs');

const privateKeyBase58 = '4m4frpx3VJpDDFvDoJJP9dVvNdyb32S4dKxWXCrrqQUS17Uz4Gya4qz8zthcrPMVUojdQLn3RoZvbbueSEUc5dhh';
const privateKeyBytes = bs58.decode(privateKeyBase58);
const keypairArray = Array.from(privateKeyBytes);

fs.writeFileSync('C:\\Users\\salva\\.config\\solana\\temp-keypair.json', JSON.stringify(keypairArray));

console.log('Keypair file created!');
```

Save this as `convert-key.js` and run:
```bash
npm install bs58
node convert-key.js
```

---

## Once You Have the Keypair File

```bash
# Verify it works
solana-keygen pubkey C:\Users\salva\.config\solana\temp-keypair.json

# Use it for dApp Store submission
dapp-store create app --keypair C:\Users\salva\.config\solana\temp-keypair.json
```

---

## ⚠️ AFTER SUBMISSION

1. **Create new secure wallet**
2. **Transfer any remaining SOL to new wallet**
3. **Delete this keypair file**
4. **Never use this wallet again**

---

This wallet is compromised and unsafe for long-term use!

