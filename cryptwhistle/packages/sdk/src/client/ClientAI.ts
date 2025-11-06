/**
 * Client-Side AI - Runs 100% in browser
 * Uses Transformers.js, ONNX Runtime, and WebLLM
 */

import EventEmitter from 'eventemitter3';
import { ModelInfo } from '../types';

// These will be dynamically imported to keep bundle small
let transformersModule: any = null;
let onnxModule: any = null;
let webllmModule: any = null;

export class ClientAI extends EventEmitter {
  private models: Map<string, any> = new Map();
  private initialized: boolean = false;
  private debug: boolean;

  constructor(options: { debug?: boolean } = {}) {
    super();
    this.debug = options.debug || false;
  }

  /**
   * Initialize and load essential models
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.log('Initializing client-side AI...');

    try {
      // Load Transformers.js (dynamic import to reduce initial bundle)
      transformersModule = await import('@xenova/transformers');
      
      // Load basic models
      await this.loadModel('sentiment-analysis');
      
      this.initialized = true;
      this.log('Client-side AI initialized');
    } catch (error) {
      console.error('Failed to initialize client AI:', error);
      throw error;
    }
  }

  /**
   * Load a specific model
   */
  private async loadModel(modelId: string): Promise<void> {
    if (this.models.has(modelId)) return;

    this.log(`Loading model: ${modelId}`);
    
    try {
      let pipeline;
      
      switch (modelId) {
        case 'sentiment-analysis':
          pipeline = await transformersModule.pipeline('sentiment-analysis');
          break;
        
        case 'transcription':
          pipeline = await transformersModule.pipeline(
            'automatic-speech-recognition',
            'Xenova/whisper-tiny'
          );
          break;
        
        case 'translation':
          pipeline = await transformersModule.pipeline(
            'translation',
            'Xenova/nllb-200-distilled-600M'
          );
          break;
        
        case 'text-classification':
          pipeline = await transformersModule.pipeline('text-classification');
          break;
        
        case 'zero-shot-classification':
          pipeline = await transformersModule.pipeline('zero-shot-classification');
          break;
        
        default:
          throw new Error(`Unknown model: ${modelId}`);
      }
      
      this.models.set(modelId, pipeline);
      this.emit('model-loaded', modelId);
      this.log(`Model loaded: ${modelId}`);
      
    } catch (error) {
      console.error(`Failed to load model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Execute a task
   */
  async execute(task: string, input: any): Promise<any> {
    switch (task) {
      case 'sentiment-analysis':
        return this.analyzeSentiment(input.text);
      
      case 'transcription':
        return this.transcribe(input.audio);
      
      case 'translation':
        return this.translate(input.text, input.from, input.to);
      
      case 'privacy-analysis':
        return this.analyzePrivacy(input.walletAddress);
      
      case 'chat':
        return this.chat(input.messages);
      
      default:
        throw new Error(`Unknown task: ${task}`);
    }
  }

  /**
   * Sentiment analysis
   */
  private async analyzeSentiment(text: string): Promise<any> {
    await this.loadModel('sentiment-analysis');
    const pipeline = this.models.get('sentiment-analysis');
    
    const result = await pipeline(text);
    
    return {
      label: result[0].label,
      score: result[0].score
    };
  }

  /**
   * Transcribe audio
   */
  private async transcribe(audio: Blob | ArrayBuffer): Promise<any> {
    await this.loadModel('transcription');
    const pipeline = this.models.get('transcription');
    
    // Convert audio to format expected by model
    let audioData: ArrayBuffer;
    if (audio instanceof Blob) {
      audioData = await audio.arrayBuffer();
    } else {
      audioData = audio;
    }
    
    const result = await pipeline(audioData);
    
    return {
      text: result.text,
      confidence: 0.9, // Whisper doesn't provide confidence, use default
      chunks: result.chunks || []
    };
  }

  /**
   * Translate text
   */
  private async translate(
    text: string,
    from: string = 'eng_Latn',
    to: string = 'spa_Latn'
  ): Promise<any> {
    await this.loadModel('translation');
    const pipeline = this.models.get('translation');
    
    const result = await pipeline(text, {
      src_lang: from,
      tgt_lang: to
    });
    
    return {
      translation: result[0].translation_text,
      confidence: 0.95,
      sourceLang: from,
      targetLang: to
    };
  }

  /**
   * Analyze wallet privacy (client-side computation)
   */
  private async analyzePrivacy(walletAddress: string): Promise<any> {
    // Fetch public blockchain data
    const transactions = await this.fetchTransactions(walletAddress);
    
    // Analyze locally (no server involved)
    const analysis = {
      totalTransactions: transactions.length,
      privateTransactions: transactions.filter((tx: any) => tx.isPrivate).length,
      publicTransactions: transactions.filter((tx: any) => !tx.isPrivate).length,
    };
    
    const privacyRatio = analysis.privateTransactions / analysis.totalTransactions;
    const score = Math.round(privacyRatio * 10);
    
    const risks: string[] = [];
    const recommendations: string[] = [];
    
    if (analysis.publicTransactions > 0) {
      risks.push(`${analysis.publicTransactions} public transactions expose activity`);
      recommendations.push('Use Ghost Relay for future transactions');
    }
    
    if (score < 5) {
      recommendations.push('Consider creating a new wallet for clean start');
    }
    
    return {
      score,
      ...analysis,
      risks,
      recommendations
    };
  }

  /**
   * Chat with local LLM
   */
  private async chat(messages: any[]): Promise<any> {
    // For simple queries, use transformers.js
    // For complex ones, this will be routed to server
    
    // Check if we have WebLLM loaded
    if (!webllmModule) {
      webllmModule = await import('@mlc-ai/web-llm');
    }
    
    if (!this.models.has('webllm-engine')) {
      this.log('Initializing WebLLM engine...');
      const engine = await webllmModule.CreateMLCEngine('Phi-3-mini-4k-instruct-q4f32_1');
      this.models.set('webllm-engine', engine);
    }
    
    const engine = this.models.get('webllm-engine');
    
    const response = await engine.chat.completions.create({
      messages,
      max_tokens: 512,
      temperature: 0.7
    });
    
    return {
      message: response.choices[0].message.content,
      model: 'phi-3-mini',
      tokensUsed: response.usage?.total_tokens
    };
  }

  /**
   * Fetch transactions from blockchain (public data)
   */
  private async fetchTransactions(walletAddress: string): Promise<any[]> {
    try {
      // This would call Solana RPC in production
      // For now, return mock data for demo
      const response = await fetch(
        `https://api.mainnet-beta.solana.com`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getSignaturesForAddress',
            params: [walletAddress, { limit: 100 }]
          })
        }
      );
      
      const data = await response.json();
      
      // Process and classify transactions
      return (data.result || []).map((sig: any) => ({
        signature: sig.signature,
        timestamp: sig.blockTime,
        // Heuristic: transactions with memos might be private relay
        isPrivate: sig.memo && sig.memo.includes('ghost')
      }));
      
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      return [];
    }
  }

  /**
   * Get available client-side models
   */
  async getModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'sentiment-analysis',
        name: 'Sentiment Analysis',
        description: 'Analyze text sentiment (positive/negative/neutral)',
        size: '5MB',
        averageLatency: 50,
        cost: 0,
        layer: 'client',
        tasks: ['sentiment-analysis', 'text-classification']
      },
      {
        id: 'transcription',
        name: 'Speech-to-Text (Whisper Tiny)',
        description: 'Transcribe audio to text',
        size: '75MB',
        averageLatency: 200,
        cost: 0,
        layer: 'client',
        tasks: ['transcription', 'speech-to-text']
      },
      {
        id: 'translation',
        name: 'Translation (NLLB-200)',
        description: 'Translate between 200 languages',
        size: '50MB',
        averageLatency: 150,
        cost: 0,
        layer: 'client',
        tasks: ['translation']
      },
      {
        id: 'webllm',
        name: 'Phi-3 Mini (4K context)',
        description: 'Small language model for chat',
        size: '2GB',
        averageLatency: 500,
        cost: 0,
        layer: 'client',
        tasks: ['chat', 'text-generation']
      }
    ];
  }

  /**
   * Load custom model
   */
  async loadCustomModel(params: {
    name: string;
    modelUrl: string;
    type: 'onnx' | 'transformers' | 'webllm';
  }): Promise<void> {
    this.log(`Loading custom model: ${params.name}`);
    
    switch (params.type) {
      case 'onnx':
        if (!onnxModule) {
          onnxModule = await import('onnxruntime-web');
        }
        const session = await onnxModule.InferenceSession.create(params.modelUrl);
        this.models.set(params.name, session);
        break;
      
      case 'transformers':
        const pipeline = await transformersModule.pipeline('feature-extraction', params.modelUrl);
        this.models.set(params.name, pipeline);
        break;
      
      case 'webllm':
        if (!webllmModule) {
          webllmModule = await import('@mlc-ai/web-llm');
        }
        const engine = await webllmModule.CreateMLCEngine(params.modelUrl);
        this.models.set(params.name, engine);
        break;
    }
    
    this.emit('model-loaded', params.name);
  }

  /**
   * Check if running in browser
   */
  static isSupported(): boolean {
    return typeof window !== 'undefined' && 'WebAssembly' in window;
  }

  /**
   * Check if WebGPU is available (for acceleration)
   */
  static hasWebGPU(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
  }

  private log(...args: any[]): void {
    if (this.debug) {
      console.log('[ClientAI]', ...args);
    }
  }
}

