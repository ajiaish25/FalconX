# Databricks RAG Quick Start (TL;DR)

## What You're Getting

You're moving from "local FastAPI" → "Databricks Cloud RAG"

```
BEFORE                          AFTER
┌─────────────┐                ┌──────────────────┐
│ Your UI     │                │ Your UI          │
└─────┬───────┘                └────────┬─────────┘
      │                                 │
      ├─→ Jira API                      ├─→ Databricks Vector Search
      ├─→ Confluence API                   (Search docs in seconds)
      └─→ OpenAI                        ├─→ OpenAI
      (Local server)                    └─→ Auto-scales
                                        (Cloud)
```

---

## 3 Files You Got

| File | Purpose | Action |
|------|---------|--------|
| `docs/DATABRICKS_RAG_SETUP.md` | **Step-by-step guide with clicks** | Follow this first |
| `backend/databricks_rag_handler.py` | **RAG code ready to deploy** | Copy to Databricks |
| `frontend/lib/databricks-client.ts` | **Frontend integration** | Already included |

---

## Timeline

| Step | Task | Time | Waiting? |
|------|------|------|----------|
| 1 | Request Databricks from IT | 5 min | ⏳ 24h |
| 2 | Create secrets + catalog | 15 min | No |
| 3 | Create Vector Search endpoint | 5 min | ⏳ 10m |
| 4 | Run ingest notebook | 10 min | No |
| 5 | Create index | 5 min | ⏳ 5m |
| 6 | Deploy RAG handler | 15 min | ⏳ 5m |
| 7 | Update frontend | 5 min | No |
| 8 | Test | 5 min | No |

**Total active time: ~1 hour**
**Total with waits: ~2 hours**

---

## The 5-Step Summary

### Step 1: Request from IT (Copy-Paste This)

> I need a Databricks Lab workspace with:
> - Cloud: AWS or Azure
> - Features: Unity Catalog, Serverless SQL, Vector Search
> - Workspace name: `leadership-quality-poc`
> - Users: me

**You get back:** Workspace URL (save this!)

---

### Step 2: Setup Secrets (10 min)

In Databricks:
1. Create 3 secrets in scope `leadership`:
   - `databricks_host` = your workspace URL
   - `databricks_token` = your PAT
   - `openai_api_key` = your OpenAI key

2. Create catalog/schema:
   - Catalog: `leadership_poc`
   - Schema: `rag`

3. Create Vector Search endpoint:
   - Name: `leadership-vector-endpoint`
   - Status: wait for `ONLINE`

---

### Step 3: Ingest Confluence (10 min)

Create notebook in Databricks called `01_ingest_confluence_docs`

Copy code from `DATABRICKS_RAG_SETUP.md` → **STEP 5a** → paste entire notebook → update your Confluence URL/token/email → Run

You'll see:
```
✅ Found 487 pages
✅ Created 2,341 chunks
✅ Saved to leadership_poc.rag.confluence_chunks
```

---

### Step 4: Deploy RAG (15 min)

Create notebook called `03_rag_handler_serving`

Copy code from `backend/databricks_rag_handler.py` → paste → Run

Then:
1. Left sidebar → Models → Serving
2. Deploy model → From MLflow
3. Search `leadership-rag`
4. Name: `leadership-rag-endpoint`
5. Click Deploy
6. Wait 5 min for status = `Ready`

Copy the endpoint URL.

---

### Step 5: Update Frontend (5 min)

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_BACKEND_URL=https://your-workspace-url/serving-endpoints/leadership-rag-endpoint
NEXT_PUBLIC_DATABRICKS_TOKEN=dapi...your-token...
```

Done! Your UI now calls Databricks.

---

## Test It

In your browser at `http://localhost:3000`:

**Ask:**
```
What are best practices for leadership delegation?
```

**You see:**
```
Based on the documentation, effective delegation involves...

Sources:
1. [Leadership Handbook - Delegation](url) (87% confidence)
2. [Team Management Guide](url) (76% confidence)
```

✅ **It works!**

---

## Troubleshooting

### 401 Unauthorized
- Check PAT token is correct in `.env.local`

### No documents found
- Make sure ingest notebook ran successfully
- Check Confluence URL/token/email are correct

### Endpoint not ready
- Wait 5 min and refresh
- Check Model Serving page

### CORS error
- Remove trailing `/` from endpoint URL in `.env.local`

### Still stuck?
- DM me the exact error
- Tell me which step you're on
- Tell me what you tried

---

## What Happens Next

Your app now:
- ✅ Searches Confluence instantly (Vector Search)
- ✅ Gets AI answers with sources (OpenAI)
- ✅ Shows confidence scores (0-100%)
- ✅ Scales automatically (no server management)

### Optional Add-ons (Ask Me Later)

1. Add Jira issue search to RAG
2. Improve relevance with reranking
3. Add caching to reduce costs
4. Monitor usage + costs

---

## One More Thing

**You've now got:**

```
🟢 RAG Handler: Production code
🟢 Frontend Client: TypeScript integration
🟡 Databricks: Your setup (start here ↓)
```

→ **Open `docs/DATABRICKS_RAG_SETUP.md` for detailed steps**

---

**Need help?** → Ask me. I'm here to debug with you. 🚀
