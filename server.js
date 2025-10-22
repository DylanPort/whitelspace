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
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      'https://unpkg.com',
      'https://cdn.tailwindcss.com',
      'https://esm.sh',
      'https://cdn.jsdelivr.net',
      'https://changenow.io'
    ],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'connect-src': ["'self'", 'https:', 'wss:', 'ws:', 'http://localhost:*', 'ws://localhost:*'],
  }
}));
app.use(compression());
app.use(morgan('tiny'));

app.use(express.static(__dirname, { extensions: ['html'] }));

// Serve specific HTML files
app.get('/init-relay-pool.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'init-relay-pool.html'));
});

app.get('/create-relay-vault.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'create-relay-vault.html'));
});

app.get('/whitepaper.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'whitepaper.html'));
});

// Catch-all route for everything else
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Whistle running at http://localhost:${PORT}`);
});


