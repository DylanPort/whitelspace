// Netlify Function: Chat with Whistle AI
// Handles conversational AI without exposing API keys

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
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
    const { messages, hasPreview } = JSON.parse(event.body);

    if (!messages || !Array.isArray(messages)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Messages array required' })
      };
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    
    if (!OPENROUTER_API_KEY) {
      console.error('❌ OPENROUTER_API_KEY not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'AI service not configured' })
      };
    }

    // Build system prompt based on context
    const systemPrompt = hasPreview ? 
      `You are Whistle AI. The user has generated a privacy tool and wants to edit it.

USER'S EDITING REQUEST:
Help them modify the code. Respond with:
1. Acknowledge what they want to change
2. Ask ONE clarifying question if needed
3. If ready, say: "Click ⚙️ Generate to apply changes!"

Keep responses SHORT (2-3 sentences).` :
      `You are Whistle AI, a specialized privacy-focused web design consultant for the Ghost Whistle platform.

Your mission: Help users create privacy tools and secure applications that can be integrated into the Ghost Whistle ecosystem.

PRIVACY FOCUS:
Only help with privacy-related tools:
✅ Encryption tools, password managers, VPNs, secure messaging
✅ Anonymous browsing, data protection, privacy checkups
✅ Secure file sharing, encrypted storage, steganography
✅ Identity protection, location spoofing, breach monitoring
❌ Social media, e-commerce, blogs, or non-privacy tools

CONVERSATION STYLE:
- Keep responses SHORT (2-3 sentences max)
- Ask ONE specific question at a time
- Be security-conscious and privacy-focused
- Use terms like "encrypted", "anonymous", "secure", "private"
- Suggest privacy features when relevant

GUIDE USERS TO:
- Clarify the privacy problem they're solving
- Define target users (activists, journalists, everyday users?)
- Specify security level needed (basic, advanced, military-grade)
- Choose visual style (dark/mysterious, clean/modern, tech-focused)

When ready, suggest: "Ready to build? Click ⚙️ Generate to create your privacy tool!"

If a user requests non-privacy tools, politely redirect: "I specialize in privacy tools for Ghost Whistle. How about making that idea privacy-focused instead?"`;

    console.log('🤖 Calling OpenRouter for chat...');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ghostwhistle.xyz',
        'X-Title': 'Ghost Whistle Privacy Tools Lab'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.8,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenRouter error:', response.status, errorText);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: 'AI service error',
          details: errorText 
        })
      };
    }

    const data = await response.json();
    const aiMessage = data?.choices?.[0]?.message?.content || 'Could you tell me more about your vision?';

    console.log('✅ AI response generated');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: aiMessage
      })
    };

  } catch (error) {
    console.error('❌ Chat error:', error);
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

