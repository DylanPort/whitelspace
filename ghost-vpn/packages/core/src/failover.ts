/**
 * Ghost VPN - Auto-Failover System
 * Automatically switch to backup servers if primary fails
 */

import { EventEmitter } from 'events';
import { GhostVPNClient, WireGuardConfig } from './wireguard-client';

export interface FailoverServer {
  id: string;
  config: WireGuardConfig | string;
  priority: number; // Lower is higher priority
  region: string;
  healthStatus: 'healthy' | 'degraded' | 'down';
  lastHealthCheck: Date;
  failureCount: number;
}

export interface FailoverConfig {
  enabled: boolean;
  healthCheckInterval: number; // milliseconds
  maxRetries: number;
  failureThreshold: number; // consecutive failures before failover
  autoReconnect: boolean;
}

export class VPNFailover extends EventEmitter {
  private config: FailoverConfig;
  private servers: FailoverServer[] = [];
  private currentServer: FailoverServer | null = null;
  private vpnClient: GhostVPNClient;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private enabled = false;

  constructor(vpnClient: GhostVPNClient, config: FailoverConfig) {
    super();
    this.vpnClient = vpnClient;
    this.config = config;
  }

  /**
   * Add failover server
   */
  addServer(server: Omit<FailoverServer, 'healthStatus' | 'lastHealthCheck' | 'failureCount'>): void {
    this.servers.push({
      ...server,
      healthStatus: 'healthy',
      lastHealthCheck: new Date(),
      failureCount: 0
    });

    // Sort by priority
    this.servers.sort((a, b) => a.priority - b.priority);
    
    this.emit('server-added', server);
  }

  /**
   * Remove server
   */
  removeServer(serverId: string): void {
    this.servers = this.servers.filter(s => s.id !== serverId);
    this.emit('server-removed', serverId);
  }

  /**
   * Start failover monitoring
   */
  async start(): Promise<void> {
    if (this.enabled) return;

    if (this.servers.length === 0) {
      throw new Error('No failover servers configured');
    }

    this.enabled = true;

    // Set current server (highest priority healthy server)
    this.currentServer = this.getNextHealthyServer();

    if (!this.currentServer) {
      throw new Error('No healthy servers available');
    }

    // Start health checking
    this.startHealthChecking();

    this.emit('started');
  }

  /**
   * Stop failover monitoring
   */
  async stop(): Promise<void> {
    if (!this.enabled) return;

    this.enabled = false;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.emit('stopped');
  }

  /**
   * Force failover to next server
   */
  async failover(): Promise<void> {
    if (!this.currentServer) {
      throw new Error('No current server');
    }

    this.emit('failover-starting', this.currentServer);

    // Mark current server as down
    this.currentServer.healthStatus = 'down';
    this.currentServer.failureCount++;

    // Get next healthy server
    const nextServer = this.getNextHealthyServer();

    if (!nextServer) {
      this.emit('failover-failed', 'No healthy servers available');
      throw new Error('No healthy servers available for failover');
    }

    try {
      // Disconnect from current server
      if (this.vpnClient.isConnected()) {
        await this.vpnClient.disconnect();
      }

      // Connect to next server
      await this.vpnClient.loadConfig(nextServer.config);
      await this.vpnClient.connect();

      this.currentServer = nextServer;
      this.emit('failover-complete', nextServer);

    } catch (error) {
      this.emit('failover-error', error);
      
      // Try next server
      if (this.config.autoReconnect) {
        setTimeout(() => this.failover(), 5000);
      }
      
      throw error;
    }
  }

  /**
   * Get next healthy server
   */
  private getNextHealthyServer(): FailoverServer | null {
    // Find the highest priority healthy server that's not the current one
    for (const server of this.servers) {
      if (
        server.healthStatus === 'healthy' &&
        server.failureCount < this.config.failureThreshold &&
        (!this.currentServer || server.id !== this.currentServer.id)
      ) {
        return server;
      }
    }

    // If no healthy servers, return least failed server
    if (this.servers.length > 0) {
      return this.servers.reduce((prev, current) => 
        current.failureCount < prev.failureCount ? current : prev
      );
    }

    return null;
  }

