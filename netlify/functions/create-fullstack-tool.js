// 🚀 Create Full-Stack Privacy Tool
// Generates multi-file projects with frontend + backend

const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Auto-retry helper with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, label = 'operation') {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 ${label} - Attempt ${attempt}/${maxRetries}`);
      const result = await fn();
      console.log(`✅ ${label} - Success on attempt ${attempt}`);
      return result;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      
      if (isLastAttempt) {
        console.error(`❌ ${label} - Failed after ${maxRetries} attempts:`, error.message);
        throw error;
      }
      
      // Exponential backoff: 2s, 4s, 8s
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`⏳ ${label} - Retry in ${delay/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

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
    const { description, category, includeBackend = true } = JSON.parse(event.body);

    if (!description || description.length < 20) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Description must be at least 20 characters' })
      };
    }

    console.log('🚀 Generating full-stack tool:', description);
    console.log('   Backend:', includeBackend ? 'Yes' : 'Frontend only');
    console.log('   🔄 Auto-retry enabled: Up to 3 attempts per operation\n');

    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    // ========================================
    // STEP 1: Generate Project Structure
    // ========================================
    const structurePrompt = `You are an elite privacy tool architect, not a website builder. Your mission is to design FUNCTIONAL TOOLS that solve real privacy problems.

PROJECT BRIEF: "${description}"
CATEGORY: ${category || 'Privacy Tool'}

🎯 CRITICAL: This is NOT a landing page or website. Build an actual working privacy tool with:
- Real encryption algorithms
- Functional APIs
- Working utilities
- Reusable modules
- Integration-ready components

Think like Cursor AI - creative, practical, deeply technical. Design a tool that could be integrated into Ghost Whistle.

Generate a JSON project structure:
{
  "projectName": "descriptive-tool-name",
  "description": "What this tool actually DOES (not what it looks like)",
  "files": [
    {
      "path": "tools/encryptor.js",
      "type": "module",
      "description": "Core encryption logic with AES-256"
    },
    {
      "path": "api/encrypt.js",
      "type": "backend",
      "description": "API endpoint for encryption operations"
    },
    {
      "path": "utils/crypto-helpers.js",
      "type": "utility",
      "description": "Cryptographic utility functions"
    },
    {
      "path": "interface/index.html",
      "type": "frontend",
      "description": "Minimal UI for tool interaction (not a website)"
    }
  ],
  "techStack": ["crypto", "node.js", "express", "web-crypto-api"],
  "features": ["actual working features", "not marketing points"],
  "integrationPoints": ["how this plugs into Ghost Whistle"]
}

${includeBackend ? 
'BACKEND REQUIRED: Include working APIs, encryption modules, database logic, authentication, middleware.' : 
'Frontend utility only - still must be functional, not decorative.'}

TOOL EXAMPLES (what to build):
✅ Password hasher with PBKDF2
✅ File encryptor with chunked AES
✅ Steganography encoder/decoder
✅ Zero-knowledge proof generator
✅ Anonymous credential issuer
✅ Onion routing relay logic
✅ Metadata stripper
❌ "Beautiful landing page with features section"
❌ "Modern website with pricing"
❌ "Sleek design with CTA buttons"

STRUCTURE REQUIREMENTS:
- /tools/ or /modules/ for core logic
- /api/ for backend endpoints
- /utils/ for helper functions
- /interface/ for minimal UI (not /pages/)
- /tests/ for unit tests
- /docs/ for integration docs
- package.json with real dependencies (crypto, express, etc.)

OUTPUT ONLY THE JSON, NO MARKDOWN FENCES.`;

    console.log('📋 Step 1: Generating project structure...');
    
    // Auto-retry structure generation
    const projectStructure = await retryWithBackoff(async () => {
      const structureRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ghostwhistle.xyz',
          'X-Title': 'Ghost Whistle Privacy Tools Lab'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3.5-sonnet',
          messages: [{ role: 'user', content: structurePrompt }],
          temperature: 0.8,
          max_tokens: 2000
        })
      });

      if (!structureRes.ok) {
        const errorText = await structureRes.text();
        throw new Error(`OpenRouter error ${structureRes.status}: ${errorText}`);
      }

      const structureData = await structureRes.json();
      const structureJson = structureData?.choices?.[0]?.message?.content || '{}';
      
      // Parse structure (remove markdown fences if present)
      const cleanJson = structureJson.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanJson);
    }, 3, 'Project Structure Generation');

    console.log('✅ Project structure:', projectStructure.projectName);
    console.log('   Files to generate:', projectStructure.files.length);

    // ========================================
    // STEP 2: Generate Code for Each File
    // ========================================
    const generatedFiles = [];

    for (const fileSpec of projectStructure.files) {
      console.log(`\n   📝 Generating ${fileSpec.path}...`);

      // Auto-retry individual file generation
      const generatedFile = await retryWithBackoff(async () => {
        const filePrompt = `You are an elite developer with deep expertise in privacy, cryptography, and systems design. Generate ${fileSpec.path} with the intelligence and creativity of Cursor AI.

🎯 PROJECT CONTEXT:
Name: ${projectStructure.projectName}
Mission: ${projectStructure.description}
This File: ${fileSpec.description}
Type: ${fileSpec.type}
Stack: ${projectStructure.techStack.join(', ')}

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
- Example:
  export class Encryptor {
    constructor(key) { /* derive key */ }
    async encrypt(data) { /* real AES-GCM */ }
    async decrypt(cipher) { /* real decryption */ }
  }
` : ''}

${fileSpec.path.includes('/api/') || fileSpec.type === 'backend' ? `
🌐 BACKEND API:
- Express.js with real routes
- Middleware for auth, rate limiting
- Proper error handling (don't expose internals)
- Security headers (helmet, cors)
- Input sanitization
- Example:
  router.post('/encrypt', rateLimit, async (req, res) => {
    const { data, key } = req.body;
    // actual encryption here
    res.json({ cipher, iv, tag });
  });
` : ''}

${fileSpec.path.includes('/utils/') || fileSpec.path.includes('/helpers/') ? `
🛠️ UTILITY FUNCTIONS:
- Pure, testable functions
- Handle edge cases
- Efficient algorithms
- Type-safe (JSDoc or TypeScript)
- Example:
  export const generateSalt = () => crypto.randomBytes(32);
  export const deriveKey = async (password, salt) => { /* PBKDF2 */ };
` : ''}

${fileSpec.path.endsWith('.html') ? `
🖥️ INTERFACE (NOT A WEBSITE):
- Minimal, functional UI
- Focus on tool usage, not marketing
- Dark theme (privacy aesthetic)
- Input/output for the tool
- No hero sections, no CTAs, no pricing
- Example structure:
  <div class="tool-interface">
    <textarea id="input">Enter data</textarea>
    <button onclick="encrypt()">Encrypt</button>
    <pre id="output"></pre>
  </div>
- Use Tailwind CDN but keep it tool-focused
` : ''}

${fileSpec.path === 'package.json' ? `
📦 PACKAGE.JSON:
Include real dependencies:
- express (if backend)
- helmet, cors (security)
- crypto (if encryption)
- ws, socket.io (if real-time)
- joi, validator (input validation)
- winston, morgan (logging)
Add proper scripts: start, dev, test
` : ''}

${fileSpec.path === 'README.md' ? `
📖 README:
Focus on:
1. What this tool DOES (not looks like)
2. Integration with Ghost Whistle
3. API endpoints and usage
4. Security considerations
5. Local setup
6. Testing
NOT: Marketing fluff, feature lists without substance
` : ''}

${fileSpec.path.includes('/tests/') ? `
🧪 TESTS:
- Real unit tests with Jest or Mocha
- Test edge cases, failures, security
- Example:
  test('encrypts and decrypts correctly', async () => {
    const plain = 'secret';
    const cipher = await encrypt(plain, key);
    const result = await decrypt(cipher, key);
    expect(result).toBe(plain);
  });
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

Think: "How would Cursor AI build this file if it deeply understood privacy tech?"

OUTPUT ONLY THE CODE, NO MARKDOWN FENCES OR EXPLANATIONS.`;

        const fileRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://ghostwhistle.xyz',
            'X-Title': 'Ghost Whistle Privacy Tools Lab'
          },
          body: JSON.stringify({
            model: 'anthropic/claude-3.5-sonnet',
            messages: [{ role: 'user', content: filePrompt }],
            temperature: 0.9,
            max_tokens: 4000
          })
        });

        if (!fileRes.ok) {
          const errorText = await fileRes.text();
          throw new Error(`File generation failed ${fileRes.status}: ${errorText}`);
        }

        const fileData = await fileRes.json();
        let code = fileData?.choices?.[0]?.message?.content || '';

        if (!code || code.length < 50) {
          throw new Error('Generated code too short or empty');
        }

        // Clean up markdown fences
        const langMatch = fileSpec.path.match(/\.(\w+)$/);
        const ext = langMatch ? langMatch[1] : '';
        const fenceRegex = new RegExp(`\`\`\`${ext}\\n?|\\n?\`\`\`|\`\`\`\\n?`, 'g');
        code = code.replace(fenceRegex, '').trim();

        return {
          path: fileSpec.path,
          content: code,
          type: fileSpec.type,
          size: code.length
        };
      }, 3, `File: ${fileSpec.path}`);

      generatedFiles.push(generatedFile);
      console.log(`   ✅ Generated ${fileSpec.path} (${generatedFile.size} chars)`);
    }

    // ========================================
    // STEP 3: Create Preview (index.html)
    // ========================================
    const indexFile = generatedFiles.find(f => f.path === 'index.html');
    const previewHtml = indexFile ? indexFile.content : '<html><body><h1>No frontend generated</h1></body></html>';

    // ========================================
    // STEP 4: Deploy to CodeSandbox for preview
    // ========================================
    console.log('🚀 Creating CodeSandbox preview...');
    
    const sandboxFiles = {};
    generatedFiles.forEach(file => {
      sandboxFiles[file.path] = { content: file.content };
    });

    const sandboxRes = await fetch('https://codesandbox.io/api/v1/sandboxes/define?json=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: sandboxFiles })
    });

    let embedUrl = null;
    let sandboxId = null;

    if (sandboxRes.ok) {
      const sandboxData = await sandboxRes.json();
      sandboxId = sandboxData.sandbox_id;
      embedUrl = `https://codesandbox.io/embed/${sandboxId}?view=preview&hidedevtools=1&hidenavigation=1&theme=dark&fontsize=14`;
      console.log('✅ CodeSandbox deployed:', sandboxId);
    } else {
      console.error('CodeSandbox deployment failed:', await sandboxRes.text());
    }

    // ========================================
    // STEP 5: Save to Supabase (optional)
    // ========================================
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        await supabase.from('privacy_tools').insert({
          description,
          category: category || 'General',
          project_structure: projectStructure,
          files: generatedFiles,
          url: embedUrl,
          sandbox_id: sandboxId,
          status: 'pending'
        });
        console.log('✅ Saved to Supabase');
      } catch (e) {
        console.error('Supabase error:', e.message);
      }
    }

    // ========================================
    // RESPONSE
    // ========================================
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tool: {
          projectName: projectStructure.projectName,
          description: projectStructure.description,
          techStack: projectStructure.techStack,
          features: projectStructure.features,
          files: generatedFiles,
          url: embedUrl,
          sandboxId: sandboxId,
          html: previewHtml
        }
      })
    };

  } catch (error) {
    console.error('❌ Generation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to generate project',
        message: error.message
      })
    };
  }
};

