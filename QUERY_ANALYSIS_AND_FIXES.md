# Query Analysis and Fixes Report

## Analysis of User Questions and Answers

### Query 1: "give me NDP-20290 assignee details" ✅
**Status:** Working correctly
**Response:** Detailed issue information with assignee, status, priority, etc.
**Analysis:** This query correctly:
- Detected ticket key (NDP-20290)
- Routed to Jira
- Generated proper JQL: `issue = "NDP-20290"`
- Returned complete issue details

---

### Query 2: "what is the defect leakage for NDP project during November 2025" ✅
**Status:** Working correctly
**Response:** Defect Leakage Analysis showing 30.8% with breakdown
**Analysis:** This query correctly:
- Detected as metric query (defect_leakage)
- Extracted project (NDP) and time period (November 2025)
- Calculated metric correctly
- Provided detailed breakdown and analysis

---

### Query 3: "how many regression test cases are there in NDP project ? out of which how many are automated and how many are manual" ❌
**Status:** **CRITICAL ISSUE - Misrouted to Confluence**
**Response:** "I could not find matching Confluence pages" (WRONG!)
**Expected Response:** Should show:
- Total regression test cases count
- Automated regression test cases count
- Manual regression test cases count
- Breakdown percentages

**Root Cause Analysis:**

1. **Routing Issue:** The query is being incorrectly routed to Confluence instead of Jira
2. **Missing Logic:** The system doesn't have a specific handler for "regression test cases with automated/manual breakdown" queries
3. **JQL Generation:** Even if routed correctly, the query needs to generate multiple JQL queries:
   - Total regression: `project = "NDP" AND type = Test AND "Test Type" = "Regression Testing"`
   - Automated: `project = "NDP" AND type = Test AND "Test Type" = "Regression Testing" AND "Test Status" = Automated`
   - Manual: `project = "NDP" AND type = Test AND "Test Type" = "Regression Testing" AND "Test Status" != Automated`

---

## Issues Identified

### Issue 1: Query Misclassification
**Problem:** Test case queries are being misclassified as Confluence queries
**Location:** `backend/services/jql_processor.py` line 78-79
**Current Logic:**
```python
confluence_keywords = ['confluence', 'documentation', 'wiki', 'page', 'article', 'knowledge base', 'doc']
is_confluence_query = any(keyword in query.lower() for keyword in confluence_keywords)
```
**Issue:** The word "doc" in the keyword list might be matching "documentation" context, but more importantly, test case queries should be explicitly recognized as Jira queries.

### Issue 2: Missing Test Case Breakdown Handler
**Problem:** No specific handler for queries asking for "automated vs manual" breakdown of test cases
**Location:** `backend/services/ai_engine.py`
**Current State:** 
- Has `_calculate_regression_automation()` but it only calculates percentage, not the breakdown
- Doesn't handle "how many automated and how many manual" queries

### Issue 3: Incomplete Response Formatting
**Problem:** Even if JQL is generated correctly, the response doesn't format the automated/manual breakdown clearly
**Location:** Response generation in `ai_engine.py`

---

## Recommended Fixes

### Fix 1: Improve Query Classification
**Priority:** HIGH
**Action:** Add test case keywords to Jira detection logic

**File:** `backend/services/jql_processor.py`
**Change:**
```python
# Before Confluence check, add explicit Jira test case detection
test_case_keywords = ['test case', 'test cases', 'regression test', 'automated test', 'manual test', 
                      'test automation', 'automation status', 'test status']
is_test_case_query = any(keyword in query.lower() for keyword in test_case_keywords)

if is_test_case_query:
    # Force Jira routing for test case queries
    logger.info(f"🔍 Test case query detected - routing to Jira")
    # Continue with Jira processing
```

### Fix 2: Add Test Case Breakdown Handler
**Priority:** HIGH
**Action:** Create a new method to handle test case breakdown queries

**File:** `backend/services/ai_engine.py`
**New Method:**
```python
async def _calculate_test_case_breakdown(self, project: str, test_type: str = None) -> Dict[str, Any]:
    """
    Calculate breakdown of test cases: total, automated, manual
    Args:
        project: Project key
        test_type: Optional test type filter (e.g., "Regression Testing")
    """
    # Build base JQL
    base_jql = f'project = "{project}" AND type = Test'
    if test_type:
        base_jql += f' AND "Test Type" = "{test_type}"'
    
    # Total test cases
    total_jql = base_jql
    total_results = await self.jira_client.search(total_jql, max_results=1000)
    total_count = len(total_results.get('issues', [])) if isinstance(total_results, dict) else len(total_results) if total_results else 0
    
    # Automated test cases
    automated_jql = f'{base_jql} AND "Test Status" = Automated'
    automated_results = await self.jira_client.search(automated_jql, max_results=1000)
    automated_count = len(automated_results.get('issues', [])) if isinstance(automated_results, dict) else len(automated_results) if automated_results else 0
    
    # Manual test cases (all non-automated)
    manual_jql = f'{base_jql} AND "Test Status" != Automated'
    manual_results = await self.jira_client.search(manual_jql, max_results=1000)
    manual_count = len(manual_results.get('issues', [])) if isinstance(manual_results, dict) else len(manual_results) if manual_results else 0
    
    automated_percentage = (automated_count / total_count * 100) if total_count > 0 else 0
    manual_percentage = (manual_count / total_count * 100) if total_count > 0 else 0
    
    return {
        'total': total_count,
        'automated': automated_count,
        'manual': manual_count,
        'automated_percentage': round(automated_percentage, 1),
        'manual_percentage': round(manual_percentage, 1),
        'test_type': test_type or 'All',
        'project': project
    }
```

