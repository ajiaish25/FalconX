# Environment Setup Guide - How OpenAI is Initialized

## ✅ Current Status

The `backend/config/.env` file has been **restored** and contains all necessary environment variables for the system to work.

---

## 📁 File Structure

```
backend/
├── config/
│   ├── .env              ← ✅ ENVIRONMENT VARIABLES (gitignored for security)
│   ├── auth.py
│   └── __init__.py
└── main.py
```

---

## 🔑 What's in `backend/config/.env`?

```env
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
DEBUG=false
LOG_LEVEL=INFO
```

### Why is this file special?
- ✅ Contains **sensitive credentials** (API keys)
- ✅ **NOT committed to Git** (in .gitignore for security)
- ✅ **Must exist locally** for the application to work
- ✅ Created from `config/config.env.template`

---

## 🚀 How OpenAI Gets Initialized

### Step 1: Backend Loads Environment Variables

**File: `backend/main.py` (line 19)**
```python
load_dotenv(os.path.join(os.path.dirname(__file__), 'config', '.env'), override=True)
```

**What this does:**
- Loads all variables from `backend/config/.env`
- Makes them available via `os.environ`

### Step 2: Services Access OpenAI Key

**File: `backend/services/ai_engine.py`**
```python
import os
from openai import OpenAI

# OpenAI client initialized with API key from environment
openai_api_key = os.environ.get('OPENAI_API_KEY')
client = OpenAI(api_key=openai_api_key)
```

**What this does:**
- Reads `OPENAI_API_KEY` from environment
- Creates OpenAI client automatically
- Client is ready to use for AI operations

### Step 3: Chat & AI Features Use the Client

**In any AI operation:**
```python
# Uses the initialized OpenAI client to:
# 1. Process user queries
# 2. Generate AI responses
# 3. Understand context
# 4. Return formatted results
```

---

## 📋 Setup Instructions

### Step 1: Create Your Environment File

Your `.env` file should already exist, but if you need to recreate it:

```bash
# From project root
copy config\config.env.template backend\config\.env
```

Or on Linux/Mac:
```bash
cp config/config.env.template backend/config/.env
```

### Step 2: Add Your OpenAI API Key

Edit `backend/config/.env` and replace:

```env
# ❌ BEFORE (doesn't work)
OPENAI_API_KEY=your_openai_api_key_here

# ✅ AFTER (works!)
OPENAI_API_KEY=sk-proj-YOUR_ACTUAL_KEY_HERE
```

**How to get your API key:**
1. Go to https://platform.openai.com/api-keys
2. Sign in or create account
3. Click "Create new secret key"
4. Copy the key
5. Paste into `backend/config/.env`

### Step 3: Verify Setup

```bash
cd backend
python -c "import os; from dotenv import load_dotenv; load_dotenv('config/.env'); print('✅ Key loaded' if os.environ.get('OPENAI_API_KEY') else '❌ Key missing')"
```

---

## 🔒 Security Best Practices

### ✅ DO's
- ✅ Store API keys in `.env` file
- ✅ Add `.env` to `.gitignore` (already done)
- ✅ Never commit `.env` to Git
- ✅ Use strong API keys
- ✅ Rotate keys periodically

### ❌ DON'Ts
- ❌ Never hardcode API keys in source code
- ❌ Never commit `.env` to repository
- ❌ Never share API keys publicly
- ❌ Never use test keys in production
- ❌ Never commit keys to pull requests

---

## 📊 Environment Variables Explained

| Variable | Purpose | Example | Required |
|----------|---------|---------|----------|
| `OPENAI_API_KEY` | OpenAI authentication | `sk-proj-...` | ✅ Yes |
| `OPENAI_MODEL` | Which model to use | `gpt-4o-mini` | ⚠️ Optional (defaults to gpt-4o-mini) |
| `DEBUG` | Enable debug mode | `false` | ⚠️ Optional |
| `LOG_LEVEL` | Logging verbosity | `INFO` | ⚠️ Optional |

---

## 🚀 Running with Environment Variables

### Step 1: Make sure `.env` exists
```bash
ls backend/config/.env   # Linux/Mac
dir backend\config\.env  # Windows
```

### Step 2: Start backend
```bash
cd backend
venv\Scripts\activate  # Windows
# or: source venv/bin/activate  # Linux/Mac

python main.py
```

**Expected output:**
```
✅ Started server process [PID]
✅ Application startup complete
✅ Uvicorn running on http://0.0.0.0:8000
```

### Step 3: Test OpenAI integration
```bash
# In another terminal
curl http://localhost:8000/health
```

---

## ❓ Troubleshooting

### Problem: "OPENAI_API_KEY not found"

**Solution:**
1. Check `.env` exists: `backend/config/.env`
2. Verify it has your actual API key (not `your_openai_api_key_here`)
3. Restart backend after editing

### Problem: "OpenAI API error: 401 Unauthorized"

**Solution:**
1. Verify API key is correct
2. Check key isn't expired
3. Regenerate key from https://platform.openai.com/api-keys

### Problem: "ModuleNotFoundError: No module named 'openai'"

**Solution:**
```bash
cd backend
pip install openai
```

### Problem: Backend crashes on startup

**Solution:**
1. Check `.env` has `OPENAI_API_KEY=...`
2. Verify file is not empty
3. No special characters in values

---

## 📚 File Locations Reference

| File | Purpose |
|------|---------|
| `backend/config/.env` | ✅ Your actual environment vars (NOT in Git) |
| `config/config.env.template` | Template to create `.env` |
| `backend/main.py` | Loads `.env` on startup |
| `backend/services/ai_engine.py` | Uses OPENAI_API_KEY |
| `.gitignore` | Hides `.env` from Git |

---

## 🎯 Quick Commands

```bash
# Create env file from template
copy config\config.env.template backend\config\.env

# Verify env file exists
test -f backend/config/.env && echo "✅ File exists"

# Edit env file
notepad backend\config\.env          # Windows
nano backend/config/.env             # Linux/Mac

# View env file
type backend\config\.env             # Windows
cat backend/config/.env              # Linux/Mac

# Test OpenAI connection
cd backend
python -c "from services.ai_engine import client; print('✅ OpenAI ready')"
```

---

## ✅ Checklist

- [ ] `backend/config/.env` file exists
- [ ] `OPENAI_API_KEY` is set with your actual key
- [ ] Key is not the placeholder text
- [ ] `.env` is in `.gitignore`
- [ ] Backend starts without "key not found" errors
- [ ] Can successfully call OpenAI endpoints

---

## 🔗 Related Documentation

- OpenAI API: https://platform.openai.com/docs/api-reference
- Environment Variables: https://en.wikipedia.org/wiki/.env
- Security Best Practices: https://owasp.org/www-community/

---

**Summary:** The OpenAI API key is loaded from `backend/config/.env` when the backend starts. This file is gitignored for security and must be created locally with your actual API key for the system to work.
