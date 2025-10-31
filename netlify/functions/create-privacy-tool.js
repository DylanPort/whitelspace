// 🛠️ Create Privacy Tool with Val.town + OpenAI GPT-4
// This function generates code using AI and deploys it to Val.town

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
// Use a dedicated variable to avoid local dev overrides like "ollama-local"
const OPENAI_API_KEY = process.env.GW_OPENAI_API_KEY;
const OPENAI_MODEL = process.env.GW_OPENAI_MODEL || 'gpt-4o-mini';
const VALTOWN_API_KEY = process.env.VALTOWN_API_KEY;
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID; // optional
const DEPLOY_PROVIDER = (process.env.DEPLOY_PROVIDER || '').toLowerCase();
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN;
const CF_KV_NAMESPACE_ID = process.env.CF_KV_NAMESPACE_ID;
const CF_WORKER_HOST = process.env.CF_WORKER_HOST; // e.g. gw-preview.yourname.workers.dev
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL_SPEC = process.env.OPENROUTER_MODEL_SPEC || 'anthropic/claude-3.5-sonnet';
const OPENROUTER_MODEL_RENDER = process.env.OPENROUTER_MODEL_RENDER || process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';
const FORCE_OPENROUTER = String(process.env.FORCE_OPENROUTER || '').toLowerCase() === 'true';

