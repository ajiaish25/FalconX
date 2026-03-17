# FalconX - Project Structure

## Overview
FalconX is a modern AI-powered project management assistant that integrates with Jira and Confluence. This document describes the organized framework-like structure of the project.

## Directory Structure

```
FalconX/
│
├── backend/                          # FastAPI backend application
│   ├── app/                          # Application core
│   │   ├── __init__.py              # Package initialization
│   │   └── utils/                   # Utility modules
│   │       ├── __init__.py
│   │       ├── advanced_jql_generator.py
│   │       ├── enhanced_jql_training_loader.py
│   │       ├── metrics_utils.py
│   │       └── slot_based_nlu.py
│   │
│   ├── config/                       # Configuration management
│   │   ├── __init__.py
│   │   ├── .env                     # Environment variables
│   │   └── auth.py                  # Authentication & secrets
│   │
│   ├── services/                     # Business logic services
│   │   ├── __init__.py
│   │   ├── ai_engine.py             # AI engine core
│   │   ├── chatbot_engine.py        # Advanced chatbot
│   │   ├── analytics.py             # Analytics engine
│   │   ├── jira.py                  # Jira API client
│   │   ├── confluence.py            # Confluence API client
│   │   ├── rag_handler.py           # Databricks RAG handler
│   │   ├── jql_processor.py         # Enhanced JQL processing
│   │   ├── router.py                # Intent routing
│   │   ├── entity_extractor.py      # Entity extraction
│   │   ├── summarizer.py            # AI summarizer
│   │   └── ai.py                    # AI engine utilities
│   │
│   ├── models/                       # Data models
│   │   └── __init__.py
│   │
│   ├── middleware/                   # Custom middleware
│   │   └── __init__.py
│   │
│   ├── main.py                      # FastAPI application entry point
│   └── requirements.txt             # Python dependencies
│
├── frontend/                         # Next.js frontend application
│   ├── app/                         # Next.js app directory
│   │   ├── components/              # React components
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Navigation.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── RightSidebar.tsx
│   │   │   ├── FalconXConfigCenter.tsx
│   │   │   ├── FalconXInsights.tsx
│   │   │   ├── FalconXModeToggle.tsx
│   │   │   ├── FalconXStatusIndicator.tsx
│   │   │   ├── SimpleFalconXConnect.tsx
│   │   │   ├── SimpleJiraConnect.tsx
│   │   │   ├── SimpleConfluenceConnect.tsx
│   │   │   ├── Integrations.tsx
│   │   │   ├── IntegrationsDropdown.tsx
│   │   │   ├── ProfileDropdown.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   ├── LoadingComponents.tsx
│   │   │   ├── StatusIndicators.tsx
│   │   │   ├── ConnectionPopup.tsx
│   │   │   └── ui/                  # UI component library
│   │   │       ├── button.tsx
│   │   │       ├── card.tsx
│   │   │       ├── input.tsx
│   │   │       ├── select.tsx
│   │   │       ├── tabs.tsx
│   │   │       ├── accordion.tsx
│   │   │       └── ...
│   │   ├── contexts/                # React contexts
│   │   │   ├── ChatContext.tsx
│   │   │   ├── SettingsContext.tsx
│   │   │   ├── ThemeContext.tsx
│   │   │   └── UserContext.tsx
│   │   ├── layout.tsx               # Root layout
│   │   ├── page.tsx                 # Home page
│   │   ├── globals.css              # Global styles
│   │   └── leadership/              # Leadership mode pages
│   │       └── page.tsx
│   │
│   ├── src/                         # Source directory
│   │   ├── lib/                     # Utilities & helpers
│   │   │   ├── api-config.ts
│   │   │   ├── databricks-client.ts
│   │   │   └── utils.ts
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── services/                # API services
│   │   ├── types/                   # TypeScript types
│   │   ├── utils/                   # Utility functions
│   │   └── contexts/                # Moved contexts if needed
│   │
│   ├── public/                      # Static assets
│   │   ├── images/                  # Image assets
│   │   │   ├── company-logo.png
│   │   │   └── cdk-logo.svg
│   │   └── ...
│   │
│   ├── package.json                 # Dependencies
│   ├── next.config.js               # Next.js config
│   ├── tailwind.config.js           # Tailwind config
│   ├── tsconfig.json                # TypeScript config
│   └── postcss.config.js            # PostCSS config
│
├── docs/                            # Documentation
│   ├── guides/                      # User & setup guides
│   │   ├── QUICK_START.md
│   │   ├── INSTALLATION_GUIDE.md
│   │   ├── NEW_USER_GUIDE.md
│   │   ├── USER_GUIDE.md
│   │   ├── INTEGRATION_GUIDE.md
│   │   └── ...
│   │
│   ├── api/                         # API documentation
│   │   ├── README.md
│   │   └── ...
│   │
│   ├── SETUP_CHECKLIST.md
│   ├── ADVANCED_CHATBOT_SUMMARY.md
│   ├── AI_SETUP_README.md
│   ├── DATABRICKS_RAG_SETUP.md
│   └── ... (other documentation)
│
├── config/                          # Configuration templates
│   ├── config.env.template          # Environment template
│   ├── leadership_config.env.template
│   └── data/                        # Training data
│       ├── jira_ai_training_pack.json
│       └── jira_intents.json
│
├── tests/                           # Test suite
│   ├── test_integration.py
│   ├── test_ai.py
│   ├── test_api_key.py
│   ├── comprehensive_test.py
│   └── ... (other tests)
│
├── scripts/                         # Utility scripts
│   ├── start.bat                    # Windows startup
│   ├── start.sh                     # Linux/Mac startup
│   ├── start_integrated.bat
│   ├── start_integrated.sh
│   ├── debug.bat
│   └── fetch_jira.ps1
│
├── start.bat                        # Root startup (Windows)
├── start.sh                         # Root startup (Linux/Mac)
├── package.json                     # Root dependencies
├── package-lock.json
├── README.md                        # Main documentation
├── QUICK_START.md
├── INSTALLATION_GUIDE.md
├── NEW_USER_GUIDE.md
├── PROJECT_STRUCTURE.md             # This file
├── SETUP_CHECKLIST.md
└── .gitignore
```

