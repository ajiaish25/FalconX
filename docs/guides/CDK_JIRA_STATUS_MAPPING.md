# CDK Jira Status Mapping for Defect Leakage Analysis

## 📋 Overview

This document explains how Jira statuses map to defect leakage categories in the CDK Intelligence Suite project.

---

## 🎯 Status Definitions

### Bugs (Caught in Lower Environments)

These statuses indicate issues found **BEFORE production** - your testing safety net:

| Status | Badge | Meaning | Environment |
|--------|-------|---------|-------------|
| **IN PROGRESS** | 🔵 | Being worked on | Development |
| **PENDING APPROVAL** | 🟠 | Awaiting review | Development |
| **READY TO START** | 🟢 | Ready for dev | Development |
| **DEVELOPMENT COMPLETE** | 🔵 | Dev done, ready for test | Development |
| **IN TEST** | 🔵 | Currently testing | QA/Testing |
| **TEST COMPLETE** | 🟢 | Testing finished | QA/Testing |
| **IN REVIEW** | 🔵 | Under review | QA/Testing |
| **Canceled** | ⚫ | Cancelled/Won't fix | Any |

### Defects (Escaped to Production)

This status indicates issues that **ESCAPED to production**:

| Status | Badge | Meaning | Environment |
|--------|-------|---------|-------------|
| **ACCEPTED** | 🟢 | Issue accepted/verified in production | **Production** |

---

## 🔍 Why "ACCEPTED" = Production Defect?

In CDK's Jira workflow:

- **ACCEPTED** status means the issue has been **verified and accepted as a real defect**
- This typically happens when:
  - Customer reports an issue
  - Issue is verified in production environment
  - Team accepts it as a genuine defect requiring fix

**Key Point**: If an issue reaches "ACCEPTED", it means it **escaped all pre-production testing** and was found by customers or in production monitoring.

---

## 📊 Defect Leakage Formula

```
Total Bugs (Lower Env) = Issues with status IN:
  - IN PROGRESS
  - PENDING APPROVAL  
  - READY TO START
  - DEVELOPMENT COMPLETE
  - IN TEST
  - TEST COMPLETE
  - IN REVIEW
  - Canceled

Total Defects (Production) = Issues with status:
  - ACCEPTED

Defect Leakage % = Defects / (Defects + Bugs) × 100
```

---

## 💡 Example Calculation

### Scenario: Week of Dec 28 - Jan 3, 2026

**Query Results from CDK Intelligence Suite:**

```jql
project = "CDK Intelligence Suite"
AND type IN (Bug, Defect)
AND created >= "2025-12-28"
AND created <= "2026-01-03"
```

**Results by Status:**

| Status | Count | Category |
|--------|-------|----------|
| IN PROGRESS | 2 | Bug (Lower Env) |
| IN TEST | 1 | Bug (Lower Env) |
| TEST COMPLETE | 1 | Bug (Lower Env) |
| DEVELOPMENT COMPLETE | 1 | Bug (Lower Env) |
| **ACCEPTED** | **6** | **Defect (Production)** |
| **Total** | **11** | |

**Calculation:**
- Bugs (Lower Env): 5 issues (caught before production)
- Defects (Production): 6 issues (escaped to production - ACCEPTED)
- **Defect Leakage: 6 / 11 = 54.5%** 🔴 CRITICAL

**Interpretation**: More than half (54.5%) of all issues found this week were discovered in production after release. This is critical and indicates significant testing gaps.

---

## 🎯 Target Metrics

| Leakage % | Status | Action Required |
|-----------|--------|-----------------|
| **< 30%** | 🟢 Good | Meeting industry standard |
| **30-40%** | 🟡 Fair | Improvement needed |
| **40-50%** | 🟠 Warning | Urgent attention required |
| **> 50%** | 🔴 Critical | Immediate intervention needed |

---

## 🔧 JQL Queries Used

