# Known Issues and Fixes - FalconX

## Issue 1: Projects Dropdown Shows "0 Projects"

### Problem
When connecting to Jira, the frontend shows "0 projects" even though the backend successfully fetches 1048 projects.

### Root Causes Identified
1. **API Response Format Mismatch**: Frontend expects `data.projects.detailed` array
2. **Caching Issues**: Old/empty data might be cached in localStorage
3. **Timing Issues**: Component might render before API call completes
4. **Error Handling**: Silent failures not visible to end users

### Solutions Implemented

#### 1. Backend: Added Project Count to Configure Response
**File**: `backend/main.py` (line 1050-1111)

```python
# Now returns:
{
    "success": True,
    "message": "Jira configured successfully",
    "projects": 1048,  # ✅ Added projects count
    "current_sprint": "Sprint 23",  # Optional
    "config": {...}
}
```

#### 2. Frontend: Enhanced Error Logging
**File**: `frontend/app/components/figma/InsightsDashboard.tsx`

- Added detailed console logging for debugging
- Added explicit success check
- Increased maxResults to 1000 to get all projects
- Added error messages visible to user

```typescript
const response = await fetch(getApiUrl('/api/jira/projects?maxResults=1000'));
console.log('📋 Projects API response:', {
  success: data.success,
  detailedLength: data.projects?.detailed?.length,
  summaryTotal: data.projects?.summary?.total
});
```

### How to Debug

1. **Open Browser Developer Console** (F12)
2. **Connect to Jira**
3. **Look for these log messages**:
   - `📋 Fetching projects from: http://localhost:8000/api/jira/projects`
   - `📋 Projects response status: 200`
   - `📋 Projects API response: { success: true, detailedLength: 1048 }`
   - `📋 Setting 1048 projects in state`
   - `📋 First project sample: { id: "...", key: "...", name: "..." }`

4. **If you see "⚠️ Projects list is empty!"**:
   - Check backend logs for errors
   - Verify `/api/jira/projects` endpoint is accessible
   - Clear localStorage: `localStorage.clear()` in console
   - Refresh page

### Troubleshooting Steps

#### Step 1: Verify Backend is Working
```powershell
# Test projects endpoint
curl http://localhost:8000/api/jira/projects | python -m json.tool
```

Should return:
```json
{
  "success": true,
  "projects": {
    "detailed": [...1048 projects...],
    "summary": {
      "total": 1048,
      "keys": ["PROJ1", "PROJ2", ...]
    }
  }
}
```

#### Step 2: Clear Frontend Cache
```javascript
// In browser console
localStorage.clear();
location.reload();
```

#### Step 3: Check Network Tab
1. Open DevTools → Network tab
2. Filter by "projects"
3. Click on `/api/jira/projects` request
4. Check Response tab - should show 1048 projects

#### Step 4: Verify Jira Configuration
```powershell
# Check Jira status
curl http://localhost:8000/api/jira/status
```

Should return:
```json
{
  "configured": true,
  "config": {
    "url": "https://projects.cdk.com",
    "email": "***@***"
  }
}
```

---

## Issue 2: Metrics Stop at a Particular Point

### Problem
The backend fetches issues in batches but stops at ~5,000 issues even though there are 1.7 million issues in the Jira instance.

### Root Cause
**Safety Limit**: There's a hardcoded limit in `backend/main.py` (line 2545):

```python
if batch_count > 50:  # Max 50 batches = 5,000 issues
    logger.warning(f"Reached safety limit of {batch_count} batches, stopping")
    break
```

### Why This Limit Exists
- **Performance**: Fetching 1.7M issues would take hours and consume massive memory
- **API Rate Limiting**: Prevents hitting Jira API rate limits
- **User Experience**: Most analytics work fine with a sample of 5,000 issues
- **Timeout Prevention**: Avoids frontend timeouts waiting for data

### Solutions

#### Option 1: Increase the Limit (Simple)
**File**: `backend/main.py` line 2545

```python
# Change from 50 to 100 batches (10,000 issues)
if batch_count > 100:  # Max 100 batches = 10,000 issues
    logger.warning(f"Reached safety limit of {batch_count} batches, stopping")
    break
```

#### Option 2: Project-Specific Fetching (Recommended)
When fetching metrics, **select a specific project** instead of "All Projects":
- Individual projects usually have < 5,000 issues
- Metrics will be complete for that project
- Much faster response times

#### Option 3: Configurable Limit (Best for Production)
Add to `backend/config/.env`:

