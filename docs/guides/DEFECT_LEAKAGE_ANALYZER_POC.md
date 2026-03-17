# Defect Leakage Analyzer - POC Module

## 📋 Overview

The **Defect Leakage Analyzer** is a Proof of Concept (POC) module for FalconX that analyzes quality metrics by comparing bugs found in lower environments versus defects that escaped to production.

**Purpose**: Help quality teams understand testing effectiveness and identify areas for improvement.

**Formula**: `Defect Leakage = Defects / (Defects + Bugs) × 100`

**Target**: < 30% (industry standard)

---

## 🎯 What is Defect Leakage?

### Definition

**Defect Leakage** measures the percentage of issues that escape testing and are discovered in production, rather than being caught during development or QA testing.

### Why It Matters

- **Lower leakage = Better testing quality**
- **Higher leakage = Testing gaps exist**
- Indicates areas where test coverage or effectiveness needs improvement
- Direct impact on customer experience and support costs

### Example

```
Week of Dec 28 - Jan 3:
- Bugs found in Dev/QA/Staging: 5
- Defects found in Production: 6
- Total Issues: 11

Defect Leakage = 6 / 11 × 100 = 54.5%

This is CRITICAL (>50%) - more than half of issues are escaping to production!
```

---

## 🚀 Getting Started

### Prerequisites

1. **Jira Connection**: FalconX must be connected to your Jira instance
2. **OpenAI API Key**: For AI-powered insights (in `backend/config/.env`)
3. **Portfolio Access**: You need access to at least one Jira project

### Access the Module

1. Open FalconX
2. Click on **"Quality Metrics (POC)"** in the left navigation
3. Select your portfolio and date ranges
4. Click **"Analyze Defect Leakage"**

---

## 📊 How It Works

### Step 1: Data Collection

The system queries your Jira instance for two types of issues:

#### Bugs (Lower Environments)
```jql
project = "YOUR_PROJECT"
AND type = Bug
AND created >= "2025-12-28"
AND created <= "2026-01-03"
AND environment IN (Dev, QA, Staging, UAT, Test)
```

These are issues caught **before production** - your safety net!

#### Defects (Production)
```jql
project = "YOUR_PROJECT"
AND type = Defect
AND created >= "2025-12-28"
AND created <= "2026-01-03"
AND environment = Production
```

These are issues that **escaped to production** - customer-impacting!

### Step 2: Calculation

```
Current Week:
- Bugs: 5
- Defects: 6
- Leakage: 6/(6+5) × 100 = 54.5%

Previous Week:
- Bugs: 7
- Defects: 4
- Leakage: 4/(4+7) × 100 = 36.4%

Week-over-Week Change: +18.1 percentage points (WORSENING)
```

### Step 3: AI Analysis

The system sends the data to OpenAI GPT-4 which analyzes:

- **Severity** (Critical/Warning/Attention/Normal)
- **Root causes** (Why is leakage high?)
- **Business impact** (What does this mean?)
- **Immediate actions** (What to do in next 48 hours)
- **Long-term strategy** (How to improve over time)
- **Success metrics** (What to expect next week)

---

## 🎨 User Interface Guide

### Main Dashboard

```
┌─────────────────────────────────────────────────┐
│  🎯 Defect Leakage Analyzer                    │
│  Quality Metrics POC                            │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Configure Analysis                             │
├─────────────────────────────────────────────────┤
│  Portfolio: [Data Solutions ▼]                  │
│                                                  │
│  Current Week:                                   │
│  From: [Dec 28, 2025]  To: [Jan 3, 2026]       │
│                                                  │
│  Previous Week:                                  │
│  From: [Dec 21, 2025]  To: [Dec 27, 2025]      │
│                                                  │
│  [⚡ Analyze Defect Leakage]                    │
└─────────────────────────────────────────────────┘
```

### Results Display

#### 1. Summary Cards
- **Current Week Leakage** - Big number with severity badge
- **Bugs Count** - Issues caught in lower environments
- **Defects Count** - Issues that escaped to production

#### 2. Week-over-Week Table
- Side-by-side comparison
- Change indicators (arrows and badges)
- Trend classification (improving/worsening/stable)

#### 3. AI Insights
- Comprehensive analysis
- Root cause identification
- Specific, actionable recommendations
- Timeline to recovery

---

## 📈 Understanding the Metrics

### Severity Levels

| Severity | Leakage % | Meaning | Action Required |
|----------|-----------|---------|-----------------|
| **Critical** | > 50% | More than half of issues escape to production | Immediate intervention |
| **Warning** | 40-50% | High leakage, well above target | Urgent attention needed |
| **Attention** | 30-40% | Above target, needs improvement | Plan improvements |
| **Normal** | < 30% | Meeting industry standard | Continue monitoring |

### Trend Classification

| Trend | WoW Change | Icon | Meaning |
|-------|------------|------|---------|
| **Improving** | < -2% | ↘ Green | Leakage decreasing (good!) |
| **Worsening** | > +2% | ↗ Red | Leakage increasing (bad!) |
| **Stable** | -2% to +2% | — Gray | No significant change |

---

## 💡 Use Cases

### Use Case 1: Weekly Quality Review

**Scenario**: Your team does weekly quality check-ins

**Workflow**:
1. Every Monday morning, run analysis for previous week
2. Review AI insights in team standup
3. Assign action items based on recommendations
4. Track progress week-over-week

**Benefits**:
- Data-driven quality discussions
- Clear action items
- Trend visibility over time

### Use Case 2: Sprint Retrospective

**Scenario**: You want to include quality metrics in retros

**Workflow**:
1. Run analysis for the sprint period
2. Compare with previous sprint
3. Discuss: "Why did leakage increase/decrease?"
4. Add quality improvements to next sprint backlog

