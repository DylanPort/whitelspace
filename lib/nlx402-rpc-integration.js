/**
 * NLx402 RPC Integration for WHISTLE Network
 * 
 * This module integrates NLx402's nonce-locked payment system with WHISTLE's RPC network
 * to prevent replay attacks and ensure secure, single-use payment quotes for RPC queries.
 */

const crypto = require('crypto');

class WhistleNLx402Integration {
  constructor(options = {}) {
    // RPC recipient wallet (X402 wallet for RPC payments)
    this.rpcRecipientWallet = options.rpcRecipientWallet || 'BMiSBoT5aPCrFcxaTrHuzXMkfrtzCLMcDYqrPTVymNbU';
    
    // Track verified nonces to prevent replay attacks
    this.verifiedNonces = new Map(); // nonce -> { timestamp, walletAddress, queryCount }
    
    // Track paid nonces for RPC access
    this.paidNonces = new Map(); // nonce -> { tx, walletAddress, queriesAllowed, queriesUsed }
    
    // Cleanup expired nonces every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanupExpiredNonces(), 5 * 60 * 1000);
    
    // RPC pricing configuration
    this.pricing = {
      perQuery: options.perQueryPrice || 0.0001, // SOL per query
      bulkDiscount: options.bulkDiscount || {
        100: 0.95,   // 5% discount for 100+ queries
        1000: 0.90,  // 10% discount for 1000+ queries
        10000: 0.85, // 15% discount for 10000+ queries
      }
    };
  }

  /**
   * Generate a quote for RPC access
   * @param {Object} params
   * @param {string} params.walletAddress - User's Solana wallet
   * @param {number} params.queryCount - Number of RPC queries requested
   * @param {string} params.rpcMethod - Optional: specific RPC method
   * @returns {Promise<Object>} Quote with nonce and pricing
   */
  async generateRPCQuote({ walletAddress, queryCount = 1, rpcMethod }) {
    try {
      // Calculate total price with bulk discounts
      const totalPrice = this.calculatePrice(queryCount);
      
      // Generate unique nonce
      const nonce = crypto.randomBytes(32).toString('hex');
      
      // Create NLx402 quote
      const quote = {
        amount: totalPrice.toString(),
        mint: 'SOL',
        recipient: this.rpcRecipientWallet,
        nonce,
        expires_at: Date.now() + (5 * 60 * 1000), // 5 minute validity
        created_at: Date.now()
      };
      
      // Enhance quote with WHISTLE-specific metadata
      const enhancedQuote = {
        ...quote,
        whistle: {
          walletAddress,
          queryCount,
          rpcMethod: rpcMethod || 'any',
          pricePerQuery: this.pricing.perQuery,
          totalPrice,
          discount: this.getDiscountRate(queryCount),
          validFor: 300, // 5 minutes
          timestamp: Date.now(),
        }
      };
      
      // Store quote metadata
      this.verifiedNonces.set(nonce, {
        timestamp: Date.now(),
        walletAddress,
        queryCount,
        rpcMethod,
        quote: enhancedQuote
      });
      
      return {
        success: true,
        quote: enhancedQuote,
        nonce
      };
    } catch (error) {
      console.error('Error generating RPC quote:', error);
      throw error;
    }
  }

  /**
   * Verify a quote before payment
   * @param {Object} params
   * @param {Object} params.quote - The quote object
   * @param {string} params.nonce - The nonce from the quote
   * @param {string} params.walletAddress - User's wallet for verification
   * @returns {Promise<Object>} Verification result
   */
  async verifyRPCQuote({ quote, nonce, walletAddress }) {
    try {
      // Check if nonce exists and matches wallet
      const storedData = this.verifiedNonces.get(nonce);
      if (!storedData) {
        throw new Error('Invalid or expired nonce');
      }
      
      if (storedData.walletAddress !== walletAddress) {
        throw new Error('Wallet address mismatch');
      }
      
      // Check expiration (5 minutes)
      const age = Date.now() - storedData.timestamp;
      if (age > 5 * 60 * 1000) {
        this.verifiedNonces.delete(nonce);
        throw new Error('Quote expired');
      }
      
      // Verify quote integrity
      if (quote.nonce !== nonce || quote.recipient !== this.rpcRecipientWallet) {
        throw new Error('Quote integrity check failed');
      }
      
      // Update verification status
      storedData.verified = true;
      storedData.verifiedAt = Date.now();
      
      return {
        success: true,
        nonce,
        queryCount: storedData.queryCount,
        message: 'Quote verified successfully'
      };
    } catch (error) {
      console.error('Error verifying RPC quote:', error);
      throw error;
    }
  }

