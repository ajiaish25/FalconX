# WorkBuddy Response Formats

This document outlines all response formats used by WorkBuddy.

## Response Structure

All WorkBuddy responses follow this structure:

```python
{
    "content": str,        # The actual response text
    "type": str,           # Response type: "simple", "analysis", or "error"
    "confidence": float    # Confidence score (0.0 to 1.0)
}
```

## Response Types

### 1. Simple Factual Response (`type: "simple"`)

**Location**: `backend/services/adaptive_response_engine.py` - `generate_simple_factual_response()`

**When Used**: When user query does NOT contain analysis keywords (e.g., "show me NDP-123")

**Single Issue Format**:
```python
**{issue_key}**: {summary}

**Status**: {status}
**Priority**: {priority}
**Reporter**: {reporter}
**Assignee**: {assignee}
**Created**: {created_date}
**Updated**: {updated_date}
**Link**: {jira_url}
```

**Multiple Issues Format**:
```python
Found {count} issues:

- **{issue_key}**: {summary} ({status})
- **{issue_key}**: {summary} ({status})
...

... and {remaining_count} more.
```

**Code Reference**:
```python
# Lines 58-112 in adaptive_response_engine.py
def generate_simple_factual_response(
    self,
    results: List[Dict],
    user_query: str
) -> str:
    if len(results) == 1:
        # Single issue format
        response = f"""**{issue_key}**: {fields.get('summary', 'No summary')}

**Status**: {fields.get('status', {}).get('name', 'Unknown')}
**Priority**: {fields.get('priority', {}).get('name', 'Unknown')}
**Reporter**: {fields.get('reporter', {}).get('displayName', 'Unknown')}
**Assignee**: {fields.get('assignee', {}).get('displayName', 'Unassigned')}
**Created**: {fields.get('created', 'Unknown')}
**Updated**: {fields.get('updated', 'Unknown')}"""
    else:
        # Multiple issues format
        response = f"Found {len(results)} issues:\n\n"
        for issue in results[:10]:
            response += f"- **{issue_key}**: {summary} ({status})\n"
```

---

### 2. Deep Analysis Response (`type: "analysis"`)

**Location**: `backend/services/enhanced_issue_analyzer.py` - `_format_analysis_response()`

**When Used**: When user query contains analysis keywords (e.g., "why", "root cause", "analysis", "fix")

**Format**:
```python
📋 **Issue Analysis: {issue_key} - {summary}**

**Issue Overview:**
This issue was reported by {reporter} and is currently assigned to {assignee}. Status: {status}, Priority: {priority}.

**Root Cause Analysis:**
{root_cause_analysis}

**Recommended Fix Approach:**

{fix_suggestions}

**Related Resources:**
- 🐛 [{related_issue_key}]({url}): {summary}
- 📄 [{doc_title}]({url})
- 🔀 [{pr_title}]({url})

**Next Steps:**
1. Review the root cause analysis above
2. Implement the immediate fix if applicable
3. Plan the proper fix for long-term resolution
4. Update documentation and tests as needed
```

**Code Reference**:
```python
# Lines 322-368 in enhanced_issue_analyzer.py
def _format_analysis_response(
    self,
    issue_details: Dict,
    root_cause: Dict,
    fix_suggestions: Dict,
    related_context: Dict
) -> str:
    response = f"""📋 **Issue Analysis: {issue_details['key']} - {issue_details['summary']}**

**Issue Overview:**
This issue was reported by {issue_details['reporter']} and is currently assigned to {issue_details['assignee']}. Status: {issue_details['status']}, Priority: {issue_details['priority']}.

**Root Cause Analysis:**
{root_cause.get('analysis', 'Analysis not available')}

**Recommended Fix Approach:**

{fix_suggestions.get('suggestions', 'Suggestions not available')}
{related_section}

**Next Steps:**
1. Review the root cause analysis above
2. Implement the immediate fix if applicable
3. Plan the proper fix for long-term resolution
4. Update documentation and tests as needed"""
```

---

### 3. Error Response (`type: "error"`)

**Location**: `backend/services/adaptive_response_engine.py` - `generate_adaptive_response()`

**When Used**: When response generation fails completely

**Format**:
```python
{
    "content": "Unable to generate response.",
    "type": "error",
    "confidence": 0.0
}
```

**Code Reference**:
```python
# Lines 283-288 in adaptive_response_engine.py
return {
    "content": "Unable to generate response.",
    "type": "error",
    "confidence": 0.0
}
```

---

## Response Type Detection

**Location**: `backend/services/adaptive_response_engine.py` - `requires_deep_analysis()`

**Analysis Keywords** (triggers deep analysis):
- "why", "root cause", "analysis", "analyse"
- "explain", "give fix", "how to fix"
- "engineering fix", "what is causing"
- "why is it failing", "debug", "rca"
- "postmortem", "deep dive"
- "technical explanation", "recommendation"
- "fix suggestion", "how can we fix"
- "what should we do", "troubleshoot"
- "investigate", "diagnose"

