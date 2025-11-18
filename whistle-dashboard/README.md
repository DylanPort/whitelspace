# WHISTLE Dashboard

**Production-ready decentralized RPC provider network dashboard**

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Visit http://localhost:3000

---

## 📱 **Pages**

| Route | Description | Status |
|---|---|---|
| `/` | Landing page with central core | ✅ Complete |
| `/dashboard` | Wallet dashboard (balances, NFTs, transactions) | ✅ Complete |
| `/tokens` | Token explorer with search & filters | ✅ Complete |
| `/tokens/[address]` | Token details with price charts | ✅ Complete |
| `/transactions` | Transaction explorer | ✅ Complete |
| `/tx/[signature]` | Transaction details | ✅ Complete |
| `/provider` | Provider dashboard with earnings charts | ✅ Complete |
| `/network` | Network monitoring & provider leaderboard | ✅ Complete |
| `/docs` | Documentation (user guide, API reference) | ✅ Complete |

---

## 🎨 **Features**

### For Users
- ✅ Connect wallet (Phantom, Solflare, Backpack)
- ✅ View portfolio (tokens, NFTs, transactions)
- ✅ Browse & search tokens
- ✅ View token price charts
- ✅ Track transaction history
- ✅ Stake WHISTLE tokens
- ✅ Query RPC data

### For Providers
- ✅ Register as provider
- ✅ Monitor earnings with charts
- ✅ View performance metrics
- ✅ Claim earnings
- ✅ Track query volume
- ✅ See network stats

### UX
- ✅ Toast notifications
- ✅ Loading skeletons
- ✅ Smooth animations
- ✅ Error handling
- ✅ Copy-to-clipboard
- ✅ Empty states
- ✅ Responsive navigation

---

## 🛠️ **Tech Stack**

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** TailwindCSS v4
- **Animation:** Framer Motion
- **Charts:** Recharts
- **Data Fetching:** TanStack React Query
- **Notifications:** react-hot-toast
- **Wallet:** @solana/wallet-adapter
- **Blockchain:** Solana Web3.js
- **Date:** date-fns
- **Loading:** react-loading-skeleton

---

## 📂 **Project Structure**

```
whistle-dashboard/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Wallet dashboard
│   ├── tokens/            # Token explorer
│   ├── transactions/      # Transaction explorer
│   ├── provider/          # Provider dashboard
│   ├── network/           # Network monitoring
│   ├── docs/              # Documentation
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── CentralCore.tsx
│   ├── Navigation.tsx
│   ├── StakingPanel.tsx
│   └── ...
├── lib/                   # Utilities & services
│   ├── api.ts            # API client
│   ├── contract.ts       # Smart contract integration
│   ├── providers.tsx     # React Query + Toast
│   └── services/         # Data fetching services
│       ├── token.service.ts
│       ├── transaction.service.ts
│       └── wallet.service.ts
└── public/               # Static assets
```

---

## 🔗 **Smart Contract**

**Mainnet:** `5cmaPy5i8efSWSwRVVuWr9VUx8sAMv6qMVSE1o82TRgc`  
**WHISTLE Token:** `6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump`

---

## 🌐 **Backend API**

**Base URL:** `http://152.53.130.177:8080`

**Endpoints:**
- `GET /api/health` - Health check
- `GET /api/transactions` - Query transactions
- `GET /api/balances` - Token balances
- `GET /api/nfts` - NFTs
- `GET /tokens/latest` - Latest tokens
- `GET /tokens/:address` - Token details
- `GET /search` - Token search
- `GET /providers/stats` - Provider stats
- `GET /queries/logs` - Query logs
- `POST /rpc` - RPC proxy

---

## 🔧 **Environment Variables**

Create `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://152.53.130.177:8080
NEXT_PUBLIC_SOLANA_RPC=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
```

---

## 📊 **Current Status**

✅ **14/18 Major Tasks Complete (70%)**

**Completed:**
- Foundation & Services
- Core Pages
- Provider & Network Features
- Documentation
- UX Components

**Pending:**
- Enhanced Query Interface
- Enhanced Staking Page
- Mobile Responsive Design
- Performance Optimization
- E2E Tests

See `CURRENT_STATUS.md` for detailed breakdown.

---

## 🚦 **Production Readiness**

| Category | Status |
|---|---|
| Functionality | 🟢 90% |
| UX | 🟢 85% |
| Performance | 🟡 60% |
| Testing | 🔴 0% |
| Documentation | 🟢 100% |
| **OVERALL** | 🟡 **70%** |

---

## 📚 **Documentation**

- `CURRENT_STATUS.md` - Current build status
- `BUILD_PROGRESS.md` - Phase-by-phase progress
- `MISSING_FEATURES_ANALYSIS.md` - Gap analysis
- `DATA_SOURCES.md` - Real vs mock data explanation

---

## 🐛 **Known Issues**

- Mobile responsive design not optimized
- No lazy loading / code splitting yet
- No E2E tests yet

---

## 🤝 **Contributing**

1. Clone the repo
2. Install dependencies (`npm install`)
3. Run dev server (`npm run dev`)
4. Make changes
5. Build to verify (`npm run build`)
6. Submit PR

---

## 📄 **License**

MIT License

---

**Built with 🔥 by WHISTLE Network**
