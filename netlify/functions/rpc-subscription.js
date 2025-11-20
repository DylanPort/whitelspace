/**
 * Get RPC subscription status for a wallet
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
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const wallet = event.queryStringParameters?.wallet;
    
    if (!wallet) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'missing_wallet' })
      };
    }

    console.log('📊 Checking subscription status for:', wallet);

    // If Cloudflare not configured, return mock data
    if (!CF_ACCOUNT_ID || !CF_DATABASE_ID || !CF_API_TOKEN) {
      console.warn('⚠️ Cloudflare D1 not configured');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ subscription: null })
      };
    }

    // Query Cloudflare D1
    const result = await queryCloudflareD1(wallet);

    if (!result.success) {
      throw new Error(result.error || 'Database query failed');
    }

    const subscription = result.data?.[0]?.results?.[0] || null;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ subscription })
    };

  } catch (e) {
    console.error('❌ Status check error:', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'status_check_failed',
        detail: String(e)
      })
    };
  }
};

/**
 * Query Cloudflare D1 via REST API
 */
async function queryCloudflareD1(wallet) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT * FROM subscriptions 
      WHERE api_key = ? AND is_active = 1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    const payload = JSON.stringify({
      sql: sql,
      params: [wallet]
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

