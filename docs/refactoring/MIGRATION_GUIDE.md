# FalconX Migration Guide

## Overview
This document outlines the changes made to restructure the project from "Leadership Engine" to "FalconX" with a clean, organized framework-like structure.

## Key Changes

### 1. Project Rebranding
- **Old Name:** Leadership Engine / TAO
- **New Name:** FalconX / CDK
- All files, documentation, and code references have been updated
- The new branding is consistent across frontend, backend, and documentation

### 2. Directory Structure Reorganization

#### Backend Structure (Before → After)

**Before:**
```
backend/
├── main.py
├── jira_client.py
├── confluence_client.py
├── intelligent_ai_engine.py
├── advanced_chatbot.py
├── analytics_engine.py
├── auth.py
├── config.env
├── enhanced_jql_processor.py
├── intent_router.py
├── entity_extractor.py
├── utils/
├── requirements.txt
└── venv/
```

**After:**
```
backend/
├── app/
│   ├── __init__.py
│   └── utils/
├── config/
│   ├── __init__.py
│   ├── .env
│   └── auth.py
├── services/
│   ├── __init__.py
│   ├── ai_engine.py
│   ├── chatbot_engine.py
│   ├── analytics.py
│   ├── jira.py
│   ├── confluence.py
│   ├── rag_handler.py
│   ├── jql_processor.py
│   ├── router.py
│   ├── entity_extractor.py
│   ├── summarizer.py
│   └── ai.py
├── models/
│   └── __init__.py
├── middleware/
│   └── __init__.py
├── main.py
└── requirements.txt
```

#### Frontend Structure (Before → After)

**Before:**
```
frontend/
├── app/
│   ├── components/
│   ├── contexts/
│   ├── page.tsx
│   └── layout.tsx
├── lib/
├── components/
├── assets/
├── package.json
└── node_modules/
```

**After:**
```
frontend/
├── app/
│   ├── components/
│   ├── contexts/
│   ├── page.tsx
│   ├── layout.tsx
│   └── leadership/
├── src/
│   ├── lib/
│   ├── hooks/
│   ├── services/
│   ├── types/
│   ├── utils/
│   └── contexts/
├── public/
│   └── images/
├── package.json
└── node_modules/
```

### 3. File Reorganization Details

#### Backend File Moves
| Old Location | New Location | Module Name |
|---|---|---|
| `jira_client.py` | `services/jira.py` | `services.jira.JiraClient` |
| `confluence_client.py` | `services/confluence.py` | `services.confluence.ConfluenceConfig` |
| `intelligent_ai_engine.py` | `services/ai_engine.py` | `services.ai_engine.IntelligentAIEngine` |
| `advanced_chatbot.py` | `services/chatbot_engine.py` | `services.chatbot_engine.AdvancedChatbotEngine` |
| `analytics_engine.py` | `services/analytics.py` | `services.analytics.AdvancedAnalyticsEngine` |
| `enhanced_jql_processor.py` | `services/jql_processor.py` | `services.jql_processor.EnhancedJQLProcessor` |
| `intent_router.py` | `services/router.py` | `services.router` |
| `entity_extractor.py` | `services/entity_extractor.py` | `services.entity_extractor` |
| `ai_engine.py` | `services/ai.py` | `services.ai` |
| `ai_summarizer.py` | `services/summarizer.py` | `services.summarizer` |
| `databricks_rag_handler.py` | `services/rag_handler.py` | `services.rag_handler` |
| `auth.py` | `config/auth.py` | `config.auth.JiraConfig` |
| `config.env` | `config/.env` | N/A |
| `utils/` | `app/utils/` | `app.utils` |

#### Frontend Asset Moves
| Old Location | New Location |
|---|---|
| `assets/company-logo.png` | `public/images/company-logo.png` |
| `assets/cdk-logo.svg` | `public/images/cdk-logo.svg` |
| `lib/` | `src/lib/` |
| `components/ui/` | `src/components/ui/` |

### 4. Import Path Updates

#### Backend Import Updates
Update all import statements in backend files:

**Old Pattern:**
```python
from jira_client import JiraClient
from auth import JiraConfig
from intelligent_ai_engine import IntelligentAIEngine
from advanced_chatbot import AdvancedChatbotEngine
from enhanced_jql_processor import EnhancedJQLProcessor
```

**New Pattern:**
```python
from services.jira import JiraClient
from config.auth import JiraConfig
from services.ai_engine import IntelligentAIEngine
from services.chatbot_engine import AdvancedChatbotEngine
from services.jql_processor import EnhancedJQLProcessor
```

#### Environment Variable Loading
**Old:**
```python
load_dotenv(os.path.join(os.path.dirname(__file__), 'config.env'), override=True)
```