exports.handler = async (event) => {
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
    const { description, creatorWallet, category } = JSON.parse(event.body);

    if (!description || description.length < 20) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Description must be at least 20 characters' })
      };
    }

    console.log('🤖 Generating privacy tool:', description);

    // ========================================
    // STEP 1: Generate HTML with Cloudflare AI (preferred) or OpenAI
    // ========================================
    let fallbackHtml = null;
    let aiFallbackUsed = false;

    // Try Cloudflare Workers AI first (single provider path) unless forcing OpenRouter
    if (!FORCE_OPENROUTER && CF_API_TOKEN && CF_ACCOUNT_ID) {
      try {
        const cfModel = '@cf/meta/llama-3.1-8b-instruct';
        const cfResp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${encodeURIComponent(cfModel)}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CF_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: 'Generate a complete SINGLE HTML file using Tailwind via CDN. No external assets besides Tailwind. It must be a functional landing page for the described idea. Do not include markdown fencing.' },
              { role: 'user', content: description }
            ]
          })
        });
        if (cfResp.ok) {
          const cfData = await cfResp.json();
          const raw = cfData?.result?.response || cfData?.result?.output || '';
          // Extract HTML
          const match = raw.match(/```html\n([\s\S]*?)```/i) || raw.match(/```\n([\s\S]*?)```/);
          fallbackHtml = (match ? match[1] : raw).trim();
          if (!fallbackHtml.toLowerCase().includes('<html')) {
            fallbackHtml = `<!DOCTYPE html>\n<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Generated</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-950 text-slate-100 p-8"><pre class="whitespace-pre-wrap">${fallbackHtml.replace(/</g,'&lt;')}</pre></body></html>`;
          }
          aiFallbackUsed = true; // indicates AI used to build a site
        } else {
          console.error('Cloudflare AI error:', await cfResp.text());
        }
      } catch (e) {
        console.error('Cloudflare AI exception:', e);
      }
    }

    // If Cloudflare AI not available, try OpenAI direct first (most reliable), then OpenRouter
    let cleanCode;
    if (!fallbackHtml) {
      // Try OpenAI GPT-4o directly (if USE_OPENAI_DIRECT is set or OpenRouter unavailable)
      const USE_OPENAI_DIRECT = process.env.USE_OPENAI_DIRECT === 'true';
      if ((USE_OPENAI_DIRECT || !OPENROUTER_API_KEY) && OPENAI_API_KEY) {
        try {
          const directPrompt = `You are a visionary web designer creating a COMPLETELY UNIQUE landing page. Each project you create must be entirely different from the last.

PROJECT BRIEF:
"${description}"
Category: ${category || 'General'}

CRITICAL UNIQUENESS REQUIREMENTS:
1. VISUAL IDENTITY - Create a UNIQUE design language for this specific product:
   - Choose a color palette that MATCHES THE PRODUCT (not just purple/cyan)
   - For VPN: Deep blues/teals suggesting security and anonymity
   - For crypto: Gold/black/emerald suggesting wealth and innovation  
   - For mystery/cryptic: Dark purples/blacks with neon accents
   - For productivity: Warm oranges/yellows suggesting energy
   - For education: Blues/greens suggesting growth
   - USE SPECIFIC, UNEXPECTED COLOR COMBINATIONS

2. LAYOUT INNOVATION - DO NOT use the same layout structure:
   - Experiment with: side-by-side hero, diagonal sections, overlapping cards, asymmetric grids
   - Use different section orders each time
   - Try: split-screen designs, full-width backgrounds, contained content areas, floating elements

3. TYPOGRAPHY - Vary the text style:
   - Use different heading sizes and styles (some projects: huge headings, others: subtle)
   - Mix uppercase/lowercase strategically
   - Experiment with letter-spacing and line-height

4. INTERACTIVE ELEMENTS - Add product-specific features:
   - VPN: Speed test widget, server map, live connection counter
   - Crypto: Price chart, wallet generator preview, transaction simulator
   - Mystery site: Countdown timer, random quote revealer, dark mode toggle
   - Tool: Live demo, interactive calculator, visual before/after

5. COPY - Write DEEPLY SPECIFIC content:
   - NO generic "fast", "secure", "easy" - use CONCRETE details
   - Include specific numbers, use cases, technical details
   - Write as if you deeply understand this exact product
   - Use industry-specific terminology

6. ANIMATIONS - Unique for each project:
   - Vary: entrance animations, scroll effects, hover states
   - Some projects: minimal motion, others: dynamic interactions

STRUCTURE (vary the order and presentation):
- Hero (make it UNIQUE to the product)
- 4-6 Features (with product-specific icons/emojis)
- How It Works OR Use Cases (choose based on product)
- Social Proof OR Demo (choose what fits)
- Pricing/Plans OR CTA (style differently each time)
- FAQ (questions specific to THIS product)

TECHNICAL:
- Single HTML file with Tailwind CDN
- Mobile responsive
- NO markdown fences - output ONLY HTML starting with <!DOCTYPE html>
- Use Tailwind's full palette creatively (not just the same 4 colors)

BUILD THIS AS IF IT'S A REAL CLIENT PROJECT WHERE YOU'RE SHOWING OFF YOUR UNIQUE VISION.`;

          console.log('🎨 OpenAI GPT-4o: Starting generation...');
          const oaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                { role: 'system', content: 'You are a world-class web designer. Generate ONLY the raw HTML - no explanations, no markdown fences, no preamble. Start with <!DOCTYPE html> and end with </html>.' },
                { role: 'user', content: directPrompt }
              ],
              temperature: 1.0,
              max_tokens: 4096
            })
          });
          console.log('📦 OpenAI response received, processing...');
          if (oaiResp.ok) {
            const j = await oaiResp.json();
            let hout = (j?.choices?.[0]?.message?.content || '').trim();
            // Strip markdown fences if present
            const mh = hout.match(/```html\n([\s\S]*?)```/i) || hout.match(/```\n([\s\S]*?)```/);
            fallbackHtml = (mh ? mh[1] : hout).trim();
            if (!fallbackHtml.toLowerCase().includes('<html')) {
              console.error('OpenAI did not return valid HTML, got:', fallbackHtml.slice(0, 200));
            } else {
              aiFallbackUsed = true;
              console.log('✅ Generated with OpenAI GPT-4o');
            }
          } else {
            const errText = await oaiResp.text();
            console.error('OpenAI error:', errText);
          }
        } catch (e) {
          console.error('OpenAI exception:', e);
        }
      } else if (OPENROUTER_API_KEY) {
        try {
          // Single-stage: directly generate full HTML (skip spec)
          const directPrompt = `You are a visionary web designer creating a COMPLETELY UNIQUE landing page. Each project you create must be entirely different from the last.

PROJECT BRIEF:
"${description}"
Category: ${category || 'General'}

CRITICAL UNIQUENESS REQUIREMENTS:
1. VISUAL IDENTITY - Create a UNIQUE design language for this specific product:
   - Choose a color palette that MATCHES THE PRODUCT (not just purple/cyan)
   - For VPN: Deep blues/teals suggesting security and anonymity
   - For crypto: Gold/black/emerald suggesting wealth and innovation  
   - For mystery/cryptic: Dark purples/blacks with neon accents
   - For productivity: Warm oranges/yellows suggesting energy
   - For education: Blues/greens suggesting growth
   - USE SPECIFIC, UNEXPECTED COLOR COMBINATIONS

2. LAYOUT INNOVATION - DO NOT use the same layout structure:
   - Experiment with: side-by-side hero, diagonal sections, overlapping cards, asymmetric grids
   - Use different section orders each time
   - Try: split-screen designs, full-width backgrounds, contained content areas, floating elements

3. TYPOGRAPHY - Vary the text style:
   - Use different heading sizes and styles (some projects: huge headings, others: subtle)
   - Mix uppercase/lowercase strategically
   - Experiment with letter-spacing and line-height

4. INTERACTIVE ELEMENTS - Add product-specific features:
   - VPN: Speed test widget, server map, live connection counter
   - Crypto: Price chart, wallet generator preview, transaction simulator
   - Mystery site: Countdown timer, random quote revealer, dark mode toggle
   - Tool: Live demo, interactive calculator, visual before/after

5. COPY - Write DEEPLY SPECIFIC content:
   - NO generic "fast", "secure", "easy" - use CONCRETE details
   - Include specific numbers, use cases, technical details
   - Write as if you deeply understand this exact product
   - Use industry-specific terminology

6. ANIMATIONS - Unique for each project:
   - Vary: entrance animations, scroll effects, hover states
   - Some projects: minimal motion, others: dynamic interactions

STRUCTURE (vary the order and presentation):
- Hero (make it UNIQUE to the product)
- 4-6 Features (with product-specific icons/emojis)
- How It Works OR Use Cases (choose based on product)
- Social Proof OR Demo (choose what fits)
- Pricing/Plans OR CTA (style differently each time)
- FAQ (questions specific to THIS product)

TECHNICAL:
- Single HTML file with Tailwind CDN
- Mobile responsive
- NO markdown fences - output ONLY HTML starting with <!DOCTYPE html>
- Use Tailwind's full palette creatively (not just the same 4 colors)

BUILD THIS AS IF IT'S A REAL CLIENT PROJECT WHERE YOU'RE SHOWING OFF YOUR UNIQUE VISION.`;

          console.log(`🎨 OpenRouter (${OPENROUTER_MODEL_RENDER}): Starting generation...`);
          const orResp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: OPENROUTER_MODEL_RENDER,
              messages: [
                { role: 'system', content: 'You are a world-class web designer. Generate ONLY the raw HTML - no explanations, no markdown fences, no preamble. Start with <!DOCTYPE html> and end with </html>.' },
                { role: 'user', content: directPrompt }
              ],
              temperature: 1.0,
              max_tokens: 4000
            })
          });
          console.log('📦 OpenRouter response received, processing...');
          if (orResp.ok) {
            const j = await orResp.json();
            let hout = (j?.choices?.[0]?.message?.content || '').trim();
            // Strip markdown fences if present
            const mh = hout.match(/```html\n([\s\S]*?)```/i) || hout.match(/```\n([\s\S]*?)```/);
            fallbackHtml = (mh ? mh[1] : hout).trim();
            if (!fallbackHtml.toLowerCase().includes('<html')) {
              console.error('OpenRouter did not return valid HTML, got:', fallbackHtml.slice(0, 200));
              if (FORCE_OPENROUTER) {
                throw new Error('OpenRouter returned invalid HTML');
              }
            } else {
              aiFallbackUsed = true;
            }
          } else {
            const errText = await orResp.text();
            console.error('OpenRouter error:', errText);
            if (FORCE_OPENROUTER) {
              throw new Error(`OpenRouter API failed: ${errText}`);
            }
          }
        } catch (e) {
          console.error('OpenRouter exception:', e);
          if (FORCE_OPENROUTER) {
            throw e;
          }
        }
      }

      // If we still have no HTML, synthesize from a spec built locally (non-generic)
      if (!fallbackHtml) {
        if (FORCE_OPENROUTER) {
          return { statusCode: 500, headers, body: JSON.stringify({ error: 'openrouter_unavailable', details: 'OpenRouter did not return HTML (check balance/model access).' }) };
        }
        const featurePresets = [];
        const d = (description||'').toLowerCase();
        function addFeature(icon, title, desc){ featurePresets.push({icon, title, desc}); }
        if (d.includes('wallet')) addFeature('👛','Seedless Onboarding','Passwordless sign ups with passkeys');
        if (d.includes('passkey')) addFeature('🔑','Passkey Security','FIDO2-based authentication');
        if (d.includes('guardian')||d.includes('recovery')) addFeature('🛡️','Guardian Recovery','Trusted social recovery workflow');
        if (d.includes('swap')) addFeature('🔄','Built-in Swap','Token swaps with best routes');
        if (d.includes('nft')) addFeature('🖼️','NFT Gallery','Beautiful on-chain collectibles view');
        if (featurePresets.length === 0) {
          addFeature('⚡','Blazing Fast','Optimized static site, instant loads');
          addFeature('🔒','Private by Default','No tracking, no cookies');
          addFeature('🎯','Purpose Built','Designed around your exact use-case');
        }
        const titleBase = (description.split(/\.|\n/)[0] || 'Your Product').replace(/</g,'&lt;');
        const aboutText = (description || '').replace(/</g,'&lt;');
        const featuresHtml = featurePresets.map(f=>`<div class="rounded-xl border border-slate-800 bg-slate-900 p-6"><div class="text-2xl mb-2">${f.icon}</div><div class="font-semibold mb-1">${f.title}</div><p class="text-slate-400 text-sm">${f.desc}</p></div>`).join('');
        fallbackHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${titleBase}</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-950 text-slate-100 min-h-screen"><header class="bg-gradient-to-r from-cyan-600 to-purple-600 py-14"><div class="max-w-5xl mx-auto px-6"><h1 class="text-4xl font-extrabold mb-2">${titleBase}</h1><p class="text-slate-100/90">${aboutText}</p><div class="mt-6"><a href="#cta" class="inline-block px-5 py-3 bg-black/20 border border-white/30 rounded-xl">Get Started</a></div></div></header><main class="max-w-5xl mx-auto px-6 py-10 space-y-10"><section class="grid md:grid-cols-3 gap-6">${featuresHtml}</section><section class="rounded-2xl border border-slate-800 bg-slate-900 p-8"><h2 class="text-2xl font-bold mb-4">About</h2><p class="text-slate-300 leading-7">${aboutText}</p></section><section id="cta" class="rounded-2xl border border-emerald-700 bg-emerald-600/10 p-8 text-center"><h3 class="text-2xl font-bold mb-2">Ready to try?</h3><p class="text-slate-300 mb-4">Join the waitlist to get early access.</p><form onsubmit="event.preventDefault(); this.querySelector('button').textContent='Joined✓'" class="max-w-md mx-auto flex gap-2"><input required placeholder="you@example.com" class="flex-1 px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white"/><button class="px-4 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700">Join Waitlist</button></form></section></main><footer class="py-10 text-center text-slate-500 text-sm">Generated by Ghost Whistle</footer></body></html>`;
        aiFallbackUsed = true;
      }
    }

    // Post-process: validate HTML quality
    if (fallbackHtml) {
      const htmlLower = fallbackHtml.toLowerCase();
      const tooShort = fallbackHtml.length < 1500;
      const missingKey = !htmlLower.includes('tailwind') || !htmlLower.includes('<body');
      if (tooShort || missingKey) {
        console.warn('Generated HTML appears incomplete or invalid (length:', fallbackHtml.length, ')');
        if (FORCE_OPENROUTER) {
          throw new Error('OpenRouter HTML validation failed - too short or missing key elements');
        }
        fallbackHtml = null; // trigger local fallback
      }
    }

    try { console.log('✅ HTML generated length:', (fallbackHtml||'').length); } catch {}

    // ========================================
    // STEP 2: Deploy to Hosting
    // Preference: Cloudflare KV (if configured) → Vercel → Val.town → Local preview
    // ========================================
    const toolName = `privacy_tool_${Date.now()}`;
    let deployedUrl = null;
    let providerUsed = null;

    // 2a) Cloudflare KV deploy (1-hour TTL) if we have CF creds and HTML
    if (!deployedUrl && CF_API_TOKEN && CF_ACCOUNT_ID && CF_KV_NAMESPACE_ID && (fallbackHtml || cleanCode)) {
      try {
        const id = `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
        const htmlOut = fallbackHtml || `<!DOCTYPE html><html><head><meta charset=\"utf-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/><script src=\"https://cdn.tailwindcss.com\"></script><title>Tool</title></head><body class=\"bg-slate-950 text-slate-100 p-8\"><pre class=\"whitespace-pre-wrap\">${cleanCode.replace(/</g,'&lt;')}</pre></body></html>`;
        const putUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_NAMESPACE_ID}/values/${encodeURIComponent(id)}?expiration_ttl=3600`;
        const putResp = await fetch(putUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${CF_API_TOKEN}`,
            'Content-Type': 'text/plain'
          },
          body: htmlOut
        });
        if (putResp.ok) {
          if (CF_WORKER_HOST) {
            deployedUrl = `https://${CF_WORKER_HOST}/t/${id}`;
            providerUsed = 'cloudflare-kv';
          } else {
            console.warn('CF_WORKER_HOST not set; returning data URL');
            deployedUrl = 'data:text/html;base64,' + Buffer.from(htmlOut).toString('base64');
            providerUsed = 'cloudflare-kv-dataurl';
          }
        } else {
          console.error('Cloudflare KV put error:', await putResp.text());
        }
      } catch (e) {
        console.error('Cloudflare KV exception:', e);
      }
    }

    // Try Vercel first if configured
    if (VERCEL_TOKEN && (DEPLOY_PROVIDER === 'vercel' || !VALTOWN_API_KEY)) {
      try {
        const vercelResp = await fetch('https://api.vercel.com/v13/deployments' + (VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${VERCEL_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: toolName,
            projectSettings: { framework: 'static' },
            target: 'production',
            files: [
              { file: 'index.html', data: (fallbackHtml || '').length > 0 ? fallbackHtml : `<!DOCTYPE html><html><head><meta charset=\"utf-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/><title>Tool</title><script src=\"https://cdn.tailwindcss.com\"></script></head><body class=\"bg-slate-950 text-slate-100 min-h-screen\"><div class=\"max-w-4xl mx-auto p-8\"><h1 class=\"text-3xl font-bold mb-4\">Generated Tool</h1><pre class=\"text-xs whitespace-pre-wrap\">${description}</pre></div></body></html>` }
            ]
          })
        });
        if (vercelResp.ok) {
          const vercelData = await vercelResp.json();
          deployedUrl = vercelData.url ? `https://${vercelData.url}` : (vercelData.alias && vercelData.alias[0] ? `https://${vercelData.alias[0]}` : null);
          providerUsed = 'vercel';
        } else {
          const errTxt = await vercelResp.text();
          console.error('Vercel error:', errTxt);
        }
      } catch (e) {
        console.error('Vercel exception:', e);
      }
    }

    // 2b) CodeSandbox widget (no auth) – instant embeddable preview
    if (!deployedUrl && (fallbackHtml || cleanCode)) {
      try {
        console.log('🚀 Deploying to CodeSandbox...');
        const htmlOut = fallbackHtml || `<!DOCTYPE html><html><head><meta charset=\"utf-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/><script src=\"https://cdn.tailwindcss.com\"></script><title>Tool</title></head><body class=\"bg-slate-950 text-slate-100 p-8\"><pre class=\"whitespace-pre-wrap\">${cleanCode.replace(/</g,'&lt;')}</pre></body></html>`;
        const defineResp = await fetch('https://codesandbox.io/api/v1/sandboxes/define?json=1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: { 'index.html': { content: htmlOut } } })
        });
        if (defineResp.ok) {
          const def = await defineResp.json();
          if (def && def.sandbox_id) {
            const params = 'view=preview&hidedevtools=1&hidenavigation=1&theme=dark&fontsize=14';
            deployedUrl = `https://codesandbox.io/embed/${def.sandbox_id}?${params}`;
            providerUsed = 'codesandbox';
            console.log('✅ Deployed to CodeSandbox:', def.sandbox_id);
          }
        } else {
          console.error('CodeSandbox define error:', await defineResp.text());
        }
      } catch (e) {
        console.error('CodeSandbox exception:', e);
      }
    }

    // If Vercel not used/succeeded, try Val.town
    if (!deployedUrl && VALTOWN_API_KEY) {
      // Try modern endpoint first; fall back to legacy
      let valtownResponse = await fetch('https://api.val.town/v1/vals.create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VALTOWN_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: toolName,
          code: cleanCode,
          source: cleanCode,
          privacy: "unlisted",
          readme: `🔒 Privacy Tool\n\n${description}\n\nCreated by community member via Ghost Whistle\nCategory: ${category || 'General'}\nCreator: ${creatorWallet || 'Anonymous'}`
        })
      });
      if (!valtownResponse.ok) {
        // Attempt legacy endpoint
        valtownResponse = await fetch('https://api.val.town/v1/vals', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${VALTOWN_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: toolName,
            code: cleanCode,
            privacy: "unlisted",
            readme: `🔒 Privacy Tool\n\n${description}\n\nCreated by community member via Ghost Whistle\nCategory: ${category || 'General'}\nCreator: ${creatorWallet || 'Anonymous'}`
          })
        });
      }
      if (valtownResponse.ok) {
        const val = await valtownResponse.json();
        deployedUrl = val.links?.endpoint || `https://${val.author}-${toolName}.web.val.run`;
        providerUsed = 'valtown';
      } else {
        const error = await valtownResponse.text();
        console.error('Val.town error:', error);
      }
    }

    if (!deployedUrl) {
      // Fallback: provide local data URL preview if AI fallback HTML exists
      if (aiFallbackUsed && fallbackHtml) {
        const dataUrl = 'data:text/html;base64,' + Buffer.from(fallbackHtml).toString('base64');
        // Save to DB as local preview
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        const { data: toolData, error: dbError } = await supabase
          .from('privacy_tools')
          .insert({
            val_id: null,
            val_name: toolName,
            description: description,
            category: category || 'General',
            creator_wallet: creatorWallet || null,
            url: dataUrl,
            code: cleanCode,
            status: 'local_preview',
            upvotes: 0,
            downvotes: 0,
            views: 0,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (dbError) {
          console.error('Database error (local preview):', dbError);
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            tool: {
              id: toolData?.id || null,
              url: dataUrl,
              valId: null,
              description: description,
              status: 'local_preview',
              message: '✅ Preview ready locally. Val.town deploy unavailable; using local data URL.',
              html: fallbackHtml,
              model: 'local-builder',
              provider: 'local_preview'
            }
          })
        };
      }
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'deploy_error', details: 'All providers failed' }) };
    }

    console.log('✅ Deployed:', deployedUrl, 'via', providerUsed || 'unknown');

    // ========================================
    // STEP 3: Save to Supabase
    // ========================================
    let toolData = null;
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
      const insertRes = await supabase
        .from('privacy_tools')
        .insert({
          val_id: providerUsed === 'valtown' ? (deployedUrl || null) : null,
          val_name: toolName,
          description: description,
          category: category || 'General',
          creator_wallet: creatorWallet || null,
          url: deployedUrl,
          code: cleanCode,
          status: aiFallbackUsed ? 'ai_fallback' : 'pending_review',
          upvotes: 0,
          downvotes: 0,
          views: 0,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      if (insertRes.error) {
        console.warn('Supabase insert failed (continuing without DB):', insertRes.error.message);
      } else {
        toolData = insertRes.data;
        console.log('✅ Saved to database:', toolData.id);
      }
    } catch (e) {
      console.warn('Supabase not configured or unreachable, continuing:', e.message || e);
    }

    // ========================================
    // STEP 4: Return success
    // ========================================
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tool: {
          id: toolData?.id || null,
          url: deployedUrl,
          valId: providerUsed === 'valtown' ? (deployedUrl || null) : null,
          description: description,
          status: 'pending_review',
          message: '🎉 Your privacy tool has been created!',
          html: fallbackHtml,
          model: OPENROUTER_MODEL_RENDER || null,
          provider: providerUsed
        }
      })
    };

  } catch (error) {
    console.error('❌ Error creating tool:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create privacy tool',
        details: error.message
      })
    };
  }
};

