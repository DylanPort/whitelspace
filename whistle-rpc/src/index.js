/**
 * WHISTLE RPC Proxy - Production Ready
 * 
 * Features:
 * - API key verification (wallet-based)
 * - Time-based subscription validation
 * - Rate limiting (per-minute)
 * - Request forwarding to Whistle RPC
 * - WebSocket support for transaction confirmations
 * - WHISTLE branding
 */

// Upstream RPC endpoints
const UPSTREAM_HTTP = 'https://api.mainnet-beta.solana.com';
const UPSTREAM_WS = 'wss://api.mainnet-beta.solana.com';

// Alternative: Use Helius if you have an API key
// const UPSTREAM_HTTP = 'https://mainnet.helius-rpc.com/?api-key=YOUR_KEY';
// const UPSTREAM_WS = 'wss://mainnet.helius-rpc.com/?api-key=YOUR_KEY';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle WebSocket upgrade requests
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') {
      return handleWebSocket(request, env);
    }
    
    // Only allow POST requests for RPC calls
    if (request.method === 'POST') {
      return await handleRPC(request, env);
    }
    
    // Handle OPTIONS for CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, solana-client, Upgrade, Connection'
        }
      });
    }
    
    // Return info page for GET requests
    return new Response(JSON.stringify({
      service: 'WHISTLE Network RPC',
      version: '2.1.0',
      status: 'online',
      features: {
        http: 'POST / (JSON-RPC)',
        websocket: 'wss://rpc.whistle.ninja/ (subscriptions & confirmations)',
      },
      documentation: 'https://whistlenet.io/docs/rpc',
      endpoints: {
        rpc: 'POST / (requires X-API-Key header for premium)',
        websocket: 'WSS / (for transaction confirmations)',
        subscribe: 'https://whistlenet.io/dashboard (get API key)'
      }
    }, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Server': 'WHISTLE-RPC/2.1.0'
      }
    });
  }
};

/**
 * Handle WebSocket connections - proxy to upstream Solana RPC
 */
async function handleWebSocket(request, env) {
  // Create a WebSocket pair - one for the client, one for us
  const webSocketPair = new WebSocketPair();
  const [client, server] = Object.values(webSocketPair);

  // Accept the WebSocket connection from our side
  server.accept();

  // Connect to upstream Solana WebSocket
  let upstream = null;
  let isConnected = false;
  let messageQueue = [];

  // Function to connect to upstream
  const connectUpstream = async () => {
    try {
      const upstreamResponse = await fetch(UPSTREAM_WS, {
        headers: {
          'Upgrade': 'websocket',
        },
      });

      upstream = upstreamResponse.webSocket;
      
      if (!upstream) {
        console.error('Failed to establish upstream WebSocket');
        server.send(JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'WHISTLE: Failed to connect to upstream RPC' },
          id: null
        }));
        server.close(1011, 'Upstream connection failed');
        return;
      }

      upstream.accept();
      isConnected = true;

      // Send any queued messages
      while (messageQueue.length > 0) {
        const msg = messageQueue.shift();
        upstream.send(msg);
      }

      // Forward messages from upstream to client
      upstream.addEventListener('message', (event) => {
        try {
          // Optionally transform/brand the response
          let data = event.data;
          
          // Try to parse and add branding for JSON responses
          try {
            const parsed = JSON.parse(data);
            if (typeof parsed === 'object' && parsed !== null) {
              parsed._whistle = {
                node: 'whistle-ws-1',
                timestamp: Date.now()
              };
              data = JSON.stringify(parsed);
            }
          } catch (e) {
            // Not JSON, forward as-is
          }
          
          if (server.readyState === WebSocket.OPEN) {
            server.send(data);
          }
        } catch (e) {
          console.error('Error forwarding upstream message:', e);
        }
      });

      // Handle upstream close
      upstream.addEventListener('close', (event) => {
        isConnected = false;
        if (server.readyState === WebSocket.OPEN) {
          server.close(event.code, event.reason || 'Upstream closed');
        }
      });

      // Handle upstream errors
      upstream.addEventListener('error', (event) => {
        console.error('Upstream WebSocket error:', event);
        isConnected = false;
      });

    } catch (error) {
      console.error('Error connecting to upstream:', error);
      server.send(JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'WHISTLE: Connection error' },
        id: null
      }));
      server.close(1011, 'Connection error');
    }
  };

  // Start upstream connection
  connectUpstream();

  // Handle messages from client
  server.addEventListener('message', (event) => {
    try {
      const data = event.data;
      
      // Log subscription requests for debugging
      try {
        const parsed = JSON.parse(data);
        if (parsed.method) {
          console.log(`WHISTLE WS: ${parsed.method}`);
        }
      } catch (e) {
        // Not JSON
      }

      // Forward to upstream
      if (isConnected && upstream && upstream.readyState === WebSocket.OPEN) {
        upstream.send(data);
      } else {
        // Queue if not yet connected
        messageQueue.push(data);
      }
    } catch (e) {
      console.error('Error handling client message:', e);
    }
  });

  // Handle client disconnect
  server.addEventListener('close', (event) => {
    if (upstream && upstream.readyState === WebSocket.OPEN) {
      upstream.close(event.code, event.reason);
    }
  });

  // Handle client errors
  server.addEventListener('error', (event) => {
    console.error('Client WebSocket error:', event);
    if (upstream && upstream.readyState === WebSocket.OPEN) {
      upstream.close(1011, 'Client error');
    }
  });

  // Return the client end of the WebSocket pair
  return new Response(null, {
    status: 101,
    webSocket: client,
    headers: {
      'Upgrade': 'websocket',
      'Connection': 'Upgrade',
    }
  });
}

