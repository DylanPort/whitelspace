// 📚 Get Privacy Tools from Database
// Fetches all community-created privacy tools

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

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
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Parse query parameters
    const params = event.queryStringParameters || {};
    const status = params.status || 'approved'; // Default: show only approved
    const category = params.category;
    const limit = parseInt(params.limit) || 50;
    const sortBy = params.sortBy || 'created_at'; // created_at, upvotes, views

    // Build query
    let query = supabase
      .from('privacy_tools')
      .select('*');

    // Filter by status
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Filter by category
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    // Sort
    if (sortBy === 'upvotes') {
      query = query.order('upvotes', { ascending: false });
    } else if (sortBy === 'views') {
      query = query.order('views', { ascending: false });
    } else if (sortBy === 'trending') {
      // Calculate trending score (upvotes + views/10) - simplified
      query = query.order('upvotes', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    query = query.limit(limit);

    const { data: tools, error } = await query;

    if (error) {
      throw error;
    }

    // Get categories count
    const { data: categoryCounts } = await supabase
      .from('privacy_tools')
      .select('category')
      .eq('status', 'approved');

    const categories = {};
    if (categoryCounts) {
      categoryCounts.forEach(item => {
        categories[item.category] = (categories[item.category] || 0) + 1;
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tools: tools || [],
        total: tools?.length || 0,
        categories: categories
      })
    };

  } catch (error) {
    console.error('Error fetching tools:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch privacy tools',
        details: error.message
      })
    };
  }
};


