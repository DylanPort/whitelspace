/**
 * Direct RPC client for Whistlenet
 * Our own validator - no rate limits!
 */

const RPC_URL = process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://rpc.whistle.ninja'

class SolanaRPC {
  constructor(endpoint = RPC_URL) {
    this.endpoint = endpoint
    this.requestId = 0
  }

  async call(method, params = []) {
    this.requestId++
    
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: this.requestId,
        method,
        params
      })
    })

    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.error.message || 'RPC Error')
    }
    
    return data.result
  }

  // Get current slot
  async getSlot() {
    return this.call('getSlot')
  }

  // Get block height
  async getBlockHeight() {
    return this.call('getBlockHeight')
  }

  // Get epoch info
  async getEpochInfo() {
    return this.call('getEpochInfo')
  }

  // Get version
  async getVersion() {
    return this.call('getVersion')
  }

  // Get health
  async getHealth() {
    try {
      const result = await this.call('getHealth')
      return result === 'ok' ? 'healthy' : 'unhealthy'
    } catch (e) {
      // getHealth returns error when behind
      if (e.message?.includes('behind')) {
        return 'behind'
      }
      return 'error'
    }
  }

  // Get recent performance samples
  async getRecentPerformanceSamples(limit = 10) {
    return this.call('getRecentPerformanceSamples', [limit])
  }

  // Get cluster nodes
  async getClusterNodes() {
    return this.call('getClusterNodes')
  }

  // Get vote accounts (for validator count)
  async getVoteAccounts() {
    return this.call('getVoteAccounts')
  }

  // Get supply
  async getSupply() {
    return this.call('getSupply')
  }

  // Get recent blockhash
  async getLatestBlockhash() {
    return this.call('getLatestBlockhash')
  }

  // Get account info
  async getAccountInfo(pubkey) {
    return this.call('getAccountInfo', [pubkey, { encoding: 'base64' }])
  }

  // Get balance
  async getBalance(pubkey) {
    return this.call('getBalance', [pubkey])
  }
}

// Export singleton
export const rpc = new SolanaRPC()

// Export class for custom instances
export { SolanaRPC }

