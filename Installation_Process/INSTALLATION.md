# Installation Guide - Leadership Engine

Complete step-by-step installation instructions for setting up the Leadership Engine project on your local machine or server.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

1. **Python 3.11 or higher**
   - Download from [python.org](https://www.python.org/downloads/)
   - Verify installation: `python --version` or `python3 --version`

2. **Node.js 18.x or higher**
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`
   - npm comes bundled with Node.js

3. **Git** (for cloning the repository)
   - Download from [git-scm.com](https://git-scm.com/downloads)
   - Verify installation: `git --version`

### Optional (for production deployment)

4. **Docker & Docker Compose** (for containerized deployment)
   - Download from [docker.com](https://www.docker.com/get-started)
   - Verify installation: `docker --version` and `docker-compose --version`

---

## 🚀 Quick Installation (Windows)

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd Leadership_Engine_Dev-main
```

### Step 2: Run the Setup Script

```bash
start.bat
```

This script will:
- Set up Python virtual environment
- Install backend dependencies
- Install frontend dependencies
- Start both servers

### Step 3: Configure Environment Variables

1. Navigate to `backend/config/`
2. Copy `env.template` to `.env`:
   ```bash
   copy env.template .env
   ```
3. Edit `.env` with your credentials (see Configuration section below)

### Step 4: Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

---

## 🐧 Manual Installation (Linux/Mac)

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd Leadership_Engine_Dev-main
```

### Step 2: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Step 3: Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install
```

### Step 4: Configure Environment Variables

```bash
# Navigate to backend/config
cd ../backend/config

# Copy template to .env
cp env.template .env

# Edit .env with your credentials
nano .env  # or use your preferred editor
```

### Step 5: Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python main.py
# Or use uvicorn directly:
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 6: Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

---

## ⚙️ Configuration

### Backend Environment Variables

Create `backend/config/.env` file with the following variables:

```env
# Session Secret Key (change in production!)
SESSION_SECRET_KEY=your-secret-key-min-32-chars

# LDAP Authentication
LDAP_SERVICE_ACCOUNT_USERNAME=your-ldap-username
LDAP_SERVICE_ACCOUNT_PASSWORD=your-encrypted-password
LDAP_SERVER_URL=ldaps://your-ldap-server:636

# Jira Service Account
JIRA_SERVICE_EMAIL=your-email@example.com
JIRA_SERVICE_API_TOKEN=your-encrypted-api-token
JIRA_BASE_URL=https://your-domain.atlassian.net

# Confluence Service Account
CONFLUENCE_SERVICE_EMAIL=your-email@example.com
CONFLUENCE_SERVICE_API_TOKEN=your-encrypted-api-token
CONFLUENCE_BASE_URL=https://your-domain.atlassian.net/wiki

# OpenAI / Databricks AI Configuration
OPENAI_API_KEY=your-api-key
OPENAI_API_ENDPOINT=https://your-databricks-endpoint/invocations
OPENAI_MODEL=databricks-gpt-5-1

# JWT Secret (for authentication tokens)
JWT_SECRET_KEY=your-jwt-secret-min-32-chars
```

### Encrypting Passwords

For LDAP and Jira/Confluence passwords, use the encryption script:

```bash
cd backend/scripts
python generate_env.py
```

This will encrypt your passwords. Copy the encrypted values to your `.env` file.

### Frontend Environment Variables (Optional)

Create `frontend/.env.local` if needed:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🔑 Getting API Keys and Credentials

### Jira API Token

1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Copy the token and use it in `JIRA_SERVICE_API_TOKEN`

### Confluence API Token

1. Same as Jira - use your Atlassian API token
2. Use it in `CONFLUENCE_SERVICE_API_TOKEN`

### OpenAI / Databricks API Key

1. Contact your Databricks administrator for:
   - API Key
   - Endpoint URL
   - Model name

### LDAP Credentials

1. Contact your IT administrator for:
   - Service account username
   - Service account password
   - LDAP server URL

---

## ✅ Verification

### Check Backend

1. Open http://localhost:8000/health
2. Should return: `{"status": "healthy", "timestamp": "..."}`

### Check Frontend

1. Open http://localhost:3000
2. Should see the login page or dashboard

### Check API Documentation

1. Open http://localhost:8000/docs
2. Should see Swagger UI with all API endpoints

---

## 🐛 Troubleshooting

### Backend Issues

**Problem: Module not found errors**
```bash
# Solution: Reinstall dependencies
cd backend
pip install -r requirements.txt
```

**Problem: Port 8000 already in use**
```bash
# Solution: Change port in main.py or use:
uvicorn main:app --reload --port 8001
```

**Problem: Environment variables not loading**
- Ensure `.env` file is in `backend/config/` directory
- Check file name is exactly `.env` (not `.env.txt`)
- Restart the backend server

### Frontend Issues

**Problem: Module not found errors**
```bash
# Solution: Reinstall dependencies
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Problem: Port 3000 already in use**
```bash
# Solution: Change port
npm run dev -- -p 3001
```

**Problem: Build errors**
```bash
# Solution: Clear Next.js cache
cd frontend
rm -rf .next
npm run build
```

### Connection Issues

**Problem: Cannot connect to Jira/Confluence**
- Verify API tokens are correct
- Check network connectivity
- Verify URLs are correct (include `https://`)
- Check if VPN is required

**Problem: LDAP authentication fails**
- Verify LDAP server URL is correct
- Check service account credentials
- Ensure LDAP server is accessible
- Verify port 636 (LDAPS) is open

---

## 📦 Production Installation

For production deployment, see [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- Docker containerization
- Environment-specific configurations
- Security best practices
- Scaling considerations

---

## 🔄 Updating the Project

### Pull Latest Changes

```bash
git pull origin main
```

### Update Backend Dependencies

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt --upgrade
```

### Update Frontend Dependencies

```bash
cd frontend
npm update
```

---

## 📚 Next Steps

After installation:

1. **Configure Integrations:**
   - Set up Jira connection
   - Set up Confluence connection
   - Configure LDAP authentication

2. **Test the System:**
   - Run health checks
   - Test API endpoints
   - Verify frontend functionality

3. **Review Documentation:**
   - [User Guide](docs/guides/NEW_USER_GUIDE.md)
   - [API Documentation](http://localhost:8000/docs)
   - [Quick Reference](docs/guides/QUICK_REFERENCE.md)

---

## 🆘 Getting Help

If you encounter issues:

1. Check the [Troubleshooting](#-troubleshooting) section above
2. Review logs in `logs/` directory
3. Check [GitHub Issues](https://github.com/your-repo/issues)
4. Contact the development team

---

## 📝 Notes

- **Never commit `.env` files** - they contain sensitive credentials
- **Change default secrets** in production environments
- **Use encrypted passwords** for all service accounts
- **Keep dependencies updated** for security patches

---

**Installation complete!** 🎉

For deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