**New:**
```python
load_dotenv(os.path.join(os.path.dirname(__file__), 'config', '.env'), override=True)
```

### 5. Configuration Changes

#### Environment File Location
- **Old:** `backend/config.env`
- **New:** `backend/config/.env`

#### Setup Steps
1. Copy your existing `config.env` to `backend/config/.env`
2. Or copy from template:
   ```bash
   cp config/config.env.template backend/config/.env
   ```
3. Update with your credentials

### 6. Branding Changes

#### Text Replacements
| Old Text | New Text |
|---|---|
| Leadership Engine | FalconX |
| leadership engine | falconx |
| LeadershipEngine | FalconX |
| TAO Digital | FalconX |
| Powered by TAO | Powered by FalconX |

#### File Name Changes
| Old Name | New Name |
|---|---|
| LeadershipConfigCenter | FalconXConfigCenter |
| LeadershipInsights | FalconXInsights |
| LeadershipModeToggle | FalconXModeToggle |
| LeadershipStatusIndicator | FalconXStatusIndicator |
| SimpleLeadershipConnect | SimpleFalconXConnect |
| tao-logo | cdk-logo |

#### Logo Changes
- Replaced TAO logo with CDK logo
- New location: `frontend/public/images/cdk-logo.svg`

### 7. Removed Files and Directories

The following unnecessary files and directories have been removed:

#### Removed Directories
- `archive/` - Old/deprecated files
- `backend/venv/` - Virtual environment (can be recreated)
- `frontend/node_modules/` - Node packages (can be recreated with npm install)
- `backend/__pycache__/` - Python cache
- `frontend/app/figma/` - Old design files

#### Removed Files
- Test JSON reports from archive
- Backup files (*.bak)
- `backend/test_imports_simple.py` - Test file moved to tests/

### 8. New Project Structure Benefits

✅ **Cleaner Organization:**
- Services are logically grouped
- Configuration is separated from code
- Clear separation of concerns

✅ **Better Scalability:**
- Easy to add new services
- Middleware directory ready for cross-cutting concerns
- Models directory ready for Pydantic models

✅ **Improved Development:**
- Standard framework-like structure
- Easier onboarding for new developers
- Clear file navigation

✅ **Professional Branding:**
- Consistent naming (FalconX)
- Modern logo (CDK)
- Cohesive brand identity

## Migration Steps for Developers

### Step 1: Update Python Imports
If you have custom code importing from the backend:

```python
# Before
from jira_client import JiraClient

# After
from services.jira import JiraClient
```

### Step 2: Update Configuration
```bash
# Copy template
cp config/config.env.template backend/config/.env

# Or move existing config
mv backend/config.env backend/config/.env
```

### Step 3: Install Dependencies (Fresh Start)
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py

# Frontend
cd frontend
npm install
npm run dev
```

### Step 4: Verify New Structure
Run the application and verify:
- Frontend loads at http://localhost:3000
- Backend API responds at http://localhost:8000
- All services initialize correctly
- No import errors in console

## Troubleshooting

### Import Errors
If you get `ModuleNotFoundError`:
1. Verify you're in the correct directory: `cd backend`
2. Check that `__init__.py` files exist in all package directories
3. Ensure Python path includes the backend directory

### Configuration Errors
If environment variables aren't loading:
1. Verify `backend/config/.env` exists
2. Check file permissions
3. Confirm all required variables are set

### Tests Not Running
If tests fail:
1. Ensure you're in the `tests/` directory
2. Update any import paths in test files
3. Verify backend services are properly initialized

## Documentation Updates

All documentation has been updated to reflect:
- New project name: FalconX
- New structure: services, config, app organization
- New file paths and import statements
- CDK branding instead of TAO

### Key Documentation Files
- `PROJECT_STRUCTURE.md` - Complete structure overview
- `README.md` - Updated project description
- `INSTALLATION_GUIDE.md` - Updated installation steps
- `docs/` - All guides updated with new paths

## Version Compatibility

This reorganization is compatible with:
- Python 3.11+
- Node.js 18+
- FastAPI (latest)
- Next.js 14+

## Next Steps

1. **Review** the new `PROJECT_STRUCTURE.md` for complete directory layout
2. **Update** any custom code with new import paths
3. **Test** the application thoroughly
4. **Deploy** the reorganized version to your environment
5. **Monitor** for any import-related errors

## Questions or Issues?

Refer to:
- `PROJECT_STRUCTURE.md` for structure details
- `docs/INTEGRATION_GUIDE.md` for integration help
- `docs/AI_SETUP_README.md` for AI configuration
- Test files in `tests/` for usage examples

---

**Version:** 1.0  
**Date:** October 28, 2025  
**Project:** FalconX - AI-Powered Project Management Assistant
