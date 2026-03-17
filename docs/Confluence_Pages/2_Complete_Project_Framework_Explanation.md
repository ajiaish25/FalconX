# FalconX Leadership Engine – Complete Project Framework Explanation

<!-- CONFLUENCE TIP: Use {panel:title=Key Concept|borderStyle=solid|borderColor=#3572b0|bgColor=#f0f0f0} for highlighted sections.
     Tables and code blocks paste directly. For diagrams, paste the ASCII art or use Draw.io/Gliffy. -->

> **Purpose:** Explain where each technology is used in FalconX, why it was chosen, and how the pieces fit together. Written for developers and architects who need to understand or extend the system.

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Technology Stack Overview](#technology-stack-overview)
3. [Backend Framework Deep Dive](#backend-framework-deep-dive)
4. [Frontend Framework Deep Dive](#frontend-framework-deep-dive)
5. [Data Flow and Integration Pattern](#data-flow-and-integration-pattern)
6. [Service Layer Explained](#service-layer-explained)
7. [Real-World Examples from FalconX](#real-world-examples-from-falconx)

---

## High-Level Architecture

FalconX is a **full-stack web application** with a clear separation between user interface (frontend) and business logic (backend). The backend talks to external systems (Jira, Confluence, Databricks) and handles authentication.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER (Browser)                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js – localhost:3000)                                        │
│  ┌──────────────┬──────────────┬──────────────┬──────────────────────────┐  │
│  │ Login Page   │ Dashboard    │ Chat (Work   │ Insights / QA Metrics /   │  │
│  │ (LDAP auth)  │ (NewFigmaApp)│ Buddy)      │ GitHub / Export           │  │
│  └──────────────┴──────────────┴──────────────┴──────────────────────────┘  │
│  React + TypeScript + Tailwind + shadcn/ui + Framer Motion                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                         HTTP/REST (JSON, JWT Bearer)
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  BACKEND (FastAPI – localhost:8000)                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  API Layer (main.py) – Routes, Auth Middleware, CORS                   │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │  Services Layer – AI, Jira, Confluence, RAG, Analytics, GitHub       │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │  Config & Auth – .env, LDAP, JWT, Encryption                          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
            ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐
            │ Jira API     │   │ Confluence    │   │ Databricks        │
            │ (projects)   │   │ API (wiki)    │   │ (AI, RAG, Vector) │
            └──────────────┘   └──────────────┘   └──────────────────┘
```

---

## Technology Stack Overview

### Summary Table

| Layer | Technology | Version | Where Used | Why We Use It |
|-------|------------|---------|------------|---------------|
| **Backend runtime** | Python | 3.11+ | `backend/` | Strong ecosystem for APIs, AI, and data processing |
| **Backend framework** | FastAPI | Latest | `main.py`, routes | Async, automatic OpenAPI docs, validation |
| **Backend server** | Uvicorn | Latest | `run_server.py` | ASGI server for FastAPI, supports async |
| **Frontend runtime** | Node.js | 18+ | `frontend/` | Required for Next.js and npm |
| **Frontend framework** | Next.js | 14 | `frontend/app/` | SSR, routing, API routes, good DX |
| **Frontend language** | TypeScript | 5 | All `.tsx` files | Type safety, better refactoring |
| **UI library** | React | 18 | Components | Component model, large ecosystem |
| **Styling** | Tailwind CSS | 3.3 | `globals.css`, classes | Utility-first, consistent design |
| **UI components** | shadcn/ui (Radix) | Latest | `components/ui/` | Accessible, customizable components |
| **Charts** | Recharts + Chart.js | Latest | Dashboards | Flexible charting for metrics |
| **Animations** | Framer Motion (motion) | 12 | Login, dashboards | Smooth transitions |
| **Auth (backend)** | LDAP + JWT | — | `ldap_auth.py`, `main.py` | Corporate identity, stateless API auth |
| **External: Jira** | Jira REST API | v3 | `services/jira.py` | Project and issue data |
| **External: Confluence** | Confluence REST API | — | `services/confluence.py` | Documentation search |
| **External: AI** | Databricks (OpenAI-compatible) | — | `services/ai_engine.py`, `rag_handler.py` | LLM and RAG over corporate docs |
| **External: GitHub** | GitHub API | — | `services/github.py` | Repo and commit insights |

---

## Backend Framework Deep Dive

### Directory Structure and Purpose

```
backend/
├── main.py              # FastAPI app, all route definitions, CORS, lifespan
├── run_server.py        # Uvicorn launcher, logging setup
├── config/
│   ├── .env             # Secrets (never commit)
│   ├── env.template     # Template for .env
│   └── auth.py          # JiraConfig, auth helpers
├── services/            # Business logic – the core of the backend
│   ├── ai_engine.py     # Natural language → Jira queries (Databricks LLM)
│   ├── chatbot_engine.py# Multi-turn chat, intent routing
│   ├── jira.py          # Jira REST client (projects, issues, boards)
│   ├── confluence.py   # Confluence REST client (search, pages)
│   ├── rag_handler.py   # RAG over Confluence (vector search + LLM)
│   ├── jira_rag_handler.py
│   ├── ldap_auth.py     # LDAP authentication
│   ├── encryption.py   # Encrypt/decrypt service passwords
│   ├── analytics.py     # Sprint metrics, velocity
│   ├── github.py        # GitHub API client
│   └── ...              # Other analyzers (defect leakage, QA metrics)
├── app/utils/           # JQL generation, entity extraction
└── requirements.txt     # Python dependencies
```

### Why FastAPI?

- **Async support:** Handles many concurrent API calls without blocking (e.g. Jira + Confluence in parallel).
- **Automatic API docs:** `/docs` gives Swagger UI for all endpoints without extra setup.
- **Pydantic validation:** Request/response models validate data and reduce bugs.
- **Performance:** One of the fastest Python frameworks for web APIs.

**Example from FalconX:** `main.py` defines routes like `@app.post("/api/auth/login")` and `@app.get("/api/jira/projects")`. FastAPI validates the `LoginRequest` body and returns structured JSON.

### Why Python for Backend?

- **AI/ML ecosystem:** OpenAI SDK, httpx, and Databricks integration are mature in Python.
- **Data processing:** `pandas`, `openpyxl` for Excel exports; `reportlab`, `python-pptx` for PDF/PPT.
- **LDAP support:** `ldap3` for corporate directory auth.
- **Jira/Confluence:** Well-supported REST clients (e.g. `httpx`, `aiohttp`).

---

## Frontend Framework Deep Dive

### Directory Structure and Purpose

```
frontend/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Home: login or main app
│   ├── layout.tsx          # Root layout, providers
│   ├── globals.css         # Tailwind, theme variables
│   ├── components/         # React components
│   │   ├── IntegratedLoginPage.tsx
│   │   ├── figma/NewFigmaApp.tsx   # Main app shell
│   │   ├── ChatInterface.tsx       # Work Buddy
│   │   ├── ui/                     # shadcn components
│   │   └── ...
│   ├── contexts/           # React Context (auth, theme, chat)
│   │   ├── AuthContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── ChatContext.tsx
│   └── leadership/         # Leadership-specific pages
├── lib/
│   ├── api-config.ts       # getApiUrl() – backend URL
│   └── databricks-client.ts# RAG client (optional)
├── package.json
├── tailwind.config.js
└── next.config.js
```

### Why Next.js?

- **App Router:** File-based routing (`app/page.tsx`, `app/leadership/page.tsx`).
- **Server and client components:** Mix server-rendered and client-interactive code.
- **Built-in optimizations:** Code splitting, image optimization.
- **Deployment:** `output: 'standalone'` supports Docker and cloud deployment.

**Example from FalconX:** `app/page.tsx` checks `useAuth()` – if not authenticated, it renders `IntegratedLoginPage`; otherwise `NewFigmaApp` (main dashboard). This keeps the entry point simple and auth-aware.

### Why Tailwind CSS?

- **Utility classes:** Style directly in JSX (e.g. `className="flex gap-4 p-4"`).
- **Design tokens:** `tailwind.config.js` defines colors, spacing; theme can be switched.
- **No CSS-in-JS runtime:** Smaller bundle, faster load.

### Why shadcn/ui (Radix)?

- **Accessibility:** Radix primitives handle focus, keyboard, screen readers.
- **Customizable:** Components are copied into the project (not a black-box package).
- **Consistency:** Button, Card, Dialog, Tabs, etc. look and behave the same across FalconX.

**Example from FalconX:** `IntegratedLoginPage` uses `Button`, `Card`, `Input`, `Label`, `Alert` from `components/ui/` for a consistent, accessible login form.

### Why Framer Motion (motion)?

- **Declarative animations:** `motion.div` with `animate`, `transition` for page transitions and micro-interactions.
- **Reduced layout thrash:** Handles enter/exit animations cleanly.

**Example from FalconX:** Login page and dashboard use motion for fade-in and slide effects.

---

## Data Flow and Integration Pattern

### Request Flow (User Action → Backend → External System)

```
User clicks "Get my open issues"
        │
        ▼
┌───────────────────────────────────┐
│  Frontend (React)                  │
│  • ChatInterface or Dashboard     │
│  • Calls getApiUrl('/api/chat')   │
│  • Sends: { message, context }    │
│  • Header: Authorization: Bearer <JWT>
└───────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────┐
│  Backend (FastAPI)                 │
│  • main.py: /api/chat route       │
│  • Validates JWT (if protected)   │
│  • Calls chatbot_engine or        │
│    ai_engine                      │
└───────────────────────────────────┘
        │
        ├─────────────────────────────────────┐
        ▼                                     ▼
┌─────────────────────┐           ┌─────────────────────┐
│  ai_engine.py        │           │  jira.py            │
│  • Understands intent│           │  • Fetches issues   │
│  • Generates JQL     │           │  • Uses service     │
│  • Uses Databricks   │           │    account creds    │
└─────────────────────┘           └─────────────────────┘
        │                                     │
        ▼                                     ▼
┌─────────────────────┐           ┌─────────────────────┐
│  Databricks LLM     │           │  Jira REST API      │
└─────────────────────┘           └─────────────────────┘
```

### Authentication Flow

| Step | Component | Action |
|------|-----------|--------|
| 1 | `IntegratedLoginPage` | User enters CDK username + password |
| 2 | `AuthContext.login()` | POST to `/api/auth/login` |
| 3 | `main.py` login route | Calls `authenticate_user()` |
| 4 | `ldap_auth.py` | Validates against LDAP |
| 5 | `main.py` | Creates JWT, returns token |
| 6 | Frontend | Stores token in `localStorage` |
| 7 | `main.py` | Calls `auto-connect-integrations` for Jira/Confluence |
| 8 | Subsequent requests | Send `Authorization: Bearer <token>` |

---

## Service Layer Explained

The backend logic lives in `services/`. Each module has a clear responsibility.

### Backend Services – What Each Does and Why

| Service | File | Purpose | Why It Exists |
|---------|------|---------|---------------|
| **AI Engine** | `ai_engine.py` | Turns natural language into Jira queries; uses Databricks LLM | Users ask in plain English; we need structured JQL |
| **Chatbot Engine** | `chatbot_engine.py` | Multi-turn chat, intent routing, follow-up questions | Work Buddy chat needs context and routing |
| **Jira Client** | `jira.py` | REST calls to Jira (projects, issues, boards) | Central place for all Jira API usage |
| **Confluence Client** | `confluence.py` | Search and fetch Confluence pages | Documentation search for RAG and links |
| **RAG Handler** | `rag_handler.py` | Vector search + LLM over Confluence docs | Answer questions using company documentation |
| **Jira RAG Handler** | `jira_rag_handler.py` | RAG over Jira data | Answer questions using issue/project data |
| **LDAP Auth** | `ldap_auth.py` | Validates CDK username/password via LDAP | Corporate single sign-on |
| **Encryption** | `encryption.py` | Encrypt/decrypt API tokens in .env | Avoid plain-text secrets in config |
| **Analytics** | `analytics.py` | Sprint velocity, burndown, KPIs | Dashboard metrics |
| **GitHub Client** | `github.py` | Repository and commit data | GitHub insights in FalconX |

### Frontend Contexts – What Each Manages

| Context | File | Purpose | Why It Exists |
|---------|------|---------|---------------|
| **AuthContext** | `AuthContext.tsx` | Login state, token, user info | Single source of auth state for the app |
| **ThemeContext** | `ThemeContext.tsx` | Light/dark mode | Consistent theme across pages |
| **ChatContext** | `ChatContext.tsx` | Chat history, Work Buddy state | Shared chat state |
| **UserContext** | `UserContext.tsx` | User profile, preferences | User-specific settings |
| **SettingsContext** | `SettingsContext.tsx` | Integration settings | Jira/Confluence config in UI |

---

## Real-World Examples from FalconX

### Example 1: User Asks “Show me bugs in NDP project”

1. **Frontend:** `ChatInterface` sends message to `POST /api/chat`.
2. **Backend:** `ai_engine.py` receives the message.
3. **AI Engine:** Calls Databricks LLM to understand intent and generate JQL, e.g. `project = NDP AND type = Bug`.
4. **Jira Client:** `jira.py` runs the JQL via Jira REST API.
5. **Backend:** Formats issues and returns to frontend.
6. **Frontend:** Renders the list in the chat or a table.

**Technologies involved:** Next.js (UI), FastAPI (route), Databricks LLM (intent/JQL), `jira.py` (Jira REST), React (display).

### Example 2: User Logs In

1. **Frontend:** `IntegratedLoginPage` calls `login(username, password)`.
2. **AuthContext:** Sends POST to `/api/auth/login`.
3. **Backend:** `main.py` calls `authenticate_user()` from `ldap_auth.py`.
4. **LDAP:** Validates against `LDAP_SERVER_URL` using `ldap3`.
5. **Backend:** Creates JWT with `PyJWT`, returns token.
6. **Frontend:** Saves token, calls `/api/auth/auto-connect-integrations`.
7. **Backend:** Uses `encryption.py` to decrypt Jira/Confluence tokens, connects both.
8. **Frontend:** Shows `NewFigmaApp` dashboard.

**Technologies involved:** React (form), FastAPI (auth routes), `ldap3` (LDAP), `PyJWT` (JWT), `cryptography` (encryption).

### Example 3: User Exports Sprint Report to Excel

1. **Frontend:** User selects “Export to Excel” on a sprint report.
2. **Backend:** Route receives filters, calls `analytics.py` for sprint data.
3. **Backend:** Uses `pandas` and `openpyxl` to build an Excel file.
4. **Backend:** Returns file as `StreamingResponse` with correct headers.
5. **Frontend:** Triggers download (e.g. via `exceljs` or blob download).

**Technologies involved:** Next.js (UI), FastAPI (route), `pandas`/`openpyxl` (Excel), `analytics.py` (data).

---

## Quick Reference – Technology to Location

| Need to Change | Look Here |
|----------------|-----------|
| API routes | `backend/main.py` |
| Jira integration | `backend/services/jira.py` |
| Confluence integration | `backend/services/confluence.py` |
| AI / natural language | `backend/services/ai_engine.py`, `chatbot_engine.py` |
| RAG over docs | `backend/services/rag_handler.py` |
| Login / auth | `backend/services/ldap_auth.py`, `main.py` (auth routes) |
| Environment variables | `backend/config/.env` |
| Frontend pages | `frontend/app/page.tsx`, `app/leadership/` |
| Login UI | `frontend/app/components/IntegratedLoginPage.tsx` |
| Main dashboard | `frontend/app/components/figma/NewFigmaApp.tsx` |
| UI components | `frontend/app/components/ui/` |
| API base URL | `frontend/lib/api-config.ts` |
| Theme / styling | `frontend/app/globals.css`, `tailwind.config.js` |

---

## Summary

FalconX uses:

- **Backend:** FastAPI + Python for async APIs, LDAP auth, JWT, and integrations with Jira, Confluence, and Databricks.
- **Frontend:** Next.js 14 + React + TypeScript for the UI; Tailwind and shadcn/ui for layout and components; Framer Motion for animations.
- **External services:** Jira and Confluence for project data and docs; Databricks for LLM and RAG.

The architecture separates UI (frontend) from logic and integrations (backend), making it easier to extend features, change UI, or swap external services.
