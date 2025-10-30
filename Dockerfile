# Ghost Whistle Node - Production Docker Image
FROM node:18-alpine

# Install PM2
RUN npm install -g pm2

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --only=production

# Copy application files
COPY node-client.js .
COPY signaling-server.js .
COPY server.js .

# Create directories
RUN mkdir -p logs node-storage node-keys

# Copy node keys (will be mounted as volume in production)
# COPY node-keys/ ./node-keys/

# Expose ports
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]

