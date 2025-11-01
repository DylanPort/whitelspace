// Netlify Function: Chat with Whistle AI
// Handles conversational AI without exposing API keys

const fetch = require('node-fetch');

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
    const { messages, hasPreview, workspaceContext, isEditRequest } = JSON.parse(event.body);

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

    // Build workspace context string
    let workspaceInfo = '';
    if (workspaceContext && workspaceContext.files) {
      workspaceInfo = '\n\n📁 CURRENT WORKSPACE:\n';
      workspaceContext.files.forEach(f => {
        workspaceInfo += `\n[${f.path}] (${f.type}, ${f.size} bytes)`;
        if (workspaceContext.activeFile?.path === f.path) {
          workspaceInfo += ' ← CURRENTLY OPEN';
        }
      });

      // If this is an edit request, include full file contents
      if (isEditRequest && workspaceContext.files.length > 0) {
        workspaceInfo += '\n\n📄 FILE CONTENTS:\n';
        workspaceContext.files.forEach(f => {
          workspaceInfo += `\n--- ${f.path} ---\n${f.content}\n`;
        });
      }
    }

    // Build system prompt based on context
    const systemPrompt = hasPreview && isEditRequest ? 
      `You are Whistle AI, a Cursor-like AI coding assistant specializing in privacy tools.

${workspaceInfo}

USER WANTS TO EDIT CODE:
The user has requested changes to their workspace files.

YOUR MISSION:
1. READ the current file contents carefully
2. UNDERSTAND what they want to change
3. Generate the EDITED file content
4. Respond with BOTH:
   a) A brief explanation of changes (2-3 sentences)
   b) JSON with edited files

RESPONSE FORMAT:
First, explain the changes in natural language (2-3 sentences).

Then, if you're making edits, output a JSON block:
\`\`\`json
{
  "fileEdits": [
    {
      "path": "exact/file/path.js",
      "content": "FULL EDITED FILE CONTENT HERE"
    }
  ]
}
\`\`\`

EDITING RULES:
- Output the ENTIRE file with changes applied
- Maintain code style and structure
- Add comments explaining complex changes
- Fix any obvious bugs or issues
- Be precise with line-level edits
- Preserve imports, exports, and structure

EXAMPLE USER REQUEST: "Change the button color to cyan in index.html"
EXAMPLE RESPONSE:
"I'll update the button styles to use cyan instead of the current color. The change is in the main button class.

\`\`\`json
{
  "fileEdits": [
    {
      "path": "interface/index.html",
      "content": "<full html with cyan button classes>"
    }
  ]
}
\`\`\`"

Think like Cursor AI: understand context, make surgical edits, explain clearly.` :
      hasPreview ? 
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

    // Increase max_tokens for edit requests (need to return full files)
    const maxTokens = isEditRequest ? 4000 : 150;

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
        max_tokens: maxTokens
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
    let aiMessage = data?.choices?.[0]?.message?.content || 'Could you tell me more about your vision?';

    console.log('✅ AI response generated');

    // Extract JSON file edits if present (for edit requests)
    let fileEdits = null;
    if (isEditRequest && aiMessage.includes('```json')) {
      const jsonMatch = aiMessage.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try {
          const editData = JSON.parse(jsonMatch[1]);
          if (editData.fileEdits && Array.isArray(editData.fileEdits)) {
            fileEdits = editData.fileEdits;
            // Remove JSON block from message, keep only explanation
            aiMessage = aiMessage.replace(/```json\n[\s\S]*?\n```/, '').trim();
            console.log(`✅ Parsed ${fileEdits.length} file edit(s)`);
          }
        } catch (e) {
          console.error('⚠️ Failed to parse file edits JSON:', e);
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: aiMessage,
        fileEdits: fileEdits
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

