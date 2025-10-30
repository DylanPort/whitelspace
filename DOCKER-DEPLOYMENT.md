# 🐳 Ghost Whistle - Docker Deployment Guide

This guide shows you how to deploy all 10 bootstrap nodes using Docker - the easiest way to run in production!

---

## 🚀 **Quick Start (3 Minutes)**

### **Prerequisites**
- Docker installed ([Get Docker](https://docs.docker.com/get-docker/))
- Docker Compose installed (usually comes with Docker Desktop)
- Your node keypairs in the `node-keys/` directory

### **Step 1: Setup Environment**

```bash
# Copy environment template
cp env.template .env

# Edit with your values
nano .env
```

Add your Solana RPC URL (get one free at [helius.dev](https://helius.dev) or [quicknode.com](https://www.quicknode.com/)):

```env
RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
```

### **Step 2: Start All Services**

```bash
# Build and start all 10 nodes + signaling server + backend
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

**That's it!** All 10 nodes are now running. 🎉

---

## 📊 **Monitoring**

### **View Logs**

```bash
# All services
docker-compose logs -f

# Specific node
docker-compose logs -f node-1

# Last 100 lines
docker-compose logs --tail=100

# Signaling server
docker-compose logs -f signaling-server
```

### **Check Status**

```bash
# List running containers
docker-compose ps

# Check resource usage
docker stats

# Inspect specific container
docker inspect ghost-node-1
```

---

## 🔧 **Management Commands**

### **Restart Services**

```bash
# Restart all
docker-compose restart

# Restart specific node
docker-compose restart node-1

# Restart only nodes (not signaling server)
docker-compose restart node-1 node-2 node-3 node-4 node-5 node-6 node-7 node-8 node-9 node-10
```

### **Stop/Start Services**

```bash
# Stop all
docker-compose stop

# Start all
docker-compose start

# Stop specific node
docker-compose stop node-5

# Start specific node
docker-compose start node-5
```

### **Update Code**

```bash
# Pull latest code
git pull

# Rebuild containers
docker-compose build

# Restart with new code
docker-compose up -d
```

### **Clean Up**

```bash
# Stop and remove containers
docker-compose down

# Remove everything including volumes (CAUTION: deletes node storage)
docker-compose down -v

# Remove old images
docker image prune -a
```

---

## 🌐 **Production Deployment Options**

### **Option 1: Single Server (Simple)**

Deploy all 10 nodes on one VPS:

```bash
# On your VPS (Ubuntu/Debian)
git clone YOUR_REPO_URL ghost-whistle
cd ghost-whistle

# Setup environment
cp env.template .env
nano .env

# Start services
docker-compose up -d

# Enable auto-start on reboot
sudo systemctl enable docker
```

**Specs needed:**
- 4 vCPUs
- 8 GB RAM
- 50 GB SSD
- Cost: ~$40-60/month

### **Option 2: Distributed (Recommended)**

Deploy nodes across multiple servers for better reliability:

**Server 1** (US):
```yaml
# docker-compose.yml - only include node-1, node-2, node-3
services:
  node-1: ...
  node-2: ...
  node-3: ...
```

**Server 2** (EU):
```yaml
# docker-compose.yml - only include node-4, node-5, node-6
services:
  node-4: ...
  node-5: ...
  node-6: ...
```

**Server 3** (Asia):
```yaml
# docker-compose.yml - only include node-7, node-8, node-9, node-10
services:
  node-7: ...
  node-8: ...
  node-9: ...
  node-10: ...
```

### **Option 3: Cloud Platforms**

#### **Deploy to DigitalOcean App Platform**

1. Push code to GitHub
2. Create new App in DigitalOcean
3. Select your repo
4. Add environment variables
5. Deploy!

Cost: ~$12-24/month per server

#### **Deploy to Railway.app**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

Cost: ~$5-20/month based on usage

#### **Deploy to Fly.io**

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Deploy
fly launch
```

Cost: ~$10-30/month

---

## 🔒 **Security Best Practices**

### **1. Secure Node Keypairs**

```bash
# Encrypt keypairs before deploying
cd node-keys
for file in *.json; do
    gpg --symmetric --cipher-algo AES256 "$file"
done

# Only deploy encrypted versions
# Update docker-compose.yml to decrypt on startup
```

### **2. Use Secrets Management**

Instead of .env file, use Docker secrets:

```yaml
services:
  node-1:
    secrets:
      - rpc_url
      - supabase_key

secrets:
  rpc_url:
    external: true
  supabase_key:
    external: true
```

```bash
# Create secrets
echo "your-rpc-url" | docker secret create rpc_url -
echo "your-key" | docker secret create supabase_key -
```

### **3. Enable HTTPS**

Use Traefik as reverse proxy:

```yaml
services:
  traefik:
    image: traefik:v2.10
    command:
      - "--providers.docker=true"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.myresolver.acme.tlschallenge=true"
      - "--certificatesresolvers.myresolver.acme.email=your@email.com"
    ports:
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

---

## 📈 **Scaling**

### **Run Multiple Instances Per Node**

```yaml
services:
  node-1:
    deploy:
      replicas: 3  # Run 3 instances
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
```

### **Load Balancing**

Add nginx as load balancer:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - signaling-server
```

---

## 🛠️ **Troubleshooting**

### **Containers Keep Restarting**

```bash
# Check logs for errors
docker-compose logs node-1

# Check if keypairs are accessible
docker-compose exec node-1 ls -la /app/node-keys/

# Verify environment variables
docker-compose config
```

### **Out of Memory**

```bash
# Check memory usage
docker stats

# Increase memory limit in docker-compose.yml
services:
  node-1:
    mem_limit: 512m
```

### **Network Issues**

```bash
# Check network connectivity
docker-compose exec node-1 ping signaling-server

# Restart networking
docker network prune
docker-compose down
docker-compose up -d
```

### **Logs Not Showing**

```bash
# Check log driver
docker inspect ghost-node-1 | grep LogPath

# Change to json-file driver
services:
  node-1:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

---

## 📊 **Health Monitoring**

### **Add Health Checks**

Already included in Dockerfile:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

### **Setup Monitoring Stack**

Add Prometheus + Grafana:

```yaml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
  
  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

---

## 💾 **Backup Strategy**

### **Backup Node Keys**

```bash
# Create encrypted backup
docker run --rm -v $(pwd)/node-keys:/data \
  alpine tar -czf - /data | \
  gpg --symmetric --cipher-algo AES256 > node-keys-backup.tar.gz.gpg

# Upload to cloud storage
aws s3 cp node-keys-backup.tar.gz.gpg s3://your-bucket/
```

### **Backup Volumes**

```bash
# Backup all node storage
docker run --rm -v ghost-whistle_node-1-storage:/data \
  -v $(pwd):/backup alpine tar -czf /backup/node-1-storage.tar.gz /data
```

### **Automated Backups**

Add to docker-compose.yml:

```yaml
services:
  backup:
    image: offen/docker-volume-backup:latest
    environment:
      - BACKUP_CRON_EXPRESSION=0 2 * * *  # Daily at 2 AM
      - BACKUP_FILENAME=backup-%Y-%m-%d.tar.gz
      - BACKUP_PRUNING_PREFIX=backup-
      - BACKUP_RETENTION_DAYS=7
    volumes:
      - node-1-storage:/backup/node-1-storage:ro
      - ./backups:/archive
```

---

## 🔍 **Performance Tuning**

### **Optimize Resource Usage**

```yaml
services:
  node-1:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.25'
          memory: 128M
```

### **Use BuildKit**

```bash
# Enable BuildKit for faster builds
export DOCKER_BUILDKIT=1

# Build with cache
docker-compose build --build-arg BUILDKIT_INLINE_CACHE=1
```

---

## 📞 **Support**

- **Docker Docs**: https://docs.docker.com/
- **Docker Compose Docs**: https://docs.docker.com/compose/
- **Community**: GitHub Issues

---

## ✅ **Production Checklist**

- [ ] Docker & Docker Compose installed
- [ ] .env file configured with real values
- [ ] Node keypairs in node-keys/ directory
- [ ] Keypairs encrypted (optional but recommended)
- [ ] Containers built: `docker-compose build`
- [ ] Services started: `docker-compose up -d`
- [ ] All containers running: `docker-compose ps`
- [ ] Logs look healthy: `docker-compose logs`
- [ ] Health checks passing
- [ ] Nodes connected to signaling server
- [ ] Test relay transaction successful
- [ ] Monitoring setup (optional)
- [ ] Backup strategy in place
- [ ] Auto-restart enabled

---

**🎉 Your Ghost Whistle network is running in Docker!**

Run `docker-compose logs -f` to watch your nodes in action.