/**
 * Handle HTTP RPC requests
 */
async function handleRPC(request, env) {
  try {
    // Extract API key from header (optional for basic access)
    const apiKey = request.headers.get('X-API-Key');
    
    // If API key provided, verify subscription
    if (apiKey) {
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

      // Check rate limit for premium users
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
    }

    // Forward to upstream RPC
    const body = await request.text();
    
    const upstreamResponse = await fetch(UPSTREAM_HTTP, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WHISTLE-Node/2.1.0'
      },
      body: body
    });
    
    // Parse response
    let data = await upstreamResponse.json();
    
    // Remove external metadata
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
    data._whistle = {
      node_id: `whistle-node-${Math.floor(Math.random() * 10) + 1}`,
      region: 'global',
      version: '2.1.0',
      timestamp: Date.now()
    };
    
    // Return with WHISTLE branding
    return jsonResponse(data, upstreamResponse.status, {
      'X-RPC-Provider': 'WHISTLE Network',
      'X-Node-ID': data._whistle.node_id
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
    if (!env.SUBSCRIPTIONS) {
      // KV not configured, allow request with default limits
      return { valid: true, rateLimit: 300, packageName: 'free' };
    }

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
    // On error, allow with default limits
    return { valid: true, rateLimit: 300, packageName: 'free' };
  }
}

/**
 * Check rate limit (requests per minute)
 */
async function checkRateLimit(apiKey, limit, env) {
  try {
    if (!env.RATE_LIMITS) {
      // KV not configured, allow request
      return { allowed: true, remaining: limit };
    }

    const now = Math.floor(Date.now() / 1000);
    const currentMinute = Math.floor(now / 60);
    const key = `ratelimit:${apiKey}:${currentMinute}`;
    
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
      expirationTtl: 60
    });
    
    return {
      allowed: true,
      remaining: limit - count - 1
    };
    
  } catch (error) {
    console.error('Rate limit check error:', error);
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
      'Server': 'WHISTLE-RPC/2.1.0',
      'Access-Control-Allow-Origin': '*',
      ...extraHeaders
    }
  });
}
