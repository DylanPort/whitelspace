/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use static export for Netlify
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.whistle.ninja',
    NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.whistle.ninja',
    NEXT_PUBLIC_COORDINATOR_HTTP: process.env.NEXT_PUBLIC_COORDINATOR_HTTP || 'https://coordinator.whistle.ninja',
    NEXT_PUBLIC_COORDINATOR_WS: process.env.NEXT_PUBLIC_COORDINATOR_WS || 'wss://coordinator.whistle.ninja/ws'
  }
}

module.exports = nextConfig

