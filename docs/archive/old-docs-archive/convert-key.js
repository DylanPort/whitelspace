// Convert base58 private key to Solana keypair JSON format
// ⚠️ WARNING: This wallet is COMPROMISED - use only temporarily!

const bs58 = require('bs58');
const fs = require('fs');
const path = require('path');

// Your private key (COMPROMISED - shared publicly)
const privateKeyBase58 = '4m4frpx3VJpDDFvDoJJP9dVvNdyb32S4dKxWXCrrqQUS17Uz4Gya4qz8zthcrPMVUojdQLn3RoZvbbueSEUc5dhh';

try {
  console.log('⚠️  WARNING: This wallet is COMPROMISED!');
  console.log('Use only for dApp Store submission, then create a new wallet.\n');

  // Decode base58 to bytes
  const privateKeyBytes = bs58.decode(privateKeyBase58);
  
  // Convert to array format that Solana expects
  const keypairArray = Array.from(privateKeyBytes);

  // Create directory if it doesn't exist
  const outputDir = path.join(process.env.USERPROFILE || process.env.HOME, '.config', 'solana');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write to file
  const outputPath = path.join(outputDir, 'temp-keypair.json');
  fs.writeFileSync(outputPath, JSON.stringify(keypairArray));

  console.log('✅ Keypair file created successfully!');
  console.log(`📁 Location: ${outputPath}`);
  console.log(`\n🔑 Keypair array length: ${keypairArray.length} bytes`);
  
  console.log('\n📝 Next steps:');
  console.log('1. Verify keypair:');
  console.log(`   solana-keygen pubkey "${outputPath}"`);
  console.log('\n2. Use for dApp Store:');
  console.log(`   dapp-store create app --keypair "${outputPath}"`);
  console.log('\n⚠️  IMPORTANT: Create a new secure wallet after submission!');

} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\nMake sure bs58 is installed:');
  console.log('npm install bs58');
}

