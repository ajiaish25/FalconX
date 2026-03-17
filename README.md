# FalconX Leadership Engine - AI-Powered Project Management Assistant

A comprehensive AI-powered project management tool that integrates with Jira and Confluence to provide real-time insights, analytics, and intelligent recommendations for project management and team performance.

## 📦 Installation & Setup

**New to the project? Start here:**

- **[⚡ Quick Setup Guide](./Installation_Process/SETUP_GUIDE.md)** - Get started in 5 minutes
- **[📖 Complete Installation Guide](./Installation_Process/INSTALLATION.md)** - Detailed step-by-step instructions  
- **[🚀 Deployment Guide](./Installation_Process/DEPLOYMENT.md)** - Production deployment instructions
- **[📋 Setup Summary](./Installation_Process/PROJECT_SETUP_SUMMARY.md)** - Overview of all setup files
- **[✅ Deployment Checklist](./Installation_Process/DEPLOYMENT_READY_CHECKLIST.md)** - Pre-deployment verification

## 🚀 Quick Navigation

📚 **Documentation organized by category:**

- **[📦 Installation Process](./Installation_Process/)** - Setup, installation, and deployment guides
- **[🤝 Development](./Development/)** - Contributing guidelines and development docs
- **[📖 Getting Started](docs/guides/)** - QUICK_START, Installation, User Guide, Quick Reference
- **[🏗️ Project Structure](docs/structure/)** - Complete architecture overview
- **[⚙️ Setup & Configuration](docs/setup/)** - Checklists and configuration guide
- **[🔄 Refactoring & Migration](docs/refactoring/)** - What changed and how to migrate
- **[🤖 Work Buddy](docs/Work_Buddy/)** - AI assistant examples and response formats
- **[🔗 API Integration](docs/API_Integration/)** - RAG, Databricks, and integration guides
- **[✨ Features](docs/Features/)** - Feature documentation and implementation guides

---

## 🚀 Quick Start

### Windows
```batch
start.bat
```

### Linux/Mac
```bash
./start.sh
```

