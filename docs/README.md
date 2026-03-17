# Leadership Quality Tool

A comprehensive AI-powered leadership management tool that integrates with Jira and Confluence to provide real-time insights, analytics, and intelligent recommendations for project management and team performance.

## Features

### 🤖 AI-Powered Chat Assistant
- Natural language query processing for Jira and Confluence
- Context-aware responses with follow-up question handling
- Intelligent JQL generation and entity extraction
- Leadership-style summaries and insights

### 📊 Leadership Analytics Dashboard
- Real-time project metrics and KPIs
- Sprint velocity tracking and trend analysis
- Team performance analytics
- AI-powered insights and projections

### 🔗 Integration Hub
- Jira API integration with comprehensive fallback mechanisms
- Confluence API integration for documentation search
- Secure authentication and configuration management
- Real-time connection status monitoring

### 📈 Advanced Analytics
- Project breakdown (stories, defects, tasks)
- Assignee performance tracking
- Sprint health monitoring
- Predictive analysis and recommendations

### 📤 Export Capabilities
- Excel export for comprehensive data analysis
- PDF reports for leadership presentations
- PowerPoint presentations for stakeholder updates
- Real-time data export with filtering

## Technology Stack

### Backend
- **FastAPI** - Modern, fast web framework for building APIs
- **Python 3.11+** - Core programming language
- **Jira REST API v3** - Primary integration with fallbacks to v2
- **Confluence REST API** - Documentation and knowledge base integration
- **OpenAI GPT-4o-mini** - AI-powered natural language processing
- **Pandas** - Data manipulation and Excel generation
- **httpx** - Async HTTP client for API calls

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern UI component library
- **Lucide React** - Beautiful icon library

### AI & NLP
- **Slot-based Natural Language Understanding**
- **Advanced JQL Generation** with entity extraction
- **Context-aware response generation**
- **Leadership-style summarization**

## Project Structure

```
Leadership Quality Tool/
├── backend/
│   ├── app.py                 # Main FastAPI application
│   ├── jira_client.py         # Jira API client with fallbacks
│   ├── confluence_client.py   # Confluence API client
│   ├── auth.py               # Authentication and configuration
│   ├── entity_extractor.py   # NLP entity extraction
│   ├── ai_summarizer.py      # OpenAI-powered summarization
│   ├── intent_router.py      # AI intent matching and routing
│   ├── data/
│   │   ├── jira_intents.json # Intent definitions and JQL templates
│   │   └── custom_jira_intents.json # Custom user intents
│   └── utils/                # Utility modules
├── frontend/
│   ├── app/
│   │   ├── page.tsx          # Main application layout
│   │   ├── components/       # React components
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── FalconXInsights.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   └── ui/           # shadcn/ui components
│   │   └── contexts/         # React contexts
│   └── package.json          # Frontend dependencies
└── README.md                 # This file
```

## Installation & Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git
- Jira and Confluence accounts with API access

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend Setup
```bash
cd frontend
npm install
```

### Environment Configuration
Create a `.env` file in the backend directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
JIRA_URL=your_jira_instance_url
JIRA_USERNAME=your_jira_username
JIRA_API_TOKEN=your_jira_api_token
CONFLUENCE_URL=your_confluence_instance_url
CONFLUENCE_USERNAME=your_confluence_username
CONFLUENCE_API_TOKEN=your_confluence_api_token
```

## Running the Application

### Start Backend Server
```bash
cd backend
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### Start Frontend Development Server
```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:3000`

## API Endpoints

### Core Endpoints
- `GET /health` - Health check
- `GET /api/jira/status` - Jira connection status
- `GET /api/confluence/status` - Confluence connection status

### Chat & AI
- `POST /api/chat` - Main chat endpoint with AI processing
- `POST /api/chat/enhanced` - Enhanced chat with JQL processing
- `POST /api/chat/json` - JSON-formatted responses

### Analytics & Metrics
- `GET /api/jira/analytics` - Comprehensive Jira analytics
- `POST /api/metrics/completed` - Completed stories/bugs metrics
- `POST /api/metrics/blockers` - Unresolved blockers analysis
- `POST /api/metrics/contributors` - Top contributors leaderboard
- `POST /api/metrics/resolution` - Average resolution time
- `POST /api/metrics/velocity` - Sprint velocity comparison
- `POST /api/metrics/summary` - AI-powered leadership insights

### Export & Reports
- `POST /api/jira/export/excel` - Excel export with JQL filtering
- `POST /api/export/pdf` - PDF report generation
- `POST /api/export/powerpoint` - PowerPoint presentation export

## Key Features in Detail

### AI-Powered Query Processing
The system uses advanced natural language understanding to:
- Parse user queries and extract entities (projects, assignees, dates, etc.)
- Generate appropriate JQL queries
- Provide context-aware responses
- Handle follow-up questions intelligently

### Robust API Integration
- **Jira API Fallbacks**: Primary v3 API with automatic fallback to v2
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Rate Limiting**: Built-in rate limiting and retry mechanisms
- **Caching**: Intelligent caching for improved performance

### Leadership-Focused Analytics
- **Real-time Metrics**: Live project and team performance data
- **Trend Analysis**: Historical data analysis and trend identification
- **Predictive Insights**: AI-powered forecasting and recommendations
- **Executive Summaries**: Leadership-friendly reports and insights

## Development

### Adding New Intents
1. Add intent definitions to `backend/data/jira_intents.json`
2. Define JQL templates with dynamic placeholders
3. Test with the AI chat interface

### Customizing AI Responses
- Modify `backend/ai_summarizer.py` for response formatting
- Update `backend/intent_router.py` for intent matching logic
- Customize leadership insights in the analytics engine

### Frontend Customization
- Components are built with shadcn/ui for consistency
- Tailwind CSS for styling
- TypeScript for type safety
- React Context for state management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary software developed for FalconX Solutions Inc.

## Support

For technical support or questions, please contact the development team.

---

**Built with ❤️ by the FalconX Solutions team**