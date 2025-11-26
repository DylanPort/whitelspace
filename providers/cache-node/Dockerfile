# WHISTLE Cache Node
# Distributed caching layer for Solana RPC

FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install --production

# Copy source
COPY src/ ./src/

# Environment defaults
ENV PORT=8545
ENV UPSTREAM_RPC=https://rpc.whistle.ninja/rpc
ENV COORDINATOR_URL=
ENV PROVIDER_WALLET=
ENV NODE_ID=

# Expose port
EXPOSE 8545

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8545/health || exit 1

# Run
CMD ["node", "src/index.js"]

