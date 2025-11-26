/**
 * API client for WHISTLE Provider API
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.whistle.ninja'

class WhistleAPI {
  constructor(baseUrl = API_URL) {
    this.baseUrl = baseUrl
  }

  async fetch(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Health check
  async health() {
    return this.fetch('/health')
  }

  // Get current metrics
  async getMetrics() {
    return this.fetch('/api/metrics')
  }

  // Get metrics history
  async getMetricsHistory(hours = 24) {
    return this.fetch(`/api/metrics/history?hours=${hours}`)
  }

  // Get RPC request stats
  async getRequestStats(hours = 1) {
    return this.fetch(`/api/metrics/requests?hours=${hours}`)
  }

  // Get all providers
  async getProviders() {
    return this.fetch('/api/providers')
  }

  // Get provider by wallet
  async getProvider(wallet) {
    return this.fetch(`/api/providers/${wallet}`)
  }

  // Register as provider
  async registerProvider({ wallet, name, rpcEndpoint, providerType, signature, message }) {
    return this.fetch('/api/providers/register', {
      method: 'POST',
      body: JSON.stringify({
        wallet,
        name,
        rpcEndpoint,
        providerType,
        signature,
        message,
      }),
    })
  }

  // Update provider
  async updateProvider(wallet, { name, rpcEndpoint, signature, message }) {
    return this.fetch(`/api/providers/${wallet}`, {
      method: 'PUT',
      body: JSON.stringify({ name, rpcEndpoint, signature, message }),
    })
  }

  // Provider heartbeat
  async heartbeat(wallet) {
    return this.fetch(`/api/providers/${wallet}/heartbeat`, {
      method: 'POST',
    })
  }

  // Get API info
  async getInfo() {
    return this.fetch('/api/info')
  }
}

// Export singleton instance
export const api = new WhistleAPI()

// Export class for custom instances
export { WhistleAPI }