```env
# Maximum issues to fetch for analytics
MAX_ISSUES_PER_QUERY=10000
```

Then in `backend/main.py`:

```python
import os

MAX_BATCHES = int(os.getenv('MAX_ISSUES_PER_QUERY', '5000')) // 100

if batch_count > MAX_BATCHES:
    logger.warning(f"Reached configured limit of {batch_count} batches")
    break
```

#### Option 4: Progressive Loading (Advanced)
Implement streaming/progressive loading:
1. Fetch first 5,000 issues immediately
2. Display initial metrics
3. Continue fetching in background
4. Update metrics as more data arrives

### Current Behavior
```
✅ Batch 1-50: Fetches 5,000 issues successfully
⚠️ Batch 51: Stops due to safety limit
📊 Analytics: Calculated from 5,000 issues (not all 1.7M)
```

### Recommended Approach for End Users

**For General Overview**:
- Use "All Projects" mode
- Accept that metrics are based on first 5,000 issues
- This gives a good statistical sample

**For Detailed Analysis**:
- Select a specific project from dropdown
- Get complete data for that project
- More accurate and faster

### Monitoring the Fetch Process

Backend logs will show:
```
INFO:main:Fetching batch #1 starting at 0
INFO:main:Got 100 issues in batch #1 (Total so far: 100)
...
INFO:main:Fetching batch #50 starting at 4900
INFO:main:Got 100 issues in batch #50 (Total so far: 5000)
WARNING:main:Reached safety limit of 50 batches, stopping
INFO:main:Retrieved 5000 total issues (exact count)
```

---

## Issue 3: Insights Not Showing All Projects

### Problem
Related to Issue #1 - if projects don't load, the insights dropdown will be empty.

### Solution
Follow the solutions for Issue #1 above.

### Additional Check
Verify the projects state is being passed correctly:

```typescript
// In InsightsDashboard.tsx
console.log('Current projects state:', projects);
console.log('Projects array length:', projects.length);
console.log('Is array?:', Array.isArray(projects));
```

---

## Performance Optimization Tips

### 1. Use Project-Specific Queries
Instead of querying all 1.7M issues:
- Select individual projects
- Much faster queries
- Complete data for that project

### 2. Enable Caching
The backend caches project lists for 5 minutes:
```python
app_state.projects_cache_ttl_seconds = 300  # 5 minutes
```

### 3. Adjust Fetch Frequency
Frontend auto-refreshes every 15 minutes:
```typescript
// Increase to 30 minutes for better performance
const interval = setInterval(() => {
  refreshData();
}, 30 * 60 * 1000); // 30 minutes
```

### 4. Use Minimal Mode
```typescript
// Only fetch id, key, name (faster for large lists)
fetch(getApiUrl('/api/jira/projects?minimal=true&maxResults=1000'))
```

---

## End User Best Practices

### ✅ DO
- Select specific projects for detailed analysis
- Clear cache if data seems stale (localStorage.clear())
- Check browser console for errors (F12)
- Wait for "Data loaded successfully" message

### ❌ DON'T
- Expect all 1.7M issues to load instantly
- Refresh too frequently (causes API rate limiting)
- Use "All Projects" for detailed per-issue analysis

---

## Getting Help

### 1. Check Browser Console (F12)
Look for error messages starting with:
- ❌ (errors)
- ⚠️ (warnings)
- 📋/📊 (info about data fetching)

### 2. Check Backend Logs
Look for:
- `ERROR:` lines
- `WARNING:` lines
- Issue counts per batch

### 3. Verify API Endpoints
Test each endpoint manually:
```bash
# Projects
curl http://localhost:8000/api/jira/projects

# Status
curl http://localhost:8000/api/jira/status

# Health
curl http://localhost:8000/health
```

### 4. Contact Support
Include:
- Browser console logs
- Backend terminal output
- Network tab screenshots
- Steps to reproduce

---

## Quick Fixes Checklist

- [ ] Backend is running (`python backend/main.py`)
- [ ] Frontend is running (`npm run dev`)
- [ ] Jira is connected (check `/api/jira/status`)
- [ ] Browser console shows no errors (F12)
- [ ] localStorage is clear (run `localStorage.clear()`)
- [ ] Page is refreshed after clearing cache
- [ ] Network tab shows 200 OK responses
- [ ] Projects endpoint returns data with `success: true`
- [ ] Selected project in dropdown (not default "All")

---

**Last Updated**: October 28, 2025
**Version**: 1.0.0
**Status**: Active Issue Tracking

