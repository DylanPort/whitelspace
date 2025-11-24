# Provider Panel Integration Guide

## Quick Integration into Your Existing Dashboard

### Option 1: Add as a New Route

1. **Copy the provider page to your pages directory:**
```bash
cp whistlenet/frontend/pages/provider.tsx → your-app/pages/provider.tsx
```

2. **Copy the components:**
```bash
cp whistlenet/frontend/components/ProviderDashboardDark.tsx → your-app/components/
cp whistlenet/frontend/components/BecomeProviderSection.tsx → your-app/components/
```

3. **Install dependencies:**
```bash
npm install lucide-react
```

4. **Add navigation link in your existing dashboard:**
```tsx
// In your main dashboard where you have the "BECOME A PROVIDER" card
<Link href="/provider">
  <button className="register-btn">REGISTER NOW</button>
</Link>
```

### Option 2: Embed Directly in Dashboard

1. **Import the component in your main dashboard:**
```tsx
import BecomeProviderSection from '../components/BecomeProviderSection';
```

2. **Replace your existing "BECOME A PROVIDER" card:**
```tsx
// Find this section in your dashboard
<div className="become-provider-card">
  {/* Replace contents with: */}
  <BecomeProviderSection />
</div>
```

### Option 3: Modal/Popup Integration

1. **Add state for modal:**
```tsx
const [showProviderPanel, setShowProviderPanel] = useState(false);
```

2. **Update your REGISTER NOW button:**
```tsx
<button onClick={() => setShowProviderPanel(true)}>
  REGISTER NOW
</button>
```

3. **Add modal rendering:**
```tsx
{showProviderPanel && (
  <div className="modal-overlay">
    <div className="modal-content">
      <button onClick={() => setShowProviderPanel(false)}>×</button>
      <ProviderDashboardDark />
    </div>
  </div>
)}
```

## Styling to Match Your Theme

The components are already styled for a dark theme, but you can adjust:

### Color Variables
```css
/* Your existing theme colors */
--primary: #8B5CF6;  /* Purple */
--secondary: #3B82F6; /* Blue */
--success: #10B981;   /* Green */
--warning: #F59E0B;   /* Orange */
--background: #0a0a0a;
--card-bg: rgba(20, 20, 20, 0.8);
```

### Update Component Styles
```tsx
// In ProviderDashboardDark.tsx
const cardStyle = {
  background: 'var(--card-bg)',
  border: '1px solid rgba(139, 92, 246, 0.2)',
  // ... rest of your theme
};
```

## Connect to Backend

1. **Update API endpoints in ProviderDashboardDark.tsx:**
```tsx
// Replace mock data with actual API calls
useEffect(() => {
  fetch('/api/user/nodes')
    .then(res => res.json())
    .then(data => setUserNodes(data));
    
  fetch('/api/network/stats')
    .then(res => res.json())
    .then(data => setNetworkStats(data));
}, []);
```

2. **Add WebSocket connection for real-time updates:**
```tsx
useEffect(() => {
  const ws = new WebSocket('wss://coordinator.whistle.network');
  
  ws.on('stats', (data) => {
    setNetworkStats(data);
  });
  
  return () => ws.close();
}, []);
```

## Required API Endpoints

Your backend should provide:

```typescript
// GET /api/user/nodes
{
  nodes: [{
    id: string,
    status: 'online' | 'offline',
    location: string,
    uptime: number,
    cacheHits: number,
    earnings: number,
    performance: {
      cpu: number,
      memory: number,
      bandwidth: number
    }
  }]
}

// GET /api/network/stats
{
  totalNodes: number,
  activeNodes: number,
  totalCacheHits: number,
  avgResponseTime: number,
  totalEarnings: number
}

// POST /api/nodes/register
{
  walletAddress: string,
  endpoint: string
}

// GET /api/earnings/:walletAddress
{
  today: number,
  week: number,
  month: number,
  total: number,
  payments: [{
    date: string,
    amount: number,
    status: string
  }]
}
```

## Testing

1. **Run your frontend:**
```bash
npm run dev
```

2. **Navigate to:**
- `/provider` - Full provider page
- Or click "REGISTER NOW" in your dashboard

3. **Test features:**
- Connect wallet
- View dashboard
- Copy setup commands
- Check responsive design

## Production Deployment

1. **Update coordinator URL:**
```tsx
// In BecomeProviderSection.tsx
const COORDINATOR_URL = 'https://coordinator.whistle.network';
```

2. **Update Docker image:**
```tsx
// In setup commands
'docker run -d whistlenet/cache-node:latest'
```

3. **Add analytics:**
```tsx
// Track user actions
const trackEvent = (action: string) => {
  // Your analytics code
  gtag('event', action, { category: 'Provider' });
};
```

## Support

For help integrating:
1. Check the example implementation in `/pages/provider.tsx`
2. Review component props in `/components/ProviderDashboardDark.tsx`
3. Test with mock data first before connecting to backend


