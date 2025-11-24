/**
 * NLx402 General Access Integration for WHISTLE X402 Features
 * 
 * This module provides nonce-locked payment protection for ALL x402 features:
 * - Privacy Tools (Vanishing Payments, Dead Man's Switch, etc.)
 * - Ghost Identity Generator
 * - Location Spoofer
 * - Steganography Tools
 * - Privacy Checkup
 * - And more...
 */

const crypto = require('crypto');

class WhistleNLx402GeneralAccess {
  constructor(options = {}) {
    // Track verified nonces to prevent replay attacks
    this.verifiedNonces = new Map(); // nonce -> { timestamp, walletAddress, feature }
    
    // Track paid nonces for access validation
    this.paidNonces = new Map(); // nonce -> { tx, walletAddress, expiresAt, feature, accessToken }
    
    // Track active access tokens
    this.activeTokens = new Map(); // accessToken -> { walletAddress, expiresAt, feature, nonce }
    
    // Cleanup expired nonces every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanupExpiredNonces(), 5 * 60 * 1000);
    
    // X402 pricing configuration
    this.pricing = {
      total: 0.02,              // Total user pays
      x402Amount: 0.019,        // Goes to X402 wallet
      facilitatorFee: 0.001,    // Goes to facilitator
      duration: options.accessDuration || 3600, // 1 hour in seconds
    };
    
    // Wallets
    this.x402Wallet = options.x402Wallet || 'BMiSBoT5aPCrFcxaTrHuzXMkfrtzCLMcDYqrPTVymNbU';
    this.facilitatorWallet = options.facilitatorWallet || 'GwtbzDh6QHwVan4DVyUR11gzBVcBT92KjnaPdk43fMG5';
  }
  
  /**
   * Generate an NLx402 quote for x402 access
   */
  async generateX402Quote({ walletAddress, feature = 'x402-access', amount, duration }) {
    // Generate unique nonce
    const nonce = crypto.randomBytes(32).toString('hex');
    
    // Use default pricing (split payment)
    const totalPrice = amount || this.pricing.total;
    const accessDuration = duration || this.pricing.duration;
    
    // Create quote with split payment info
    const quote = {
      amount: totalPrice.toString(),
      mint: 'SOL',
      recipient: this.x402Wallet,
      nonce,
      feature,
      duration: accessDuration,
      expires_at: Date.now() + (5 * 60 * 1000), // 5 minute quote validity
      created_at: Date.now(),
      split: {
        x402Amount: this.pricing.x402Amount,
        facilitatorFee: this.pricing.facilitatorFee,
        facilitatorWallet: this.facilitatorWallet
      }
    };
    
    // Store verified nonce
    this.verifiedNonces.set(nonce, {
      timestamp: Date.now(),
      walletAddress,
      feature,
      quote
    });
    
    console.log(`📋 NLx402 Quote generated for ${feature}: ${totalPrice} SOL (split: ${this.pricing.x402Amount} + ${this.pricing.facilitatorFee}), nonce: ${nonce.substring(0, 16)}...`);
    
    return {
      success: true,
      quote,
      nonce
    };
  }
  
  /**
   * Verify an NLx402 quote before payment
   */
  async verifyX402Quote({ quote, nonce, walletAddress }) {
    // Check if nonce exists
    const verifiedNonce = this.verifiedNonces.get(nonce);
    
    if (!verifiedNonce) {
      return {
        valid: false,
        error: 'Invalid or expired nonce'
      };
    }
    
    // Check wallet address matches
    if (verifiedNonce.walletAddress !== walletAddress) {
      return {
        valid: false,
        error: 'Wallet address mismatch'
      };
    }
    
    // Check quote hasn't expired
    if (quote.expires_at < Date.now()) {
      this.verifiedNonces.delete(nonce);
      return {
        valid: false,
        error: 'Quote expired'
      };
    }
    
    // Verify quote integrity
    if (quote.nonce !== nonce || quote.recipient !== this.x402Wallet) {
      return {
        valid: false,
        error: 'Quote integrity check failed'
      };
    }
    
    console.log(`✅ NLx402 Quote verified for nonce: ${nonce.substring(0, 16)}...`);
    
    return {
      valid: true,
      quote,
      walletAddress
    };
  }
  
