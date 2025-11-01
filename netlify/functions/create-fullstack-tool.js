// 🚀 Create Full-Stack Privacy Tool
// Generates multi-file projects with frontend + backend

const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

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

    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    // ========================================
    // STEP 1: Generate Project Structure
    // ========================================
    const structurePrompt = `You are a full-stack developer creating a privacy-focused web application.

PROJECT BRIEF: "${description}"
CATEGORY: ${category || 'Privacy Tool'}

Generate a JSON project structure with the following format:
{
  "projectName": "snake-case-name",
  "description": "brief description",
  "files": [
    {
      "path": "index.html",
      "type": "frontend",
      "description": "Main HTML file"
    },
    {
      "path": "api/server.js",
      "type": "backend",
      "description": "Express server"
    },
    {
      "path": "api/routes/auth.js",
      "type": "backend",
      "description": "Authentication routes"
    }
  ],
  "techStack": ["html", "tailwind", "node.js", "express"],
  "features": ["feature1", "feature2"]
}

${includeBackend ? 'Include both frontend AND backend files (API routes, server logic, middleware).' : 'Frontend only - no backend files.'}

REQUIREMENTS:
- Use modern tech stack (Tailwind, Node.js/Express if backend)
- Privacy-focused architecture
- Modular file structure
- Include package.json if backend
- Include README.md
- All paths should be relative

OUTPUT ONLY THE JSON, NO MARKDOWN FENCES.`;

    console.log('📋 Step 1: Generating project structure...');
    
    const structureRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ghostwhistle.xyz',
        'X-Title': 'Ghost Whistle Privacy Tools Lab'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: structurePrompt }],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!structureRes.ok) {
      throw new Error(`OpenRouter structure error: ${structureRes.status}`);
    }

    const structureData = await structureRes.json();
    const structureJson = structureData?.choices?.[0]?.message?.content || '{}';
    
    // Parse structure (remove markdown fences if present)
    const cleanJson = structureJson.replace(/```json\n?|\n?```/g, '').trim();
    const projectStructure = JSON.parse(cleanJson);

    console.log('✅ Project structure:', projectStructure.projectName);
    console.log('   Files to generate:', projectStructure.files.length);

    // ========================================
    // STEP 2: Generate Code for Each File
    // ========================================
    const generatedFiles = [];

    for (const fileSpec of projectStructure.files) {
      console.log(`   📝 Generating ${fileSpec.path}...`);

      const filePrompt = `You are generating: ${fileSpec.path}

PROJECT: ${projectStructure.projectName}
DESCRIPTION: ${projectStructure.description}
FILE TYPE: ${fileSpec.type}
FILE PURPOSE: ${fileSpec.description}
TECH STACK: ${projectStructure.techStack.join(', ')}

Generate COMPLETE, PRODUCTION-READY code for this file.

REQUIREMENTS:
- Write actual working code, not placeholders
- Include all imports/dependencies
- Add comments for complex logic
- Follow best practices for ${fileSpec.type}
- Privacy-focused (encryption, secure headers, etc.)
- Modern syntax (ES6+)

${fileSpec.path.endsWith('.html') ? 'Use Tailwind CDN. Make it beautiful and functional.' : ''}
${fileSpec.path.endsWith('.js') && fileSpec.type === 'backend' ? 'Use Express.js patterns. Include error handling.' : ''}
${fileSpec.path === 'package.json' ? 'Include all necessary dependencies with versions.' : ''}
${fileSpec.path === 'README.md' ? 'Include setup instructions, features, and tech stack.' : ''}

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
          model: 'openai/gpt-4o-mini',
          messages: [{ role: 'user', content: filePrompt }],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!fileRes.ok) {
        console.error(`Failed to generate ${fileSpec.path}`);
        continue;
      }

      const fileData = await fileRes.json();
      let code = fileData?.choices?.[0]?.message?.content || '';

      // Clean up markdown fences
      const langMatch = fileSpec.path.match(/\.(\w+)$/);
      const ext = langMatch ? langMatch[1] : '';
      const fenceRegex = new RegExp(`\`\`\`${ext}\\n?|\\n?\`\`\`|\`\`\`\\n?`, 'g');
      code = code.replace(fenceRegex, '').trim();

      generatedFiles.push({
        path: fileSpec.path,
        content: code,
        type: fileSpec.type,
        size: code.length
      });

      console.log(`   ✅ Generated ${fileSpec.path} (${code.length} chars)`);
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

