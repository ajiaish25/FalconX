# Metrics Implementation Plan - Test Coverage, Test to Story Ratio, Bug Ratio, Test Case Review Status

## 📊 Overview

This document outlines the implementation plan for 4 new QCOE metrics:
1. **Test Coverage** - Stories with linked Test Cases / Total Stories
2. **Test to Story Ratio** - Test Cases / User Stories  
3. **Bug Discovery Ratio** - Bugs found / Test Cases executed
4. **Test Case Review Status** - Stories with "Test Case Reviewed" = Yes / Total Stories

---

## 1. TEST COVERAGE

### Formula
```
Test Coverage % = (Stories with linked Test Cases / Total Stories) × 100
```

### JQL Queries (NDP Example)

**Total Stories:**
```jql
project = "NDP" AND type = Story
```

**Stories with Linked Test Cases:**
```jql
project = "NDP" 
AND type = Story 
AND issueFunction in linkedIssuesOf("type = Test")
```

**Alternative (if issueFunction not available):**
```jql
project = "NDP" 
AND type = Story 
AND issue in linkedIssues(issueFunction in issuesOf("project = NDP AND type = Test"))
```

**Or using linkType:**
```jql
project = "NDP" 
AND type = Story 
AND issue in linkedIssues(project = "NDP" AND type = Test, "tests")
```

### Calculation Example
- Total Stories: 500
- Stories with Test Cases: 350
- **Test Coverage = (350 / 500) × 100 = 70%**

### Target
- **Target**: > 80% (industry standard)
- **Excellent**: > 90%
- **Good**: 70-80%
- **Needs Improvement**: < 70%

### Layout Design

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Test Coverage Analysis                                  │
│  Stories with linked Test Cases / Total Stories             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Portfolio: NDP                                     │   │
│  │  Period: Dec 1, 2025 - Dec 14, 2025                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Total Stories│  │ With Tests   │  │ Coverage %   │     │
│  │     500      │  │    350      │  │    70.0%     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  AI Analysis                                         │   │
│  │  Test coverage is at 70.0% with 350 of 500 stories  │   │
│  │  having linked test cases. While approaching the    │   │
│  │  80% target, there's room for improvement...        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### AI Analysis Example

**Single Period:**
```
Test coverage stands at 70.0% for the NDP project, with 350 of 500 stories 
having linked test cases. While this is approaching the 80% industry standard, 
there's opportunity to improve coverage by ensuring all new stories have test 
cases linked during sprint planning. Focus on the remaining 150 stories without 
test cases, particularly those in active development or recently completed.
```

**Comparison Mode (Improving):**
```
Test coverage improved from 65.0% to 70.0% (+5.0 percentage points), with 
50 additional stories now having linked test cases. This positive trend 
demonstrates the team's commitment to quality. Continue this momentum by 
ensuring test case creation is part of the definition of done for all new 
stories, and review the remaining 150 stories to identify which ones require 
test coverage.
```

---

## 2. TEST TO STORY RATIO

### Formula
```
Test to Story Ratio = Total Test Cases / Total Stories
```

### JQL Queries (NDP Example)

**Total Test Cases:**
```jql
project = "NDP" AND type = Test
```

**Total Stories:**
```jql
project = "NDP" AND type = Story
```

### Calculation Example
- Total Test Cases: 2000
- Total Stories: 500
- **Test to Story Ratio = 2000 / 500 = 4.0**

### Target
- **Target**: 3-5 tests per story (industry standard)
- **Excellent**: > 5 tests per story
- **Good**: 3-5 tests per story
- **Needs Improvement**: < 3 tests per story

