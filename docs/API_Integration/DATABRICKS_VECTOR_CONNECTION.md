# Databricks Vector Search Connection Guide

## Overview

This document explains how vector embeddings are connected to Databricks 5.1 for semantic search across Jira, GitHub, and Confluence.

---

## 🔗 Connection Architecture

### How It Works

1. **Initialization Flow:**
   ```
   Application Start
   ↓
   get_handler() called
   ↓
   initialize_handler() attempts Databricks connection
   ↓
   If Databricks SDK available → Connect to Vector Search
   ↓
   If not available → Fallback to local mode
   ```

2. **Vector Search Connection:**
   - Uses `databricks.vector_search.client.VectorSearchClient`
   - Connects to Databricks workspace via `WorkspaceClient`
   - Accesses Vector Search endpoint and index
   - Uses embeddings for semantic document search

---

## 📋 Required Environment Variables

### For Databricks Vector Search (Full RAG)

```env
# Databricks Workspace Connection
# (Auto-detected from Databricks SDK if running in Databricks environment)
# OR manually set:
DATABRICKS_WORKSPACE_URL=https://your-workspace.cloud.databricks.com
DATABRICKS_TOKEN=your-databricks-token

# Vector Search Configuration
DATABRICKS_VECTOR_ENDPOINT=leadership-vector-endpoint
DATABRICKS_VECTOR_INDEX=leadership_poc.rag.confluence_index

# LLM Configuration (Databricks GPT 5.1)
OPENAI_API_KEY=your-databricks-token
OPENAI_API_ENDPOINT=https://your-workspace.cloud.databricks.com/serving-endpoints/databricks-gpt-5-1/invocations

# Embedding Model (Optional - for custom embeddings)
DATABRICKS_EMBEDDING_ENDPOINT=https://your-workspace.cloud.databricks.com/serving-endpoints/databricks-gte-large-en/invocations
```

### For Local Mode (Fallback)

```env
# Basic OpenAI (if not using Databricks)
OPENAI_API_KEY=your-openai-key
```

---

## 🔍 Connection Verification

### 1. Check RAG Health

```bash
GET /api/rag/health
```

**Response:**
```json
{
  "available": true,
  "status": "ready",
  "openai_configured": true,
  "vector_search_configured": true,
  "databricks": {
    "vector_search_available": true,
    "endpoint": "leadership-vector-endpoint",
    "index": "leadership_poc.rag.confluence_index",
    "connection_status": "connected"
  },
  "message": "RAG system is ready"
}
```

### 2. Check Logs

When the application starts, you'll see detailed connection logs:

```
============================================================
🔍 INITIALIZING RAG HANDLER
============================================================
📦 Attempting to import Databricks SDK...
✅ Databricks SDK imported successfully
🔗 Connecting to Databricks workspace...
   - Workspace URL: https://your-workspace.cloud.databricks.com
   - Token present: Yes
   - Token length: 40
🔗 Initializing Vector Search Client...
✅ Vector Search Client initialized
📊 Connecting to Vector Search Index...
   - Endpoint: leadership-vector-endpoint
   - Index: leadership_poc.rag.confluence_index
✅ Vector Search Index connected successfully
🤖 Initializing OpenAI/LLM client...
   - API Key present: Yes
   - API Endpoint: https://.../databricks-gpt-5-1/invocations
   - Using Databricks LLM endpoint
✅ LLM client initialized
============================================================
✅ RAG HANDLER FULLY INITIALIZED WITH DATABRICKS VECTOR SEARCH
============================================================
```

---

## 🎯 What Gets Connected

### 1. **Vector Search Index**
- **Purpose:** Stores embeddings of Confluence documents
- **Location:** `leadership_poc.rag.confluence_index`
- **Endpoint:** `leadership-vector-endpoint`
- **Usage:** Semantic search for document retrieval

### 2. **LLM (Databricks GPT 5.1)**
- **Purpose:** Generates answers from retrieved documents
- **Endpoint:** `databricks-gpt-5-1` serving endpoint
- **Usage:** RAG response generation

### 3. **Embedding Model (Optional)**
- **Purpose:** Generate embeddings for new documents
- **Model:** `databricks-gte-large-en`
- **Usage:** Document ingestion and embedding generation

---

## 🔧 Connection Modes

### Mode 1: Full Databricks (Recommended)

**Requirements:**
- Databricks SDK installed (`databricks-vector-search`, `databricks-sdk`)
- Running in Databricks environment OR configured with workspace URL/token
- Vector Search endpoint and index created
- Databricks GPT 5.1 serving endpoint available

