/**
 * Server-Side AI - Communicates with backend API
 * Handles TEE and FHE compute layers
 */

import axios, { AxiosInstance } from 'axios';
import { ModelInfo } from '../types';

export interface ServerAIConfig {
  apiUrl: string;
  apiKey?: string;
}

export interface ServerExecuteOptions {
  layer: 'tee' | 'fhe';
  requireProof?: boolean;
}

export interface ServerResult<T = any> {
  result: T;
  cost: number;
  recipient: string;
  proof?: string;
}

export class ServerAI {
  private client: AxiosInstance;
  private config: ServerAIConfig;

  constructor(config: ServerAIConfig) {
    this.config = config;
    
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` })
      }
    });
  }

  /**
   * Test server connection
   */
  async ping(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      console.warn('Server ping failed:', error);
      return false;
    }
  }

  /**
   * Execute task on server
   */
  async execute<T = any>(
    task: string,
    input: any,
    options: ServerExecuteOptions
  ): Promise<ServerResult<T>> {
    try {
      const response = await this.client.post('/api/v1/query', {
        task,
        input,
        options: {
          computeLayer: options.layer,
          requireProof: options.requireProof
        }
      });

      return {
        result: response.data.result,
        cost: response.data.metadata.cost,
        recipient: response.data.metadata.recipient,
        proof: response.data.metadata.proof
      };
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Server error: ${error.response.data.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get available server-side models
   */
  async getModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.client.get('/api/v1/models');
      return response.data.serverSide || [];
    } catch (error) {
      console.error('Failed to fetch server models:', error);
      return [];
    }
  }

  /**
   * Deploy custom model to server
   */
  async deployModel(params: {
    name: string;
    modelUrl: string;
    type: string;
  }): Promise<void> {
    await this.client.post('/api/v1/models/deploy', params);
  }

  /**
   * Update API key
   */
  updateApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${apiKey}`;
  }
}

