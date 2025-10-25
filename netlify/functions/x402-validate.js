// Stateless validation (in production, use JWT tokens with embedded expiry)
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

    // Simple stateless validation - check if token format is valid
    // In production, use JWT tokens with embedded expiry and signature
    if (!accessToken.startsWith('atk_') || accessToken.length < 20) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: false, error: 'invalid_token' })
      };
    }

    // Accept all valid format tokens (stateless - can't track expiry without shared storage)
    // In production, use JWT with embedded expiry that can be verified without state
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        ok: true,
        note: 'Stateless validation - use JWT in production for expiry tracking'
      })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: 'internal_error' })
    };
  }
};