## Quick Integration into Your Existing Dashboard

### Option 1: Add as a New Route

1. **Copy the provider page to your pages directory:**
```bash
cp whistlenet/frontend/pages/provider.tsx → your-app/pages/provider.tsx
```

2. **Copy the components:**
```bash
cp whistlenet/frontend/components/ProviderDashboardDark.tsx → your-app/components/
cp whistlenet/frontend/components/BecomeProviderSection.tsx → your-app/components/
```

3. **Install dependencies:**
```bash
npm install lucide-react
```

4. **Add navigation link in your existing dashboard:**
```tsx
// In your main dashboard where you have the "BECOME A PROVIDER" card
<Link href="/provider">
  <button className="register-btn">REGISTER NOW</button>
</Link>
```

### Option 2: Embed Directly in Dashboard

1. **Import the component in your main dashboard:**
```tsx
import BecomeProviderSection from '../components/BecomeProviderSection';
```

2. **Replace your existing "BECOME A PROVIDER" card:**
```tsx
// Find this section in your dashboard
<div className="become-provider-card">
  {/* Replace contents with: */}
  <BecomeProviderSection />
</div>
```

### Option 3: Modal/Popup Integration

1. **Add state for modal:**
```tsx
const [showProviderPanel, setShowProviderPanel] = useState(false);
```

2. **Update your REGISTER NOW button:**
```tsx
<button onClick={() => setShowProviderPanel(true)}>
  REGISTER NOW
</button>
```

3. **Add modal rendering:**
```tsx
{showProviderPanel && (
  <div className="modal-overlay">
    <div className="modal-content">
      <button onClick={() => setShowProviderPanel(false)}>×</button>
      <ProviderDashboardDark />
    </div>
  </div>
)}
```

## Styling to Match Your Theme

The components are already styled for a dark theme, but you can adjust:

### Color Variables
```css
/* Your existing theme colors */
--primary: #8B5CF6;  /* Purple */
--secondary: #3B82F6; /* Blue */
--success: #10B981;   /* Green */
--warning: #F59E0B;   /* Orange */
--background: #0a0a0a;
--card-bg: rgba(20, 20, 20, 0.8);
```

### Update Component Styles
```tsx
// In ProviderDashboardDark.tsx
const cardStyle = {
  background: 'var(--card-bg)',
  border: '1px solid rgba(139, 92, 246, 0.2)',
  // ... rest of your theme
};
```

## Connect to Backend

1. **Update API endpoints in ProviderDashboardDark.tsx:**
```tsx
// Replace mock data with actual API calls
useEffect(() => {
  fetch('/api/user/nodes')
    .then(res => res.json())
    .then(data => setUserNodes(data));
    
  fetch('/api/network/stats')
    .then(res => res.json())
    .then(data => setNetworkStats(data));
}, []);
```

2. **Add WebSocket connection for real-time updates:**
```tsx
useEffect(() => {
  const ws = new WebSocket('wss://coordinator.whistle.network');
  
  ws.on('stats', (data) => {
    setNetworkStats(data);
  });
  
  return () => ws.close();
}, []);
```

## Required API Endpoints

Your backend should provide:

```typescript
// GET /api/user/nodes
{
  nodes: [{
    id: string,
    status: 'online' | 'offline',
    location: string,
    uptime: number,
    cacheHits: number,
    earnings: number,
    performance: {
      cpu: number,
      memory: number,
      bandwidth: number
    }
  }]
}

// GET /api/network/stats
{
  totalNodes: number,
  activeNodes: number,
  totalCacheHits: number,
  avgResponseTime: number,
  totalEarnings: number
}

// POST /api/nodes/register
{
  walletAddress: string,
  endpoint: string
}

// GET /api/earnings/:walletAddress
{
  today: number,
  week: number,
  month: number,
  total: number,
  payments: [{
    date: string,
    amount: number,
    status: string
  }]
}
```

## Testing

1. **Run your frontend:**
```bash
npm run dev
```

2. **Navigate to:**
- `/provider` - Full provider page
- Or click "REGISTER NOW" in your dashboard

3. **Test features:**
- Connect wallet
- View dashboard
- Copy setup commands
- Check responsive design

## Production Deployment

1. **Update coordinator URL:**
```tsx
// In BecomeProviderSection.tsx
const COORDINATOR_URL = 'https://coordinator.whistle.network';
```

2. **Update Docker image:**
```tsx
// In setup commands
'docker run -d whistlenet/cache-node:latest'
```

3. **Add analytics:**
```tsx
// Track user actions
const trackEvent = (action: string) => {
  // Your analytics code
  gtag('event', action, { category: 'Provider' });
};
```

## Support

For help integrating:
1. Check the example implementation in `/pages/provider.tsx`
2. Review component props in `/components/ProviderDashboardDark.tsx`
3. Test with mock data first before connecting to backend
