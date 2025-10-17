import express from 'express';
import path from 'path';
import compression from 'compression';
import helmet from 'helmet';
import morgan from 'morgan';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    'script-src': ["'self'", "'unsafe-inline'", 'https://unpkg.com', 'https://cdn.tailwindcss.com', 'https://esm.sh'],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'connect-src': ["'self'", 'https:', 'wss:'],
  }
}));
app.use(compression());
app.use(morgan('tiny'));

app.use(express.static(__dirname, { extensions: ['html'] }));

// Lightweight proxy for PumpPortal wallet creation to avoid CORS issues
app.get('/api/proxy/create-wallet', async (req, res) => {
  try {
    const doFetch = globalThis.fetch ? globalThis.fetch.bind(globalThis) : (await import('node-fetch')).default;
    const upstream = await doFetch('https://pumpportal.fun/api/create-wallet');
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'upstream_error', status: upstream.status });
    }
    const data = await upstream.json();
    res.set('Access-Control-Allow-Origin', '*');
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: 'proxy_failed', message: e.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Whistle running at http://localhost:${PORT}`);
});


