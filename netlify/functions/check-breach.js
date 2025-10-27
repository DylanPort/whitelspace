// Netlify Function for Dark Web Breach Checking
// Uses HaveIBeenPwned API v3

const https = require('https');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { email } = JSON.parse(event.body);

    if (!email || !email.includes('@')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid email required' })
      };
    }

    // Query HaveIBeenPwned API
    const breaches = await checkHaveIBeenPwned(email);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        email,
        breachCount: breaches.length,
        breaches
      })
    };

  } catch (error) {
    console.error('Breach check error:', error);

    // If no breaches found
    if (error.message === 'NOT_FOUND') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          breachCount: 0,
          breaches: [],
          safe: true
        })
      };
    }

    // Rate limit error
    if (error.message === 'RATE_LIMITED') {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({
          error: 'Rate limit exceeded. Please try again later.'
        })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to check breaches',
        details: error.message
      })
    };
  }
};

function checkHaveIBeenPwned(email) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'haveibeenpwned.com',
      port: 443,
      path: `/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`,
      method: 'GET',
      headers: {
        'User-Agent': 'GhostWhistle-Scanner',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        // 404 = No breaches found (good news!)
        if (res.statusCode === 404) {
          reject(new Error('NOT_FOUND'));
          return;
        }

        // 429 = Rate limited
        if (res.statusCode === 429) {
          reject(new Error('RATE_LIMITED'));
          return;
        }

        // 200 = Breaches found
        if (res.statusCode === 200) {
          try {
            const breaches = JSON.parse(data);
            resolve(breaches);
          } catch (e) {
            reject(new Error('Failed to parse response'));
          }
          return;
        }

        reject(new Error(`API returned status ${res.statusCode}`));
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

