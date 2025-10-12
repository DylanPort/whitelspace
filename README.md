# Whistle

P2P end‑to‑end encrypted tips over WebRTC with an on‑chain Solana Memo proof of existence.

- No servers for file or message transfer — the encrypted bundle streams directly peer‑to‑peer
- A tiny SHA‑256 hash is posted to Solana Memo as public timestamp proof (required in this build)
- Works in a modern desktop browser with Phantom wallet

## Quick start

Prereqs:
- Node.js 18+ (LTS recommended)
- A modern Chromium/Firefox/Safari browser
- Phantom wallet extension installed

Run locally:
```bash
# from repo root
npm install
npm start
# open http://localhost:3000
```

The app is a single‑page React app (no build step) served by a tiny Express server.

## How it works (roles)

### Tipster
1) Write the tip and optionally attach files (≤ 5 GB total)
2) Step A — Generate Offer and share the Offer text with the newsroom
3) Step B — Paste the newsroom Answer, click Connect, then Send
4) The app posts the bundle hash to Solana Memo automatically; copy the tx link if needed

You’ll also see a short, domain‑style code for the hash, e.g. `whis.abcd.efgh...`.

### Newsroom
1) Paste the Offer from the tipster
2) Click Generate Answer and send the Answer back to the tipster
3) As the stream arrives it decrypts locally; download any files you need
4) The computed hash is shown for verification; you can also post a memo in Verify tab

### Verify / Memo
- Paste either the 64‑hex hash or the short code (e.g. `whis.abcd.efgh...`)
- Click Post Memo to anchor the hash on Solana

## RPC configuration

- Defaults use SolanaTracker (HTTP+WS) and should work out of the box.
- To override in your browser, set localStorage keys and refresh:
```js
localStorage.setItem('rpcHttpUrl', 'https://YOUR_HTTP_RPC');
localStorage.setItem('rpcWsUrl',  'wss://YOUR_WS_RPC');
```

Notes:
- Some providers require an API key and proper CORS/Referer to allow browser POSTs
- The app uses `Connection` with `wsEndpoint` when a WS URL is present

## Deployment

### Netlify (recommended)
This repo contains `netlify.toml` with a single‑page app redirect.

- Connect your GitHub repo in Netlify
- Build command: (leave empty)
- Publish directory: `.`
- Click Deploy

Alternatively, with Netlify CLI:
```bash
npm install -g netlify-cli
netlify deploy --prod --dir .
```

### Custom server
- Development: `npm start` runs Express on port 3000
- Production: run behind HTTPS (wallets typically require secure context)
  - Example: `PORT=8080 node server.js` behind Nginx/Cloudflare TLS

## Troubleshooting

- Memo failed: 403 Access forbidden
  - Use your own RPC provider URL (Helius/QuickNode/Alchemy/etc.)
  - Ensure your key permits `getLatestBlockhash` and `sendRawTransaction`
- Buffer is not defined / Buffer.from is not a function
  - The app loads a browser Buffer polyfill before web3; ensure the network allows `https://esm.sh` and `https://unpkg.com`
- Offer/Answer invalid or garbled
  - Use the built‑in Copy/Share buttons; don’t reformat the code block
- Connection stuck at Connecting…
  - Corporate/VPN/NATs can block WebRTC; try a different network/browser
- File too large
  - Evidence limit is 5 GB per send

## Repository layout

- `index.html` — the entire app (React + UI + crypto + web3)
- `server.js` — tiny Express server for local/prod hosting
- `netlify.toml` — SPA redirect config for Netlify
- `package.json` — scripts and dependencies
- `whistel_logo_top_right_2048.png` — logo (also used as favicon)

## Security & privacy

- Content is encrypted client‑side with AES‑GCM; the symmetric key is encrypted to the newsroom’s RSA‑OAEP key
- Only the SHA‑256 hash of the encrypted bundle is posted on‑chain (no plaintext content)
- Always verify hashes and wallet prompts; never paste secrets into untrusted pages

## Contributing

Issues and PRs are welcome. Please avoid adding heavy dependencies; the project aims to stay lightweight and auditable.

## License

MIT
