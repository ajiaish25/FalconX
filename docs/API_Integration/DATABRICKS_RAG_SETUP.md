# Databricks RAG Integration Guide - Step-by-Step (Zero to Hero)

## Overview
You're taking your FalconX from local FastAPI → Databricks cloud. This gives you:
- ✅ Infinite scalability (no more server management)
- ✅ RAG search on Confluence docs (find answers in seconds)
- ✅ Jira + Confluence + OpenAI all in one place
- ✅ Automatic backups, security, compliance

**Total time: ~2 hours** (mostly waiting for IT)

---

## STEP 1: Request Databricks Lab Access (IT - 24 hours)

### What to Ask IT:
Copy-paste this to IT:

> **Request:** Databricks Lab workspace
> - Cloud: AWS or Azure (doesn't matter)
> - Workspace name: `leadership-quality-poc`
> - Features needed:
>   - Unity Catalog enabled
>   - Serverless SQL enabled
>   - Vector Search enabled
> - Users: [Your email]
> - Purpose: RAG (Retrieval-Augmented Generation) for leadership insights

### What You'll Get Back:
```
Workspace URL: https://adb-1234567890abcdef.5.azuredatabricks.net
(save this somewhere safe)
```

### Verification (After IT Sets It Up)
1. Open the URL in browser
2. Login with your corporate account
3. You should see: "Databricks" logo + workspace name
4. If you see an error, ask IT to add you as "Workspace Admin"

✅ **Mark DONE when:** You can see the Databricks homepage.

---

## STEP 2: Create Service Principal & PAT (10 minutes)

A "Service Principal" is like a robot user that lets your app talk to Databricks without needing your password.

### In Databricks UI:

**2a. Create Service Principal:**
1. Click your user icon (top right) → **Admin Console**
2. Left menu → **Users & groups** → **Service principals** tab
3. Click **+ New service principal**
   - Name: `leadership-engine-sp`
   - Click **Create**
4. Copy the **Application ID** (you'll need this):
   ```
   Example: 12345678-1234-1234-1234-123456789abc
   ```

**2b. Generate Personal Access Token (PAT):**
1. Still in the service principal details, scroll down
2. Click **Generate new token**
   - Token lifetime: `90 days` (safe default)
   - Comment: `leadership-engine-rag`
   - Click **Generate**
3. **COPY THE TOKEN** (you won't see it again!):
   ```text
   dapi-your-databricks-token-here
   ```

### Store These Securely:
In Databricks, create a secret scope to hold these:

1. Click **Settings** (left sidebar)
2. Click **Secrets** tab (if you see it) or go to: https://your-workspace-url/admin/secrets
3. Click **+ Create Secret Scope**
   - Name: `leadership`
   - Manager: `Users` (for now)
   - Click **Create**
4. Now add secrets:
   - Click **Add secret**
     - Key: `databricks_host`
     - Value: `https://adb-1234567890abcdef.5.azuredatabricks.net` (your workspace URL)
     - Click **Create**
   - Add another:
     - Key: `databricks_token`
     - Value: `dapi-your-databricks-token-here` (the PAT you copied)
     - Click **Create**
   - Add another:
     - Key: `openai_api_key`
     - Value: `sk-your-openai-api-key-here` (your OpenAI key)
     - Click **Create**

✅ **Mark DONE when:** You have 3 secrets stored in the `leadership` scope.

---

## STEP 3: Enable Unity Catalog & Create Catalog/Schema (5 minutes)

Unity Catalog = organized storage for your data (like folders).

### 3a. Check if Enabled
1. In Databricks, left sidebar → **Catalog**
2. If you see a list of catalogs, **Unity Catalog is already enabled** → Skip to 3b
3. If you get an error, ask IT to enable it

### 3b. Create Your Catalog & Schema
1. Click **Catalog** → **Create Catalog**
   - Name: `leadership_poc`
   - Description: `POC for Leadership RAG`
   - Click **Create**

2. After creation, you'll see the catalog. Click into it.
3. Click **Create Schema**
   - Name: `rag`
   - Comment: `RAG data and indexes`
   - Click **Create**

### 3c. Create a Volume (File Storage)
1. In the `leadership_poc.rag` schema, click **Create** → **Create Volume**
   - Name: `raw_docs`
   - Comment: `Store raw Confluence exports`
   - Click **Create**

### Result:
You now have:
```
leadership_poc
  └── rag
      ├── raw_docs (volume - for files)
      └── (will add embeddings table later)
```

✅ **Mark DONE when:** You can see `leadership_poc.rag` in the Catalog UI.

---

## STEP 4: Create Vector Search Endpoint (5 minutes)

This is the "search engine" that finds similar documents.

### In Databricks UI:
1. Left sidebar → **Vector Search** (under AI)
2. Click **Create endpoint**
   - Name: `leadership-vector-endpoint`
   - Provider: `Databricks`
   - Embedding model: `Databricks BGE Large EN` (free, fast, good quality)
   - Region: (auto-selected based on workspace)
   - Click **Create**

**⏳ Wait 5-10 minutes for endpoint to start.**

### Verify:
1. Refresh the page
2. You should see: Status = `ONLINE`

✅ **Mark DONE when:** Status = `ONLINE`

---

## STEP 5: Ingest Confluence Docs (First-Time Setup)

### 5a. Create Notebook in Databricks

1. Click **Workspace** (left sidebar)
2. Right-click → **Create** → **Notebook**
   - Name: `01_ingest_confluence_docs`
   - Language: `Python`
   - Cluster: (leave default for now)
   - Click **Create**

3. Copy the entire code below into the notebook:

```python
# Databricks notebook source
# STEP 1: Load secrets
import os
os.environ["OPENAI_API_KEY"] = dbutils.secrets.get(scope="leadership", key="openai_api_key")

from confluence_client import ConfluenceClient
from typing import List
import pandas as pd
from datetime import datetime
import hashlib

# STEP 2: Initialize Confluence Client (same as your existing code)
confluence_url = "https://confluence.cdk.com/"
confluence_user = "your-confluence-email@company.com"
confluence_token = "your-confluence-api-token"  # Ask for this in Confluence settings

confluence_client = ConfluenceClient(
    url=confluence_url,
    username=confluence_user,
    api_token=confluence_token
)

# STEP 3: Fetch ALL Confluence pages
print("🔍 Fetching Confluence pages...")
all_pages = confluence_client.get_all_pages()  # This should exist in your code
print(f"✅ Found {len(all_pages)} pages")

# STEP 4: Chunk documents (1024 tokens ~ 1000 chars)
def chunk_text(text: str, chunk_size: int = 2000, overlap: int = 200) -> List[str]:
    """Split text into overlapping chunks"""
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])
        start = end - overlap
    return chunks

# STEP 5: Create chunked dataset
chunks_data = []
for page in all_pages:
    page_id = page.get("id", "unknown")
    page_title = page.get("title", "Untitled")
    page_body = page.get("body", {}).get("storage", {}).get("value", "")
    page_url = page.get("_links", {}).get("webui", "")
    
    # Skip empty pages
    if not page_body.strip():
        continue
    
    # Create chunks
    for chunk_text in chunk_text(page_body, chunk_size=2000, overlap=200):
        chunk_id = hashlib.md5(f"{page_id}-{chunk_text[:100]}".encode()).hexdigest()
        
        chunks_data.append({
            "id": chunk_id,
            "page_id": page_id,
            "page_title": page_title,
            "text": chunk_text,
            "source_type": "confluence",
            "source_url": page_url,
            "indexed_at": datetime.now().isoformat()
        })

print(f"✅ Created {len(chunks_data)} chunks from {len(all_pages)} pages")

# STEP 6: Save to Delta Lake
df = spark.createDataFrame(chunks_data)
table_path = "leadership_poc.rag.confluence_chunks"
df.write.mode("overwrite").option("mergeSchema", "true").saveAsTable(table_path)

print(f"✅ Saved chunks to {table_path}")

# DISPLAYNAME:
display(spark.table(table_path).limit(5))
```

### 5b. Configure Your Confluence Details

In the notebook, update these 3 lines:

```python
confluence_url = "https://confluence.cdk.com/"                    # Your URL
confluence_user = "your-confluence-email@company.com"            # Your email
confluence_token = "your-confluence-api-token"                   # Get from Confluence
```

**How to get Confluence API token:**
1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **Create API token**
3. Copy the token, paste into the notebook

### 5c. Run the Notebook
1. At the top of the notebook, click **Attach & run** (or just **Run**)
2. Select a cluster (or create one: **New cluster** → `Python 3.11` → **Create**)
3. Wait for the cluster to start
4. Click **Run all** (play icon)

### What You'll See:
```
🔍 Fetching Confluence pages...
✅ Found 487 pages
✅ Created 2,341 chunks from 487 pages
✅ Saved chunks to leadership_poc.rag.confluence_chunks
```

✅ **Mark DONE when:** You see the ✅ messages and a preview table at the bottom.

**Troubleshooting:**
- **Error: "Confluence client not found"** → Add your existing `confluence_client.py` to Databricks. Ask me how.
- **Error: "401 Unauthorized"** → Check your Confluence URL and token are correct.

---

## STEP 6: Create Vector Search Index

Now we'll create the searchable index from your chunks.

### 6a. Create Another Notebook

1. Right-click → **Create** → **Notebook**
   - Name: `02_create_vector_index`
   - Language: `Python`

2. Paste this code:

```python
# Databricks notebook source
from databricks.vector_search.client import VectorSearchClient
from databricks.sdk import WorkspaceClient

# Initialize clients
ws = WorkspaceClient()
vsc = VectorSearchClient(workspace_url=ws.config.host, personal_token=ws.config.token)

# Create Vector Search index
endpoint_name = "leadership-vector-endpoint"
index_name = "leadership_poc.rag.confluence_index"

print(f"🔍 Creating Vector Search index: {index_name}")

try:
    vsc.create_delta_sync_index(
        endpoint_name=endpoint_name,
        index_name=index_name,
        primary_key="id",
        delta_sync_index_config={
            "source_table": "leadership_poc.rag.confluence_chunks",
            "embedding_source_columns": ["text"],  # Column to embed
            "embedding_model_endpoint_name": "databricks-bge-large-en"  # Built-in model
        }
    )
    print("✅ Index created! Embedding will start in background...")
    
except Exception as e:
    if "already exists" in str(e):
        print("⚠️ Index already exists, skipping creation")
    else:
        raise

# Check status
index_info = vsc.get_index(endpoint_name=endpoint_name, index_name=index_name)
print(f"Index status: {index_info}")
```

3. Click **Run all**

### What You'll See:
```
🔍 Creating Vector Search index: leadership_poc.rag.confluence_index
✅ Index created! Embedding will start in background...
Index status: <ready>
```

✅ **Mark DONE when:** You see the ✅ message.

---

## STEP 7: Deploy RAG Model Serving Handler (15 minutes)

This is your new "FastAPI" but running in Databricks.

### 7a. Create the Handler Notebook

1. Right-click → **Create** → **Notebook**
   - Name: `03_rag_handler_serving`
   - Language: `Python`

2. Paste the entire code below:

```python
# Databricks notebook source
# This notebook defines the RAG handler for Model Serving

# STEP 1: Load your existing Python modules
# (We'll import from your local files)

import json
import os
from typing import Dict, List, Any
from datetime import datetime
import logging

# Load secrets
os.environ["OPENAI_API_KEY"] = dbutils.secrets.get(scope="leadership", key="openai_api_key")

from databricks.vector_search.client import VectorSearchClient
from databricks.sdk import WorkspaceClient
import openai

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# STEP 2: Initialize clients
ws = WorkspaceClient()
vsc = VectorSearchClient(workspace_url=ws.config.host, personal_token=ws.config.token)

# STEP 3: Define the RAG class (this will serve requests)
class LeadershipRAGHandler:
    def __init__(self):
        self.vector_index = vsc.get_index(
            endpoint_name="leadership-vector-endpoint",
            index_name="leadership_poc.rag.confluence_index"
        )
        self.openai_client = openai.OpenAI()
        logger.info("✅ RAG Handler initialized")
    
    def search_documents(self, query: str, num_results: int = 5) -> List[Dict[str, Any]]:
        """Search Vector Search index for similar documents"""
        try:
            results = self.vector_index.similarity_search(
                query_text=query,
                num_results=num_results
            )
            
            docs = []
            for result in results.get("result", {}).get("data_array", []):
                docs.append({
                    "id": result[0],  # ID column
                    "text": result[1],  # Text column
                    "score": result[2],  # Similarity score
                    "metadata": {
                        "title": result[3] if len(result) > 3 else "Unknown",
                        "url": result[4] if len(result) > 4 else ""
                    }
                })
            
            return docs
        except Exception as e:
            logger.error(f"❌ Search failed: {e}")
            return []
    
    def generate_rag_response(self, query: str) -> Dict[str, Any]:
        """
        RAG (Retrieval-Augmented Generation):
        1. Retrieve similar docs
        2. Pass as context to LLM
        3. Return answer + citations
        """
        # Step 1: Retrieve
        docs = self.search_documents(query, num_results=5)
        
        if not docs:
            return {
                "answer": "No relevant documents found in Confluence.",
                "citations": [],
                "error": "No context found"
            }
        
        # Step 2: Build context
        context = "## Relevant Documentation\n\n"
        citations = []
        for i, doc in enumerate(docs, 1):
            context += f"**Document {i}** (Confidence: {doc['score']:.2%})\n"
            context += f"{doc['text'][:500]}...\n"
            context += f"Source: {doc['metadata'].get('title', 'Unknown')}\n\n"
            
            citations.append({
                "title": doc['metadata'].get('title'),
                "url": doc['metadata'].get('url'),
                "score": doc['score']
            })
        
        # Step 3: Generate with LLM
        prompt = f"""You are a leadership insights assistant. Answer the user's question based on the provided documentation.
Be concise and cite which documents you used.

{context}

User Question: {query}

Provide a helpful, actionable answer."""
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a helpful leadership insights assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            answer = response.choices[0].message.content
            
            return {
                "answer": answer,
                "citations": citations,
                "context_used": len(docs),
                "timestamp": datetime.now().isoformat()
            }
        
        except Exception as e:
            logger.error(f"❌ OpenAI call failed: {e}")
            return {
                "answer": f"Error generating response: {str(e)}",
                "citations": citations,
                "error": str(e)
            }

# STEP 4: Initialize handler (this runs once when model loads)
handler = LeadershipRAGHandler()

# STEP 5: Define the serving function (this is what Model Serving calls)
def predict(dataframe):
    """
    Input dataframe columns: query
    Output: answer, citations, etc.
    """
    results = []
    
    for row in dataframe.to_dict(orient="records"):
        query = row.get("query", "")
        logger.info(f"Processing query: {query}")
        
        response = handler.generate_rag_response(query)
        results.append(response)
    
    return results
```

3. At the bottom of the notebook, add this cell to test locally:

```python
# Test locally before deploying
test_query = "What are best practices for team leadership?"
result = handler.generate_rag_response(test_query)
print(json.dumps(result, indent=2))
```

4. Click **Run all** to test

### What You'll See:
```
✅ RAG Handler initialized
Processing query: What are best practices for team leadership?

{
  "answer": "Based on the documentation, effective team leadership includes...",
  "citations": [
    {
      "title": "Leadership Handbook - Building Trust",
      "url": "https://confluence.cdk.com/...",
      "score": 0.87
    }
  ],
  "context_used": 5,
  "timestamp": "2024-01-15T10:30:45.123456"
}
```

✅ **Mark DONE when:** You see results above with no errors.

---

## STEP 8: Deploy to Model Serving (10 minutes)

Now we'll expose this as a REST API that your frontend can call.

### 8a. Package the Model

In the notebook `03_rag_handler_serving`, add this final cell:

```python
# Register model to MLflow (Model Registry)
import mlflow
from mlflow.models import infer_signature

# Log the model
mlflow.set_experiment("/Users/your-email@company.com/leadership-rag")

with mlflow.start_run():
    # Save the predict function
    mlflow.pyfunc.log_model(
        artifact_path="model",
        python_model=handler,
        code_path=["/path/to/your/code"]  # Optional: include dependencies
    )
    
    mlflow.log_param("endpoint_type", "rag")
    mlflow.log_param("embedding_model", "databricks-bge-large-en")
    
    print("✅ Model logged to MLflow")
```

Click **Run**

### 8b. Deploy to Model Serving

1. Left sidebar → **Models** → **Serving**
2. Click **Deploy model** → **From MLflow**
3. Search: `leadership-rag`
4. Select the latest version
5. Configure:
   - Endpoint name: `leadership-rag-endpoint`
   - Serving compute: `Serverless` (if available, or `Standard`)
   - Rate limit: `100` requests/minute
   - Click **Deploy**

**⏳ Wait 2-5 minutes for deployment.**

### What You'll See:
```
Status: Ready (green checkmark)
Endpoint URL: https://your-workspace.databricks.com/serving-endpoints/leadership-rag-endpoint/invocations
```

**Copy that URL!** You'll need it for the frontend.

✅ **Mark DONE when:** Status = `Ready` (green)

---

## STEP 9: Update Frontend (15 minutes)

Now your Next.js UI will call Databricks instead of localhost.

### 9a. Update `.env.local`

In `frontend/.env.local`, replace:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

With:

```env
NEXT_PUBLIC_BACKEND_URL=https://your-workspace.databricks.com/serving-endpoints/leadership-rag-endpoint
NEXT_PUBLIC_DATABRICKS_TOKEN=dapi-your-databricks-token-here
```

(Use the PAT token from Step 2)

### 9b. Create a New API Wrapper

Create `frontend/lib/databricks-client.ts`:

```typescript
// Databricks RAG client
export async function queryRagEndpoint(query: string): Promise<{
  answer: string;
  citations: Array<{ title: string; url: string; score: number }>;
  context_used: number;
}> {
  const endpoint = process.env.NEXT_PUBLIC_BACKEND_URL;
  const token = process.env.NEXT_PUBLIC_DATABRICKS_TOKEN;

  if (!endpoint || !token) {
    throw new Error("Databricks endpoint or token not configured");
  }

  try {
    const response = await fetch(`${endpoint}/invocations`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dataframe_records: [{ query }],
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const result = data.predictions?.[0] || data[0];

    return {
      answer: result.answer,
      citations: result.citations || [],
      context_used: result.context_used || 0,
    };
  } catch (error) {
    console.error("❌ RAG query failed:", error);
    throw error;
  }
}
```

### 9c. Update Your Chat Component

In your chat/message handling component (e.g., `frontend/app/components/ChatInterface.tsx`):

```typescript
import { queryRagEndpoint } from "@/lib/databricks-client";

async function handleUserMessage(userInput: string) {
  try {
    // First try RAG
    const ragResult = await queryRagEndpoint(userInput);
    
    setMessages(prev => [...prev, {
      role: "assistant",
      content: ragResult.answer,
      citations: ragResult.citations  // Show sources!
    }]);
  } catch (error) {
    console.error("RAG failed, falling back to local AI:", error);
    // Fallback to your existing OpenAI logic
  }
}
```

### 9d. Display Citations

In your message display component:

```typescript
{message.citations && message.citations.length > 0 && (
  <div className="mt-3 p-2 bg-gray-100 rounded text-sm">
    <strong>Sources:</strong>
    <ul className="mt-1">
      {message.citations.map((cite, i) => (
        <li key={i}>
          <a href={cite.url} target="_blank" className="text-blue-600 underline">
            {cite.title}
          </a>
          {" "}(Confidence: {(cite.score * 100).toFixed(0)}%)
        </li>
      ))}
    </ul>
  </div>
)}
```

✅ **Mark DONE when:** Frontend compiles without errors.

---

## STEP 10: Test End-to-End (5 minutes)

### 10a. Start Frontend
```bash
cd frontend
npm run dev
```

### 10b. Open Browser
```
http://localhost:3000
```

### 10c. Ask a Question
In the chat:
```
What are the best practices for delegation in team leadership?
```

### What Should Happen:
```
✅ Your Next.js frontend sends query to Databricks
✅ Databricks searches Confluence docs
✅ OpenAI generates answer with context
✅ You see: "Based on the documentation..."
✅ You see: "Sources: [Leadership Handbook - Building Trust](url) (Confidence: 87%)"
```

### Troubleshooting:

| Error | Fix |
|-------|-----|
| `401 Unauthorized` | Check your Databricks token in `.env.local` is correct |
| `No relevant documents found` | Make sure the ingest notebook completed successfully |
| `Model endpoint not ready` | Wait 2-3 minutes, refresh Model Serving page |
| `CORS error` | Check Databricks workspace URL is correct (no trailing `/`) |

---

## STEP 11: What Happens If Something Breaks?

**I'm here 24/7.** Send me:

1. **The error message** (exact text)
2. **Where it happened** (Databricks notebook? Frontend? Logs?)
3. **What you did before it broke** (e.g., "clicked Deploy")

Common issues I can fix:

- ✅ Confluence API token expired → Regenerate
- ✅ Vector Search index not syncing → Restart cluster
- ✅ Model Serving endpoint won't start → Check cluster resources
- ✅ Frontend not connecting → CORS/token issues
- ✅ No documents found → Rerun ingest notebook

---

## Checklist: You're Done When...

- [ ] Databricks workspace access confirmed
- [ ] Service principal + PAT created and stored in secrets
- [ ] Unity Catalog + catalog/schema created
- [ ] Vector Search endpoint online
- [ ] Confluence docs ingested (2,000+ chunks)
- [ ] Vector index fully synced
- [ ] RAG handler notebook tested locally
- [ ] Model Serving endpoint deployed and ready
- [ ] Frontend updated with Databricks endpoint
- [ ] End-to-end test successful
- [ ] You asked me 3+ questions and got answers 😊

---

## Next Steps (After Verification)

Once verified, I can:
1. Add Jira query support (search Jira issues in RAG)
2. Add reranking (Cohere) for better relevance
3. Add caching to reduce costs
4. Set up monitoring + cost alerts
5. Optimize chunk size/embedding model

---

**Questions? Ask me anything. I'll help you debug.**

---

Generated: 2024-01-15
Next review: After you complete Step 10
