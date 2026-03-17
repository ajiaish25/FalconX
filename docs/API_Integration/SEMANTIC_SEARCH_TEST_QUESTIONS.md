# Semantic Search Test Questions

## Overview

This document provides sample questions to test and verify semantic search functionality across Jira, GitHub, and Confluence.

---

## 🔍 Test Categories

### 1. Jira Semantic Search
### 2. GitHub Semantic Search  
### 3. Confluence Semantic Search
### 4. Combined/Multi-Source Search
### 5. Databricks Vector Search Verification

---

## 📋 1. Jira Semantic Search Tests

### Basic Semantic Queries

**Question 1:** "Find tickets about authentication problems"
- **Expected:** Finds issues with "login error", "SSO timeout", "password reset failed", etc.
- **Verify:** Results show similarity scores, not just exact keyword matches

**Question 2:** "Show me issues related to upload failures"
- **Expected:** Finds "file upload error", "data import failed", "upload timeout", etc.
- **Verify:** Multiple related issues with semantic scores

**Question 3:** "Tickets about performance issues"
- **Expected:** Finds "slow response", "timeout errors", "latency problems", etc.
- **Verify:** Broad semantic matching beyond exact keywords

**Question 4:** "Issues similar to database connection errors"
- **Expected:** Finds "DB connection timeout", "database unavailable", "SQL errors", etc.
- **Verify:** Related technical issues with context

**Question 5:** "Find bugs related to user interface problems"
- **Expected:** Finds "UI not loading", "button not working", "display issues", etc.
- **Verify:** Cross-domain semantic understanding

### Advanced Jira Queries

**Question 6:** "Show me tickets where users can't access the system"
- **Expected:** Finds authentication, permission, access denied issues
- **Verify:** Context-aware semantic search

**Question 7:** "Find issues about data not saving correctly"
- **Expected:** Finds "save failed", "data loss", "persistence errors", etc.
- **Verify:** Synonym and related term matching

**Question 8:** "Tickets about email notifications not working"
- **Expected:** Finds "email delivery failed", "notification issues", "mail service down", etc.
- **Verify:** Functional area semantic search

---

## 🐙 2. GitHub Semantic Search Tests

### Basic GitHub Queries

**Question 9:** "Find GitHub pull requests about login functionality"
- **Expected:** Finds PRs with "authentication", "sign-in", "login flow", etc.
- **Verify:** GitHub results with similarity scores

**Question 10:** "Show me GitHub issues about API rate limiting"
- **Expected:** Finds "rate limit exceeded", "throttling", "API limits", etc.
- **Verify:** Technical concept matching

**Question 11:** "Find PRs related to database migrations"
- **Expected:** Finds "migration scripts", "schema changes", "DB updates", etc.
- **Verify:** Development workflow semantic search

**Question 12:** "GitHub issues about deployment failures"
- **Expected:** Finds "deploy error", "CI/CD failed", "build broken", etc.
- **Verify:** DevOps-related semantic matching

### Advanced GitHub Queries

**Question 13:** "Show me pull requests that fix memory leaks"
- **Expected:** Finds "memory optimization", "leak fixes", "performance improvements", etc.
- **Verify:** Technical problem-solving semantic search

**Question 14:** "Find GitHub issues about security vulnerabilities"
- **Expected:** Finds "security fix", "vulnerability patch", "CVE", etc.
- **Verify:** Security domain understanding

---

## 📚 3. Confluence Semantic Search Tests

### Basic Confluence Queries

**Question 15:** "What are best practices for delegation?"
- **Expected:** Finds leadership docs, management guides, delegation processes
- **Verify:** Document retrieval with citations and confidence scores

**Question 16:** "Show me documentation about sprint planning"
- **Expected:** Finds agile guides, sprint planning docs, scrum processes
- **Verify:** Process documentation semantic search

**Question 17:** "Find documentation about team management"
- **Expected:** Finds leadership handbooks, team guides, management docs
- **Verify:** Broad topic semantic matching

**Question 18:** "What are the guidelines for code reviews?"
- **Expected:** Finds code review processes, quality standards, review checklists
- **Verify:** Technical process documentation

### Advanced Confluence Queries

**Question 19:** "How do we handle conflict resolution in teams?"
- **Expected:** Finds conflict management docs, team dynamics guides
- **Verify:** HR/management domain understanding

