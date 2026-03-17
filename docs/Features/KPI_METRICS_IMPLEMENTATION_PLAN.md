# KPI Metrics Dashboard - Implementation Plan

## 📊 Data Structure Overview

### Three Excel Sheets:
1. **PI4 Defect Analysis** (21 rows) - Defect metrics
2. **PI4 Bug Analysis** (118 rows) - Bug metrics  
3. **Automation%** (28 rows) - Automation metrics

### Common Key Columns (All 3 sheets):
- `Portfolio`
- `Project Key`
- `Project Name`

**Important**: Projects may exist in 1, 2, or all 3 sheets. Only 1 project exists in all 3 sheets.

---

## 🎯 Implementation Architecture

### **Approach: Unified Data Model with Sheet-Specific Filtering**

#### **Backend Structure:**

```
/api/kpi-metrics
├── GET /api/kpi-metrics/options
│   └── Returns: Portfolio, Project Key, Project Name, RCA options
│
└── POST /api/kpi-metrics
    ├── Request Body:
    │   ├── portfolio (string)
    │   ├── project_key (string)
    │   ├── project_name (string)
    │   └── rca (string) - optional, only for Bug/Defect counts
    │
    └── Response:
        ├── defect_count (number) - filtered by RCA if provided
        ├── bug_count (number) - filtered by RCA if provided
        ├── automation_metrics (object)
        │   ├── completion_percentage
        │   ├── automation_percentage
        │   ├── committed_tc_count
        │   └── completed_tc_count
        └── metadata
            ├── total_projects
            └── filtered_projects
```

---

## 🔄 Data Flow & Filtering Logic

### **Step 1: Common Filtering (Portfolio, Project Key, Project Name)**

```python
# Pseudo-code
def filter_common(df, portfolio, project_key, project_name):
    filtered = df.copy()
    
    if portfolio and portfolio != 'All':
        filtered = filtered[filtered['Portfolio'] == portfolio]
    
    if project_key and project_key != 'All':
        filtered = filtered[filtered['Project Key'] == project_key]
    
    if project_name and project_name != 'All':
        filtered = filtered[filtered['Project Name'] == project_name]
    
    return filtered
```

### **Step 2: Sheet-Specific Processing**

#### **For Defect Count:**
```python
def get_defect_count(df_defects, rca=None):
    filtered = filter_common(df_defects, portfolio, project_key, project_name)
    
    if rca and rca != 'All':
        filtered = filtered[filtered['RCA (as per JIRA)'] == rca]
    
    return len(filtered)  # Count of defects
```

#### **For Bug Count:**
```python
def get_bug_count(df_bugs, rca=None):
    filtered = filter_common(df_bugs, portfolio, project_key, project_name)
    
    if rca and rca != 'All':
        filtered = filtered[filtered['RCA (as per JIRA)'] == rca]
    
    return len(filtered)  # Count of bugs
```

#### **For Automation Metrics:**
```python
def get_automation_metrics(df_automation):
    filtered = filter_common(df_automation, portfolio, project_key, project_name)
    
    # Aggregate metrics
    return {
        'completion_percentage': filtered['Completion %'].mean(),
        'automation_percentage': filtered['Automation % as per Tableau'].mean(),
        'committed_tc_count': filtered['Committed Automation TC Count for PI4'].sum(),
        'completed_tc_count': filtered['Completed Automation TC count'].sum(),
        'total_projects': len(filtered)
    }
```

---

## 🎨 Frontend UI Structure

### **Filter Section:**
```
┌─────────────────────────────────────────────────────────┐
│  Portfolio: [Dropdown ▼]                               │
│  Project Key: [Dropdown ▼]                             │
│  Project Name: [Dropdown ▼]                             │
│  RCA (for Bug/Defect): [Dropdown ▼] [All]              │
└─────────────────────────────────────────────────────────┘
```

### **Metrics Display Section:**

#### **Option A: Card-Based Layout (Recommended)**
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Defect Count │  │  Bug Count   │  │ Automation % │
│     21       │  │     118      │  │    45.2%     │
└──────────────┘  └──────────────┘  └──────────────┘

