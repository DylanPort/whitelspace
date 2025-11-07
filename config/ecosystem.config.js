// PM2 Ecosystem Configuration for 10 Bootstrap Nodes

const SIGNALING_SERVER = process.env.SIGNALING_SERVER || 'wss://ghost-whistle-signaling.onrender.com';
const RPC_URL = process.env.RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=413dfeef-84d4-4a37-98a7-1e0716bfc4ba';

// Geographic distribution for better privacy
const REGIONS = [
  'US-East',
  'US-West',
  'US-Central',
  'EU-West',
  'EU-East',
  'Asia-Pacific',
  'South-America',
  'Australia',
  'Canada',
  'Middle-East'
];

module.exports = {
  apps: [
    // Signaling Server
    {
      name: 'signaling-server',
      script: './signaling-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        PORT: 8080,
        NODE_ENV: 'production'
      },
      max_memory_restart: '500M',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    
    // Backend API Server
    {
      name: 'backend-api',
      script: './server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        PORT: 3001,
        NODE_ENV: 'production'
      },
      max_memory_restart: '500M',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    
    // 10 Bootstrap Nodes
    ...Array.from({ length: 10 }, (_, i) => ({
      name: `ghost-node-${i + 1}`,
      script: './node-client.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ID: `bootstrap-node-${i + 1}`,
        NODE_REGION: REGIONS[i],
        SIGNALING_SERVER: SIGNALING_SERVER,
        RPC_URL: RPC_URL,
        STORAGE_DIR: `./node-storage/node-${i + 1}`
      },
      max_memory_restart: '200M',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      error_file: `./logs/node-${i + 1}-error.log`,
      out_file: `./logs/node-${i + 1}-out.log`,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }))
  ]
};

