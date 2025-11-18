import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable strict mode to prevent double-mounting issues with Solana wallet
  reactStrictMode: false,
};

export default nextConfig;
