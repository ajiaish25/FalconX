# FalconX - Quick Reference Guide

## 🚀 Quick Start

### Windows
```batch
start.bat
```

### Linux/Mac
```bash
./start.sh
```

---

## 📁 Project Structure at a Glance

```
FalconX/
├── backend/              ← FastAPI server
│   ├── app/              ← Application core
│   ├── config/           ← .env & auth
│   ├── services/         ← Business logic
│   ├── models/           ← Data models (ready)
│   ├── middleware/       ← Middleware (ready)
│   ├── main.py           ← FastAPI app
│   └── requirements.txt
│
├── frontend/             ← Next.js app
│   ├── app/              ← Routes & components
│   ├── src/              ← Utilities & hooks
│   ├── public/           ← Assets (logos, images)
│   └── package.json
│
├── docs/                 ← Documentation
├── tests/                ← Test files
├── scripts/              ← Utility scripts
├── config/               ← Config templates
│
├── README.md             ← Main guide
├── PROJECT_STRUCTURE.md  ← Complete structure
├── MIGRATION_GUIDE.md    ← Migration info
├── REFACTORING_SUMMARY.md ← Changes made
└── QUICK_REFERENCE.md    ← This file
```

---

## 🔧 Common Tasks

### Setup & Installation

**First Time Setup:**
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install

# Configuration
cp ../config/config.env.template backend/config/.env
# Edit backend/config/.env with your API keys
```

### Running the Application

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Running Tests

```bash
cd tests
python test_integration.py
python test_ai.py
python comprehensive_test.py
```

### Updating Code

**After pulling new changes:**
```bash
# Backend
cd backend
pip install -r requirements.txt  # If dependencies changed

# Frontend
cd ../frontend
npm install  # If dependencies changed
```

---

## 📚 Key Files

| File | Purpose |
|------|---------|
| `backend/main.py` | FastAPI entry point |
| `backend/services/ai_engine.py` | AI core engine |
| `backend/services/jira.py` | Jira integration |
| `backend/services/confluence.py` | Confluence integration |
| `backend/config/auth.py` | Authentication |
| `backend/config/.env` | Environment variables |
| `frontend/app/page.tsx` | Home page |
| `frontend/app/layout.tsx` | Root layout |
| `frontend/public/images/cdk-logo.svg` | CDK logo |
| `frontend/package.json` | Frontend dependencies |

---

## 🔑 Environment Variables

**Required in `backend/config/.env`:**
```env
OPENAI_API_KEY=your_key_here
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your_email@example.com
JIRA_API_TOKEN=your_token
CONFLUENCE_URL=https://your-domain.atlassian.net/wiki
```

**Template:** Copy from `config/config.env.template`

---

## 📦 Backend Services

| Service | File | Purpose |
|---------|------|---------|
| AI Engine | `services/ai_engine.py` | Core AI processing |
| Chatbot | `services/chatbot_engine.py` | Conversational AI |
| Jira | `services/jira.py` | Jira API client |
| Confluence | `services/confluence.py` | Confluence client |
| Analytics | `services/analytics.py` | Data analytics |
| JQL Processor | `services/jql_processor.py` | Query processing |
| Entity Extractor | `services/entity_extractor.py` | NLP extraction |
| Summarizer | `services/summarizer.py` | Text summarization |
| RAG Handler | `services/rag_handler.py` | Databricks RAG |

---

## 🎨 Frontend Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Header | `app/components/Header.tsx` | Navigation header |
| Sidebar | `app/components/Sidebar.tsx` | Left navigation |
| ChatInterface | `app/components/ChatInterface.tsx` | Chat UI |
| Dashboard | `app/components/DashboardPage.tsx` | Analytics dashboard |
| FalconXInsights | `app/components/FalconXInsights.tsx` | Insights display |
| FalconXModeToggle | `app/components/FalconXModeToggle.tsx` | Mode switcher |
| JiraConnect | `app/components/SimpleJiraConnect.tsx` | Jira setup |
| ConfluenceConnect | `app/components/SimpleConfluenceConnect.tsx` | Confluence setup |

---

## 📝 Import Examples

### Backend Imports
```python
# AI Engine
from services.ai_engine import IntelligentAIEngine