### Fix 3: Enhance Query Understanding for Test Case Queries
**Priority:** MEDIUM
**Action:** Update AI query understanding to detect test case breakdown queries

**File:** `backend/services/ai_engine.py` - `_understand_query_with_ai()`
**Enhancement:** Add detection for:
- "how many automated"
- "how many manual"
- "breakdown of test cases"
- "automated vs manual"

### Fix 4: Improve Response Formatting
**Priority:** MEDIUM
**Action:** Create formatted response for test case breakdown

**File:** `backend/services/ai_engine.py`
**New Method:**
```python
def _format_test_case_breakdown_response(self, breakdown: Dict[str, Any]) -> str:
    """Format test case breakdown into user-friendly response"""
    test_type_label = breakdown.get('test_type', 'All Test Cases')
    if breakdown['test_type'] == 'Regression Testing':
        test_type_label = 'Regression Test Cases'
    
    response = f"**{test_type_label} - {breakdown['project']} Project**\n\n"
    response += f"**Total {test_type_label.lower()}: {breakdown['total']}**\n\n"
    response += f"**Breakdown:**\n"
    response += f"- **Automated:** {breakdown['automated']} ({breakdown['automated_percentage']}%)\n"
    response += f"- **Manual:** {breakdown['manual']} ({breakdown['manual_percentage']}%)\n\n"
    
    if breakdown['automated_percentage'] >= 70:
        response += f"✅ Excellent automation coverage at {breakdown['automated_percentage']}%."
    elif breakdown['automated_percentage'] >= 50:
        response += f"📊 Good automation coverage at {breakdown['automated_percentage']}%. Consider automating more tests."
    else:
        response += f"⚠️ Automation coverage needs improvement at {breakdown['automated_percentage']}%. Focus on automating critical test scenarios."
    
    return response
```

### Fix 5: Update Query Processing Logic
**Priority:** HIGH
**Action:** Add test case breakdown detection in process_query()

**File:** `backend/services/ai_engine.py` - `process_query()`
**Enhancement:**
```python
# After metric detection, check for test case breakdown queries
if 'test case' in user_query.lower() and ('automated' in user_query.lower() or 'manual' in user_query.lower()):
    # Extract project and test type
    project = query_understanding.get('project') if query_understanding else None
    test_type = None
    if 'regression' in user_query.lower():
        test_type = 'Regression Testing'
    
    if project:
        breakdown = await self._calculate_test_case_breakdown(project, test_type)
        response = self._format_test_case_breakdown_response(breakdown)
        return {
            "response": response,
            "data": breakdown,
            "intent": "test_case_breakdown",
            "success": True,
            "source": "jira"
        }
```

---

## Implementation Priority

1. **Fix 1 (Query Classification)** - CRITICAL - Prevents misrouting
2. **Fix 5 (Query Processing)** - CRITICAL - Handles the query type
3. **Fix 2 (Breakdown Handler)** - HIGH - Core functionality
4. **Fix 4 (Response Formatting)** - MEDIUM - User experience
5. **Fix 3 (Query Understanding)** - MEDIUM - Better detection

---

## Testing Scenarios

After fixes, test these queries:

1. "how many regression test cases are there in NDP project? out of which how many are automated and how many are manual"
2. "show me automated vs manual test cases for NDP"
3. "what is the breakdown of regression tests in NDP project?"
4. "how many automated regression test cases in NDP?"
5. "count manual test cases for NDP project"

---

## Additional Observations

### Good Practices Already in Place:
1. ✅ Detailed logging (recently enhanced)
2. ✅ Proper JQL generation for most queries
3. ✅ Metric calculation works well
4. ✅ Ticket key detection works correctly

### Areas for Improvement:
1. ⚠️ Test case queries need better handling
2. ⚠️ Query classification could be more robust
3. ⚠️ Response formatting for breakdowns needs enhancement
4. ⚠️ Error messages should be more informative

---

## Summary

The main issue is that test case queries asking for automated/manual breakdown are being misrouted to Confluence instead of Jira. The fixes focus on:

1. **Preventing misrouting** by improving classification
2. **Adding specific handlers** for test case breakdown queries
3. **Improving response formatting** for better user experience

All fixes are backward compatible and won't affect existing functionality.

