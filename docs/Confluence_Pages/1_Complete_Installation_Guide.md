# FalconX Leadership Engine – Complete Installation Guide

<!-- CONFLUENCE TIP: When pasting, use {info} for key notes, {warning} for cautions. 
     Example: {info:title=Quick Link}GitHub: https://github.com/cdk-prod/falconx{info} -->

> **Audience:** Developers and team members setting up FalconX for the first time.  
> **Goal:** Get the application running locally and log in to both the frontend and backend successfully.  
> **GitHub Repository:** [cdk-prod/falconx (master branch)](https://github.com/cdk-prod/falconx)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Clone the Repository](#clone-the-repository)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Configuration – Environment Variables](#configuration--environment-variables)
6. [Starting the Application](#starting-the-application)
7. [First Login](#first-login)
8. [Verification Checklist](#verification-checklist)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before installation, ensure these tools are installed on your machine.

| Software | Minimum Version | Purpose | Download Link |
|----------|-----------------|---------|---------------|
| **Python** | 3.11+ | Backend API, AI, and integration services | [python.org/downloads](https://www.python.org/downloads/) |
| **Node.js** | 18.x+ | Frontend build and dev server (bundles npm) | [nodejs.org](https://nodejs.org/) |
| **Git** | Latest | Clone and version control | [git-scm.com](https://git-scm.com/downloads) |

**How to verify:**

```
python --version    # Should show Python 3.11 or higher
node --version      # Should show v18.x or higher
git --version       # Should show Git version
```

> **Note:** On Windows, if `python` is not found, try `py -3 --version`. Ensure Python and Node.js are added to your system PATH.

---

## Clone the Repository

1. Open a terminal (Command Prompt, PowerShell, or Git Bash on Windows; Terminal on Mac/Linux).

2. Navigate to the folder where you want the project, for example:

   ```
   cd C:\Users\<YourUsername>\Projects
   ```
   or on Mac/Linux:

   ```
   cd ~/projects
   ```

3. Clone the FalconX repository:

   ```
   git clone https://github.com/cdk-prod/falconx.git
   cd falconx
   ```

4. Ensure you are on the **master** branch:

   ```
   git checkout master
   ```

5. Confirm the project structure:

   ```
   falconx/
   ├── backend/        # Python FastAPI application
   ├── frontend/       # Next.js React application
   ├── start.bat       # Windows startup script
   ├── start.sh        # Linux/Mac startup script
   └── README.md
   ```

---

## Backend Setup

The backend is a **FastAPI** application that serves the API, handles LDAP auth, and integrates with Jira, Confluence, and Databricks AI.

### Step 1: Navigate to the backend folder

```
cd backend
```

### Step 2: Create a Python virtual environment

A virtual environment keeps project dependencies isolated from other Python projects:

**Windows:**
```
python -m venv venv
venv\Scripts\activate
```

**Linux/Mac:**
```
python3 -m venv venv
source venv/bin/activate
```

When the virtual environment is active, your prompt usually shows `(venv)`.

### Step 3: Install backend dependencies

```
pip install -r requirements.txt
```

This installs FastAPI, uvicorn, Jira/Confluence clients, OpenAI/Databricks libraries, LDAP support, and other required packages.

### Step 4: Verify backend setup

From the `backend` folder:

```
python -c "import fastapi; print('FastAPI OK')"
```

If this runs without errors, the backend environment is ready.

---

## Frontend Setup

The frontend is a **Next.js 14** React application that provides the FalconX UI.

### Step 1: Navigate to the frontend folder

From the project root:

```
cd frontend
```

### Step 2: Install Node.js dependencies

```
npm install
```

This installs Next.js, React, Tailwind CSS, chart libraries, and UI components (shadcn/ui, Radix UI).

### Step 3: Verify frontend setup

```
npm run build
```

If the build completes without errors, the frontend setup is correct. (You can cancel the build with `Ctrl+C` once it starts succeeding; you do not need to wait for it to finish every time.)

---

## Configuration – Environment Variables

FalconX needs configuration for LDAP, Jira, Confluence, and AI services. These values are stored in `backend/config/.env`.

### Step 1: Create the `.env` file

1. Go to the `backend/config/` folder.
2. Copy the template:

   **Windows:**
   ```
   copy env.template .env
   ```

   **Linux/Mac:**
   ```
   cp env.template .env
   ```

3. Open `backend/config/.env` in a text editor (e.g. VS Code, Notepad++).

### Step 2: Required variables

The following variables must be set for login and integrations to work.

| Variable | Description | Example | Where to Get It |
|----------|-------------|---------|------------------|
| `SESSION_SECRET_KEY` | Secret for password encryption (min 32 chars) | `tao123cdk789` | Keep default for dev, change in production |
| `LDAP_SERVICE_ACCOUNT_USERNAME` | LDAP service account for user lookup | `global\SVC_FalconX` | IT / LDAP admin |
| `LDAP_SERVICE_ACCOUNT_PASSWORD` | Encrypted LDAP password | *(encrypted string)* | See below |
| `LDAP_SERVER_URL` | LDAP server URL | `ldaps://ORDPGBLADC01.global.cdk.com:636` | IT / LDAP admin |
| `JIRA_SERVICE_EMAIL` | Jira service account email | `your.email@cdk.com` | Your Atlassian account |
| `JIRA_SERVICE_API_TOKEN` | Jira API token (encrypted) | *(encrypted string)* | [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens) |
| `JIRA_BASE_URL` | Jira instance URL | `https://projects.cdk.com` | Your Jira URL |
| `CONFLUENCE_SERVICE_EMAIL` | Confluence service account email | Same as Jira | Atlassian account |
| `CONFLUENCE_SERVICE_API_TOKEN` | Confluence API token (encrypted) | Same as Jira token | Same as Jira |
| `CONFLUENCE_BASE_URL` | Confluence instance URL | `https://confluence.cdk.com` | Your Confluence URL |
| `OPENAI_API_KEY` | Databricks API key for AI | *(from Databricks)* | Databricks admin |
| `OPENAI_API_ENDPOINT` | Databricks model serving endpoint | `https://dbc-xxx.cloud.databricks.com/...` | Databricks admin |

### Step 3: Encrypt sensitive passwords

LDAP, Jira, and Confluence passwords/tokens must be encrypted before being stored in `.env`. Use the built-in script:

1. From the project root:

   ```
   cd backend
   venv\Scripts\activate    # Windows
   # or: source venv/bin/activate  # Linux/Mac

   cd scripts
   python generate_env.py
   ```

2. When prompted, enter:
   - LDAP service account password
   - Jira API token
   - Confluence API token (or press Enter to reuse Jira’s)

3. The script prints encrypted values. Copy them into `backend/config/.env`:

   - Replace `LDAP_SERVICE_ACCOUNT_PASSWORD` with the LDAP encrypted value.
   - Replace `JIRA_SERVICE_API_TOKEN` with the Jira encrypted value.
   - Replace `CONFLUENCE_SERVICE_API_TOKEN` with the Confluence encrypted value.

4. Ensure `SESSION_SECRET_KEY=tao123cdk789` matches the value used during encryption. If you change it, you must regenerate encrypted values.

### Step 4: Optional – frontend API URL

By default, the frontend talks to `http://localhost:8000`. For custom setups, create `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Starting the Application

You can start backend and frontend manually or use the startup scripts.

### Option A: Use the startup scripts (recommended)

**Windows:**
```
start.bat
```

**Linux/Mac:**
```
./start.sh
```

The script will:

- Check Python and Node.js
- Create a Python virtual environment if needed
- Install backend and frontend dependencies
- Start the backend on port 8000
- Start the frontend on port 3000

### Option B: Manual start (two terminals)

**Terminal 1 – Backend:**
```
cd backend
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac
python run_server.py
# or: python main.py
```

**Terminal 2 – Frontend:**
```
cd frontend
npm run dev
```

### Access points

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:3000 | Main FalconX UI |
| **Backend API** | http://localhost:8000 | REST API |
| **API docs (Swagger)** | http://localhost:8000/docs | API reference |
| **Health check** | http://localhost:8000/health | Backend status |

---

## First Login

The login flow uses **LDAP** for authentication and then connects **Jira** and **Confluence** using shared service credentials.

### Step 1: Open the frontend

In a browser, go to:

```
http://localhost:3000
```

### Step 2: Use your CDK credentials

You will see the FalconX login page. Enter:

- **Username:** Your CDK network username (e.g. `rameshaj`), not email.
- **Password:** Your CDK network password.

### Step 3: What happens behind the scenes

1. **Frontend** sends username and password to `POST /api/auth/login`.
2. **Backend** calls LDAP to validate credentials.
3. **Backend** returns a JWT if authentication succeeds.
4. **Frontend** stores the JWT and calls `POST /api/auth/auto-connect-integrations`.
5. **Backend** connects Jira and Confluence using the service account in `.env`.
6. **Frontend** shows the main dashboard (NewFigmaApp).

### Step 4: Confirm successful login

After login you should see:

- FalconX main dashboard with sidebar navigation
- Jira and Confluence connection status (e.g. green indicators)
- Access to Insights, Work Buddy (chat), QA Metrics, and other modules

### Step 5: Backend “login” (API access)

Backend access is via the API:

1. Go to http://localhost:8000/docs.
2. Use `POST /api/auth/login` with your CDK username and password to obtain a token.
3. Click **Authorize** and enter: `Bearer <your_token>`.
4. You can then call protected endpoints using that token.

---

## Verification Checklist

Use this checklist to confirm everything works:

| Check | Action | Expected Result |
|-------|--------|------------------|
| Backend health | Open http://localhost:8000/health | `{"status":"healthy","timestamp":"..."}` |
| API docs | Open http://localhost:8000/docs | Swagger UI with all endpoints |
| Frontend loads | Open http://localhost:3000 | Login page |
| LDAP login | Enter CDK username and password | Redirect to dashboard |
| Jira connection | Check status on dashboard | Green/connected |
| Confluence connection | Check status on dashboard | Green/connected |

---

## Troubleshooting

### Backend issues

| Symptom | Possible cause | Fix |
|---------|----------------|-----|
| `ModuleNotFoundError` | Missing dependency | `pip install -r requirements.txt` |
| Port 8000 in use | Another process using 8000 | Stop that process or use a different port |
| LDAP auth fails | Wrong `.env` or LDAP unreachable | Check `LDAP_*` values and network/VPN |
| Env vars not loaded | Wrong file/location | Ensure `.env` is in `backend/config/` and named exactly `.env` |

### Frontend issues

| Symptom | Possible cause | Fix |
|---------|----------------|-----|
| `Module not found` | Incomplete `npm install` | Delete `node_modules`, run `npm install` |
| Port 3000 in use | Another app on 3000 | Run `npm run dev -- -p 3001` |
| Build errors | Cached build | Delete `frontend/.next` and run `npm run build` again |
| Blank page / CORS | Backend not running or wrong URL | Start backend, check `NEXT_PUBLIC_API_URL` |

### Login issues

| Symptom | Possible cause | Fix |
|---------|----------------|-----|
| “Invalid username or password” | LDAP misconfiguration or wrong credentials | Verify LDAP URL, service account, and encryption |
| Stuck on loading | Backend not reachable | Ensure backend is running and `getApiUrl` points to it |
| Jira/Confluence not connected | Service account or tokens | Regenerate encrypted tokens and update `.env` |

---

## Summary

1. **Prerequisites:** Python 3.11+, Node.js 18+, Git  
2. **Clone:** `git clone https://github.com/cdk-prod/falconx.git` and `cd falconx`  
3. **Backend:** Create venv, `pip install -r requirements.txt`  
4. **Frontend:** `npm install`  
5. **Config:** Copy `env.template` to `.env`, fill in values, run `generate_env.py` for encrypted credentials  
6. **Start:** Use `start.bat` (Windows) or `./start.sh` (Linux/Mac)  
7. **Login:** Open http://localhost:3000 and sign in with CDK username and password  
8. **Verify:** Health check, API docs, dashboard, and integration status

For deployment and production setup, see the Deployment Guide in the `Installation_Process` folder.
