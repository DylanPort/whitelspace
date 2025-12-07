/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable strict mode to prevent double-mounting issues with Solana wallet
  reactStrictMode: false,
};

module.exports = nextConfig;

