# Quick Setup Guide - Leadership Engine

This is a condensed setup guide. For detailed instructions, see [INSTALLATION.md](./INSTALLATION.md).

## ⚡ 5-Minute Setup

### Prerequisites Check

```bash
# Check Python (need 3.11+)
python --version

# Check Node.js (need 18+)
node --version

# Check npm
npm --version
```

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd Leadership_Engine_Dev-main
```

### Step 2: Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Step 3: Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install
```

### Step 4: Configure Environment

```bash
# Copy template
cd ../backend/config
copy env.template .env  # Windows
# OR
cp env.template .env   # Linux/Mac

# Edit .env file with your credentials
# See INSTALLATION.md for required values
```

### Step 5: Start Application

**Terminal 1 - Backend:**
```bash
cd backend
venv\Scripts\activate  # Windows
# OR
source venv/bin/activate  # Linux/Mac
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 6: Access

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 🐳 Docker Quick Start

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## 📋 Required Configuration

### Minimum Required Environment Variables

Create `backend/config/.env`:

```env
# Required: AI Configuration
OPENAI_API_KEY=your-api-key
OPENAI_API_ENDPOINT=https://your-endpoint/invocations
OPENAI_MODEL=databricks-gpt-5-1

# Required: Jira (if using)
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_SERVICE_EMAIL=your-email@example.com
JIRA_SERVICE_API_TOKEN=your-token

# Required: Secrets (change in production!)
SESSION_SECRET_KEY=your-32-char-secret
JWT_SECRET_KEY=your-32-char-secret
```

---

## ✅ Verify Installation

1. **Backend Health Check:**
   ```bash
   curl http://localhost:8000/health
   ```
   Should return: `{"status": "healthy"}`

2. **Frontend:**
   - Open http://localhost:3000
   - Should see login page or dashboard

3. **API Docs:**
   - Open http://localhost:8000/docs
   - Should see Swagger UI

---

## 🆘 Common Issues

**Port already in use:**
- Change port in `main.py` (backend) or use `npm run dev -- -p 3001` (frontend)

**Module not found:**
- Reinstall dependencies: `pip install -r requirements.txt` or `npm install`

**Environment variables not loading:**
- Ensure `.env` is in `backend/config/` directory
- Restart the server

---

## 📚 Next Steps

- [Installation Guide](./INSTALLATION.md) - Complete setup instructions
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment
- [User Guide](docs/guides/NEW_USER_GUIDE.md) - How to use the application

---

**Setup complete!** 🎉