  /**
   * Process payment and unlock RPC access
   * @param {Object} params
   * @param {string} params.tx - Solana transaction signature
   * @param {string} params.nonce - The nonce from the quote
   * @param {string} params.walletAddress - User's wallet
   * @returns {Promise<Object>} Access token and RPC credentials
   */
  async unlockRPCAccess({ tx, nonce, walletAddress }) {
    try {
      // Verify nonce was previously verified
      const storedData = this.verifiedNonces.get(nonce);
      if (!storedData || !storedData.verified) {
        throw new Error('Nonce not verified. Call verifyRPCQuote first.');
      }
      
      if (storedData.walletAddress !== walletAddress) {
        throw new Error('Wallet address mismatch');
      }
      
      // Check if nonce already used (replay attack prevention)
      if (this.paidNonces.has(nonce)) {
        throw new Error('Nonce already used (replay attack prevented)');
      }
      
      // Note: In production, you would verify the transaction signature here
      // For now, we trust that if the client sends a tx signature, payment was made
      // You can add blockchain verification using @solana/web3.js if needed
      
      // Generate RPC access token
      const accessToken = this.generateAccessToken(walletAddress, nonce);
      
      // Store paid access
      this.paidNonces.set(nonce, {
        tx,
        walletAddress,
        queriesAllowed: storedData.queryCount,
        queriesUsed: 0,
        accessToken,
        paidAt: Date.now()
      });
      
      // Clean up verified nonce (it's now paid)
      this.verifiedNonces.delete(nonce);
      
      return {
        success: true,
        accessToken,
        rpcEndpoint: process.env.WHISTLE_RPC_ENDPOINT || 'https://rpc.whistle.ninja',
        queriesAllowed: storedData.queryCount,
        expiresIn: 24 * 60 * 60, // 24 hours
        message: 'RPC access unlocked successfully'
      };
    } catch (error) {
      console.error('Error unlocking RPC access:', error);
      throw error;
    }
  }

  /**
   * Validate RPC request with access token
   * @param {string} accessToken - The access token from unlock
   * @param {string} rpcMethod - The RPC method being called
   * @returns {Object} Validation result
   */
  validateRPCRequest(accessToken, rpcMethod) {
    // Find the paid nonce by access token
    let paidAccess = null;
    let foundNonce = null;
    
    for (const [nonce, data] of this.paidNonces.entries()) {
      if (data.accessToken === accessToken) {
        paidAccess = data;
        foundNonce = nonce;
        break;
      }
    }
    
    if (!paidAccess) {
      return {
        valid: false,
        error: 'Invalid or expired access token'
      };
    }
    
    // Check if queries are remaining
    if (paidAccess.queriesUsed >= paidAccess.queriesAllowed) {
      return {
        valid: false,
        error: 'Query limit reached',
        queriesUsed: paidAccess.queriesUsed,
        queriesAllowed: paidAccess.queriesAllowed
      };
    }
    
    // Check expiration (24 hours)
    const age = Date.now() - paidAccess.paidAt;
    if (age > 24 * 60 * 60 * 1000) {
      this.paidNonces.delete(foundNonce);
      return {
        valid: false,
        error: 'Access token expired'
      };
    }
    
    // Increment query count
    paidAccess.queriesUsed++;
    
    return {
      valid: true,
      walletAddress: paidAccess.walletAddress,
      queriesUsed: paidAccess.queriesUsed,
      queriesRemaining: paidAccess.queriesAllowed - paidAccess.queriesUsed,
      tx: paidAccess.tx
    };
  }

  /**
   * Calculate price with bulk discounts
   * @param {number} queryCount - Number of queries
   * @returns {number} Total price in SOL
   */
  calculatePrice(queryCount) {
    const basePrice = this.pricing.perQuery * queryCount;
    const discountRate = this.getDiscountRate(queryCount);
    return basePrice * discountRate;
  }

  /**
   * Get discount rate based on query count
   * @param {number} queryCount - Number of queries
   * @returns {number} Discount multiplier (1.0 = no discount)
   */
  getDiscountRate(queryCount) {
    if (queryCount >= 10000) return this.pricing.bulkDiscount[10000];
    if (queryCount >= 1000) return this.pricing.bulkDiscount[1000];
    if (queryCount >= 100) return this.pricing.bulkDiscount[100];
    return 1.0;
  }

  /**
   * Generate secure access token
   * @param {string} walletAddress - User's wallet
   * @param {string} nonce - Payment nonce
   * @returns {string} Access token
   */
  generateAccessToken(walletAddress, nonce) {
    const data = `${walletAddress}:${nonce}:${Date.now()}:${Math.random()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Clean up expired nonces
   */
  cleanupExpiredNonces() {
    const now = Date.now();
    const expirationTime = 5 * 60 * 1000; // 5 minutes for unpaid, 24 hours for paid
    
    // Clean verified but unpaid nonces
    for (const [nonce, data] of this.verifiedNonces.entries()) {
      if (now - data.timestamp > expirationTime) {
        this.verifiedNonces.delete(nonce);
      }
    }
    
    // Clean paid nonces after 24 hours
    for (const [nonce, data] of this.paidNonces.entries()) {
      if (now - data.paidAt > 24 * 60 * 60 * 1000) {
        this.paidNonces.delete(nonce);
      }
    }
  }

  /**
   * Get usage statistics
   * @returns {Object} Current usage stats
   */
  getStats() {
    let totalQueries = 0;
    let activeTokens = 0;
    
    for (const data of this.paidNonces.values()) {
      totalQueries += data.queriesUsed;
      if (data.queriesUsed < data.queriesAllowed) {
        activeTokens++;
      }
    }
    
    return {
      verifiedNonces: this.verifiedNonces.size,
      paidNonces: this.paidNonces.size,
      activeTokens,
      totalQueries,
      timestamp: Date.now()
    };
  }

  /**
   * Cleanup on shutdown
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

module.exports = WhistleNLx402Integration;
