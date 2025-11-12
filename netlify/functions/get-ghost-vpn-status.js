const fetch = require('node-fetch');

const LINODE_API_TOKEN = process.env.LINODE_API_TOKEN;
const LINODE_API_URL = 'https://api.linode.com/v4';

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const serverId = event.queryStringParameters?.serverId;
    const searchTag = event.queryStringParameters?.searchTag;

    if (!serverId && !searchTag) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Missing serverId or searchTag parameter' })
      };
    }

    if (!LINODE_API_TOKEN) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'VPN status check not configured' 
        })
      };
    }

    let linode = null;

    // If searchTag provided, search for Linode by label/tag
    if (searchTag) {
      const listResponse = await fetch(`${LINODE_API_URL}/linode/instances`, {
        headers: {
          'Authorization': `Bearer ${LINODE_API_TOKEN}`
        }
      });

      if (!listResponse.ok) {
        throw new Error('Failed to list Linodes');
      }

      const linodes = await listResponse.json();
      
      // Find Linode matching the search tag (check label or tags)
      linode = linodes.data?.find(l => 
        l.label === searchTag || 
        (l.tags && l.tags.includes(searchTag))
      );

      if (!linode) {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: true,
            status: 'creating',
            ip: null,
            ready: false,
            found: false
          })
        };
      }
    } else {
      // Direct lookup by ID
      const statusResponse = await fetch(`${LINODE_API_URL}/linode/instances/${serverId}`, {
        headers: {
          'Authorization': `Bearer ${LINODE_API_TOKEN}`
        }
      });

      if (!statusResponse.ok) {
        const errorData = await statusResponse.json();
        throw new Error(`Linode API error: ${JSON.stringify(errorData)}`);
      }

      linode = await statusResponse.json();
    }

    const serverIp = linode.ipv4 && linode.ipv4.length > 0 ? linode.ipv4[0] : null;
    const isReady = serverIp && linode.status === 'running';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        status: linode.status,
        ip: serverIp,
        ready: isReady,
        serverId: linode.id,
        found: true
      })
    };

  } catch (error) {
    console.error('VPN status check error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message || 'Failed to check VPN status' 
      })
    };
  }
};