### First Time Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Leadership_Engine_Dev-main
   ```

2. **Follow the installation guide:**
   - 📖 **[Complete Installation Guide](./Installation_Process/INSTALLATION.md)** - Step-by-step setup instructions
   - 🚀 **[Deployment Guide](./Installation_Process/DEPLOYMENT.md)** - Production deployment instructions

3. **Quick Setup:**
   ```bash
   # Backend
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   
   # Frontend
   cd ../frontend
   npm install
   ```

4. **Configure environment:**
   - Copy `backend/config/env.template` to `backend/config/.env`
   - Fill in your API keys and credentials
   - See [INSTALLATION.md](./Installation_Process/INSTALLATION.md) for details

For detailed setup instructions, see [**docs/guides/QUICK_START.md**](docs/guides/QUICK_START.md)

## 🌐 Access Points

- **Frontend UI:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/health

## 📊 Features

### 🤖 AI-Powered Assistant
- Natural language query processing for Jira and Confluence
- Context-aware responses with follow-up question handling
- Intelligent JQL generation and entity extraction
- AI-powered summaries and insights
- Enhanced glassmorphism UI with smooth animations

### 📈 Falcon Analytics Dashboard
- Real-time project metrics and KPIs
- Sprint velocity tracking and trend analysis
- Team performance analytics
- AI-powered insights and projections
- Best Performers section with animated rankings

### 🔗 Integration Hub
- Jira API integration with comprehensive fallback mechanisms
- Confluence API integration for documentation search
- Secure authentication and configuration management
- Real-time connection status monitoring

### 📤 Export Capabilities
- Excel export for comprehensive data analysis
- PDF reports for presentations
- PowerPoint presentations for stakeholder updates
- Real-time data export with filtering

## 📁 Project Structure

```
FalconX/
├── backend/                 # FastAPI backend application
│   ├── main.py             # Main API server
│   ├── services/           # Business logic services
│   ├── config/             # Configuration & authentication
│   ├── app/                # Application core
│   ├── models/             # Data models (ready)
│   ├── middleware/         # Middleware (ready)
│   ├── requirements.txt    # Python dependencies
│   └── utils/              # Utility modules
│
├── frontend/               # Next.js frontend application
│   ├── app/                # Next.js app directory
│   ├── components/         # React components
│   ├── src/                # Source utilities & hooks
│   ├── public/             # Static assets
│   ├── package.json        # Node.js dependencies
│   └── ...
│
├── Installation_Process/  # 📦 Installation & deployment docs
│   ├── INSTALLATION.md     # Complete installation guide
│   ├── SETUP_GUIDE.md      # Quick setup guide
│   ├── DEPLOYMENT.md       # Deployment instructions
│   └── ...
│
├── Development/            # 🤝 Development & contributing
│   └── CONTRIBUTING.md     # Contributing guidelines
│
├── docs/                   # 📚 Documentation (organized by category)
│   ├── guides/             # Getting started guides
│   ├── structure/          # Project structure docs
│   ├── setup/              # Setup & configuration
│   ├── refactoring/        # Refactoring & migration
│   ├── Work_Buddy/         # AI assistant documentation
│   ├── API_Integration/    # Integration & RAG guides
│   ├── Features/           # Feature documentation
│   └── ...                 # Other documentation
│
├── tests/                  # Test files
├── scripts/                # Startup scripts
├── config/                 # Configuration templates
│
└── README.md              # This file
```

For complete structure details, see [**docs/structure/PROJECT_STRUCTURE.md**](docs/structure/PROJECT_STRUCTURE.md)

## 🔧 Configuration

### Environment Variables

Create a `backend/config/.env` file with your API keys:

```env
OPENAI_API_KEY=your_openai_api_key
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your_email@example.com
JIRA_API_TOKEN=your_jira_api_token
CONFLUENCE_URL=https://your-domain.atlassian.net/wiki
```

See [**docs/guides/INSTALLATION_GUIDE.md**](docs/guides/INSTALLATION_GUIDE.md) for detailed setup.

### Jira Integration Setup

1. **Get Jira Credentials:**
   - Jira URL: `https://your-domain.atlassian.net`
   - Email: Your Jira account email
   - API Token: Generate from [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
   - Board ID: Found in your Jira board URL

2. **Configure in Frontend:**
   - Open http://localhost:3000
   - Go to "Integration" tab
   - Enter your credentials
   - Test the connection
   - Save configuration

## 🧪 Testing

Run tests from the `tests/` folder:

```bash
cd tests
python test_integration.py
python test_ai.py
python comprehensive_test.py
```

## 📚 Documentation

All documentation is organized in the `docs/` folder:

### 📖 Quick Links

| Section | Documents | Purpose |
|---------|-----------|---------|
| **Installation** | [Quick Setup](Installation_Process/SETUP_GUIDE.md), [Complete Guide](Installation_Process/INSTALLATION.md), [Deployment](Installation_Process/DEPLOYMENT.md) | Setup & deployment |
| **Getting Started** | [Quick Start](docs/guides/QUICK_START.md), [Installation](docs/guides/INSTALLATION_GUIDE.md), [User Guide](docs/guides/NEW_USER_GUIDE.md), [Quick Reference](docs/guides/QUICK_REFERENCE.md) | Setup & basic usage |
| **Project Info** | [Project Structure](docs/structure/PROJECT_STRUCTURE.md) | Complete architecture |
| **Setup** | [Checklist](docs/setup/SETUP_CHECKLIST.md) | Configuration guide |
| **Refactoring** | [Migration Guide](docs/refactoring/MIGRATION_GUIDE.md), [Summary](docs/refactoring/REFACTORING_SUMMARY.md), [Checklist](docs/refactoring/POST_REFACTORING_CHECKLIST.md) | Recent changes |
| **Work Buddy** | [Example Responses](docs/Work_Buddy/WORKBUDDY_EXAMPLE_RESPONSES.md), [Portfolio Responses](docs/Work_Buddy/WORKBUDDY_PORTFOLIO_RESPONSES.md) | AI assistant examples |
| **API Integration** | [Integration Guide](docs/API_Integration/INTEGRATION_GUIDE.md), [AI Setup](docs/API_Integration/AI_SETUP_README.md), [Databricks RAG](docs/API_Integration/DATABRICKS_RAG_SETUP.md) | Advanced configuration |
| **Features** | [Dashboard Guide](docs/Features/ENHANCED_DASHBOARD_GUIDE.md), [Defect Leakage](docs/Features/DEFECT_LEAKAGE_QUICKSTART.md), [KPI Metrics](docs/Features/KPI_METRICS_IMPLEMENTATION_PLAN.md) | Feature documentation |

## 🛠️ Technology Stack

### Backend
- **FastAPI** - Modern, fast web framework for building APIs
- **Python 3.11+** - Core programming language
- **Jira REST API v3** - Primary integration with fallbacks to v2
- **Confluence REST API** - Documentation and knowledge base integration
- **OpenAI GPT-4o-mini** - AI-powered natural language processing
- **Databricks** - RAG and vector search

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern UI component library
- **Framer Motion** - Smooth animations and transitions

## 🚀 Deployment

### Quick Deployment Options

1. **Docker Deployment** (Recommended)
   ```bash
   docker-compose up -d
   ```
   See [DEPLOYMENT.md](./Installation_Process/DEPLOYMENT.md) for Docker setup details.

2. **Manual Server Deployment**
   - Follow [DEPLOYMENT.md](./Installation_Process/DEPLOYMENT.md) for step-by-step instructions
   - Includes systemd service configuration
   - Nginx reverse proxy setup
   - SSL/HTTPS configuration

3. **Cloud Platform Deployment**
   - AWS (EC2, ECS, Elastic Beanstalk)
   - Azure App Service
   - Google Cloud Run
   - See [DEPLOYMENT.md](./Installation_Process/DEPLOYMENT.md) for platform-specific guides

### Production Checklist

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Secrets encrypted
- [ ] Monitoring set up
- [ ] Backups configured
- [ ] Security hardening applied

See [DEPLOYMENT.md](./Installation_Process/DEPLOYMENT.md) for complete deployment guide.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

See [CONTRIBUTING.md](./Development/CONTRIBUTING.md) for detailed guidelines.

## 📄 License

This project is proprietary software developed by FalconX.

## 🆘 Support

For support and questions:
- Check the **[docs/guides/QUICK_REFERENCE.md](docs/guides/QUICK_REFERENCE.md)** for quick answers
- Review documentation in the `docs/` folder organized by topic
- Check test files in the `tests/` folder for usage examples
- Contact the development team

---

## 🚀 Databricks RAG Integration (NEW!)

Take your FalconX to the cloud with **Databricks RAG**:

- ✅ Search Confluence docs instantly
- ✅ Get AI answers with source citations
- ✅ Auto-scale (no server management)
- ✅ Enterprise-grade security

### Quick Setup (2 hours)
1. Request Databricks Lab workspace from IT
2. Follow the step-by-step guide: [**docs/API_Integration/DATABRICKS_RAG_SETUP.md**](docs/API_Integration/DATABRICKS_RAG_SETUP.md)
3. Deploy RAG Model Serving endpoint
4. Update frontend `.env.local` with endpoint URL

### Files
- **Setup Guide**: [docs/API_Integration/DATABRICKS_RAG_SETUP.md](docs/API_Integration/DATABRICKS_RAG_SETUP.md)
- **RAG Handler**: [backend/services/rag_handler.py](backend/services/rag_handler.py)
- **Frontend Client**: [frontend/lib/databricks-client.ts](frontend/lib/databricks-client.ts)

### Example Usage
```typescript
import { queryRagEndpoint } from '@/lib/databricks-client';

const response = await queryRagEndpoint("What are best practices for delegation?");
console.log(response.answer);      // AI-generated answer with context
console.log(response.citations);   // Source citations
```

---

**Powered by FalconX** 🚀
