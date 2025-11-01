// Submit Competition Entry
const fetch = require('node-fetch');
const { getStore } = require('@netlify/blobs');
const crypto = require('crypto');

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
    const { creator, project_link, description, file_count, tech_stack } = JSON.parse(event.body);

    // Validation
    if (!project_link || !description || description.length < 100) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid submission data' })
      };
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    const submissionData = {
      creator: creator || 'Anonymous',
      project_link,
      description,
      file_count: file_count || 0,
      tech_stack: tech_stack || 'Unknown',
      upvotes: 0,
      views: 0,
      featured: false,
      created_at: new Date().toISOString()
    };

    console.log('📝 Submitting to competition:', submissionData);

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/competition_submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(submissionData)
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Supabase error:', errorText);
        throw new Error(`Failed to submit: ${res.status} ${errorText}`);
      }

      const data = await res.json();
      console.log('✅ Submission created (Supabase):', data);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          submission: data[0] || data
        })
      };
    } catch (supabaseError) {
      console.warn('⚠️ Supabase unreachable - falling back to Netlify Blobs:', supabaseError.message);
      const store = getStore('competition_submissions');
      const id = crypto.randomUUID ? crypto.randomUUID() : `blob_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      const blobRecord = { id, ...submissionData };
      await store.set(id, JSON.stringify(blobRecord), { contentType: 'application/json' });
      console.log('✅ Submission stored in Blobs:', id);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, submission: blobRecord, source: 'blobs' })
      };
    }

  } catch (error) {
    console.error('❌ Competition submission error:', error);
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