**Question 20:** "Documentation about performance reviews"
- **Expected:** Finds review processes, evaluation criteria, feedback guides
- **Verify:** HR process semantic search

**Question 21:** "Find information about project kickoff processes"
- **Expected:** Finds project initiation docs, kickoff templates, planning guides
- **Verify:** Project management domain

---

## 🔄 4. Combined/Multi-Source Search Tests

### Cross-Platform Queries

**Question 22:** "Find everything about authentication problems"
- **Expected:** Returns Jira issues + GitHub PRs + Confluence docs
- **Verify:** All three sources searched, results from each

**Question 23:** "Show me issues and documentation about API errors"
- **Expected:** Jira tickets + GitHub issues + Confluence API docs
- **Verify:** Multi-source semantic search

**Question 24:** "Find tickets, PRs, and docs about database issues"
- **Expected:** Results from all three sources
- **Verify:** Comprehensive cross-platform search

### Source-Specific Queries

**Question 25:** "Jira tickets about login failures"
- **Expected:** Only Jira results
- **Verify:** Source filtering works

**Question 26:** "GitHub pull requests about refactoring"
- **Expected:** Only GitHub results
- **Verify:** GitHub-specific search

**Question 27:** "Confluence documentation about leadership"
- **Expected:** Only Confluence results
- **Verify:** Confluence-specific search

---

## ✅ 5. Verification Tests

### Connection Verification

**Test 1:** Check RAG Health
```bash
GET /api/rag/health
```
- **Expected:** `status: "ready"`, `vector_search_configured: true`
- **Verify:** Databricks connection is active

**Test 2:** Check GitHub Status
```bash
GET /api/github/status
```
- **Expected:** `connected: true`, user information
- **Verify:** GitHub connection is active

**Test 3:** Check Jira Status
```bash
GET /api/jira/status
```
- **Expected:** Jira connection details
- **Verify:** Jira connection is active

### Semantic Search Endpoint Tests

**Test 4:** Basic Semantic Search
```bash
POST /api/chat/semantic-search
{
  "message": "authentication problems"
}
```
- **Expected:** Results from all configured sources
- **Verify:** Similarity scores present, `using_rag: true`

**Test 5:** Source-Specific Search
```bash
POST /api/chat/semantic-search
{
  "message": "confluence documentation about best practices"
}
```
- **Expected:** Only Confluence results
- **Verify:** Source filtering works

**Test 6:** Empty Results Handling
```bash
POST /api/chat/semantic-search
{
  "message": "xyzabc123nonexistent"
}
```
- **Expected:** Empty results or low similarity scores
- **Verify:** Graceful handling of no matches

---

## 📊 Expected Response Format

### Successful Semantic Search Response

```json
{
  "success": true,
  "search_results": "Found 5 similar Jira issues | Found 3 similar GitHub issues/PRs | Found 8 similar Confluence documents",
  "semantic_results": [
    {
      "key": "CCM-123",
      "summary": "User authentication failing",
      "similarity_score": 87.5,
      "using_rag": true,
      "source": "jira"
    },
    {
      "key": "123",
      "title": "Fix login timeout issue",
      "similarity_score": 82.3,
      "using_rag": true,
      "source": "github"
    },
    {
      "title": "Authentication Best Practices",
      "similarity_score": 91.2,
      "using_rag": true,
      "source": "confluence"
    }
  ],
  "jira_results": [...],
  "github_results": [...],
  "confluence_results": [...],
  "total_searched": 16,
  "using_rag": true
}
```

---

## 🎯 Testing Checklist

### Pre-Testing Setup
- [ ] Databricks Vector Search connected (`/api/rag/health` shows `ready`)
- [ ] GitHub connected (`/api/github/status` shows `connected: true`)
- [ ] Jira connected (verify Jira status)
- [ ] Confluence configured (if applicable)

### Test Execution
- [ ] Test Jira semantic search (Questions 1-8)
- [ ] Test GitHub semantic search (Questions 9-14)
- [ ] Test Confluence semantic search (Questions 15-21)
- [ ] Test combined search (Questions 22-24)
- [ ] Test source-specific filtering (Questions 25-27)
- [ ] Verify similarity scores are present
- [ ] Verify `using_rag: true` flag
- [ ] Verify results are semantically relevant (not just keyword matches)

