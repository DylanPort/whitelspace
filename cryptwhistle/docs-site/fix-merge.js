// Proper merge script that handles template literals correctly
const fs = require('fs');

console.log('\n🔧 Creating proper content.js...\n');

// Start with the base structure
let output = `// CryptWhistle Documentation Content
// Generated: ${new Date().toISOString()}

const content = {
`;

// Manually add each section with proper escaping
const sections = {
  'portal': require('./content-base-portal.js').content,
  'overview': `
    <h1>Overview</h1>
    <p>CryptWhistle is a privacy-first AI platform built on Solana.</p>
    <h2>Key Features</h2>
    <ul>
      <li>Client-Side AI - Run AI in your browser</li>
      <li>TEE Backend - Secure server-side processing</li>
      <li>Zero-Knowledge Proofs - Cryptographic verification</li>
      <li>x402 Micropayments - Solana-native payments</li>
    </ul>
  `,
  'introduction': `
    <h1>Introduction</h1>
    <p>Welcome to CryptWhistle! This guide will help you get started.</p>
    <h2>What You'll Learn</h2>
    <ol>
      <li>How to install the SDK</li>
      <li>How to make your first AI query</li>
      <li>How to integrate payments</li>
    </ol>
  `,
  'installation': `
    <h1>Installation</h1>
    <h2>NPM Installation</h2>
    <pre><code>npm install @cryptwhistle/sdk</code></pre>
    <h2>Quick Start</h2>
    <pre><code>import { CryptWhistle } from '@cryptwhistle/sdk';

const ai = new CryptWhistle({
  apiKey: 'your-key'
});

// Make a query
const result = await ai.query({
  task: 'sentiment-analysis',
  input: { text: 'Hello world!' }
});

console.log(result);</code></pre>
  `
};

// Add sections to output
let first = true;
for (const [key, value] of Object.entries(sections)) {
  if (!first) output += ',\n\n';
  first = false;
  
  // Properly escape the content
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
  
  output += `  '${key}': \`${escaped}\``;
}

// Close the object and export
output += `
};

// Export for use in app.js
window.content = content;

console.log('✅ CryptWhistle Documentation Loaded');
console.log('Total sections:', Object.keys(content).length);
`;

// Write the file
fs.writeFileSync('content-temp.js', output, 'utf8');

console.log('✅ Created content-temp.js');
console.log('📝 Testing for syntax errors...\n');

// Test it
try {
  require('./content-temp.js');
  console.log('✅ No syntax errors!');
  console.log('\n💡 If it works, run: mv content-temp.js content.js');
} catch (e) {
  console.log('❌ Error:', e.message);
}