**Code Reference**:
```python
# Lines 12-49 in adaptive_response_engine.py
def requires_deep_analysis(query: str) -> bool:
    query_lower = query.lower()
    analysis_keywords = [
        'why', 'root cause', 'analysis', 'explain',
        'give fix', 'how to fix', 'debug', 'rca',
        'postmortem', 'deep dive', 'recommendation',
        'troubleshoot', 'investigate', 'diagnose'
    ]
    return any(keyword in query_lower for keyword in analysis_keywords)
```

---

## Response Generation Flow

**Location**: `backend/services/adaptive_response_engine.py` - `generate_adaptive_response()`

```python
# Lines 160-288 in adaptive_response_engine.py
async def generate_adaptive_response(...) -> Dict[str, Any]:
    # Step 1: Check if deep analysis is required
    needs_analysis = requires_deep_analysis(user_query)
    
    if not needs_analysis:
        # SIMPLE MODE: Return factual details only
        return {
            "content": generate_simple_factual_response(results, user_query),
            "type": "simple",
            "confidence": 1.0
        }
    else:
        # DEEP ANALYSIS MODE: Generate comprehensive analysis
        try:
            analysis = await generate_deep_analysis_response(...)
            return {
                "content": analysis,
                "type": "analysis",
                "confidence": 0.9
            }
        except Exception:
            # Fallback to simple if analysis fails
            return {
                "content": generate_simple_factual_response(...) + "\n\n*Note: Deep analysis unavailable.*",
                "type": "simple",
                "confidence": 0.7
            }
```

---

## Integration with AI Engine

**Location**: `backend/services/ai_engine.py` - `_generate_response()`

The AI engine uses the adaptive response engine:

```python
# Lines 4647-4673 in ai_engine.py
async def _generate_response(...) -> Dict[str, Any]:
    from services.adaptive_response_engine import AdaptiveResponseEngine
    
    adaptive_engine = AdaptiveResponseEngine(ai_client=self.client, model=self.model)
    
    response = await adaptive_engine.generate_adaptive_response(
        user_query=user_query,
        query_analysis=query_analysis,
        results=results,
        total_count=total_count,
        unified_rag_handler=unified_rag_handler,
        integrations=integrations
    )
    
    return response
```

---

## Response Format Examples

### Example 1: Simple Query
**Query**: "show me NDP-123"

**Response**:
```json
{
    "content": "**NDP-123**: Export Excel feature not working\n\n**Status**: In Progress\n**Priority**: High\n**Reporter**: Ajith\n**Assignee**: Karthik\n**Created**: 2024-11-15T10:30:00\n**Updated**: 2024-11-17T14:20:00\n**Link**: https://jira.example.com/browse/NDP-123",
    "type": "simple",
    "confidence": 1.0
}
```

### Example 2: Analysis Query
**Query**: "what is the docs2.0 export bug? give me root cause analysis"

**Response**:
```json
{
    "content": "📋 **Issue Analysis: NDP-123 - DOCS 2.0 Export Excel Bug**\n\n**Issue Overview:**\nThis issue was reported by Ajith and is currently assigned to Karthik. Status: In Progress, Priority: High.\n\n**Root Cause Analysis:**\n[AI-generated root cause analysis]\n\n**Recommended Fix Approach:**\n[AI-generated fix suggestions]\n\n**Related Resources:**\n- 🐛 [NDP-98](url): Similar issue\n\n**Next Steps:**\n1. Review the root cause analysis above\n2. Implement the immediate fix if applicable\n3. Plan the proper fix for long-term resolution\n4. Update documentation and tests as needed",
    "type": "analysis",
    "confidence": 0.9
}
```

### Example 3: Multiple Issues
**Query**: "bugs in november"

**Response**:
```json
{
    "content": "Found 15 issues:\n\n- **NDP-123**: Export Excel feature not working (In Progress)\n- **NDP-124**: Login timeout issue (Open)\n- **NDP-125**: Data sync failure (Resolved)\n...\n\n... and 5 more.",
    "type": "simple",
    "confidence": 1.0
}
```

---

## File Locations Summary

1. **Adaptive Response Engine**: `backend/services/adaptive_response_engine.py`
   - `requires_deep_analysis()` - Detects if analysis is needed
   - `generate_simple_factual_response()` - Simple format
   - `generate_deep_analysis_response()` - Deep analysis format
   - `generate_adaptive_response()` - Main entry point

2. **Enhanced Issue Analyzer**: `backend/services/enhanced_issue_analyzer.py`
   - `_format_analysis_response()` - Formats deep analysis response
   - `analyze_issue_comprehensively()` - Generates analysis

3. **AI Engine**: `backend/services/ai_engine.py`
   - `_generate_response()` - Uses adaptive response engine

---

## Response Type Values

- `"simple"` - Basic factual information, no analysis
- `"analysis"` - Deep engineering analysis with root cause and fixes
- `"error"` - Error occurred during response generation

## Confidence Scores

- `1.0` - High confidence (simple factual responses)
- `0.9` - High confidence (successful deep analysis)
- `0.7` - Medium confidence (fallback from failed analysis)
- `0.0` - No confidence (errors)