### Verification Points
- [ ] Results show similarity scores (0-100%)
- [ ] Results are semantically relevant (not just exact keyword matches)
- [ ] Multiple sources return results when appropriate
- [ ] Source filtering works correctly
- [ ] Empty queries handled gracefully
- [ ] Error handling works for connection failures

---

## 🔍 How to Verify Semantic Search is Working

### Key Indicators:

1. **Similarity Scores Present:**
   - All results should have `similarity_score` field
   - Scores should be between 0-100%

2. **Semantic Relevance:**
   - Results should include synonyms and related terms
   - Not just exact keyword matches
   - Example: "upload failures" finds "file upload error", "data import failed"

3. **RAG Flag:**
   - Results should have `using_rag: true` when using embeddings
   - `using_rag: false` indicates keyword fallback

4. **Multi-Source Results:**
   - Combined queries return results from multiple sources
   - Each source has separate result arrays

5. **Context Understanding:**
   - Queries like "users can't access system" find authentication, permission, and access issues
   - Not just literal matches

---

## 🐛 Troubleshooting Test Failures

### Issue: No Results Returned

**Check:**
1. Verify connections are active (health checks)
2. Check if data exists in sources
3. Verify semantic search is enabled (`using_rag: true`)
4. Check logs for errors

### Issue: Only Keyword Matches (No Semantic)

**Check:**
1. Verify `OPENAI_API_KEY` is set
2. Check if RAG handler initialized correctly
3. Verify embeddings are being generated
4. Check logs for "keyword fallback" warnings

### Issue: Wrong Source Results

**Check:**
1. Verify source detection logic
2. Check query parsing
3. Verify source filtering

### Issue: Low Similarity Scores

**Check:**
1. This might be normal for broad queries
2. Try more specific queries
3. Verify embedding model is working
4. Check if documents are properly indexed

---

## 📝 Test Results Template

```
Test Date: ___________
Tester: ___________

Jira Semantic Search:
- [ ] Question 1: Pass / Fail
- [ ] Question 2: Pass / Fail
- ...

GitHub Semantic Search:
- [ ] Question 9: Pass / Fail
- [ ] Question 10: Pass / Fail
- ...

Confluence Semantic Search:
- [ ] Question 15: Pass / Fail
- [ ] Question 16: Pass / Fail
- ...

Combined Search:
- [ ] Question 22: Pass / Fail
- [ ] Question 23: Pass / Fail
- ...

Connection Verification:
- [ ] RAG Health: Pass / Fail
- [ ] GitHub Status: Pass / Fail
- [ ] Jira Status: Pass / Fail

Notes:
_______________________________________
_______________________________________
```

---

## 🚀 Quick Test Commands

### Test Semantic Search via cURL

```bash
# Test Jira + GitHub + Confluence
curl -X POST http://localhost:8000/api/chat/semantic-search \
  -H "Content-Type: application/json" \
  -d '{"message": "authentication problems"}'

# Test Confluence only
curl -X POST http://localhost:8000/api/chat/semantic-search \
  -H "Content-Type: application/json" \
  -d '{"message": "confluence documentation about best practices"}'

# Test GitHub only
curl -X POST http://localhost:8000/api/chat/semantic-search \
  -H "Content-Type: application/json" \
  -d '{"message": "github pull requests about login"}'
```

### Test Health Checks

```bash
# RAG Health
curl http://localhost:8000/api/rag/health

# GitHub Status
curl http://localhost:8000/api/github/status

# Jira Status (if endpoint exists)
curl http://localhost:8000/api/jira/status
```

---

## 💡 Tips for Effective Testing

1. **Start Simple:** Begin with basic queries before complex ones
2. **Check Logs:** Monitor backend logs for connection and search details
3. **Verify Scores:** Ensure similarity scores are reasonable (typically 50-100% for good matches)
4. **Test Edge Cases:** Try empty queries, very specific queries, very broad queries
5. **Compare Results:** Compare semantic search results with keyword search to see the difference
6. **Test Fallbacks:** Disable OpenAI API key temporarily to test keyword fallback

---

## 📚 Related Documentation

- [Databricks Vector Connection Guide](./DATABRICKS_VECTOR_CONNECTION.md)
- [RAG Implementation Summary](./RAG_IMPLEMENTATION_SUMMARY.md)
- [Jira RAG Search](./JIRA_RAG_SEARCH.md)
- [API Integration Guide](./API_Integration.md)

