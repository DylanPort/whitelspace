# 🔐 CryptWhistle Backend API

## Overview

Privacy-preserving AI backend for orchestration only. **User data is NEVER processed server-side.**

This backend serves as an orchestration layer:
- Lists available AI models
- Provides health checks
- Serves static demo files
- WebSocket support for future features

**All actual AI processing happens client-side in the browser using Transformers.js.**

---

## Features

✅ **Orchestration Only** - No user data processing  
✅ **Model Listing** - Tells clients which models are available  
✅ **Health Checks** - Service monitoring  
✅ **WebSocket Ready** - For future real-time features  
✅ **CORS Enabled** - Works with any frontend  
✅ **Production Ready** - Express.js with error handling  

---

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start server
npm start

# Or with auto-reload
npm run dev
```

Server runs on: `http://localhost:3000`

---

## API Endpoints

### Health Check
```bash
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "message": "CryptWhistle Backend is running (Orchestration Only)"
}
```

### List Models
```bash
GET /api/models
```

**Response:**
```json
[
  {
    "id": "sentiment-analysis",
    "name": "Sentiment Analysis",
    "description": "Detects the sentiment of text.",
    "size": "67MB",
    "clientSide": true
  },
  {
    "id": "zero-shot-classification",
    "name": "Zero-Shot Classification",
    "description": "Classifies text without specific training data.",
    "size": "407MB",
    "clientSide": true
  },
  {
    "id": "question-answering",
    "name": "Question Answering",
    "description": "Answers questions based on a given context.",
    "size": "108MB",
    "clientSide": true
  }
]
```

### Query Orchestration (Future)
```bash
POST /api/query
```

**Request:**
```json
{
  "task": "sentiment-analysis",
  "data": "I love privacy!"
}
```

**Response:**
```json
{
  "message": "Query received for orchestration. Client-side AI handles inference.",
  "task": "sentiment-analysis",
  "status": "orchestrated"
}
```

---

## Deploy to Render

### Option 1: Render Dashboard (Recommended)

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the `cryptwhistle/backend` directory
5. Render will detect `render.yaml` automatically
6. Click "Create Web Service"

### Option 2: render.yaml

Already configured in `backend/render.yaml`:
- Auto-deploys from Git
- Node.js environment
- Health checks enabled
- 1GB disk for model caching

---

## Environment Variables

Set in Render dashboard (automatically configured via render.yaml):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `production` | Environment |
| `ALLOWED_ORIGINS` | `*` | CORS origins (update after deployment) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Transformers.js + WebAssembly + WebGPU            │  │
│  │ ✅ Sentiment Analysis (runs locally)              │  │
│  │ ✅ Zero-Shot Classification (runs locally)        │  │
│  │ ✅ Question Answering (runs locally)              │  │
│  └───────────────────────────────────────────────────┘  │
│                          ↕                              │
│              (Orchestration requests only)              │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│              CryptWhistle Backend (This)                 │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Express.js Server                                  │  │
│  │ • Lists available models                           │  │
│  │ • Health checks                                    │  │
│  │ • WebSocket support                                │  │
│  │ • NO user data processing                          │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Privacy Guarantees

🔒 **User data NEVER reaches the server:**
- All AI inference happens in the browser
- Models download directly from Hugging Face CDN
- This server only provides orchestration
- No logging of user queries
- No data storage

---

## Monitoring

### Check if server is running:
```bash
curl https://cryptwhistle-backend.onrender.com/health
```

### List available models:
```bash
curl https://cryptwhistle-backend.onrender.com/api/models
```

---

## Development

### Project Structure
```
backend/
├── server.js           # Main Express server
├── package.json        # Dependencies
├── render.yaml         # Render deployment config
├── public/             # Static files
│   └── demo.html       # Demo interface
└── README.md           # This file
```

### Dependencies
- `express`: Web server framework
- `cors`: Cross-origin resource sharing
- `ws`: WebSocket support
- `dotenv`: Environment variables

---

## Future Features (Q1 2026)

🚧 **Coming Soon:**
- TEE backend with AWS Nitro Enclaves
- Smart routing (client-side vs. server-side)
- Model marketplace integration
- Advanced orchestration logic

---

## Troubleshooting

### Port already in use
```bash
# Kill process on port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Kill process on port 3000 (macOS/Linux)
lsof -ti:3000 | xargs kill
```

### CORS errors
Update `ALLOWED_ORIGINS` in server.js or Render dashboard to include your frontend domain.

### Models not loading
Models are downloaded client-side from Hugging Face CDN, not from this server. Check browser console for errors.

---

## Support

- **X / Twitter:** @Whistle_Ninja
- **Telegram:** @whistleninja
- **Documentation:** https://cryptwhistle.netlify.app

---

## License

Part of the CryptWhistle platform. Open source, privacy-first AI infrastructure.
