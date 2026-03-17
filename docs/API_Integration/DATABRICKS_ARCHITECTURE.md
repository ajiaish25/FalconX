# Databricks RAG Architecture Diagram

## System Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                            YOUR FalconX                          │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                                 │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Chat Interface                                                      │  │
│  │  "What are best practices for delegation?"                          │  │
│  │  ↓ queryRagEndpoint()                                               │  │
│  │  ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←  │  │
│  │  Answer: "Based on documentation..."                                │  │
│  │  Sources: [Handbook (87%), Guide (76%)]                             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Files:                                                                     │
│  - frontend/lib/databricks-client.ts (handles API calls)                   │
│  - frontend/.env.local (endpoint URL + token)                             │
└────────────────────────────────────────────────────────────────────────────┘
                                  ↑ HTTPS
                                  │ POST
                          Bearer Token Auth
                                  │
┌────────────────────────────────────────────────────────────────────────────┐
│                      DATABRICKS WORKSPACE (Cloud)                          │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  MODEL SERVING ENDPOINT                                            │    │
│  │  (leadership-rag-endpoint)                                         │    │
│  │                                                                    │    │
│  │  ┌──────────────────────────────────────────────────────────────┐ │    │
│  │  │  RAG Handler (Your Code)                                     │ │    │
│  │  │  - receive(query)                                            │ │    │
│  │  │  - search_documents(query, top_5)                            │ │    │
│  │  │  - build_context()                                           │ │    │
│  │  │  - call_openai()                                             │ │    │
│  │  │  - return(answer, citations, confidence)                     │ │    │
│  │  └──────────────────────────────────────────────────────────────┘ │    │
│  │             ↑                    ↑                   ↑              │    │
│  │             │                    │                   │              │    │
│  └─────────────┼────────────────────┼───────────────────┼──────────────┘    │
│                │                    │                   │                    │
│    ┌───────────┴─────────┐  ┌──────┴────────┐  ┌──────┴──────────┐        │
│    │                     │  │               │  │                 │        │
│    ↓                     ↓  ↓               ↓  ↓                 ↓        │
│ ┌──────────────────┐ ┌────────────┐ ┌─────────────────────┐ ┌──────────┐ │
│ │ VECTOR SEARCH    │ │  LLM       │ │ SECRETS SCOPE       │ │ CATALOG/ │ │
│ │ ENDPOINT         │ │ (OpenAI)   │ │ (leadership)        │ │ SCHEMA   │ │
│ │                  │ │            │ │                     │ │          │ │
│ │ • Embedding      │ │ • gpt-4o   │ │ • openai_api_key    │ │ Tables:  │ │
│ │   Model: BGE     │ │   mini     │ │ • databricks_token  │ │          │ │
│ │                  │ │            │ │ • databricks_host   │ │ • confluenec_chunks  │
│ │ • Index:         │ │ • Prompt   │ │                     │ │ • confluence_index   │
│ │   confluence_    │ │   engineer │ │                     │ │                      │
│ │   index          │ │            │ │                     │ │                      │
│ │                  │ │ • Context  │ │                     │ │                      │
│ │ • Source:        │ │   aware    │ │                     │ │                      │
│ │   confluence_    │ │            │ │                     │ │                      │
│ │   chunks table   │ │            │ │                     │ │                      │
│ │                  │ │            │ │                     │ │                      │
│ └────────────┬─────┘ └────────┬───┘ └─────────────────────┘ └────┬─────┘ │
│              │                │                                    │       │
│              └────────────────┼────────────────────────────────────┘       │
│                               │                                            │
│  ┌──────────────────────────┐ │                                            │
│  │ NOTEBOOKS (Batch Jobs)   │ │                                            │
│  │                          │ │                                            │
│  │ 01_ingest_confluence_docs│ │ (Run once to populate)                    │
│  │ - Fetch Confluence pages │ │                                            │
│  │ - Chunk text            │ │                                            │
│  │ - Save to table         │ │                                            │
│  │                          │ │                                            │
│  │ 02_create_vector_index  │ │ (Run once to index)                        │
│  │ - Create Vector Search  │ │                                            │
│  │ - Sync from table       │ │                                            │
│  │ - Auto-embed            │ │                                            │
│  │                          │ │                                            │
│  │ 03_rag_handler_serving  │ │ (Deploy to Model Serving)                  │
│  │ - RAG logic             │ │                                            │
│  │ - Test locally          │ │                                            │
│  │ - Register to MLflow    │ │                                            │
│  └──────────────────────────┘ │                                            │
│                               │                                            │
└───────────────────────────────┼────────────────────────────────────────────┘
                                │
                    (Optional: Can use local data)
                                │
                   ┌────────────┴────────────┐
                   │                         │
                   ↓                         ↓
            ┌────────────────┐      ┌────────────────┐
            │ CONFLUENCE     │      │ JIRA           │
            │ (External API) │      │ (External API) │
            │                │      │                │
            │ • Fetch pages  │      │ • Fetch issues │
            │ • Export data  │      │ • Export data  │
            └────────────────┘      └────────────────┘
                (via HTTP REST API)
