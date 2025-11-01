// Upvote Competition Submission
const fetch = require('node-fetch');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { id } = JSON.parse(event.body);

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Submission ID required' })
      };
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    console.log(`⬆️ Upvoting submission: ${id}`);

    // First, get current upvotes
    const getRes = await fetch(
      `${SUPABASE_URL}/rest/v1/competition_submissions?id=eq.${id}&select=upvotes`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    if (!getRes.ok) {
      throw new Error('Failed to fetch submission');
    }

    const submissions = await getRes.json();
    if (submissions.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Submission not found' })
      };
    }

    const currentUpvotes = submissions[0].upvotes || 0;
    const newUpvotes = currentUpvotes + 1;

    // Update upvotes
    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/competition_submissions?id=eq.${id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ upvotes: newUpvotes })
      }
    );

    if (!updateRes.ok) {
      const errorText = await updateRes.text();
      console.error('❌ Supabase update error:', errorText);
      throw new Error(`Failed to update: ${updateRes.status}`);
    }

    const updated = await updateRes.json();
    console.log(`✅ Upvoted! New count: ${newUpvotes}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        submission: updated[0] || updated
      })
    };

  } catch (error) {
    console.error('❌ Upvote error:', error);
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

