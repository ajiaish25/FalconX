# RAG System Query Capabilities

## ✅ What Works Now

### 1. **Confluence Documentation Queries**
- ✅ Any question about documentation, procedures, guides
- ✅ Space-specific queries: "onboarding in IS project", "deployment in DEV space"
- ✅ General knowledge base queries: "how to deploy", "troubleshooting guide"
- ✅ Procedure queries: "onboarding procedure", "setup instructions"

**Examples:**
- "Onboarding procedure in IS project" ✅
- "How to deploy to production" ✅
- "Troubleshooting guide for authentication" ✅
- "API documentation" ✅

### 2. **Space Detection**
- ✅ Automatically detects space filters: "in IS project", "IS space", "space = IS"
- ✅ Filters results to specific Confluence spaces
- ✅ Works with any space key (IS, DEV, QA, etc.)

### 3. **General Search**
- ✅ Full-text search across all Confluence pages
- ✅ Returns relevant documents with citations
- ✅ Provides AI-generated summaries

## ⚠️ Current Limitations

### 1. **Only Confluence (RAG Handler)**
The `/api/rag/query` endpoint we just fixed only searches **Confluence**. It does NOT search:
- ❌ Jira tickets/issues
- ❌ GitHub repositories/PRs
- ❌ Other data sources

### 2. **Query Types Not Supported by RAG Handler**
- ❌ "How many tickets are open?" (needs Jira)
- ❌ "Show me PRs from last week" (needs GitHub)
- ❌ "What's the status of bug NDP-12345?" (needs Jira)
- ❌ Real-time data queries (only searches documentation)

### 3. **Search Limitations**
- ⚠️ Depends on Confluence's CQL search capabilities
- ⚠️ Limited to text-based search (no complex queries)
- ⚠️ May not find documents if keywords don't match

## 🔄 Alternative: Unified System

Your system HAS a unified handler that supports multiple sources:

### `/api/chat` Endpoint
This endpoint can handle:
- ✅ Jira queries (tickets, issues, status)
- ✅ Confluence queries (documentation)
- ✅ GitHub queries (PRs, issues, code)
- ✅ Auto-routing based on query type

**Examples that work with `/api/chat`:**
- "Show me open bugs in NDP project" → Routes to Jira
- "Onboarding procedure" → Routes to Confluence
- "Recent PRs in main branch" → Routes to GitHub

## 📊 Summary

| Query Type | `/api/rag/query` | `/api/chat` |
|------------|------------------|-------------|
| Confluence docs | ✅ Works | ✅ Works |
| Jira tickets | ❌ No | ✅ Works |
| GitHub PRs | ❌ No | ✅ Works |
| Space filtering | ✅ Works | ⚠️ Limited |
| AI summaries | ✅ Works | ✅ Works |

## 💡 Recommendation

For **documentation queries** (like "onboarding procedure"): Use `/api/rag/query` ✅

For **mixed queries** or **operational data**: Use `/api/chat` endpoint which routes to appropriate source

