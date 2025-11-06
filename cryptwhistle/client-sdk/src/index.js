/**
 * CryptWhistle Client SDK
 * Privacy-Preserving AI that runs entirely in the browser
 * Data NEVER leaves the user's device
 */

import { pipeline, env } from '@xenova/transformers';

// Configure Transformers.js
env.allowLocalModels = false; // Use CDN
env.allowRemoteModels = true;

/**
 * Main CryptWhistle Client Class
 */
export class CryptWhistleClient {
  constructor(config = {}) {
    this.config = {
      apiUrl: config.apiUrl || 'http://localhost:3000',
      enableWebGPU: config.enableWebGPU !== false,
      enableLogging: config.enableLogging || false,
      ...config
    };
    
    this.models = new Map();
    this.loadingModels = new Map();
  }

  /**
   * Load a model into browser memory
   * @param {string} task - Task type (sentiment-analysis, text-classification, etc.)
   * @param {Object} options - Loading options
   */
  async loadModel(task, options = {}) {
    // Check if already loaded
    if (this.models.has(task)) {
      return this.models.get(task);
    }

    // Check if currently loading
    if (this.loadingModels.has(task)) {
      return this.loadingModels.get(task);
    }

    const loadPromise = (async () => {
      try {
        if (this.config.enableLogging) {
          console.log(`🔄 Loading ${task} model...`);
        }

        const modelPipeline = await pipeline(task, null, {
          progress_callback: options.onProgress || ((progress) => {
            if (this.config.enableLogging) {
              console.log(`Loading: ${progress.file} - ${progress.progress}%`);
            }
          })
        });

        this.models.set(task, modelPipeline);
        this.loadingModels.delete(task);

        if (this.config.enableLogging) {
          console.log(`✅ ${task} model loaded successfully`);
        }

        return modelPipeline;
      } catch (error) {
        this.loadingModels.delete(task);
        throw new Error(`Failed to load ${task} model: ${error.message}`);
      }
    })();

    this.loadingModels.set(task, loadPromise);
    return loadPromise;
  }

  /**
   * Analyze sentiment of text (runs locally in browser)
   * @param {string} text - Text to analyze
   * @param {Object} options - Options
   * @returns {Promise<Object>} Sentiment result
   */
  async analyzeSentiment(text, options = {}) {
    if (!text || typeof text !== 'string') {
      throw new Error('Text must be a non-empty string');
    }

    const startTime = performance.now();
    
    try {
      const model = await this.loadModel('sentiment-analysis', options);
      const result = await model(text);
      
      const duration = performance.now() - startTime;

      return {
        output: {
          label: result[0].label,
          score: result[0].score,
          sentiment: result[0].label
        },
        metadata: {
          duration: Math.round(duration),
          model: 'distilbert-base-uncased-sst2',
          executionLocation: 'client-side',
          privacy: 'maximum - data never left device',
          timestamp: new Date().toISOString()
        },
        privacy: {
          dataLocation: 'local-device',
          serverAccess: false,
          encrypted: 'not-needed',
          guarantee: 'Data processed entirely in your browser'
        }
      };
    } catch (error) {
      throw new Error(`Sentiment analysis failed: ${error.message}`);
    }
  }

  /**
   * Classify text (runs locally in browser)
   * @param {string} text - Text to classify
   * @param {Array<string>} labels - Possible labels
   * @param {Object} options - Options
   * @returns {Promise<Object>} Classification result
   */
  async classifyText(text, labels, options = {}) {
    if (!text || !labels || !Array.isArray(labels)) {
      throw new Error('Invalid input: text and labels array required');
    }

    const startTime = performance.now();
    
    try {
      const model = await this.loadModel('zero-shot-classification', options);
      const result = await model(text, labels);
      
      const duration = performance.now() - startTime;

      return {
        output: {
          labels: result.labels,
          scores: result.scores,
          topLabel: result.labels[0],
          topScore: result.scores[0]
        },
        metadata: {
          duration: Math.round(duration),
          model: 'facebook/bart-large-mnli',
          executionLocation: 'client-side',
          privacy: 'maximum - data never left device',
          timestamp: new Date().toISOString()
        },
        privacy: {
          dataLocation: 'local-device',
          serverAccess: false,
          encrypted: 'not-needed',
          guarantee: 'Data processed entirely in your browser'
        }
      };
    } catch (error) {
      throw new Error(`Text classification failed: ${error.message}`);
    }
  }

