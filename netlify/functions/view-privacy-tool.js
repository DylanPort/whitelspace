// 👁️ Track Privacy Tool Views
// Increments view count when user views a tool

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

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
    const { toolId } = JSON.parse(event.body);

    if (!toolId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'toolId required' })
      };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Increment view count
    const { data: tool, error } = await supabase
      .from('privacy_tools')
      .update({ 
        views: supabase.raw('views + 1')
      })
      .eq('id', toolId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        views: tool.views
      })
    };

  } catch (error) {
    console.error('Error tracking view:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to track view',
        details: error.message
      })
    };
  }
};


