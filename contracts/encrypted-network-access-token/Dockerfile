FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY x402-distributor-cron.js .
COPY x402-helpers.ts .

# Create directories
RUN mkdir -p /app/logs /app/keys

# Run as non-root user
USER node

# Start the cron job
CMD ["npm", "start"]




