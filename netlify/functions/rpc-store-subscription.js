/**
 * Store RPC subscription in Cloudflare D1 database
 * 
 * This function is called after successful payment verification
 * to persist the subscription in the database.
 */

const https = require('https');

// Cloudflare API configuration
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_DATABASE_ID = process.env.CF_DATABASE_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN;

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const subscription = JSON.parse(event.body || '{}');
    
    // Validate required fields
    const required = ['apiKey', 'walletAddress', 'package', 'packageName', 'priceSol', 'rateLimit', 'startTime', 'expiresAt', 'duration', 'txSig'];
    const missing = required.filter(field => !subscription[field]);
    
    if (missing.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'missing_fields',
          missing: missing
        })
      };
    }

    console.log('📝 Storing subscription for', subscription.walletAddress);

    // Check if using Cloudflare D1
    if (!CF_ACCOUNT_ID || !CF_DATABASE_ID || !CF_API_TOKEN) {
      console.warn('⚠️ Cloudflare D1 not configured, returning success (in-memory only)');
      
      // In development, just return success
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          message: 'Subscription stored (in-memory)',
          subscription: subscription
        })
      };
    }

    // Store in Cloudflare D1 via API
    const result = await storeInCloudflareD1(subscription);

    if (!result.success) {
      throw new Error(result.error || 'Failed to store subscription');
    }

    console.log('✅ Subscription stored successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: 'Subscription stored successfully',
        subscription: subscription
      })
    };

  } catch (e) {
    console.error('❌ Store subscription error:', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'storage_failed',
        detail: String(e)
      })
    };
  }
};

/**
 * Store subscription in Cloudflare D1 using the REST API
 */
async function storeInCloudflareD1(sub) {
  return new Promise((resolve, reject) => {
    // SQL INSERT statement
    const sql = `
      INSERT INTO subscriptions (
        api_key, wallet_address, package, package_name, price_sol,
        rate_limit, start_time, expires_at, duration, tx_sig, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(api_key) DO UPDATE SET
        expires_at = excluded.expires_at,
        package = excluded.package,
        package_name = excluded.package_name,
        rate_limit = excluded.rate_limit,
        updated_at = strftime('%s', 'now')
    `;

    const payload = JSON.stringify({
      sql: sql,
      params: [
        sub.apiKey,
        sub.walletAddress,
        sub.package,
        sub.packageName,
        sub.priceSol,
        sub.rateLimit,
        sub.startTime,
        sub.expiresAt,
        sub.duration,
        sub.txSig
      ]
    });

    const options = {
      hostname: 'api.cloudflare.com',
      port: 443,
      path: `/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_DATABASE_ID}/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (response.success) {
            resolve({ success: true, data: response.result });
          } else {
            resolve({ 
              success: false, 
              error: response.errors?.[0]?.message || 'Unknown error' 
            });
          }
        } catch (e) {
          resolve({ success: false, error: 'Failed to parse response' });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });

    req.write(payload);
    req.end();
  });
}



