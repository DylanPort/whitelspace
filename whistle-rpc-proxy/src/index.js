/**
 * WHISTLE RPC Proxy - Production Ready
 * 
 * Features:
 * - API key verification (wallet-based)
 * - Time-based subscription validation
 * - Rate limiting (per-minute)
 * - Request forwarding to Helius
 * - WHISTLE branding
 */

export default {
  async fetch(request, env) {
    // Only allow POST requests for RPC calls
    if (request.method === 'POST') {
      return await handleRPC(request, env);
    }
    
    // Handle OPTIONS for CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-API-Key'
        }
      });
    }
    
    // Return info page for GET requests
    return new Response(JSON.stringify({
      service: 'WHISTLE Network RPC',
      version: '2.0.0',
      status: 'online',
      documentation: 'https://whistlenet.io/docs/rpc',
      endpoints: {
        rpc: 'POST / (requires X-API-Key header)',
        subscribe: 'https://whistlenet.io/dashboard (get API key)'
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Server': 'WHISTLE-RPC/2.0.0'
      }
    });
  }
};

async function handleRPC(request, env) {
  try {
    // Extract API key from header
    const apiKey = request.headers.get('X-API-Key');
    
    if (!apiKey) {
      return jsonResponse({
        jsonrpc: '2.0',
        error: { 
          code: -32001, 
          message: 'Missing API key. Get yours at https://whistlenet.io/dashboard'
        },
        id: null
      }, 401);
    }

    // Verify subscription
    const verification = await verifySubscription(apiKey, env);
    
    if (!verification.valid) {
      return jsonResponse({
        jsonrpc: '2.0',
        error: { 
          code: -32002, 
          message: verification.reason || 'Invalid or expired subscription'
        },
        id: null
      }, 403);
    }

    // Check rate limit
    const rateLimitCheck = await checkRateLimit(apiKey, verification.rateLimit, env);
    
    if (!rateLimitCheck.allowed) {
      return jsonResponse({
        jsonrpc: '2.0',
        error: { 
          code: -32003, 
          message: `Rate limit exceeded. Your limit: ${verification.rateLimit} requests/minute. Try again in ${rateLimitCheck.retryAfter}s`
        },
        id: null
      }, 429, {
        'Retry-After': rateLimitCheck.retryAfter.toString(),
        'X-RateLimit-Limit': verification.rateLimit.toString(),
        'X-RateLimit-Remaining': '0'
      });
    }

    // Forward to Helius
    const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`;
    
    const body = await request.text();
    
    const heliusResponse = await fetch(HELIUS_RPC, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WHISTLE-Node/2.0.0'
      },
      body: body
    });
    
    // Parse response
    let data = await heliusResponse.json();
    
    // Remove Helius metadata
    if (data._metadata) delete data._metadata;
    
    // Rewrite error messages to WHISTLE branding
    if (data.error && data.error.message) {
      data.error.message = data.error.message
        .replace(/helius/gi, 'WHISTLE')
        .replace(/helius\.dev/gi, 'whistlenet.io')
        .replace(/rate limit/gi, 'node capacity')
        .replace(/upgrade/gi, 'contact support');
    }
    
    // Add WHISTLE branding
    data.whistle = {
      node_id: `whistle-node-${Math.floor(Math.random() * 10) + 1}`,
      region: 'global',
      version: '2.0.0',
      timestamp: Date.now(),
      subscription: verification.packageName
    };
    
    // Add random delay to mask timing patterns (50-150ms)
    const delay = Math.floor(Math.random() * 100) + 50;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Return with WHISTLE branding
    return jsonResponse(data, heliusResponse.status, {
      'X-RPC-Provider': 'WHISTLE Network',
      'X-Node-ID': data.whistle.node_id,
      'X-Response-Time': `${delay}ms`,
      'X-RateLimit-Limit': verification.rateLimit.toString(),
      'X-RateLimit-Remaining': rateLimitCheck.remaining.toString()
    });
    
  } catch (error) {
    console.error('RPC Error:', error);
    return jsonResponse({
      jsonrpc: '2.0',
      error: { 
        code: -32603, 
        message: 'WHISTLE node temporarily unavailable. Please try again.'
      },
      id: null
    }, 500);
  }
}

/**
 * Verify subscription is valid and active
 */
async function verifySubscription(apiKey, env) {
  try {
    // Query subscription from D1 database
    // For now, we'll use KV as a simple store
    const subData = await env.SUBSCRIPTIONS.get(apiKey);
    
    if (!subData) {
      return { 
        valid: false, 
        reason: 'No active subscription. Visit https://whistlenet.io/dashboard to subscribe'
      };
    }
    
    const subscription = JSON.parse(subData);
    
    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (now > subscription.expiresAt) {
      return { 
        valid: false, 
        reason: `Subscription expired on ${new Date(subscription.expiresAt * 1000).toISOString()}. Please renew at https://whistlenet.io/dashboard`
      };
    }
    
    return {
      valid: true,
      packageName: subscription.packageName,
      rateLimit: subscription.rateLimit,
      expiresAt: subscription.expiresAt
    };
    
  } catch (error) {
    console.error('Subscription verification error:', error);
    return { 
      valid: false, 
      reason: 'Unable to verify subscription. Please try again.'
    };
  }
}

/**
 * Check rate limit (requests per minute)
 */
async function checkRateLimit(apiKey, limit, env) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const currentMinute = Math.floor(now / 60);
    const key = `ratelimit:${apiKey}:${currentMinute}`;
    
    // Get current count from KV
    const countStr = await env.RATE_LIMITS.get(key);
    const count = countStr ? parseInt(countStr) : 0;
    
    if (count >= limit) {
      const secondsIntoMinute = now % 60;
      const retryAfter = 60 - secondsIntoMinute;
      
      return { 
        allowed: false, 
        retryAfter: retryAfter,
        remaining: 0
      };
    }
    
    // Increment counter
    await env.RATE_LIMITS.put(key, (count + 1).toString(), {
      expirationTtl: 60 // Expire after 60 seconds
    });
    
    return {
      allowed: true,
      remaining: limit - count - 1
    };
    
  } catch (error) {
    console.error('Rate limit check error:', error);
    // On error, allow the request (fail open)
    return { allowed: true, remaining: limit };
  }
}

/**
 * Helper to create JSON response with CORS headers
 */
function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: {
      'Content-Type': 'application/json',
      'Server': 'WHISTLE-RPC/2.0.0',
      'Access-Control-Allow-Origin': '*',
      ...extraHeaders
    }
  });
}