### Layout Design

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Test to Story Ratio Analysis                            │
│  Test Cases / User Stories                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Portfolio: NDP                                     │   │
│  │  Period: Dec 1, 2025 - Dec 14, 2025                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Test Cases  │  │   Stories    │  │    Ratio     │     │
│  │    2000     │  │     500      │  │    4.0:1     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  AI Analysis                                         │   │
│  │  Test to story ratio is 4.0:1, indicating strong    │   │
│  │  test coverage with 4 test cases per story on      │   │
│  │  average. This meets the industry standard...       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### AI Analysis Example

**Single Period:**
```
Test to story ratio is 4.0:1 for the NDP project, with 2,000 test cases 
covering 500 stories. This indicates strong test coverage, meeting the 
industry standard of 3-5 tests per story. The ratio suggests comprehensive 
testing practices are in place. Monitor this metric to ensure new stories 
continue to have adequate test coverage as the project scales.
```

**Comparison Mode (Declining):**
```
Test to story ratio declined from 4.5:1 to 4.0:1, indicating that while 
test cases increased, stories increased at a faster rate. Current status: 
2,000 test cases for 500 stories. Review recent story additions to ensure 
they have appropriate test coverage, and consider adding more test cases 
for complex or high-risk stories.
```

---

## 3. BUG DISCOVERY RATIO

### Formula
```
Bug Discovery Ratio = Bugs Found / Test Cases Executed
```

### JQL Queries (NDP Example)

**Bugs Found (in date range):**
```jql
project = "NDP" 
AND type = Bug 
AND created >= "2025-12-01" 
AND created <= "2025-12-14"
```

**Test Cases Executed (in date range):**
```jql
project = "NDP" 
AND type = Test 
AND status IN ("Test Complete", "Done", "Closed")
AND updated >= "2025-12-01" 
AND updated <= "2025-12-14"
```

**Alternative (if execution tracking exists):**
```jql
project = "NDP" 
AND type = Test 
AND "Test Execution Status" = "Executed"
AND updated >= "2025-12-01" 
AND updated <= "2025-12-14"
```

### Calculation Example
- Bugs Found: 25
- Test Cases Executed: 500
- **Bug Discovery Ratio = 25 / 500 = 0.05 (5 bugs per 100 tests)**

### Target
- **Target**: 0.02-0.05 (2-5 bugs per 100 tests)
- **Excellent**: < 0.02 (very few bugs found)
- **Good**: 0.02-0.05
- **Needs Attention**: > 0.05 (high bug discovery rate)

### Layout Design

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Bug Discovery Ratio Analysis                            │
│  Bugs found / Test Cases executed                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Portfolio: NDP                                     │   │
│  │  Period: Dec 1, 2025 - Dec 14, 2025                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Bugs Found  │  │ Tests Exec   │  │    Ratio     │     │
│  │     25      │  │     500      │  │   0.05:1     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  AI Analysis                                         │   │
│  │  Bug discovery ratio is 0.05:1 (5 bugs per 100      │   │
│  │  tests), which is within the acceptable range...     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### AI Analysis Example

**Single Period:**
```
Bug discovery ratio is 0.05:1 for the NDP project, with 25 bugs found 
during execution of 500 test cases. This translates to 5 bugs per 100 
tests, which is within the acceptable range of 2-5 bugs per 100 tests. 
The ratio indicates effective test execution and reasonable bug discovery. 
Continue monitoring to ensure the ratio stays within acceptable limits.
```

**Comparison Mode (Improving):**
```
Bug discovery ratio improved from 0.08:1 to 0.05:1, indicating fewer bugs 
found per test executed. This positive trend suggests improved code quality 
or more effective test execution. Current status: 25 bugs found during 
500 test executions. Continue this trend by maintaining code quality 
standards and ensuring comprehensive test coverage.
```

---

## 4. TEST CASE REVIEW STATUS

### Formula
```
Test Case Review Status % = (Stories with "Test Case Reviewed" = Yes / Total Stories) × 100
```

### JQL Queries (NDP Example)

**Total Stories:**
```jql
project = "NDP" AND type = Story
```

