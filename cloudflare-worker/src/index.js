/**
 * WhistleNet RPC Proxy Worker
 * 
 * Handles:
 * - API key validation
 * - Rate limiting
 * - Subscription expiry checks
 * - Request routing to distributed provider network
 * - Usage tracking
 */

// Rate limit windows (in seconds)
const RATE_LIMIT_WINDOW = 60; // 1 minute

// Package configurations
const PACKAGES = {
  DAY: { rateLimit: 50, duration: 86400 },
  WEEK: { rateLimit: 100, duration: 604800 },
  MONTH: { rateLimit: 200, duration: 2592000 }
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization, solana-client',
      'Access-Control-Max-Age': '86400',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        service: 'WhistleNet RPC Proxy',
        timestamp: Date.now()
      }), {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      });
    }

    // Status endpoint - check subscription
    if (url.pathname === '/status' && request.method === 'GET') {
      const apiKey = request.headers.get('X-API-Key') || url.searchParams.get('apiKey');
      
      if (!apiKey) {
        return jsonResponse({ error: 'missing_api_key' }, 401, corsHeaders);
      }

      const subscription = await getSubscription(env.DB, apiKey);
      
      if (!subscription) {
        return jsonResponse({ error: 'invalid_api_key' }, 401, corsHeaders);
      }

      const now = Math.floor(Date.now() / 1000);
      const isExpired = subscription.expires_at < now;
      const timeRemaining = Math.max(0, subscription.expires_at - now);
      
      // Get current usage
      const usage = await getRateLimitUsage(env.RATE_LIMIT, apiKey);

      return jsonResponse({
        status: isExpired ? 'expired' : 'active',
        package: subscription.package,
        expiresAt: subscription.expires_at,
        expiresIn: timeRemaining,
        rateLimit: subscription.rate_limit,
        currentUsage: usage.count,
        usageWindow: '1 minute',
        remainingRequests: Math.max(0, subscription.rate_limit - usage.count)
      }, 200, corsHeaders);
    }

    // Main RPC endpoint - route to provider network
    if (url.pathname === '/rpc' || url.pathname === '/') {
      return handleRpcRequest(request, env, corsHeaders);
    }

    // 404 for unknown routes
    return jsonResponse({ error: 'not_found' }, 404, corsHeaders);
  }
};

/**
 * Handle RPC request with validation and rate limiting
 */
async function handleRpcRequest(request, env, corsHeaders) {
  try {
    // Only accept POST for RPC
    if (request.method !== 'POST') {
      return jsonResponse({ 
        error: 'method_not_allowed',
        message: 'Only POST requests are accepted for RPC calls'
      }, 405, corsHeaders);
    }

    // Check if request is from our own dashboard - exempt from rate limiting
    const origin = request.headers.get('Origin') || '';
    const referer = request.headers.get('Referer') || '';
    const isOwnDashboard = origin.includes('whistle.ninja') || referer.includes('whistle.ninja');

    // Public RPC - no API key required
    // Use IP address for rate limiting
    const apiKey = request.headers.get('CF-Connecting-IP') || 'anonymous';
    const globalRateLimit = 100; // 100 requests per minute for everyone

    // Skip rate limiting for our own dashboard
    let rateLimit;
    if (!isOwnDashboard) {
    // Check rate limit
      rateLimit = await checkRateLimit(env.RATE_LIMIT, apiKey, globalRateLimit);
    
    if (!rateLimit.allowed) {
      return jsonResponse({
        error: 'rate_limit_exceeded',
        message: `Rate limit exceeded. Public limit is ${globalRateLimit} requests per minute.`,
        rateLimit: globalRateLimit,
        current: rateLimit.current,
        resetIn: rateLimit.resetIn
      }, 429, {
        ...corsHeaders,
        'X-RateLimit-Limit': String(globalRateLimit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(rateLimit.resetAt),
        'Retry-After': String(rateLimit.resetIn)
      });
    }
    } else {
      // For our own dashboard, create a mock rate limit response
      const now = Math.floor(Date.now() / 1000);
      const windowStart = now - (now % RATE_LIMIT_WINDOW);
      rateLimit = {
        allowed: true,
        current: 0,
        resetAt: windowStart + RATE_LIMIT_WINDOW,
        resetIn: RATE_LIMIT_WINDOW
      };
    }

    // Route to upstream RPC provider
    const rpcResponse = await fetch(env.UPSTREAM_RPC_URL || env.PRIMARY_RPC_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: await request.text()
    });

    // Track usage (optional - disabled for now)
    // env.ANALYTICS?.writeDataPoint({
    //   blobs: [apiKey, 'public'],
    //   doubles: [1], // request count
    //   indexes: [apiKey]
    // }).catch(() => {}); // Ignore errors

    // Return response with rate limit headers
    const responseBody = await rpcResponse.text();
    
    return new Response(responseBody, {
      status: rpcResponse.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(globalRateLimit),
        'X-RateLimit-Remaining': String(Math.max(0, globalRateLimit - rateLimit.current - 1)),
        'X-RateLimit-Reset': String(rateLimit.resetAt),
        'X-Powered-By': 'WhistleNet - Public RPC'
      }
    });

  } catch (error) {
    console.error('RPC proxy error:', error);
    return jsonResponse({
      error: 'proxy_error',
      message: 'Internal server error',
      detail: error.message
    }, 500, corsHeaders);
  }
}