**Benefits**:
- Quality becomes part of the conversation
- Historical comparison shows progress
- Team accountability for quality

### Use Case 3: Portfolio Health Check

**Scenario**: Leadership wants to see quality across all portfolios

**Workflow**:
1. Run analysis for each portfolio
2. Compare leakage across teams
3. Identify teams that need support
4. Share best practices from high-performing teams

**Benefits**:
- Portfolio-level visibility
- Resource allocation decisions
- Best practice sharing

---

## 🔧 Configuration

### Backend Configuration

Located in `backend/config/.env`:

```env
# OpenAI for AI Insights
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini

# Jira Connection (configured via UI)
# No additional config needed for POC
```

### Customizing JQL Queries

If your Jira uses different field names, edit `backend/services/defect_leakage_analyzer.py`:

```python
# Line 37-47: Customize bug query
jql_bugs = f"""
    project = "{portfolio}"
    AND type = Bug
    AND created >= "{date_from}"
    AND created <= "{date_to}"
    AND (
        environment IN (Dev, QA, Staging)  # Your environment names
        OR labels IN (internal, testing)    # Your label names
    )
"""

# Line 59-67: Customize defect query
jql_defects = f"""
    project = "{portfolio}"
    AND type = Defect                     # Your defect type name
    AND created >= "{date_from}"
    AND created <= "{date_to}"
    AND environment = Production           # Your production name
"""
```

---

## 🐛 Troubleshooting

### Issue: "No bugs or defects found"

**Possible Causes**:
1. Date range has no issues created
2. JQL query doesn't match your Jira structure
3. Missing permissions to view issues

**Solutions**:
1. Try a wider date range (e.g., whole month)
2. Check JQL query in Jira directly
3. Verify you have "Browse Projects" permission

### Issue: "Analysis failed"

**Possible Causes**:
1. Jira not connected
2. OpenAI API key missing/invalid
3. Network issues

**Solutions**:
1. Check Jira connection status (green dot in sidebar)
2. Verify `OPENAI_API_KEY` in `backend/config/.env`
3. Check backend logs for detailed error

### Issue: "Leakage is 0% or 100%"

**This is Valid!**

- **0% leakage**: All issues found in testing (excellent!)
- **100% leakage**: All issues escaped to production (critical!)

If this seems wrong, check if your JQL queries are correct.

---

## 📊 API Reference

### POST `/api/quality/defect-leakage-analysis`

Analyze defect leakage with week-over-week comparison.

**Request Body**:
```json
{
  "portfolio": "DATA_SOLUTIONS",
  "current_week_from": "2025-12-28",
  "current_week_to": "2026-01-03",
  "previous_week_from": "2025-12-21",
  "previous_week_to": "2025-12-27"
}
```

**Response**:
```json
{
  "success": true,
  "analysis": {
    "portfolio": "DATA_SOLUTIONS",
    "current_week": {
      "bugs_count": 5,
      "defects_count": 6,
      "leakage_percentage": 54.5,
      "total_issues": 11
    },
    "previous_week": {
      "bugs_count": 7,
      "defects_count": 4,
      "leakage_percentage": 36.4,
      "total_issues": 11
    },
    "comparison": {
      "leakage_change": 18.1,
      "bugs_change": -2,
      "defects_change": 2,
      "trend": "worsening",
      "severity": "critical"
    },
    "ai_insights": "Detailed AI analysis here..."
  }
}
```

### GET `/api/quality/portfolios`

Get list of available portfolios.

**Response**:
```json
{
  "success": true,
  "portfolios": [
    {
      "key": "DATA_SOLUTIONS",
      "name": "Data Solutions",
      "id": "10001"
    }
  ],
  "total": 1
}
```

---

## 🎯 Success Metrics

Track these to measure POC success:

1. **Adoption**:
   - Number of teams using the analyzer
   - Frequency of analysis runs
   - Number of AI insights generated

2. **Impact**:
   - Average defect leakage trend (decreasing?)
   - Time to identify quality issues (faster?)
   - Number of action items implemented

3. **Value**:
   - Time saved in manual analysis
   - Defects prevented by early detection
   - Improved team quality awareness

---

## 🚀 Future Enhancements

After POC validation, planned features:

### Phase 2: Multi-Portfolio Support
- Analyze all 9 portfolios at once
- Portfolio comparison matrix
- Leadership dashboard view

### Phase 3: Historical Tracking
- Store all weekly reports
- 4-week, 8-week, 12-week trends
- Seasonal pattern detection

### Phase 4: Additional Metrics
- Test coverage percentage
- Bugs per test case
- Automation coverage
- Regression effectiveness

### Phase 5: Tableau Integration
- Pull data directly from Tableau
- No manual uploads needed
- Real-time dashboard sync

---

## 📞 Support

### Getting Help

1. **Check Documentation**: This guide covers most scenarios
2. **Backend Logs**: Check terminal for detailed error messages
3. **Browser Console**: Press F12 to see frontend errors
4. **API Testing**: Use `/docs` endpoint to test API directly

### Contact

For issues or questions:
- Check `docs/guides/KNOWN_ISSUES_AND_FIXES.md`
- Review backend logs in terminal
- Contact FalconX team for support

---

## 📚 Related Documentation

- [Environment Setup Guide](./ENVIRONMENT_SETUP_GUIDE.md)
- [Known Issues and Fixes](./KNOWN_ISSUES_AND_FIXES.md)
- [Frontend Enhancements Guide](./FRONTEND_ENHANCEMENTS.md)
- [Databricks Setup (Deferred)](./DATABRICKS_SETUP_DEFERRED.md)

---

**Version**: 1.0.0 (POC)  
**Last Updated**: October 29, 2025  
**Status**: Active Development  
**Module**: Quality Metrics