# Jira Integration
from services.jira import JiraClient

# Configuration
from config.auth import JiraConfig

# Utilities
from app.utils.advanced_jql_generator import JQLGenerator
```

### Frontend Imports
```typescript
// Components
import { ChatInterface } from '@/app/components/ChatInterface'
import { DashboardPage } from '@/app/components/DashboardPage'

// Contexts
import { useChatContext } from '@/app/contexts/ChatContext'
import { useUserContext } from '@/app/contexts/UserContext'

// Utilities
import { fetchData } from '@/src/lib/utils'
```

---

## 🐛 Troubleshooting

### Import Errors
```
ModuleNotFoundError: No module named 'services'
```
**Fix:**
- Ensure you're in `backend/` directory when running
- Verify `__init__.py` files exist in all packages
- Run: `cd backend && python main.py`

### Port Already in Use
```
Address already in use: ('127.0.0.1', 8000)
```
**Fix:**
- Kill the process: `lsof -ti:8000 | xargs kill -9` (Mac/Linux)
- Or use different port: `python main.py --port 8001`

### Missing Environment Variables
```
KeyError: 'OPENAI_API_KEY'
```
**Fix:**
- Create `backend/config/.env`
- Copy from template: `cp config/config.env.template backend/config/.env`
- Fill in your API keys

### Node Modules Issues
```
npm ERR! code ERESOLVE
```
**Fix:**
- Delete `node_modules/` and `package-lock.json`
- Run: `npm install --legacy-peer-deps`

---

## 📖 Documentation Map

| Document | Content |
|----------|---------|
| `README.md` | Project overview & features |
| `PROJECT_STRUCTURE.md` | Complete directory structure |
| `MIGRATION_GUIDE.md` | Migration instructions |
| `REFACTORING_SUMMARY.md` | Changes made |
| `QUICK_REFERENCE.md` | This file |
| `INSTALLATION_GUIDE.md` | Installation steps |
| `NEW_USER_GUIDE.md` | Getting started |
| `docs/INTEGRATION_GUIDE.md` | Jira/Confluence setup |
| `docs/AI_SETUP_README.md` | AI configuration |
| `docs/DATABRICKS_RAG_SETUP.md` | Databricks RAG setup |

---

## 🎯 Project Info

| Item | Value |
|------|-------|
| **Name** | FalconX |
| **Type** | AI Project Management Assistant |
| **Backend** | FastAPI (Python 3.11+) |
| **Frontend** | Next.js 14 (TypeScript) |
| **Status** | ✅ Production Ready |
| **Last Updated** | October 28, 2025 |

---

## 🔗 Quick Links

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/health

---

## ⚡ Tips & Tricks

### Faster Development
- Use `npm run dev` for hot reload (frontend)
- Backend auto-restarts with watchdog (if installed)
- Keep browser DevTools open for debugging

### Testing Queries
- Use API docs at `localhost:8000/docs`
- Test Jira queries in isolation
- Use comprehensive tests: `python comprehensive_test.py`

### Performance
- Backend caches projects for 5 minutes
- Frontend uses React context for state management
- Enable Databricks RAG for better performance

### Debugging
- Backend logs to console (level: INFO)
- Frontend uses React DevTools
- Check `tests/` folder for debug scripts

---

## 📞 Support

1. **Check Documentation:** `README.md` or `PROJECT_STRUCTURE.md`
2. **Review Tests:** `tests/` folder has many examples
3. **Check Guides:** `docs/` folder has setup guides
4. **Debug:** Use API docs at `/docs` endpoint

---

## 🎓 Next Steps

1. ✅ Read `README.md` for overview
2. ✅ Follow `INSTALLATION_GUIDE.md` for setup
3. ✅ Review `PROJECT_STRUCTURE.md` for structure
4. ✅ Check `docs/INTEGRATION_GUIDE.md` for Jira/Confluence setup
5. ✅ Run the application and explore!

---

**Happy Coding with FalconX! 🚀**

*For more detailed information, see the full documentation.*
