/**
 * Production Configuration
 * 
 * INSTRUCTIONS:
 * 1. Deploy signaling-server.js to Render
 * 2. Get your Render URL (e.g., https://ghost-whistle-signaling-server.onrender.com)
 * 3. Replace RENDER_URL below with your actual URL
 * 4. Copy the URLs and update them in index.html before deploying to Netlify
 */

const RENDER_URL = 'ghost-whistle-signaling-server.onrender.com';

const PRODUCTION_CONFIG = {
  // WebSocket URL (wss:// for secure WebSocket)
  SIGNALING_SERVER_URL: `wss://${RENDER_URL}`,
  
  // HTTP API URL (https:// for secure HTTP)
  SIGNALING_API_URL: `https://${RENDER_URL}/api/nodes`,
  
  // Health Check URL
  HEALTH_CHECK_URL: `https://${RENDER_URL}/health`,
  
  // Stats API URL
  STATS_API_URL: `https://${RENDER_URL}/api/stats`
};

// INSTRUCTIONS FOR index.html:
console.log(`
🚀 PRODUCTION DEPLOYMENT CONFIGURATION
======================================

Step 1: Find and Replace in index.html:

1. SIGNALING_SERVER_URL (line ~8685):
   FROM: const SIGNALING_SERVER_URL = 'ws://localhost:8080';
   TO:   const SIGNALING_SERVER_URL = '${PRODUCTION_CONFIG.SIGNALING_SERVER_URL}';

2. API Fetch URL (line ~8879):
   FROM: const response = await fetch('http://localhost:8080/api/nodes');
   TO:   const response = await fetch('${PRODUCTION_CONFIG.SIGNALING_API_URL}');

Step 2: Commit and Push to GitHub

Step 3: Deploy to Netlify
   - Connect your GitHub repo
   - Deploy from main branch
   - No build command needed
   - Publish directory: "."

✅ Done! Your app will be live.
`);

module.exports = PRODUCTION_CONFIG;