## Layer Architecture

### Backend Architecture
```
┌─────────────────────────────────────┐
│    FastAPI Application (main.py)    │
├─────────────────────────────────────┤
│  Middleware & Error Handling        │
├─────────────────────────────────────┤
│       Services Layer                │
│  ┌──────────────────────────────┐   │
│  │ AI Engine   │ Chatbot Engine │   │
│  │ Analytics   │ Jira Client    │   │
│  │ Confluence  │ RAG Handler    │   │
│  └──────────────────────────────┘   │
├─────────────────────────────────────┤
│  Utilities & Processors             │
│  (JQL, Entity Extraction, Routing)  │
├─────────────────────────────────────┤
│  Configuration & Auth               │
└─────────────────────────────────────┘
```

### Frontend Architecture
```
┌─────────────────────────────────────┐
│    Next.js App Directory            │
├─────────────────────────────────────┤
│  Pages (Layout, Home, Leadership)   │
├─────────────────────────────────────┤
│  Components Layer                   │
│  ┌──────────────────────────────┐   │
│  │ Features  │  UI Components   │   │
│  │ Contexts  │  Utilities       │   │
│  └──────────────────────────────┘   │
├─────────────────────────────────────┤
│  Styling (Tailwind CSS)             │
├─────────────────────────────────────┤
│  Public Assets & Branding           │
└─────────────────────────────────────┘
```

## Key Files

### Backend Core
- **`backend/main.py`** - FastAPI application entry point and route handlers
- **`backend/services/ai_engine.py`** - Core AI engine implementation
- **`backend/services/chatbot_engine.py`** - Advanced chatbot with context awareness
- **`backend/config/auth.py`** - Authentication and credential management
- **`backend/requirements.txt`** - Python dependencies

### Frontend Core
- **`frontend/app/page.tsx`** - Home page
- **`frontend/app/leadership/page.tsx`** - Leadership mode
- **`frontend/app/layout.tsx`** - Root layout with providers
- **`frontend/package.json`** - Node.js dependencies
- **`frontend/next.config.js`** - Next.js configuration

### Configuration
- **`backend/config/.env`** - Environment variables (API keys, URLs)
- **`config/config.env.template`** - Template for environment setup
- **`config/data/jira_intents.json`** - Jira integration intents

## Environment Setup

### Backend Environment Variables
Create `backend/config/.env`:
```env
OPENAI_API_KEY=your_openai_key
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your_email@example.com
JIRA_API_TOKEN=your_api_token
CONFLUENCE_URL=https://your-domain.atlassian.net/wiki
DATABRICKS_URL=your_databricks_url
DATABRICKS_TOKEN=your_token
```

### Access Points
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/health

## Development Workflow

### Running the Application

**Windows:**
```bash
# Terminal 1: Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python main.py

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

**Linux/Mac:**
```bash
# Terminal 1: Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

Or use the convenience scripts:
```bash
./start.sh  # Linux/Mac
start.bat   # Windows
```

### Running Tests
```bash
cd tests
python test_integration.py
python test_ai.py
python comprehensive_test.py
```

## Technology Stack

### Backend
- **FastAPI** - Modern async web framework
- **Python 3.11+**
- **Jira REST API v3** - Jira integration
- **Confluence REST API** - Documentation search
- **OpenAI GPT-4o-mini** - AI processing
- **Databricks** - RAG and vector search

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **Framer Motion** - Animations

## Branding

### Logos
- CDK Logo: `frontend/public/images/cdk-logo.svg`
- Company Logo: `frontend/public/images/company-logo.png`

### Project Name
All references have been updated from "Leadership Engine" to "FalconX" and "TAO" to "CDK".

## Best Practices

### Backend
- Place business logic in `services/`
- Use `config/` for environment and secrets
- Keep utilities in `app/utils/`
- Add middleware for cross-cutting concerns
- Use proper error handling and logging

### Frontend
- Keep components modular and reusable
- Use contexts for global state
- Organize by feature, not by type
- Use TypeScript for type safety
- Follow Tailwind utility-first approach

## Notes
- Python virtual environment and node_modules are not committed (added to .gitignore)
- Configuration files use environment variables for sensitive data
- All documentation is maintained in the `docs/` folder
- Old files have been cleaned up for a cleaner project structure