```

---

## Data Flow: How RAG Works

```
1. USER INPUT
   ┌─────────────────────────────────┐
   │ "Best practices for delegation" │
   └────────────────┬────────────────┘
                    │
                    ↓
2. FRONTEND CLIENT (TypeScript)
   ┌─────────────────────────────────┐
   │ queryRagEndpoint(query)         │
   │ - Validate input                │
   │ - Build JSON payload            │
   │ - Add Bearer token auth         │
   │ - Send HTTPS POST               │
   └────────────────┬────────────────┘
                    │
                    ↓
3. DATABRICKS MODEL SERVING
   ┌─────────────────────────────────┐
   │ Endpoint receives request       │
   │ - Validates Bearer token        │
   │ - Routes to predict() function  │
   └────────────────┬────────────────┘
                    │
                    ↓
4. RAG HANDLER (Python)
   ┌─────────────────────────────────┐
   │ handler.generate_rag_response() │
   └────────────────┬────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ↓                       ↓
   4a. VECTOR SEARCH        4b. BUILD CONTEXT
   ┌──────────────────────┐ ┌──────────────────────┐
   │ Query: "delegation"  │ │ Top 5 matches:       │
   │ Search vector index  │ │ 1. Handbook (87%)    │
   │ Return top 5 results │ │ 2. Guide (76%)       │
   │                      │ │ 3. Policy (65%)      │
   │ Results:             │ │ 4. Training (58%)    │
   │ [                    │ │ 5. Wiki (52%)        │
   │   {                  │ │                      │
   │     id: "doc-123",   │ │ Format as prompt:    │
   │     text: "...",     │ │ "Context: [docs]"    │
   │     score: 0.87      │ │ "Query: [user ask]"  │
   │   },                 │ │                      │
   │   ...                │ │                      │
   │ ]                    │ │                      │
   └──────────────────────┘ └──────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ↓                       ↓
   4c. CALL OPENAI        4d. PARSE RESPONSE
   ┌──────────────────────┐ ┌──────────────────────┐
   │ POST to OpenAI API   │ │ Extract:             │
   │ - Model: gpt-4o-mini │ │ - answer text        │
   │ - Prompt w/ context  │ │ - Confidence score   │
   │ - Max tokens: 1000   │ │ - Source references  │
   │ - Temperature: 0.7   │ │                      │
   │                      │ │ Build response:      │
   │ Response:            │ │ {                    │
   │ "Based on docs, best │ │   "answer": "...",   │
   │ practices include... │ │   "citations": [...],│
   │ Effective delegation │ │   "context_used": 5  │
   │ means..."            │ │ }                    │
   └──────────────────────┘ └──────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ↓
5. RETURN TO FRONTEND
   ┌─────────────────────────────────┐
   │ HTTP 200 OK                     │
   │ {                               │
   │   "predictions": [{             │
   │     "answer": "...",            │
   │     "citations": [              │
   │       {                          │
   │         "title": "Handbook",     │
   │         "url": "https://...",    │
   │         "confidence": 0.87,      │
   │         "source_type": "confluence"│
   │       }                          │
   │     ],                           │
   │     "context_used": 5,           │
   │     "timestamp": "2024-..."      │
   │   }]                            │
   │ }                               │
   └────────────────┬────────────────┘
                    │
                    ↓
6. FRONTEND DISPLAY
   ┌─────────────────────────────────┐
   │ User sees:                      │
   │                                 │
   │ "Based on the documentation,   │
   │  effective delegation means...  │
   │                                 │
   │  Sources:                       │
   │  1. [Handbook](url) (87% conf)  │
   │  2. [Guide](url) (76% conf)"    │
   └─────────────────────────────────┘
```

---

## Infrastructure Setup Timeline

```
Day 0 (Request)
    │
    ├─ Email IT with request (5 min)
    │
    └─ Wait for Databricks workspace
    
Day 1 (Workspace Ready)
    │
    ├─ Create Service Principal (5 min)
    ├─ Generate PAT token (5 min)
    ├─ Create secret scope (5 min)
    │
    ├─ Create catalog.schema (5 min)
    │
    ├─ Create Vector Search endpoint (5 min)
    │  └─ Wait for ONLINE status (10 min) ⏳
    │
    ├─ Create & run ingest notebook (10 min)
    │  └─ Wait for completion (5 min) ⏳
    │
    ├─ Create & run index notebook (5 min)
    │  └─ Wait for index sync (5 min) ⏳
    │
    ├─ Create & run RAG handler notebook (10 min)
    │
    ├─ Deploy to Model Serving (5 min)
    │  └─ Wait for endpoint READY (5 min) ⏳
    │
    ├─ Update frontend .env.local (5 min)
    │
    └─ Test in browser (5 min)
    
TOTAL: ~2 hours active time + 30 min waiting
```

---

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    DATABRICKS WORKSPACE                     │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ EXTERNAL SOURCES                                       │ │
│  │ ┌───────────────┐  ┌─────────────┐  ┌──────────────┐  │ │
│  │ │ Confluence    │  │ Jira        │  │ Other Docs   │  │ │
│  │ │ (REST API)    │  │ (REST API)  │  │ (Files)      │  │ │
│  │ └───────┬───────┘  └─────────────┘  └──────────────┘  │ │
│  │         │                                              │ │
│  └─────────┼──────────────────────────────────────────────┘ │
│            │                                                 │
│            ↓                                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ INGESTION LAYER (Notebooks)                            │ │
│  │ ┌──────────────────────────────────────────────────┐   │ │
│  │ │ 01_ingest_confluence_docs                        │   │ │
│  │ │ - Fetch all pages                                │   │ │
│  │ │ - Chunk text (2000 char chunks)                  │   │ │
│  │ │ - Create metadata (title, URL, date)             │   │ │
│  │ │ - Save to: leadership_poc.rag.confluence_chunks  │   │ │
│  │ └──────────────────────────────────────────────────┘   │ │
│  └────────────────┬───────────────────────────────────────┘ │
│                   │                                          │
│                   ↓                                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ STORAGE LAYER (Unity Catalog)                          │ │
│  │ Catalog: leadership_poc                                │ │
│  │ Schema: rag                                            │ │
│  │                                                        │ │
│  │ Tables:                                                │ │
│  │ ├─ confluence_chunks (raw text chunks)                │ │
│  │ └─ confluence_index (embedded vectors)                │ │
│  │                                                        │ │
│  │ Volumes:                                               │ │
│  │ └─ raw_docs/ (optional: store PDFs)                   │ │
│  └────────────────┬───────────────────────────────────────┘ │
│                   │                                          │
│                   ↓                                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ INDEXING LAYER (02_create_vector_index)               │ │
│  │ ┌──────────────────────────────────────────────────┐   │ │
│  │ │ Vector Search Endpoint: leadership-vector-ep    │   │ │
│  │ │ - Model: Databricks BGE Large EN                │   │ │
│  │ │ - Source: confluence_chunks table               │   │ │
│  │ │ - Syncs automatically (new chunks → embedded)   │   │ │
│  │ │ - Status: ONLINE when ready                     │   │ │
│  │ └──────────────────────────────────────────────────┘   │ │
│  └────────────────┬───────────────────────────────────────┘ │
│                   │                                          │
│                   ↓                                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ SERVING LAYER (Model Serving)                          │ │
│  │ ┌──────────────────────────────────────────────────┐   │ │
│  │ │ Endpoint: leadership-rag-endpoint               │   │ │
│  │ │ Model: leadership-rag (from 03_rag_handler)     │   │ │
│  │ │                                                  │   │ │
│  │ │ Handler receives query:                         │   │ │
│  │ │ 1. Search vector index                          │   │ │
│  │ │ 2. Retrieve context (top 5 docs)                │   │ │
│  │ │ 3. Call OpenAI (with context)                   │   │ │
│  │ │ 4. Return answer + citations                    │   │ │
│  │ └──────────────────────────────────────────────────┘   │ │
│  └────────────────┬───────────────────────────────────────┘ │
│                   │                                          │
└───────────────────┼──────────────────────────────────────────┘
                    │
                    │ HTTPS + Bearer Token
                    │
                    ↓
        ┌───────────────────────┐
        │   FRONTEND (Next.js)  │
        │   Display: Answer     │
        │           Sources     │
        │           Confidence  │
        └───────────────────────┘
```

---

## Security Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION                          │
│                                                              │
│  User Browser (Frontend)                                    │
│      ↓                                                       │
│  Authorization: Bearer <DATABRICKS_TOKEN>                   │
│      ↓                                                       │
│  Databricks Model Serving Endpoint                          │
│      ├─ Validates token                                     │
│      ├─ Checks permissions                                  │
│      └─ Routes to handler                                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    SECRET MANAGEMENT                         │
│                                                              │
│  Secrets Scope: "leadership"                                │
│  ├─ databricks_token (for API calls)                        │
│  ├─ openai_api_key (for LLM calls)                          │
│  └─ (loaded by dbutils.secrets.get() in notebooks)         │
│                                                              │
│  ✅ Secrets NEVER exposed in code                           │
│  ✅ Secrets NEVER logged                                    │
│  ✅ Secrets stored in Databricks vault                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    DATA ISOLATION                            │
│                                                              │
│  Confluence Data                                            │
│  (Public to your org)                                       │
│      ↓                                                       │
│  Databricks Workspace                                       │
│  (Controlled access)                                        │
│      ├─ Only authorized users can query                     │
│      ├─ Audit logs track all access                         │
│      └─ Data encrypted at rest                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## File Dependencies

```
frontend/
├── lib/
│   └── databricks-client.ts
│       ├── Imports: fetch API, React types
│       └── Uses: NEXT_PUBLIC_BACKEND_URL, NEXT_PUBLIC_DATABRICKS_TOKEN
│
├── app/
│   └── components/
│       └── [Your Chat Component]
│           ├── Imports: queryRagEndpoint from databricks-client
│           └── Calls: await queryRagEndpoint(userQuery)
│
└── .env.local
    ├── NEXT_PUBLIC_BACKEND_URL=https://adb-xxx.databricks.com/...
    └── NEXT_PUBLIC_DATABRICKS_TOKEN=dapi...

backend/
├── databricks_rag_handler.py
│   ├── Imports: VectorSearchClient, OpenAI, WorkspaceClient
│   ├── Class: LeadershipRAGHandler
│   └── Function: predict(dataframe) ← Model Serving entry point

docs/
├── DATABRICKS_RAG_SETUP.md (Full 11-step guide)
├── DATABRICKS_QUICK_START.md (5-step TL;DR)
└── DATABRICKS_ARCHITECTURE.md (This file)
```

---

## Performance Characteristics

```
LATENCY BREAKDOWN (after warmup):

Query: "What are best practices for delegation?"

┌─────────────────────────────────────────────┐
│ Step                          │ Time        │
├───────────────────────────────┼─────────────┤
│ 1. Frontend → Databricks      │ 100-200ms   │
│ 2. Vector Search (find docs)  │ 200-500ms   │
│ 3. OpenAI API call            │ 1-3s        │
│ 4. Build response              │ 50-100ms    │
│ 5. Databricks → Frontend       │ 100-200ms   │
├───────────────────────────────┼─────────────┤
│ TOTAL                         │ 1.5-4.0s    │
│ (P50: ~2.5s after warmup)    │             │
└─────────────────────────────────────────────┘

Cold start (first request): ~5-10s
Warm state (subsequent): ~2-4s

THROUGHPUT:
- Serverless endpoint: Scales to 100+ concurrent users
- Rate limit: Configurable (default: 100 req/min)
- Cost: Pay per inference (not per minute)

SCALABILITY:
- Vector Search: Can handle millions of docs
- Model Serving: Auto-scales with demand
- No server management needed
```

---

That's the complete architecture! Any questions? 🚀
