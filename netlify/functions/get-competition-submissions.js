// Get Competition Submissions
const fetch = require('node-fetch');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    // Get sort parameter from query string
    const sortBy = event.queryStringParameters?.sortBy || 'recent';
    
    let orderColumn = 'created_at';
    let filter = '';
    
    if (sortBy === 'top') {
      orderColumn = 'upvotes';
    } else if (sortBy === 'featured') {
      filter = '&featured=eq.true';
    }

    console.log(`📊 Fetching submissions (sort: ${sortBy})`);

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/competition_submissions?order=${orderColumn}.desc${filter}`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Supabase error:', errorText);
      throw new Error(`Failed to fetch: ${res.status} ${errorText}`);
    }

    const data = await res.json();
    console.log(`✅ Fetched ${data.length} submissions (Supabase)`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        submissions: data
      })
    };

  } catch (error) {
    console.error('❌ Fetch submissions error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