  /**
   * Answer questions based on context (runs locally)
   * @param {string} question - Question to answer
   * @param {string} context - Context containing the answer
   * @param {Object} options - Options
   * @returns {Promise<Object>} Answer result
   */
  async answerQuestion(question, context, options = {}) {
    if (!question || !context) {
      throw new Error('Question and context required');
    }

    const startTime = performance.now();
    
    try {
      const model = await this.loadModel('question-answering', options);
      const result = await model(question, context);
      
      const duration = performance.now() - startTime;

      return {
        output: {
          answer: result.answer,
          score: result.score
        },
        metadata: {
          duration: Math.round(duration),
          model: 'distilbert-base-cased-distilled-squad',
          executionLocation: 'client-side',
          privacy: 'maximum - data never left device',
          timestamp: new Date().toISOString()
        },
        privacy: {
          dataLocation: 'local-device',
          serverAccess: false,
          encrypted: 'not-needed',
          guarantee: 'Data processed entirely in your browser'
        }
      };
    } catch (error) {
      throw new Error(`Question answering failed: ${error.message}`);
    }
  }

  /**
   * Extract features from text (for embeddings, similarity, etc.)
   * @param {string} text - Text to process
   * @param {Object} options - Options
   * @returns {Promise<Object>} Feature vectors
   */
  async extractFeatures(text, options = {}) {
    if (!text) {
      throw new Error('Text required');
    }

    const startTime = performance.now();
    
    try {
      const model = await this.loadModel('feature-extraction', options);
      const result = await model(text, { pooling: 'mean', normalize: true });
      
      const duration = performance.now() - startTime;

      return {
        output: {
          features: Array.from(result.data),
          dimensions: result.dims[1]
        },
        metadata: {
          duration: Math.round(duration),
          model: 'bert-base-uncased',
          executionLocation: 'client-side',
          privacy: 'maximum - data never left device',
          timestamp: new Date().toISOString()
        },
        privacy: {
          dataLocation: 'local-device',
          serverAccess: false,
          encrypted: 'not-needed',
          guarantee: 'Data processed entirely in your browser'
        }
      };
    } catch (error) {
      throw new Error(`Feature extraction failed: ${error.message}`);
    }
  }

  /**
   * Generic query interface (maintains API compatibility)
   * @param {Object} query - Query object
   * @returns {Promise<Object>} Result
   */
  async query(query) {
    const { task, input, options = {} } = query;

    switch (task) {
      case 'sentiment':
      case 'sentiment-analysis':
        return this.analyzeSentiment(input.text, options);

      case 'classification':
      case 'text-classification':
        return this.classifyText(input.text, input.labels || [], options);

      case 'question-answering':
      case 'qa':
        return this.answerQuestion(input.question, input.context, options);

      case 'feature-extraction':
      case 'embeddings':
        return this.extractFeatures(input.text, options);

      default:
        throw new Error(`Unsupported task: ${task}`);
    }
  }

  /**
   * Check client capabilities
   * @returns {Object} Client capabilities
   */
  async checkCapabilities() {
    const capabilities = {
      webgpu: false,
      webgl: false,
      wasm: true,
      userAgent: navigator.userAgent
    };

    // Check WebGPU
    if ('gpu' in navigator) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        capabilities.webgpu = !!adapter;
      } catch (e) {
        capabilities.webgpu = false;
      }
    }

    // Check WebGL
    try {
      const canvas = document.createElement('canvas');
      capabilities.webgl = !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      capabilities.webgl = false;
    }

    return capabilities;
  }

  /**
   * Get loaded models
   * @returns {Array<string>} List of loaded model names
   */
  getLoadedModels() {
    return Array.from(this.models.keys());
  }

  /**
   * Unload a model to free memory
   * @param {string} task - Task name
   */
  unloadModel(task) {
    if (this.models.has(task)) {
      this.models.delete(task);
      if (this.config.enableLogging) {
        console.log(`🗑️ Unloaded ${task} model`);
      }
      return true;
    }
    return false;
  }

  /**
   * Unload all models
   */
  unloadAllModels() {
    const count = this.models.size;
    this.models.clear();
    if (this.config.enableLogging) {
      console.log(`🗑️ Unloaded ${count} models`);
    }
  }
}

// Export convenience functions
export async function analyzeSentiment(text, options = {}) {
  const client = new CryptWhistleClient(options);
  return client.analyzeSentiment(text, options);
}

export async function classifyText(text, labels, options = {}) {
  const client = new CryptWhistleClient(options);
  return client.classifyText(text, labels, options);
}

export async function answerQuestion(question, context, options = {}) {
  const client = new CryptWhistleClient(options);
  return client.answerQuestion(question, context, options);
}

export default CryptWhistleClient;

