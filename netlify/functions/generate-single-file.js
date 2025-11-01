// Generate a single file for the privacy tool project
// This enables incremental, Cursor-style generation

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
    const { fileSpec, projectContext } = JSON.parse(event.body);

    if (!fileSpec || !projectContext) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing fileSpec or projectContext' })
      };
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    console.log(`📝 Generating ${fileSpec.path}...`);

    const filePrompt = `You are an elite developer with deep expertise in privacy, cryptography, and systems design. Generate ${fileSpec.path} with the intelligence and creativity of Cursor AI.

🎯 PROJECT CONTEXT:
Name: ${projectContext.projectName}
Mission: ${projectContext.description}
This File: ${fileSpec.description}
Type: ${fileSpec.type}
Stack: ${projectContext.techStack.join(', ')}

⚡ YOUR MISSION:
Write PRODUCTION-GRADE, WORKING code that:
1. Actually functions (not marketing copy)
2. Solves real privacy problems
3. Can be integrated into Ghost Whistle
4. Uses modern, secure patterns
5. Is deeply technical, not superficial

🧠 THINK LIKE CURSOR AI:
- Be creative but practical
- Add clever optimizations
- Include error handling that anticipates edge cases
- Write comments that explain WHY, not what
- Use patterns that scale
- Consider security at every line

📝 CODE REQUIREMENTS:

${fileSpec.path.includes('/tools/') || fileSpec.path.includes('/modules/') ? `
🔧 CORE TOOL/MODULE:
- Implement actual algorithms (AES, RSA, PBKDF2, etc.)
- Handle binary data, streams, chunks
- Export reusable functions
- Include input validation
- Add performance optimizations
` : ''}

${fileSpec.path.includes('/api/') || fileSpec.type === 'backend' ? `
🌐 BACKEND API:
- Express.js with real routes
- Middleware for auth, rate limiting
- Proper error handling (don't expose internals)
- Security headers (helmet, cors)
- Input sanitization
` : ''}

${fileSpec.path.includes('/utils/') || fileSpec.path.includes('/helpers/') ? `
🛠️ UTILITY FUNCTIONS:
- Pure, testable functions
- Handle edge cases
- Efficient algorithms
- Type-safe (JSDoc or TypeScript)
` : ''}

${fileSpec.path.endsWith('.html') ? `
🖥️ INTERFACE (NOT A WEBSITE):
- Minimal, functional UI
- Focus on tool usage, not marketing
- Dark theme (privacy aesthetic)
- Input/output for the tool
- No hero sections, no CTAs, no pricing
- Use Tailwind CDN but keep it tool-focused
` : ''}

🚫 FORBIDDEN:
- Placeholder code like "// TODO: implement"
- Marketing copy in code comments
- Non-functional demos
- Landing page patterns
- "Coming soon" features

✅ REQUIRED:
- Working implementations
- Real crypto (Web Crypto API, Node crypto)
- Actual error handling
- Security best practices
- Integration hooks for Ghost Whistle

OUTPUT ONLY THE CODE, NO MARKDOWN FENCES OR EXPLANATIONS.`;

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
        messages: [{ role: 'user', content: filePrompt }],
        temperature: 0.8,
        max_tokens: 2500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    let code = data?.choices?.[0]?.message?.content || '';

    if (!code || code.length < 50) {
      throw new Error('Generated code too short or empty');
    }

    // Clean up markdown fences
    const langMatch = fileSpec.path.match(/\.(\w+)$/);
    const ext = langMatch ? langMatch[1] : '';
    const fenceRegex = new RegExp(`\`\`\`${ext}\\n?|\\n?\`\`\`|\`\`\`\\n?`, 'g');
    code = code.replace(fenceRegex, '').trim();

    console.log(`✅ Generated ${fileSpec.path} (${code.length} chars)`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        file: {
          path: fileSpec.path,
          content: code,
          type: fileSpec.type,
          size: code.length
        }
      })
    };

  } catch (error) {
    console.error('❌ File generation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Generation failed',
        message: error.message 
      })
    };
  }
};

