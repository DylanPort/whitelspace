/**
 * Main WhistleAI class - The primary interface for developers
 */

import EventEmitter from 'eventemitter3';
import { ClientAI } from './client/ClientAI';
import { ServerAI } from './server/ServerAI';
import { SmartRouter } from './router/SmartRouter';
import { SolanaIntegration } from './solana/SolanaIntegration';
import {
  WhistleAIConfig,
  QueryOptions,
  QueryResult,
  SentimentResult,
  TranscriptionResult,
  TranslationResult,
  ChatMessage,
  ChatResult,
  PrivacyAnalysis,
  ModelInfo,
  WhistleAIEvent,
  WhistleAIEventMap
} from './types';

export class WhistleAI extends EventEmitter<WhistleAIEventMap> {
  private config: Required<WhistleAIConfig>;
  private clientAI: ClientAI;
  private serverAI: ServerAI;
  private router: SmartRouter;
  private solana: SolanaIntegration;
  private isReady: boolean = false;

  constructor(config: WhistleAIConfig = {}) {
    super();
    
    // Default configuration
    this.config = {
      apiUrl: config.apiUrl || 'https://api.whistle.ai',
      wallet: config.wallet || null,
      preferClientSide: config.preferClientSide !== false,
      apiKey: config.apiKey || '',
      rpcUrl: config.rpcUrl || 'https://api.mainnet-beta.solana.com',
      debug: config.debug || false
    };

    // Initialize components
    this.clientAI = new ClientAI({ debug: this.config.debug });
    this.serverAI = new ServerAI({
      apiUrl: this.config.apiUrl,
      apiKey: this.config.apiKey
    });
    this.router = new SmartRouter({
      preferClientSide: this.config.preferClientSide
    });
    this.solana = new SolanaIntegration({
      wallet: this.config.wallet,
      rpcUrl: this.config.rpcUrl
    });

    // Forward events
    this.clientAI.on('model-loaded', (model) => {
      this.emit('model-loaded', { modelId: model, layer: 'client' });
    });

    this.log('Whistle AI SDK initialized');
  }

  /**
   * Initialize and load models
   * Call this before making queries
   */
  async ready(): Promise<void> {
    if (this.isReady) return;

    this.log('Loading AI models...');
    
    try {
      // Load client-side models
      await this.clientAI.initialize();
      
      // Test server connection
      await this.serverAI.ping();
      
      this.isReady = true;
      this.emit('ready');
      this.log('Whistle AI ready!');
    } catch (error) {
      this.emit('error', { error: error as Error, context: 'initialization' });
      throw error;
    }
  }

  /**
   * Analyze sentiment of text
   * @example
   * const result = await ai.analyzeSentiment("I love privacy!");
   * // { label: 'POSITIVE', score: 0.98 }
   */
  async analyzeSentiment(
    text: string,
    options: QueryOptions = {}
  ): Promise<QueryResult<SentimentResult>> {
    return this.query('sentiment-analysis', { text }, options);
  }

  /**
   * Transcribe audio to text
   * @example
   * const result = await ai.transcribe(audioBlob);
   * // { text: "Hello world", confidence: 0.94 }
   */
  async transcribe(
    audio: Blob | ArrayBuffer,
    options: QueryOptions & { language?: string } = {}
  ): Promise<QueryResult<TranscriptionResult>> {
    return this.query('transcription', { audio, language: options.language }, options);
  }

  /**
   * Translate text between languages
   * @example
   * const result = await ai.translate("Hello", { to: "es" });
   * // { translation: "Hola", confidence: 0.99 }
   */
  async translate(
    text: string,
    params: { from?: string; to: string },
    options: QueryOptions = {}
  ): Promise<QueryResult<TranslationResult>> {
    return this.query('translation', { text, ...params }, options);
  }

