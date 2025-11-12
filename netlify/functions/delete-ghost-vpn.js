const fetch = require('node-fetch');

const LINODE_API_TOKEN = process.env.LINODE_API_TOKEN;
const LINODE_API_URL = 'https://api.linode.com/v4';

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { serverId } = JSON.parse(event.body);

    if (!LINODE_API_TOKEN) {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'VPN management not configured.' 
        })
      };
    }

    // Delete the Linode
    const response = await fetch(`${LINODE_API_URL}/linode/instances/${serverId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${LINODE_API_TOKEN}`
      }
    });

    if (!response.ok && response.status !== 404) {
      const errorData = await response.json();
      throw new Error(`Failed to delete VPN server: ${errorData.errors?.[0]?.reason || 'Unknown error'}`);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'VPN server deleted successfully'
      })
    };

  } catch (error) {
    console.error('VPN deletion error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message || 'Failed to delete VPN server' 
      })
    };
  }
};

