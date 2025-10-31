// 🗳️ Vote on Privacy Tools
// Allows users to upvote/downvote community tools

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
    const { toolId, voteType, voterWallet } = JSON.parse(event.body);

    if (!toolId || !voteType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'toolId and voteType required' })
      };
    }

    if (!['upvote', 'downvote'].includes(voteType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'voteType must be upvote or downvote' })
      };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Check if user already voted (optional - requires auth)
    if (voterWallet) {
      const { data: existingVote } = await supabase
        .from('tool_votes')
        .select('*')
        .eq('tool_id', toolId)
        .eq('voter_wallet', voterWallet)
        .single();

      if (existingVote) {
        // User already voted - update their vote
        if (existingVote.vote_type === voteType) {
          // Same vote - remove it (toggle off)
          await supabase
            .from('tool_votes')
            .delete()
            .eq('id', existingVote.id);

          // Decrement count
          const column = voteType === 'upvote' ? 'upvotes' : 'downvotes';
          await supabase.rpc('decrement_tool_vote', { 
            tool_id: toolId, 
            column_name: column 
          });

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: 'Vote removed',
              action: 'removed'
            })
          };
        } else {
          // Different vote - update it
          await supabase
            .from('tool_votes')
            .update({ vote_type: voteType })
            .eq('id', existingVote.id);

          // Update counts (decrement old, increment new)
          const oldColumn = existingVote.vote_type === 'upvote' ? 'upvotes' : 'downvotes';
          const newColumn = voteType === 'upvote' ? 'upvotes' : 'downvotes';
          
          await supabase.rpc('decrement_tool_vote', { 
            tool_id: toolId, 
            column_name: oldColumn 
          });
          await supabase.rpc('increment_tool_vote', { 
            tool_id: toolId, 
            column_name: newColumn 
          });

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: 'Vote updated',
              action: 'updated'
            })
          };
        }
      }

      // New vote - record it
      await supabase
        .from('tool_votes')
        .insert({
          tool_id: toolId,
          voter_wallet: voterWallet,
          vote_type: voteType,
          created_at: new Date().toISOString()
        });
    }

    // Increment vote count
    const column = voteType === 'upvote' ? 'upvotes' : 'downvotes';
    const { data: tool, error } = await supabase
      .from('privacy_tools')
      .update({ 
        [column]: supabase.raw(`${column} + 1`)
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
        tool: tool,
        message: 'Vote recorded',
        action: 'added'
      })
    };

  } catch (error) {
    console.error('Error voting:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to record vote',
        details: error.message
      })
    };
  }
};