  /**
   * Start health checking
   */
  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(() => {
      this.checkAllServersHealth();
    }, this.config.healthCheckInterval);

    // Initial check
    this.checkAllServersHealth();
  }

  /**
   * Check all servers health
   */
  private async checkAllServersHealth(): Promise<void> {
    const checks = this.servers.map(server => this.checkServerHealth(server));
    await Promise.all(checks);
  }

  /**
   * Check single server health
   */
  private async checkServerHealth(server: FailoverServer): Promise<void> {
    try {
      const healthy = await this.pingServer(server);
      
      server.lastHealthCheck = new Date();

      if (healthy) {
        server.healthStatus = 'healthy';
        server.failureCount = Math.max(0, server.failureCount - 1); // Gradually recover
      } else {
        server.failureCount++;

        if (server.failureCount >= this.config.failureThreshold) {
          server.healthStatus = 'down';
        } else {
          server.healthStatus = 'degraded';
        }

        // If current server is down, failover
        if (
          this.currentServer &&
          server.id === this.currentServer.id &&
          server.healthStatus === 'down'
        ) {
          this.emit('current-server-down', server);
          
          if (this.config.autoReconnect) {
            await this.failover();
          }
        }
      }

      this.emit('health-check-complete', {
        server: server.id,
        status: server.healthStatus
      });

    } catch (error) {
      server.healthStatus = 'down';
      server.failureCount++;
      this.emit('health-check-error', { server: server.id, error });
    }
  }

  /**
   * Ping server to check if it's reachable
   */
  private async pingServer(server: FailoverServer): Promise<boolean> {
    try {
      // Parse server config to get endpoint
      const config = typeof server.config === 'string' 
        ? this.parseConfig(server.config)
        : server.config;

      if (!config.peers || config.peers.length === 0) {
        return false;
      }

      const endpoint = config.peers[0].endpoint;
      const [host, port] = endpoint.split(':');

      // Try to connect to server
      const net = require('net');
      const socket = net.connect(parseInt(port), host);

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          socket.destroy();
          resolve(false);
        }, 5000); // 5 second timeout

        socket.on('connect', () => {
          clearTimeout(timeout);
          socket.destroy();
          resolve(true);
        });

        socket.on('error', () => {
          clearTimeout(timeout);
          resolve(false);
        });
      });

    } catch {
      return false;
    }
  }

  /**
   * Parse WireGuard config
   */
  private parseConfig(configText: string): WireGuardConfig {
    // Simple parser - in production use the one from wireguard-client
    const lines = configText.split('\n');
    const config: any = { peers: [{}] };

    for (const line of lines) {
      if (line.includes('Endpoint')) {
        const [, value] = line.split('=');
        config.peers[0].endpoint = value.trim();
      }
    }

    return config as WireGuardConfig;
  }

  /**
   * Get failover status
   */
  getStatus(): {
    enabled: boolean;
    currentServer: FailoverServer | null;
    servers: FailoverServer[];
  } {
    return {
      enabled: this.enabled,
      currentServer: this.currentServer,
      servers: this.servers.map(s => ({ ...s }))
    };
  }

  /**
   * Get healthy servers count
   */
  getHealthyServersCount(): number {
    return this.servers.filter(s => s.healthStatus === 'healthy').length;
  }

  /**
   * Reset server failure counts
   */
  resetFailureCounts(): void {
    this.servers.forEach(server => {
      server.failureCount = 0;
      if (server.healthStatus === 'down') {
        server.healthStatus = 'degraded';
      }
    });

    this.emit('failure-counts-reset');
  }
}

export default VPNFailover;

