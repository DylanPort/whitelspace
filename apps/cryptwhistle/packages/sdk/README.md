# @whistle/ai-sdk

> Hybrid AI SDK - Client-side + Server-side AI with privacy guarantees

## Features

- ✅ **90% Client-Side**: Most queries run instantly in browser (free, private, offline)
- ✅ **10% Server-Side**: Complex queries use TEE backend (fast, cheap, secure)
- ✅ **Smart Routing**: Automatically selects optimal compute layer
- ✅ **Zero-Knowledge Proofs**: Verify computation without revealing data
- ✅ **Solana x402**: Micropayments for AI services
- ✅ **Open Source**: Fully auditable, no vendor lock-in

## Installation

```bash
npm install @whistle/ai-sdk @solana/web3.js
```

## Quick Start

```typescript
import { WhistleAI } from '@whistle/ai-sdk';

// Initialize
const ai = new WhistleAI({
  wallet: yourSolanaWallet, // Optional, for payments
  preferClientSide: true    // Default
});

// Wait for models to load
await ai.ready();

// Use AI (runs client-side automatically)
const sentiment = await ai.analyzeSentiment("I love privacy!");
console.log(sentiment); // { label: 'POSITIVE', score: 0.98 }

const transcript = await ai.transcribe(audioBlob);
console.log(transcript); // { text: "Hello world", confidence: 0.94 }

const translation = await ai.translate("Hello", { to: "es" });
console.log(translation); // { translation: "Hola" }
```

## API Reference

### `WhistleAI`

Main SDK class.

#### Constructor

```typescript
new WhistleAI(config?: {
  apiUrl?: string;           // API endpoint (default: https://api.whistle.ai)
  wallet?: SolanaWallet;     // Solana wallet for payments
  preferClientSide?: boolean; // Prefer browser AI (default: true)
  apiKey?: string;           // API key for authenticated requests
  debug?: boolean;           // Enable debug logging
})
```

#### Methods

##### `ready(): Promise<void>`

Initialize and load AI models. Call this before making queries.

##### `analyzeSentiment(text: string, options?): Promise<QueryResult<SentimentResult>>`

Analyze text sentiment.

```typescript
const result = await ai.analyzeSentiment("Great product!");
// {
//   result: { label: 'POSITIVE', score: 0.95 },
//   metadata: { computeLayer: 'client', duration: 45, cost: 0 }
// }
```

##### `transcribe(audio: Blob | ArrayBuffer, options?): Promise<QueryResult<TranscriptionResult>>`

Transcribe audio to text.

```typescript
const result = await ai.transcribe(audioBlob);
// {
//   result: { text: "Hello world", confidence: 0.94 },
//   metadata: { computeLayer: 'client', duration: 200, cost: 0 }
// }
```

##### `translate(text: string, params: { from?: string; to: string }, options?): Promise<QueryResult<TranslationResult>>`

Translate text between languages.

```typescript
const result = await ai.translate("Hello", { to: "es" });
// {
//   result: { translation: "Hola", confidence: 0.99 },
//   metadata: { computeLayer: 'client', duration: 100, cost: 0 }
// }
```

##### `chat(message: string | ChatMessage[], options?): Promise<QueryResult<ChatResult>>`

Chat with AI assistant.

```typescript
const result = await ai.chat("Explain blockchain privacy");
// {
//   result: { message: "Blockchain privacy...", model: "phi-3" },
//   metadata: { computeLayer: 'client', duration: 500, cost: 0 }
// }
```

##### `analyzePrivacy(walletAddress: string, options?): Promise<QueryResult<PrivacyAnalysis>>`

Analyze wallet privacy score.

```typescript
const result = await ai.analyzePrivacy("7xK...B9s");
// {
//   result: {
//     score: 8,
//     totalTransactions: 50,
//     recommendations: ["Use Ghost Relay"]
//   },
//   metadata: { computeLayer: 'client', duration: 300, cost: 0 }
// }
```

##### `getModels(): Promise<ModelInfo[]>`

Get list of available AI models.

##### `batch(queries): Promise<QueryResult[]>`

Batch process multiple queries in parallel.

```typescript
const results = await ai.batch([
  { task: 'sentiment-analysis', input: { text: "Text 1" } },
  { task: 'sentiment-analysis', input: { text: "Text 2" } }
]);
```

### Query Options

All query methods accept optional `QueryOptions`:

```typescript
interface QueryOptions {
  computeLayer?: 'client' | 'tee' | 'fhe' | 'auto'; // Force specific layer
  requireProof?: boolean;      // Get ZK proof
  maxLatency?: number;         // Max latency in ms
  maxCost?: number;            // Max cost in SOL
}
```

Example:

```typescript
const result = await ai.chat("Complex query", {
  computeLayer: 'tee',  // Force TEE backend
  requireProof: true,   // Get ZK proof
  maxCost: 0.001       // Max 0.001 SOL
});
```

## Advanced Usage

### Real-Time Streaming

```typescript
// Streaming transcription
const stream = ai.transcribeStream(audioStream);
stream.on('data', (text) => console.log('Partial:', text));
stream.on('end', (final) => console.log('Final:', final.text));
```

### Custom Models

```typescript
// Deploy custom ONNX model
await ai.deployModel({
  name: 'my-model',
  modelUrl: 'https://example.com/model.onnx',
  type: 'onnx',
  computeLayer: 'client'
});

// Use it
const result = await ai.query('my-model', { input: data });
```

### Events

```typescript
ai.on('ready', () => console.log('AI ready!'));
ai.on('model-loaded', ({ modelId }) => console.log(`Loaded: ${modelId}`));
ai.on('query-start', ({ queryId }) => console.log(`Starting ${queryId}`));
ai.on('query-end', ({ queryId, result }) => console.log(`Done: ${queryId}`));
ai.on('error', ({ error }) => console.error('Error:', error));
```

## Performance

| Operation | Client-Side | Server-Side (TEE) |
|-----------|-------------|-------------------|
| Sentiment | 50ms, $0 | 500ms, $0.0001 |
| Transcription | 200ms, $0 | 2s, $0.0005 |
| Translation | 150ms, $0 | 1.5s, $0.0003 |
| Chat (simple) | 500ms, $0 | 2s, $0.001 |

**Result**: 90% of queries run client-side (instant, free). 10% use server (fast, cheap).

## Browser Support

- ✅ Chrome 90+
- ✅ Edge 90+
- ✅ Firefox 89+
- ✅ Safari 15+

Requires:
- WebAssembly support
- WebGPU (optional, for acceleration)

## License

MIT

## Links

- [Documentation](https://docs.whistle.ai)
- [GitHub](https://github.com/whistle/whistle-ai)
- [Examples](https://github.com/whistle/whistle-ai/tree/main/examples)

