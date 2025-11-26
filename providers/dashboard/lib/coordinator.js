/**
 * Coordinator API client
 */

const COORDINATOR_URL = typeof window !== 'undefined' 
  ? (process.env.NEXT_PUBLIC_COORDINATOR_URL || 'http://localhost:3003')
  : 'http://localhost:3003'

class CoordinatorAPI {
  constructor(baseUrl = COORDINATOR_URL) {
    this.baseUrl = baseUrl
  }

  async fetch(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`
    
    try {
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
    } catch (error) {
      console.error('Coordinator API error:', error)
      throw error
    }
  }

  // Health check
  async health() {
    return this.fetch('/health')
  }

  // Get network stats
  async getStats() {
    return this.fetch('/api/stats')
  }

  // Get all nodes
  async getNodes() {
    return this.fetch('/api/nodes')
  }

  // Get specific node
  async getNode(nodeId) {
    return this.fetch(`/api/nodes/${nodeId}`)
  }

  // Get rewards for wallet
  async getRewards(wallet) {
    return this.fetch(`/api/rewards/${wallet}`)
  }

  // Get leaderboard
  async getLeaderboard() {
    return this.fetch('/api/leaderboard')
  }

  // Get routing info
  async getRoute() {
    return this.fetch('/api/route')
  }
}

export const coordinator = new CoordinatorAPI()
export { CoordinatorAPI }