  /**
   * Chat with AI assistant
   * @example
   * const result = await ai.chat("Explain blockchain privacy");
   * // { message: "Blockchain privacy refers to...", model: "phi-3" }
   */
  async chat(
    message: string | ChatMessage[],
    options: QueryOptions = {}
  ): Promise<QueryResult<ChatResult>> {
    const messages = typeof message === 'string' 
      ? [{ role: 'user' as const, content: message }]
      : message;
    
    return this.query('chat', { messages }, options);
  }

  /**
   * Analyze wallet privacy score
   * @example
   * const result = await ai.analyzePrivacy("7xK...B9s");
   * // { score: 8, recommendations: ["Use Ghost Relay"], ... }
   */
  async analyzePrivacy(
    walletAddress: string,
    options: QueryOptions = {}
  ): Promise<QueryResult<PrivacyAnalysis>> {
    return this.query('privacy-analysis', { walletAddress }, options);
  }

  /**
   * Generic query interface
   * Internal method used by all specific methods
   */
  private async query<T = any>(
    task: string,
    input: any,
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    if (!this.isReady) {
      await this.ready();
    }

    const queryId = this.generateQueryId();
    const startTime = Date.now();
    
    this.emit('query-start', { queryId });
    this.log(`Query ${queryId}: ${task}`);

    try {
      // Decide which compute layer to use
      const layer = await this.router.selectLayer(task, input, options);
      
      let result: T;
      let cost = 0;

      // Execute on selected layer
      if (layer === 'client') {
        result = await this.clientAI.execute(task, input);
        cost = 0; // Client-side is free
      } else {
        // Server-side execution
        const serverResult = await this.serverAI.execute(task, input, {
          layer: layer as 'tee' | 'fhe',
          requireProof: options.requireProof
        });
        result = serverResult.result;
        cost = serverResult.cost;

        // Handle payment if required
        if (cost > 0 && this.config.wallet) {
          await this.handlePayment(cost, serverResult.recipient);
        }
      }

      const duration = Date.now() - startTime;
      
      const queryResult: QueryResult<T> = {
        result,
        metadata: {
          computeLayer: layer,
          duration,
          cost,
          model: task,
          timestamp: Date.now()
        }
      };

      this.emit('query-end', { queryId, result: queryResult });
      this.log(`Query ${queryId} complete: ${duration}ms, ${cost} SOL`);

      return queryResult;

    } catch (error) {
      this.emit('error', { error: error as Error, context: { queryId, task } });
      throw error;
    }
  }

  /**
   * Handle payment via x402 protocol
   */
  private async handlePayment(amount: number, recipient: string): Promise<void> {
    this.emit('payment-required', { amount });
    
    const payment = await this.solana.createPayment({
      amount,
      recipient
    });
    
    await this.solana.sendPayment(payment);
    
    this.emit('payment-complete', { signature: payment.signature });
  }

  /**
   * Get list of available models
   */
  async getModels(): Promise<ModelInfo[]> {
    const clientModels = await this.clientAI.getModels();
    const serverModels = await this.serverAI.getModels();
    return [...clientModels, ...serverModels];
  }

  /**
   * Batch process multiple queries
   */
  async batch(queries: Array<{
    task: string;
    input: any;
    options?: QueryOptions;
  }>): Promise<QueryResult[]> {
    return Promise.all(
      queries.map(q => this.query(q.task, q.input, q.options))
    );
  }

  /**
   * Deploy custom model
   */
  async deployModel(params: {
    name: string;
    modelUrl: string;
    type: 'onnx' | 'transformers' | 'webllm';
    computeLayer: 'client' | 'server';
  }): Promise<void> {
    if (params.computeLayer === 'client') {
      await this.clientAI.loadCustomModel(params);
    } else {
      await this.serverAI.deployModel(params);
    }
  }

  // Utility methods

  private generateQueryId(): string {
    return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[WhistleAI]', ...args);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<Required<WhistleAIConfig>> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<WhistleAIConfig>): void {
    Object.assign(this.config, config);
    
    if (config.wallet) {
      this.solana.updateWallet(config.wallet);
    }
  }
}