**Features:**
- ✅ Full vector search for semantic document retrieval
- ✅ Databricks GPT 5.1 for LLM responses
- ✅ Automatic connection from Databricks environment
- ✅ Best performance and accuracy

### Mode 2: Hybrid (Vector Search + OpenAI)

**Requirements:**
- Databricks Vector Search configured
- OpenAI API key for LLM

**Features:**
- ✅ Vector search for document retrieval
- ✅ OpenAI for LLM responses
- ⚠️ Requires both Databricks and OpenAI

### Mode 3: Local Fallback

**Requirements:**
- OpenAI API key OR basic configuration

**Features:**
- ⚠️ No vector search (uses Confluence API fallback)
- ✅ OpenAI for LLM responses
- ⚠️ Less accurate document retrieval

---

## 🚀 Testing the Connection

### 1. Test Vector Search Connection

```python
# In Python/Notebook
from services.rag_handler import get_handler

handler = get_handler()
if handler.vector_index:
    print("✅ Vector Search connected")
    # Try a test search
    docs = handler.search_documents("test query", num_results=3)
    print(f"Found {len(docs)} documents")
else:
    print("❌ Vector Search not connected")
```

### 2. Test via API

```bash
# Health check
curl http://localhost:8000/api/rag/health

# Test query
curl -X POST http://localhost:8000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What are best practices for delegation?"}'
```

---

## 🐛 Troubleshooting

### Issue: "Databricks SDK not available"

**Solution:**
```bash
pip install databricks-vector-search databricks-sdk
```

### Issue: "Vector Search Index not found"

**Check:**
1. Verify endpoint name: `DATABRICKS_VECTOR_ENDPOINT`
2. Verify index name: `DATABRICKS_VECTOR_INDEX`
3. Ensure index exists in Databricks workspace
4. Check index status (should be ONLINE)

### Issue: "Authentication failed"

**Check:**
1. Verify `OPENAI_API_KEY` is set (used as Databricks token)
2. Verify token has permissions for Vector Search and Model Serving
3. Check workspace URL is correct

### Issue: "LLM endpoint not responding"

**Check:**
1. Verify `OPENAI_API_ENDPOINT` points to `databricks-gpt-5-1` endpoint
2. Ensure serving endpoint is ONLINE in Databricks
3. Verify token has access to the endpoint

---

## 📊 Connection Status Indicators

### In Logs

- ✅ = Successfully connected
- ⚠️ = Warning (fallback mode)
- ❌ = Error (connection failed)

### In Health Check

- `status: "ready"` = Full Databricks connection
- `status: "partial"` = Partial connection (missing components)
- `status: "not_configured"` = No Databricks connection
- `status: "error"` = Connection error

---

## 🔄 Connection Flow Diagram

```
┌─────────────────────────────────────┐
│   Application Start                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   get_handler() called              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   initialize_handler()              │
└──────────────┬──────────────────────┘
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
┌──────────────┐  ┌──────────────┐
│ Try Databricks│  │ Import Error?│
│ SDK Import    │  │              │
└──────┬───────┘  └──────┬───────┘
       │                 │
       ▼                 ▼
┌──────────────┐  ┌──────────────┐
│ WorkspaceClient│ │ Local Fallback│
│ VectorSearchClient│ │              │
└──────┬───────┘  └──────────────┘
       │
       ▼
┌──────────────┐
│ Get Vector   │
│ Search Index │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Initialize   │
│ LLM Client   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ ✅ Ready     │
└──────────────┘
```

---

## 📝 Notes

1. **Auto-Detection:** If running in Databricks environment, connection is automatic
2. **Manual Configuration:** For local development, set environment variables
3. **Fallback:** System gracefully falls back to local mode if Databricks unavailable
4. **Logging:** All connection attempts are logged with detailed information
5. **Health Check:** Use `/api/rag/health` to verify connection status

---

## ✅ Verification Checklist

- [ ] Databricks SDK installed
- [ ] Environment variables set
- [ ] Vector Search endpoint exists and is ONLINE
- [ ] Vector Search index exists
- [ ] Databricks GPT 5.1 serving endpoint is ONLINE
- [ ] Token has required permissions
- [ ] Health check returns `status: "ready"`
- [ ] Logs show successful connection

---

## 🔗 Related Documentation

- [Databricks RAG Setup Guide](./DATABRICKS_RAG_SETUP.md)
- [RAG Implementation Summary](./RAG_IMPLEMENTATION_SUMMARY.md)
- [API Integration Guide](./API_Integration.md)