┌─────────────────────────────────────────────────────┐
│         Automation Details                          │
│  Committed TC: 250  |  Completed TC: 113           │
│  Completion %: 45.2%                                │
└─────────────────────────────────────────────────────┘
```

#### **Option B: Dashboard Layout**
```
┌─────────────────────────────────────────────────────┐
│  Top Row: Defect & Bug Counts (with RCA filter)    │
│  ┌──────────┐  ┌──────────┐                         │
│  │ Defects  │  │  Bugs    │                         │
│  │   21     │  │   118    │                         │
│  └──────────┘  └──────────┘                         │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Bottom Row: Automation Metrics                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Auto %   │  │ Complete │  │ TC Count │         │
│  │  45.2%   │  │  45.2%   │  │   250    │         │
│  └──────────┘  └──────────┘  └──────────┘         │
└─────────────────────────────────────────────────────┘
```

---

## 💡 Implementation Ideas

### **Idea 1: Unified Endpoint Approach** ⭐ (Recommended)
**Pros:**
- Single API call for all metrics
- Consistent filtering across all sheets
- Efficient data loading

**Cons:**
- More complex backend logic
- Larger response payload

**Implementation:**
```python
@app.post("/api/kpi-metrics")
async def get_kpi_metrics(request: KPIMetricsRequest):
    # Load all 3 sheets
    df_defects = load_sheet(0)
    df_bugs = load_sheet(1)
    df_automation = load_sheet(2)
    
    # Apply common filters
    defects_filtered = apply_common_filters(df_defects, request)
    bugs_filtered = apply_common_filters(df_bugs, request)
    automation_filtered = apply_common_filters(df_automation, request)
    
    # Apply RCA filter to defects/bugs
    if request.rca and request.rca != 'All':
        defects_filtered = defects_filtered[defects_filtered['RCA'] == request.rca]
        bugs_filtered = bugs_filtered[bugs_filtered['RCA'] == request.rca]
    
    # Calculate metrics
    return {
        "defect_count": len(defects_filtered),
        "bug_count": len(bugs_filtered),
        "automation_metrics": calculate_automation(automation_filtered)
    }
```

---

### **Idea 2: Separate Endpoints Approach**
**Pros:**
- Simpler backend logic per endpoint
- Can load metrics independently
- Smaller response payloads

**Cons:**
- Multiple API calls
- Need to coordinate filters in frontend

**Implementation:**
```python
@app.post("/api/kpi-metrics/defects")
@app.post("/api/kpi-metrics/bugs")
@app.post("/api/kpi-metrics/automation")
```

---

### **Idea 3: Cached Aggregation Approach**
**Pros:**
- Fast response times
- Pre-calculated aggregations
- Good for large datasets

**Cons:**
- Requires cache invalidation
- More complex setup

---

## 🎯 Recommended Implementation Strategy

### **Phase 1: Backend API**
1. Create `/api/kpi-metrics/options` endpoint
   - Extract unique values for Portfolio, Project Key, Project Name
   - Extract unique RCA values from Defect & Bug sheets
   
2. Create `/api/kpi-metrics` endpoint
   - Load all 3 sheets
   - Apply common filters (Portfolio, Project Key, Project Name)
   - Apply RCA filter to Defect/Bug counts
   - Calculate and return all metrics

### **Phase 2: Frontend Dashboard**
1. Create `KPIMetricsDashboard.tsx` component (similar to QAMetricsDashboard)
2. Implement filter dropdowns (Portfolio, Project Key, Project Name, RCA)
3. Display metrics cards:
   - Defect Count card (affected by RCA filter)
   - Bug Count card (affected by RCA filter)
   - Automation metrics cards (not affected by RCA filter)

### **Phase 3: Visual Enhancements**
1. Add animations (flutter effect when data changes)
2. Add charts/graphs for trends
3. Add export functionality (CSV/PDF)

---

## 📋 Data Handling Considerations

### **1. Missing Projects:**
- If a project exists in Automation sheet but not in Bug/Defect sheets:
  - Show Automation metrics
  - Show 0 for Bug/Defect counts

### **2. Empty Filters:**
- If Portfolio = "All", Project Key = "All", Project Name = "All":
  - Show aggregated data across all projects
  - RCA filter still applies to Bug/Defect counts

### **3. RCA Filter Behavior:**
- When RCA = "All" or not selected:
  - Show total Bug/Defect counts (all RCAs combined)
- When specific RCA selected:
  - Show counts only for that RCA
  - Automation metrics remain unchanged

---

## 🔧 Technical Details

### **Backend File Structure:**
```
backend/
├── main.py
│   └── /api/kpi-metrics endpoints
├── services/
│   └── kpi_metrics_service.py
│       ├── load_kpi_sheets()
│       ├── filter_by_common_keys()
│       ├── filter_by_rca()
│       ├── calculate_defect_count()
│       ├── calculate_bug_count()
│       └── calculate_automation_metrics()
```

### **Frontend File Structure:**
```
frontend/app/components/
├── KPIMetricsDashboard.tsx
│   ├── FilterSection (Portfolio, Project Key, Project Name, RCA)
│   ├── DefectCountCard (with RCA filtering)
│   ├── BugCountCard (with RCA filtering)
│   └── AutomationMetricsCards (multiple cards)
```

---

## ✅ Next Steps

1. **Review this plan** - Confirm approach and structure
2. **Backend Implementation** - Create API endpoints
3. **Frontend Implementation** - Create dashboard component
4. **Testing** - Test filtering logic and edge cases
5. **Enhancements** - Add animations, charts, exports

---

## ❓ Questions to Clarify

1. **RCA Filter UI**: Should RCA dropdown be:
   - Always visible but only affects Bug/Defect cards?
   - Or shown only when viewing Bug/Defect metrics?

2. **Default Values**: Should filters default to "All" or specific values?

3. **Aggregation**: For Automation metrics, should we:
   - Show average percentages?
   - Show sum of counts?
   - Show both?

4. **Charts**: Do you want:
   - Pie charts for RCA distribution?
   - Bar charts for Bug/Defect counts?
   - Trend charts over time?

