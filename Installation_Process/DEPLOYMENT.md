# Deployment Guide - Leadership Engine

Complete guide for deploying the Leadership Engine to production environments.

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Docker Deployment](#docker-deployment)
3. [Manual Server Deployment](#manual-server-deployment)
4. [Cloud Platform Deployment](#cloud-platform-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Security Best Practices](#security-best-practices)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## ✅ Pre-Deployment Checklist

Before deploying, ensure:

- [ ] All environment variables are configured
- [ ] Secrets are encrypted and secure
- [ ] Database connections are tested
- [ ] API keys are valid and have proper permissions
- [ ] SSL certificates are configured (for HTTPS)
- [ ] Firewall rules are configured
- [ ] Backup strategy is in place
- [ ] Monitoring is set up
- [ ] Logging is configured

---

## 🐳 Docker Deployment

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

### Step 1: Create Docker Files

The project includes Docker configuration files (see below).

### Step 2: Build and Run

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Step 3: Access Application

- **Frontend:** http://your-server:3000
- **Backend API:** http://your-server:8000

---

## 🖥️ Manual Server Deployment

### Step 1: Prepare Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.11+
sudo apt install python3.11 python3.11-venv python3-pip

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install nginx (for reverse proxy)
sudo apt install nginx
```

### Step 2: Clone and Setup

```bash
# Clone repository
git clone <repository-url>
cd Leadership_Engine_Dev-main

# Setup backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Setup frontend
cd ../frontend
npm install
npm run build
```

### Step 3: Configure Systemd Services

**Backend Service** (`/etc/systemd/system/leadership-backend.service`):

```ini
[Unit]
Description=Leadership Engine Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/Leadership_Engine_Dev-main/backend
Environment="PATH=/path/to/Leadership_Engine_Dev-main/backend/venv/bin"
ExecStart=/path/to/Leadership_Engine_Dev-main/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

**Frontend Service** (`/etc/systemd/system/leadership-frontend.service`):

```ini
[Unit]
Description=Leadership Engine Frontend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/Leadership_Engine_Dev-main/frontend
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
```

**Enable and Start Services:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable leadership-backend
sudo systemctl enable leadership-frontend
sudo systemctl start leadership-backend
sudo systemctl start leadership-frontend
```

### Step 4: Configure Nginx Reverse Proxy

**Nginx Configuration** (`/etc/nginx/sites-available/leadership-engine`):

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend Docs
    location /docs {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

**Enable Configuration:**

```bash
sudo ln -s /etc/nginx/sites-available/leadership-engine /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## ☁️ Cloud Platform Deployment

### AWS Deployment

#### Option 1: EC2 Instance

1. Launch EC2 instance (Ubuntu 22.04 LTS)
2. Follow [Manual Server Deployment](#manual-server-deployment) steps
3. Configure Security Groups:
   - Port 80 (HTTP)
   - Port 443 (HTTPS)
   - Port 22 (SSH)

#### Option 2: ECS (Elastic Container Service)

1. Push Docker images to ECR
2. Create ECS cluster and task definitions
3. Configure Application Load Balancer
4. Set up auto-scaling

#### Option 3: Elastic Beanstalk

1. Install EB CLI: `pip install awsebcli`
2. Initialize: `eb init`
3. Create environment: `eb create`
4. Deploy: `eb deploy`

### Azure Deployment

#### App Service

1. Create App Service Plan
2. Create Web App for backend
3. Create Web App for frontend
4. Configure deployment from Git
5. Set environment variables in Azure Portal

### Google Cloud Platform

#### Cloud Run

1. Build and push Docker images to GCR
2. Deploy to Cloud Run:
   ```bash
   gcloud run deploy leadership-backend --image gcr.io/PROJECT/backend
   gcloud run deploy leadership-frontend --image gcr.io/PROJECT/frontend
   ```

---

## 🔐 Environment Configuration

### Production Environment Variables

Create `backend/config/.env.production`:

```env
# Production-specific settings
ENVIRONMENT=production
DEBUG=False

# Use strong secrets in production
SESSION_SECRET_KEY=<generate-strong-32-char-secret>
JWT_SECRET_KEY=<generate-strong-32-char-secret>

# Production API endpoints
OPENAI_API_ENDPOINT=https://your-production-endpoint/invocations

# Database (if using)
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# CORS settings
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

### Frontend Production Build

```bash
cd frontend
npm run build
npm start
```

Set environment variables:
```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NODE_ENV=production
```

---

## 🔒 Security Best Practices

### 1. Secrets Management

- **Never commit secrets** to version control
- Use environment variables or secret management services
- Rotate secrets regularly
- Use different secrets for each environment

### 2. SSL/TLS

- Always use HTTPS in production
- Use valid SSL certificates (Let's Encrypt is free)
- Enable HSTS headers
- Use strong cipher suites

### 3. Authentication

- Enable LDAP authentication
- Use strong password policies
- Implement rate limiting
- Use JWT tokens with expiration

### 4. API Security

- Enable CORS with specific origins
- Implement rate limiting
- Use API keys for external access
- Validate all inputs

### 5. Database Security

- Use encrypted connections
- Limit database access
- Regular backups
- Monitor for suspicious activity

### 6. Server Hardening

- Keep system updated
- Use firewall (UFW/iptables)
- Disable unnecessary services
- Use non-root user for services
- Enable fail2ban for SSH protection

---

## 📊 Monitoring & Maintenance

### Health Checks

Set up monitoring for:

- **Backend Health:** `GET /health`
- **Frontend:** HTTP status checks
- **Database:** Connection checks
- **External APIs:** Jira/Confluence connectivity

### Logging

**Backend Logs:**
```bash
# View logs
journalctl -u leadership-backend -f

# Or if using Docker
docker-compose logs -f backend
```

**Frontend Logs:**
```bash
journalctl -u leadership-frontend -f
```

### Backup Strategy

1. **Database Backups** (if using database)
   - Daily automated backups
   - Weekly full backups
   - Monthly archive backups

2. **Configuration Backups**
   - Backup `.env` files (encrypted)
   - Backup SSL certificates
   - Backup nginx configurations

3. **Application Backups**
   - Backup code repository
   - Backup uploaded files (if any)

### Updates and Maintenance

**Regular Updates:**

```bash
# Update system
sudo apt update && sudo apt upgrade

# Update Python packages
cd backend
source venv/bin/activate
pip install -r requirements.txt --upgrade

# Update Node packages
cd frontend
npm update

# Restart services
sudo systemctl restart leadership-backend
sudo systemctl restart leadership-frontend
```

**Scheduled Maintenance:**

- Weekly: Review logs and performance
- Monthly: Security updates
- Quarterly: Dependency updates
- Annually: Major version upgrades

---

## 🚀 Quick Deployment Commands

### Docker

```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Restart
docker-compose restart
```

### Systemd

```bash
# Start services
sudo systemctl start leadership-backend
sudo systemctl start leadership-frontend

# Stop services
sudo systemctl stop leadership-backend
sudo systemctl stop leadership-frontend

# Restart services
sudo systemctl restart leadership-backend
sudo systemctl restart leadership-frontend

# Check status
sudo systemctl status leadership-backend
sudo systemctl status leadership-frontend
```

---

## 📝 Deployment Checklist

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Firewall rules configured
- [ ] Services running and enabled
- [ ] Nginx configured and running
- [ ] Health checks passing
- [ ] Monitoring set up
- [ ] Backups configured
- [ ] Documentation updated
- [ ] Team notified

---

## 🆘 Troubleshooting Deployment

### Service Won't Start

```bash
# Check service status
sudo systemctl status leadership-backend

# Check logs
sudo journalctl -u leadership-backend -n 50

# Check port availability
sudo netstat -tulpn | grep 8000
```

### Connection Issues

```bash
# Test backend
curl http://localhost:8000/health

# Test frontend
curl http://localhost:3000

# Check nginx
sudo nginx -t
sudo systemctl status nginx
```

### Performance Issues

- Check server resources: `htop` or `top`
- Review application logs
- Check database performance
- Monitor network traffic
- Review nginx access logs

---

## 📚 Additional Resources

- [Installation Guide](./INSTALLATION.md)
- [Configuration Guide](docs/setup/)
- [API Documentation](http://localhost:8000/docs)
- [User Guide](docs/guides/NEW_USER_GUIDE.md)

---

**Deployment complete!** 🎉

For installation instructions, see [INSTALLATION.md](./INSTALLATION.md)