### Query 1: Bugs in Lower Environments

```jql
project = "CDK Intelligence Suite"
AND type IN (Bug, Defect)
AND created >= "2025-12-28"
AND created <= "2026-01-03"
AND status IN (
    "IN PROGRESS",
    "PENDING APPROVAL",
    "READY TO START",
    "DEVELOPMENT COMPLETE",
    "IN TEST",
    "TEST COMPLETE",
    "IN REVIEW",
    "Canceled"
)
AND status NOT IN ("ACCEPTED")
```

### Query 2: Defects in Production

```jql
project = "CDK Intelligence Suite"
AND type IN (Bug, Defect)
AND created >= "2025-12-28"
AND created <= "2026-01-03"
AND status = "ACCEPTED"
```

---

## 🤔 Common Questions

### Q: Why aren't we using environment field?

**A**: CDK's Jira uses **status-based workflow** to track where issues are found. The status itself indicates the environment.

### Q: What if an issue moves from "IN TEST" to "ACCEPTED"?

**A**: The analysis looks at the **creation date** and **current status**. If an issue is currently "ACCEPTED", it's counted as a production defect, regardless of previous statuses.

### Q: Should "Canceled" be counted as a bug?

**A**: Yes, because it was still found before production. Canceled issues might be:
- Duplicates
- Won't fix
- Not reproducible
- Invalid

They still represent testing activity, so they're included in the denominator.

### Q: What about issues that go to "ACCEPTED" but then get fixed?

**A**: The analysis is **point-in-time**. It looks at issues created in the date range with their **current status**. For historical tracking, you'd want to look at when they transitioned to "ACCEPTED".

---

## 🔄 Workflow Mapping

```
Issue Created
    ↓
[READY TO START] ──→ (Backlog/Planning)
    ↓
[IN PROGRESS] ──────→ (Development)
    ↓
[DEVELOPMENT COMPLETE] ──→ (Ready for Test)
    ↓
[IN TEST] ──────────→ (QA Testing) ← Issues caught here = GOOD!
    ↓
[TEST COMPLETE] ────→ (Testing Done)
    ↓
[IN REVIEW] ────────→ (Final Review)
    ↓
    ├── [Canceled] ─→ (Won't Fix)
    │
    └── Released to Production
            ↓
        [ACCEPTED] ─→ (Found in Production) ← Issues here = BAD!
```

---

## 📈 Improving Your Leakage

### If Leakage is High (> 40%)

**Root Causes to Investigate:**

1. **Test Coverage Gaps**
   - Are critical user flows tested?
   - Do tests match production scenarios?

2. **Environment Differences**
   - Does test environment match production?
   - Configuration differences?

3. **Test Data Quality**
   - Using production-like data?
   - Edge cases covered?

4. **Time Pressure**
   - Releases rushed?
   - Insufficient testing time?

5. **Communication Issues**
   - Requirements unclear?
   - Test cases not aligned with features?

**Immediate Actions:**

1. **Analyze the ACCEPTED issues**
   - What types of defects?
   - Why weren't they caught in testing?

2. **Strengthen Testing**
   - Add test cases for those scenarios
   - Improve test environment setup

3. **Process Changes**
   - Add extra validation before release
   - Implement deployment checklist

---

## 🎓 Best Practices

1. **Weekly Monitoring**: Run analysis every week
2. **Team Discussion**: Review in standups
3. **Action Items**: Create tasks to address gaps
4. **Celebrate Wins**: Recognize when leakage drops
5. **Share Learnings**: When defects are caught, share how

---

## 📞 Support

For questions about:
- **Jira Status Workflow**: Contact Jira admins
- **Defect Leakage Tool**: See main documentation
- **Quality Metrics**: Contact QCOE team

---

**Version**: 1.0.0  
**Project**: CDK Intelligence Suite  
**Last Updated**: October 29, 2025  
**Maintained By**: FalconX Quality Metrics Team

