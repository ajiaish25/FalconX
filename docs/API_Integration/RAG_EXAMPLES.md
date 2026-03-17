# RAG/Hybrid Search Examples (Current Behavior)

## Confluence (Documentation)

- **Query:** “What are best practices for delegation?”  
  - **Behavior:** RAG-first (vector + LLM). Returns an answer grounded in docs with citations.  
  - **Example output:**  
    - Answer text summarizing best practices  
    - Sources with confidence:  
      - Leadership Handbook - Delegation (87%)  
      - Team Management Guide (82%)  
      - Manager Training (75%)  

- **Query:** “Show me documentation about sprint planning”  
  - RAG-first; if RAG unavailable, falls back to Confluence API search.  

## Jira (Hybrid: JQL + Semantic RAG)

- **Query:** “Find tickets about upload failures”  
  - JQL runs first. If zero results, semantic RAG searches recent issues and returns:  
    - CCM-123: “File upload error on gateway” (88%)  
    - CCM-210: “Data import failed on step 2” (81%)  
    - CCM-305: “Upload timeout during large file transfer” (77%)  

- **Query:** “Show issues similar to authentication problems”  
  - JQL first; if no matches, semantic RAG returns related issues with scores:  
    - CCM-456: “SSO login timeout issue” (82%)  
    - CCM-789: “Password reset not working” (75%)  
    - CCM-812: “JWT token validation errors” (73%)  

- **Assignee lookup:** “Tickets worked by Ashwin”  
  - JQL variations first; if zero, semantic fallback returns likely matches with scores instead of empty results.  

## API Endpoints

- **Confluence RAG:** `POST /api/rag/query`  
- **Jira semantic:** `POST /api/chat/semantic-search`  
- **Hybrid Jira search:** `/api/jira/search`, AI engine, JQL processor, and helper flows now auto-fallback to semantic RAG when JQL returns zero.  

## Notes
- Confluence paths are RAG-first; only fall back to REST search if RAG is unavailable.  
- Jira paths use exact JQL first, then semantic RAG fallback for zero-results cases.  