/**
 * Get subscription from database
 */
async function getSubscription(db, apiKey) {
  try {
    const result = await db.prepare(
      'SELECT * FROM subscriptions WHERE api_key = ? AND is_active = 1 LIMIT 1'
    ).bind(apiKey).first();
    
    return result;
  } catch (error) {
    console.error('Database error:', error);
    return null;
  }
}

/**
 * Check and increment rate limit
 */
async function checkRateLimit(kv, apiKey, limit) {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % RATE_LIMIT_WINDOW);
  const windowKey = `ratelimit:${apiKey}:${windowStart}`;
  
  try {
    // Get current count
    const currentStr = await kv.get(windowKey);
    const current = currentStr ? parseInt(currentStr) : 0;
    
    // Check if exceeded
    if (current >= limit) {
      return {
        allowed: false,
        current,
        resetAt: windowStart + RATE_LIMIT_WINDOW,
        resetIn: (windowStart + RATE_LIMIT_WINDOW) - now
      };
    }
    
    // Increment counter
    await kv.put(windowKey, String(current + 1), {
      expirationTtl: RATE_LIMIT_WINDOW + 10 // Extra 10s buffer
    });
    
    return {
      allowed: true,
      current: current + 1,
      resetAt: windowStart + RATE_LIMIT_WINDOW,
      resetIn: (windowStart + RATE_LIMIT_WINDOW) - now
    };
  } catch (error) {
    console.error('Rate limit error:', error);
    // On error, allow the request (fail open)
    return {
      allowed: true,
      current: 0,
      resetAt: windowStart + RATE_LIMIT_WINDOW,
      resetIn: RATE_LIMIT_WINDOW
    };
  }
}

/**
 * Get current rate limit usage (non-incrementing)
 */
async function getRateLimitUsage(kv, apiKey) {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % RATE_LIMIT_WINDOW);
  const windowKey = `ratelimit:${apiKey}:${windowStart}`;
  
  try {
    const currentStr = await kv.get(windowKey);
    const current = currentStr ? parseInt(currentStr) : 0;
    
    return {
      count: current,
      resetAt: windowStart + RATE_LIMIT_WINDOW,
      resetIn: (windowStart + RATE_LIMIT_WINDOW) - now
    };
  } catch (error) {
    return { count: 0, resetAt: windowStart + RATE_LIMIT_WINDOW, resetIn: RATE_LIMIT_WINDOW };
  }
}

/**
 * Helper to create JSON responses
 */
function jsonResponse(data, status = 200, additionalHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...additionalHeaders
    }
  });
}