**Stories with Test Case Reviewed = Yes:**
```jql
project = "NDP" 
AND type = Story 
AND "Test Case Reviewed" = Yes
```

**Stories with Test Case Reviewed = No:**
```jql
project = "NDP" 
AND type = Story 
AND "Test Case Reviewed" = No
```

**Stories without Test Case Reviewed field (null/empty):**
```jql
project = "NDP" 
AND type = Story 
AND "Test Case Reviewed" IS EMPTY
```

### Calculation Example
- Total Stories: 500
- Test Case Reviewed = Yes: 400
- Test Case Reviewed = No: 50
- Test Case Reviewed = Empty: 50
- **Review Status = (400 / 500) × 100 = 80%**

### Target
- **Target**: > 90% (industry standard)
- **Excellent**: > 95%
- **Good**: 80-90%
- **Needs Improvement**: < 80%

### Layout Design

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Test Case Review Status Analysis                        │
│  Stories with "Test Case Reviewed" = Yes / Total Stories   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Portfolio: NDP                                     │   │
│  │  Period: Dec 1, 2025 - Dec 14, 2025                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Total Stories│  │ Reviewed Yes │  │ Review %     │     │
│  │     500      │  │    400       │  │    80.0%     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐                       │
│  │ Reviewed No │  │ Not Set       │                       │
│  │     50      │  │     50        │                       │
│  └──────────────┘  └──────────────┘                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  AI Analysis                                         │   │
│  │  Test case review status is at 80.0% with 400 of   │   │
│  │  500 stories having test cases reviewed. While good, │   │
│  │  there's opportunity to reach the 90% target...     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### AI Analysis Example

**Single Period:**
```
Test case review status is at 80.0% for the NDP project, with 400 of 500 
stories having test cases reviewed (Test Case Reviewed = Yes). While this 
is good, there's opportunity to reach the 90% target. The remaining 100 
stories (50 with "No" and 50 not set) should be prioritized for review. 
Consider making test case review a mandatory step in the definition of 
done to improve this metric.
```

**Comparison Mode (Improving):**
```
Test case review status improved from 75.0% to 80.0% (+5.0 percentage 
points), with 25 additional stories now having test cases reviewed. This 
positive trend demonstrates the team's commitment to quality assurance. 
Current status: 400 stories reviewed out of 500 total. Focus on reviewing 
the remaining 100 stories, particularly those in active sprints, to reach 
the 90% target.
```

---

## 📋 Implementation Summary

### Backend Services Needed

1. **TestCoverageAnalyzer** (`backend/services/test_coverage_analyzer.py`)
   - Similar structure to `OverallAutomationAnalyzer`
   - Query stories with linked test cases
   - Support single period and comparison modes

2. **TestStoryRatioAnalyzer** (`backend/services/test_story_ratio_analyzer.py`)
   - Simple count comparison
   - Query total test cases and total stories
   - Support single period and comparison modes

3. **BugRatioAnalyzer** (`backend/services/bug_ratio_analyzer.py`)
   - Query bugs and executed test cases in date range
   - Support single period and comparison modes

4. **TestCaseReviewStatusAnalyzer** (`backend/services/test_case_review_status_analyzer.py`)
   - Query stories with "Test Case Reviewed" field
   - Support single period and comparison modes

### API Endpoints

- `POST /api/quality/test-coverage-analysis`
- `POST /api/quality/test-story-ratio-analysis`
- `POST /api/quality/bug-ratio-analysis`
- `POST /api/quality/test-case-review-status-analysis`

### Frontend Updates

- Enable all 4 metrics in `DefectLeakageAnalyzer.tsx`
- Add API handlers for each metric
- Update UI to display metric-specific data
- Add AI analysis display

---

## 🎯 Next Steps

1. Review and approve formulas and JQL queries
2. Implement backend services (one at a time)
3. Add API endpoints
4. Update frontend
5. Test with NDP project
6. Deploy and validate