  /**
   * Unlock x402 access after payment
   */
  async unlockX402Access({ tx, nonce, walletAddress, feature }) {
    // Verify nonce was previously verified
    const verifiedNonce = this.verifiedNonces.get(nonce);
    
    if (!verifiedNonce) {
      return {
        success: false,
        error: 'Nonce not found or already used'
      };
    }
    
    // Verify wallet matches
    if (verifiedNonce.walletAddress !== walletAddress) {
      return {
        success: false,
        error: 'Wallet address mismatch'
      };
    }
    
    // Check if nonce already used
    if (this.paidNonces.has(nonce)) {
      return {
        success: false,
        error: 'Nonce already used (replay attack prevented)'
      };
    }
    
    // Generate access token
    const accessToken = this.generateAccessToken(walletAddress, feature || verifiedNonce.feature, nonce);
    
    // Calculate expiration
    const expiresAt = Date.now() + (verifiedNonce.quote.duration * 1000);
    
    // Store paid nonce
    this.paidNonces.set(nonce, {
      tx,
      walletAddress,
      expiresAt,
      feature: feature || verifiedNonce.feature,
      accessToken,
      timestamp: Date.now()
    });
    
    // Store active token
    this.activeTokens.set(accessToken, {
      walletAddress,
      expiresAt,
      feature: feature || verifiedNonce.feature,
      nonce,
      tx
    });
    
    // Remove from verified nonces (single-use)
    this.verifiedNonces.delete(nonce);
    
    console.log(`🔓 NLx402 Access unlocked for ${walletAddress} | Feature: ${feature || verifiedNonce.feature} | TX: ${tx}`);
    
    return {
      success: true,
      accessToken,
      expiresIn: verifiedNonce.quote.duration,
      expiresAt,
      feature: feature || verifiedNonce.feature,
      tx
    };
  }
  
  /**
   * Validate an access token
   */
  validateAccessToken(accessToken, requiredFeature = null) {
    const tokenData = this.activeTokens.get(accessToken);
    
    if (!tokenData) {
      return {
        valid: false,
        error: 'Invalid access token'
      };
    }
    
    // Check expiration
    if (tokenData.expiresAt < Date.now()) {
      this.activeTokens.delete(accessToken);
      return {
        valid: false,
        error: 'Access token expired'
      };
    }
    
    // Check feature match if specified
    if (requiredFeature && tokenData.feature !== requiredFeature) {
      return {
        valid: false,
        error: 'Access token not valid for this feature'
      };
    }
    
    return {
      valid: true,
      walletAddress: tokenData.walletAddress,
      feature: tokenData.feature,
      expiresAt: tokenData.expiresAt,
      timeRemaining: Math.floor((tokenData.expiresAt - Date.now()) / 1000)
    };
  }
  
  /**
   * Generate a secure access token
   */
  generateAccessToken(walletAddress, feature, nonce) {
    const payload = {
      wallet: walletAddress,
      feature,
      nonce,
      timestamp: Date.now()
    };
    
    return Buffer.from(JSON.stringify(payload)).toString('base64')
      + '.' + crypto.createHash('sha256').update(nonce + walletAddress + feature).digest('hex').substring(0, 16);
  }
  
  /**
   * Cleanup expired nonces and tokens
   */
  cleanupExpiredNonces() {
    const now = Date.now();
    let cleaned = 0;
    
    // Clean expired verified nonces (older than 5 minutes)
    for (const [nonce, data] of this.verifiedNonces.entries()) {
      if (now - data.timestamp > 5 * 60 * 1000) {
        this.verifiedNonces.delete(nonce);
        cleaned++;
      }
    }
    
    // Clean expired paid nonces (older than expiration + 1 hour buffer)
    for (const [nonce, data] of this.paidNonces.entries()) {
      if (data.expiresAt + (60 * 60 * 1000) < now) {
        this.paidNonces.delete(nonce);
        cleaned++;
      }
    }
    
    // Clean expired active tokens
    for (const [token, data] of this.activeTokens.entries()) {
      if (data.expiresAt < now) {
        this.activeTokens.delete(token);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired NLx402 entries`);
    }
  }
  
  /**
   * Get statistics
   */
  getStats() {
    return {
      verifiedNonces: this.verifiedNonces.size,
      paidNonces: this.paidNonces.size,
      activeTokens: this.activeTokens.size,
      pricing: this.pricing
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

module.exports = WhistleNLx402GeneralAccess;

