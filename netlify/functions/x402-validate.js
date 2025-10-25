// In-memory storage (in production, use Redis or DB)
const { issuedTokens } = require('./x402-confirm');

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
    const { accessToken } = JSON.parse(event.body || '{}');
    
    if (!accessToken) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: false, error: 'missing_token' })
      };
    }

    const exp = issuedTokens.get(accessToken);
    
    if (!exp) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: false, error: 'invalid_token' })
      };
    }

    if (exp < Math.floor(Date.now() / 1000)) {
      issuedTokens.delete(accessToken);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: false, error: 'expired_token' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, expiresAt: exp })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: 'internal_error' })
    };
  }
};

