# Work Buddy Response Format - Professional Clean Format

## Format: Professional Direct Format (No Stars)

### Scenario 1: Defect Leakage Analysis

```
Defect Leakage Analysis

Value: 23.5%
Project: NDP
Period: November 5 - December 5, 2025

Breakdown:
  Bugs (Lower Environments): 13
  Defects (Production): 4
  Total Issues: 17

Analysis:
Moderate defect leakage at 23.5%. 4 production defects from 17 total issues. Review test coverage for gaps.

Recommendations:
  - Strengthen regression suite for high-risk modules
  - Perform RCA on escaped defects
  - Review unit test coverage
  - Add automated tests for modules that leaked 2+ times
  - Increase negative test coverage where patterns repeat

Prediction:
If current trend continues, expected leakage for next PI is approximately 25%. Recommend adding 15-20 automated test cases for high-risk modules.
```

### Scenario 2: Quality Metrics - Automation Percentage

```
Automation Percentage

Value: 68.5%
Project: NDP
Period: Last 30 days

Details:
  Automated Tests: 342
  Non-Automated Tests: 157
    - Automation Not Required: 89
    - Requires Automation: 68
  Total Tests: 499

Status: Good automation coverage. Above industry average of 60%.

Next Steps:
  - Focus on automating regression test suite
  - Increase negative test coverage
  - Expand automation to onboarding flows
```

### Scenario 3: General Jira Query - Team Member Workload

```
Ajith's Current Workload

Active Items:
  Stories in Progress: 2
    NDP-20290: Pre-deployment validation
    NDP-20920: DOCS 2.0 Phase 1 testing
  
  Bugs Assigned: 3
    NDP-21001: Login issue (High Priority)
    NDP-21005: Data sync problem
    NDP-21012: UI rendering bug

Focus Area: Pre-deployment validation and testing

Recent Activity:
Completed NDP-20920 (Pre-deployment validation for CDK IS-1.0.0.61) on December 3, 2025.
```

### Scenario 4: Confluence Documentation Query

```
Documentation Found

Title: API Integration Guide
Space: Intelligence Suite
Last Updated: December 1, 2025

Summary:
Comprehensive guide covering API authentication, endpoints, and integration patterns for the Intelligence Suite platform.

Key Sections:
  - Authentication and Security
  - API Endpoints Reference
  - Error Handling
  - Best Practices

Relevance: High - Directly addresses your query about API integration.
```

### Scenario 5: Strategic Insights

```
Strategic Analysis

Topic: Team Performance Trends

Key Findings:
  - Defect leakage improved by 15% over last quarter
  - Automation coverage increased from 55% to 68%
  - Average resolution time decreased by 2 days

Insights:
The team is showing positive momentum in quality metrics. Automation investments are paying off with reduced defect leakage.

Recommendations:
  - Continue automation framework expansion
  - Focus on negative test coverage
  - Maintain current quality gates
```

### Scenario 6: Single Issue Details

```
Issue Details

Key: NDP-20290
Summary: Pre-deployment validation for CDK IS-1.0.0.61
Status: In Progress
Assignee: Ajith
Priority: High
Type: Story

Created: November 15, 2025
Updated: December 3, 2025

Context:
This is a pre-deployment validation task for the CDK Intelligence Suite version 1.0.0.61. Currently in progress with Ajith as the assignee. Part of the DOCS 2.0 Phase 1 initiative.
```

### Scenario 7: Multiple Issues Summary

```
Issues Found

Total: 15 open bugs in NDP project

Priority Breakdown:
  High: 2
  Medium: 10
  Low: 3

Status Distribution:
  In Progress: 8
  To Do: 5
  In Review: 2

Notable Items:
  - NDP-21001: Login issue (High Priority, In Progress)
  - NDP-21005: Data sync problem (Medium Priority, To Do)
  - NDP-21012: UI rendering bug (Medium Priority, In Progress)

Most bugs are medium priority and currently in progress. Two high-priority items require attention.
```

### Scenario 8: Metric Calculation with Trend

```
Test Coverage Analysis

Value: 78.5%
Project: NDP
Period: Last Quarter

Trend:
  Previous Quarter: 72.0%
  Change: +6.5 percentage points

Details:
  Covered Stories: 156
  Total Stories: 199
  Coverage Gap: 43 stories

Status: Good coverage with positive trend. Above target of 75%.

Recommendations:
  - Focus on covering remaining 43 stories
  - Prioritize high-risk areas first
  - Maintain current coverage momentum
```

### Scenario 9: Error or No Results

```
No Results Found

Query: Bugs assigned to John in NDP project

Status: No matching issues found

Alternative Information:
John has 3 completed bugs in the last 30 days:
  - NDP-20890: Completed on November 20
  - NDP-20895: Completed on November 25
  - NDP-20900: Completed on December 1

John currently has no active bugs assigned. All recent work has been completed.
```

### Scenario 10: Complex Analysis with Multiple Metrics

```
Comprehensive Quality Metrics

Project: NDP
Period: Last 30 days

Defect Leakage: 23.5%
  Breakdown: 13 bugs caught, 4 defects escaped

Automation Percentage: 68.5%
  Breakdown: 342 automated, 157 non-automated tests

Test Coverage: 78.5%
  Breakdown: 156 covered, 43 uncovered stories

Overall Assessment:
Quality metrics show moderate performance. Defect leakage is acceptable but could improve. Automation coverage is strong. Test coverage meets target.

Priority Actions:
  - Reduce defect leakage by strengthening regression suite
  - Maintain automation momentum
  - Close test coverage gaps in high-risk areas
```

---

## Format Guidelines

Structure:
- Clear section headers (no stars, no bold markers)
- Use colons for key-value pairs
- Simple indentation with dashes for lists
- Two-line spacing between major sections
- Single-line spacing within sections

Tone:
- Professional and direct
- Concise and on-point
- No unnecessary words
- Factual and actionable

Visual Elements:
- No asterisks or markdown stars
- Simple dashes for bullet points
- Consistent indentation (2 spaces)
- Clean line breaks

Length:
- Keep responses concise
- Maximum 2-3 sentences per analysis section
- Recommendations limited to 5-7 items
- One paragraph for insights

## Chunked Response Strategy

- When Jira queries return very large result sets, the backend now summarizes records in configurable chunks (`AI_RESPONSE_CHUNK_SIZE`, default 200). Each chunk produces the same professional breakdown as shown above, and those chunk summaries are stitched together before the AI model is called.
- Chunk summaries include counts, breakdowns, and sample items, so the final AI response still uses fresh insights but without overwhelming the model with too much data.
- If the model returns an empty completion, we still fall back to the concise "basic response" content, but the conversation history now includes the chunked summaries that the model saw.

## Test Case Query Examples

The system correctly handles test case queries using the proper Jira field names:
- Use `type = Test` (not `type`)
- Use `"Test Type"` field for test categories
- Use `"Test Status"` field for automation status

### Example 1: Automated Regression Test Cases

**Question:** "How many test cases are in regression test cases that are automated for NDP project?"

**Generated JQL:**
```
project = "NDP" AND type = Test AND "Test Type" = "Regression" AND "Test Status" = Automated
```

**Expected Response:**
```
Test Case Count

Total: 245 automated regression test cases in NDP project

Breakdown:
- Test Type: Regression
- Automation Status: Automated
- Project: NDP

These regression tests are fully automated and ready for continuous integration pipelines.
```

### Example 2: Functional Testing Test Cases Count

**Question:** "Show me count of functional testing test cases in NDP"

**Generated JQL:**
```
project = "NDP" AND type = Test AND "Test Type" = "Functional Testing"
```

**Expected Response:**
```
Test Case Analysis

Total: 512 functional testing test cases in NDP project

Breakdown by Status:
- Automated: 342 (67%)
- Non-Automated: 170 (33%)
  - Automation Not Required: 95
  - Requires Automation: 75

The majority of functional tests are automated, indicating good test coverage and CI/CD readiness.
```

### Example 3: Automated Test Cases for Specific Module

**Question:** "How many automated test cases do we have for the Goals module in NDP project?"

**Generated JQL:**
```
project = "NDP" AND type = Test AND "Test Status" = Automated AND component = "Goals"
```

**Expected Response:**
```
Goals Module Test Coverage

Total: 89 automated test cases

Breakdown:
- Functional Testing: 45
- Regression Testing: 32
- Integration Testing: 12

All test cases are automated and integrated into the CI/CD pipeline for the Goals module.
```

### Example 4: Automated vs Non-Automated Test Cases Comparison

**Question:** "Compare manual and automated test cases in NDP project"

**Generated JQL:**
```
Query 1: project = "NDP" AND type = Test AND "Test Status" = Automated
Query 2: project = "NDP" AND type = Test AND "Test Status" != Automated
```

**Expected Response:**
```
Test Automation Comparison - NDP Project

Automated Test Cases: 687
Non-Automated Test Cases: 234
  - Automation Not Required: 120
  - Requires Automation: 89
  - In Progress: 25

Automation Percentage: 74.6%

Breakdown:
- Functional Testing: 342 automated, 170 non-automated
- Regression Testing: 245 automated, 45 non-automated
- Integration Testing: 100 automated, 19 non-automated

The project has strong test automation coverage with 74.6% of tests automated. Focus areas for improvement: 89 tests require automation, and 170 functional tests are not yet automated.
```

### Example 5: Smoke Test Cases Status

**Question:** "What is the status of smoke test cases in NDP? How many are automated?"

**Generated JQL:**
```
project = "NDP" AND type = Test AND "Test Type" = "Smoke Testing"
```

**Expected Response:**
```
Smoke Test Cases - NDP Project

Total: 45 smoke test cases

Automation Status:
- Automated: 38 (84.4%)
- Non-Automated: 7 (15.6%)
  - Requires Automation: 5
  - Automation Not Required: 2

Status Distribution:
- Automated: 38
- Requires Automation: 5
- Automation Not Required: 2

Most smoke tests are automated and ready for execution. 5 smoke tests require automation to complete the test suite.
```

---

## Test Case Query Field Reference

**Correct Field Names:**
- Issue Type: `type = Test` (NOT `type= "Test"`)
- Test Type: `"Test Type" = "Functional Testing"` (values: "Functional Testing", "Regression Testing", "Unit Testing", "Smoke Testing", "Integration Testing", "Performance Testing")
- Automation Status: `"Test Status" = Automated` (NOT "Automation Status")
- Test Status Values: Automated, Automation Not Required, In Progress, Requires Automation

**Important - "Manual Test Cases" Definition:**
- **There is NO "Manual" status in Jira**
- When users ask about "manual test cases" or "manual tests", they mean **ALL test cases that are NOT in "Automated" status**
- This includes test cases with status: "Automation Not Required", "Requires Automation", and "In Progress"
- **Query for manual tests:** `"Test Status" != Automated` (captures all non-automated tests)
- **Query for automated tests:** `"Test Status" = Automated`

**Common Query Patterns:**
- All automated tests: `project = "NDP" AND type = Test AND "Test Status" = Automated`
- **All manual test cases (non-automated):** `project = "NDP" AND type = Test AND "Test Status" != Automated`
- Regression tests: `project = "NDP" AND type = Test AND "Test Type" = "Regression Testing"`
- Automated regression: `project = "NDP" AND type = Test AND "Test Type" = "Regression Testing" AND "Test Status" = Automated`
- Manual regression tests: `project = "NDP" AND type = Test AND "Test Type" = "Regression Testing" AND "Test Status" != Automated`
- Non-automated functional tests: `project = "NDP" AND type = Test AND "Test Type" = "Functional Testing" AND "Test Status" != Automated`
- Unit tests: `project = "NDP" AND type = Test AND "Test Type" = "Unit Testing"`
- Automated unit tests: `project = "NDP" AND type = Test AND "Test Type" = "Unit Testing" AND "Test Status" = Automated`
- Tests requiring automation: `project = "NDP" AND type = Test AND "Test Status" = "Requires Automation"`
- Tests not requiring automation: `project = "NDP" AND type = Test AND "Test Status" = "Automation Not Required"`

---

## AI Query Analysis Examples

This section shows how the AI analyzes different user questions and generates JQL queries using project-specific mappings.

### Category 1: Bug/Defect Queries

#### Example 1.1: Open Bugs Query
**User Question:** "show me open bugs in ndp project for last 1 month"

**AI Analysis:**
```
Query Intent: find open bugs in NDP project for last month
Project: NDP
Issue Types: ["Bug"]
Status Filters: ["open"]
Time Period: last 1 month
Reasoning: User wants to see bugs (not defects) that are currently open in NDP project from the past month
```

**Generated JQL:**
```
project = "NDP" AND type= "Bug" AND status in ("In Progress", "Pending Approval", "Ready To Start", "Development Complete", "In Test", "In Review") AND created >= -30d ORDER BY priority DESC, created ASC
```

**Response Format:** Leadership Report (AI Insight Report)

---

#### Example 1.2: Production Defects
**User Question:** "how many defects are in production for NDP?"

**AI Analysis:**
```
Query Intent: count production defects in NDP
Project: NDP
Issue Types: ["Defect"]
Status Filters: ["open", "closed"] (all statuses)
Reasoning: User wants count of defects (production issues), not bugs (lower environment)
```

**Generated JQL:**
```
project = "NDP" AND type= "Defect"
```

**Response Format:** Count response with breakdown

---

#### Example 1.3: High Priority Bugs
**User Question:** "list all high priority bugs that are pending approval in NDP"

**AI Analysis:**
```
Query Intent: list high priority bugs with specific status
Project: NDP
Issue Types: ["Bug"]
Status Filters: ["Pending Approval"]
Priority: High
Reasoning: User wants specific bugs with high priority and pending approval status
```

**Generated JQL:**
```
project = "NDP" AND type= "Bug" AND priority = "High" AND status = "Pending Approval" ORDER BY updated DESC
```

**Response Format:** List response with details

---

### Category 2: Test Case Queries

#### Example 2.1: Automated Regression Tests
**User Question:** "how many test cases are in regression test cases that are automated for ndp project"

**AI Analysis:**
```
Query Intent: count automated regression test cases
Project: NDP
Issue Types: ["Test"]
Test Type: "Regression Testing"
Test Status: "Automated"
Reasoning: User wants count of test cases that are both regression type and automated
```

**Generated JQL:**
```
project = "NDP" AND type = Test AND "Test Type" = "Regression Testing" AND "Test Status" = Automated
```

**Response Format:** Count with breakdown

---

#### Example 2.2: Functional Test Cases Count
**User Question:** "what is the count of functional testing test cases in NDP?"

**AI Analysis:**
```
Query Intent: count functional test cases
Project: NDP
Issue Types: ["Test"]
Test Type: "Functional Testing"
Reasoning: User wants total count of functional test cases regardless of automation status
```

**Generated JQL:**
```
project = "NDP" AND type = Test AND "Test Type" = "Functional Testing"
```

**Response Format:** Count response

---

#### Example 2.3: Tests Requiring Automation
**User Question:** "show me test cases that need automation in NDP project"

**AI Analysis:**
```
Query Intent: list test cases requiring automation
Project: NDP
Issue Types: ["Test"]
Test Status: "Requires Automation"
Reasoning: User wants to see test cases that haven't been automated yet
```

**Generated JQL:**
```
project = "NDP" AND type = Test AND "Test Status" = "Requires Automation" ORDER BY created DESC
```

**Response Format:** List response

---

#### Example 2.4: Manual Test Cases Query
**User Question:** "how many manual test cases are there in NDP project?"

**AI Analysis:**
```
Query Intent: count manual (non-automated) test cases
Project: NDP
Issue Types: ["Test"]
Test Status: != Automated (all non-automated statuses)
Reasoning: User asks about "manual test cases" which means all test cases that are NOT automated. This includes: Automation Not Required, Requires Automation, and In Progress.
```

**Generated JQL:**
```
project = "NDP" AND type = Test AND "Test Status" != Automated
```

**Response Format:** Count with breakdown by status
```
Manual Test Cases Count - NDP Project

Total: 234 manual test cases

Breakdown by Status:
- Automation Not Required: 120 (51.3%)
- Requires Automation: 89 (38.0%)
- In Progress: 25 (10.7%)

These are all test cases that are not currently automated. 89 tests require automation to be picked up.
```

---

#### Example 2.5: Automation Status Comparison
**User Question:** "compare automated vs manual test cases in NDP"

**AI Analysis:**
```
Query Intent: comparison query for test automation status
Project: NDP
Issue Types: ["Test"]
Comparison: Automated vs Non-Automated (using "Test Status" field)
Reasoning: User wants to compare counts of automated vs non-automated test cases. Since there's no "Manual" status, query for tests that are NOT automated.
```

**Generated JQL (Multiple):**
```
Query 1: project = "NDP" AND type = Test AND "Test Status" = Automated
Query 2: project = "NDP" AND type = Test AND "Test Status" != Automated
```

**Response Format:** Comparison analysis with percentages

---

### Category 3: Story/Work Item Queries

#### Example 3.1: Stories in Progress
**User Question:** "what stories are currently in progress for NDP?"

**AI Analysis:**
```
Query Intent: list stories with in progress status
Project: NDP
Issue Types: ["Story"]
Status Filters: ["In Progress"]
Reasoning: User wants to see active stories being worked on
```

**Generated JQL:**
```
project = "NDP" AND type= "Story" AND status = "In Progress" ORDER BY priority DESC, updated DESC
```

**Response Format:** List with assignee and priority details

---

#### Example 3.2: Completed Stories This Month
**User Question:** "give me all stories that were completed this month in NDP project"

**AI Analysis:**
```
Query Intent: list completed stories from current month
Project: NDP
Issue Types: ["Story"]
Status Filters: ["Test Complete", "Accepted"] (closed statuses)
Time Period: this month
Reasoning: User wants stories that reached completion status this month
```

**Generated JQL:**
```
project = "NDP" AND type= "Story" AND status in ("Test Complete", "Accepted") AND resolved >= startOfMonth() ORDER BY resolved DESC
```

**Response Format:** List with completion dates

---

### Category 4: Assignee/Team Member Queries

#### Example 4.1: Team Member Workload
**User Question:** "what is Ajith working on in NDP?"

**AI Analysis:**
```
Query Intent: find work items assigned to specific person
Project: NDP
Assignee: "Ajith" (will be normalized to full name)
Status Filters: ["open"] (all open statuses)
Reasoning: User wants to see all active work for a team member
```

**Generated JQL:**
```
project = "NDP" AND assignee ~ "Ajith" AND status in ("In Progress", "Pending Approval", "Ready To Start", "Development Complete", "In Test", "In Review") ORDER BY priority DESC
```

**Response Format:** Workload summary with breakdown by type

---

#### Example 4.2: Bugs Assigned to Person
**User Question:** "show me bugs assigned to Makarand in NDP"

**AI Analysis:**
```
Query Intent: list bugs for specific assignee
Project: NDP
Issue Types: ["Bug"]
Assignee: "Makarand" (normalized)
Reasoning: User wants bugs specifically, not all work items
```

**Generated JQL:**
```
project = "NDP" AND type= "Bug" AND assignee ~ "Makarand" ORDER BY priority DESC, updated DESC
```

**Response Format:** List of bugs with details

---

### Category 5: Status-Based Queries

#### Example 5.1: Pending Approval Items
**User Question:** "how many items are pending approval in NDP?"

**AI Analysis:**
```
Query Intent: count items with pending approval status
Project: NDP
Status Filters: ["Pending Approval"]
Issue Types: null (all types)
Reasoning: User wants count of all items waiting for approval
```

**Generated JQL:**
```
project = "NDP" AND status = "Pending Approval"
```

**Response Format:** Count with breakdown by issue type

---

#### Example 5.2: Items in Test Phase
**User Question:** "list everything that is in test phase for NDP project"

**AI Analysis:**
```
Query Intent: list items currently being tested
Project: NDP
Status Filters: ["In Test"]
Issue Types: null (all types)
Reasoning: User wants all work items in testing phase
```

**Generated JQL:**
```
project = "NDP" AND status = "In Test" ORDER BY priority DESC, updated DESC
```

**Response Format:** List with type breakdown

---

### Category 6: Time-Based Queries

#### Example 6.1: Last Week's Bugs
**User Question:** "give me open bugs in ndp project for last week"

**AI Analysis:**
```
Query Intent: find bugs created in last 7 days
Project: NDP
Issue Types: ["Bug"]
Status Filters: ["open"]
Time Period: last week (7 days)
Reasoning: User wants recently created bugs that are still open
```

**Generated JQL:**
```
project = "NDP" AND type= "Bug" AND status in ("In Progress", "Pending Approval", "Ready To Start", "Development Complete", "In Test", "In Review") AND created >= -7d ORDER BY priority DESC, created ASC
```

**Response Format:** Leadership Report (AI Insight Report)

---

#### Example 6.2: Items Created This Month
**User Question:** "what was created in NDP this month?"

**AI Analysis:**
```
Query Intent: list all items created in current month
Project: NDP
Issue Types: null (all types)
Time Period: this month
Reasoning: User wants comprehensive view of new work items
```

**Generated JQL:**
```
project = "NDP" AND created >= startOfMonth() ORDER BY created DESC
```

**Response Format:** Breakdown by type with counts

---

### Category 7: Priority-Based Queries

#### Example 7.1: High Priority Items
**User Question:** "show me all high priority items in NDP that need attention"

**AI Analysis:**
```
Query Intent: list high priority open items
Project: NDP
Priority: High
Status Filters: ["open"]
Issue Types: null (all types)
Reasoning: User wants urgent items requiring attention
```

**Generated JQL:**
```
project = "NDP" AND priority = "High" AND status in ("In Progress", "Pending Approval", "Ready To Start", "Development Complete", "In Test", "In Review") ORDER BY updated DESC
```

**Response Format:** List with type and assignee breakdown

---

### Category 8: Complex/Combined Queries

#### Example 8.1: Automated Regression Tests for Module
**User Question:** "how many automated regression test cases are there for the Goals module in NDP?"

**AI Analysis:**
```
Query Intent: count automated regression tests for specific component
Project: NDP
Issue Types: ["Test"]
Test Type: "Regression Testing"
Test Status: "Automated"
Component: "Goals"
Reasoning: User wants specific test coverage for a module
```

**Generated JQL:**
```
project = "NDP" AND type = Test AND "Test Type" = "Regression Testing" AND "Test Status" = Automated AND component = "Goals"
```

**Response Format:** Count with context

---

#### Example 8.2: Bugs by Assignee and Status
**User Question:** "show me bugs assigned to Pradeep that are in progress in NDP"

**AI Analysis:**
```
Query Intent: list bugs with specific assignee and status
Project: NDP
Issue Types: ["Bug"]
Assignee: "Pradeep"
Status: "In Progress"
Reasoning: User wants active bugs for a specific person
```

**Generated JQL:**
```
project = "NDP" AND type= "Bug" AND assignee ~ "Pradeep" AND status = "In Progress" ORDER BY priority DESC
```

**Response Format:** List with details

---

### Category 9: Comparison Queries

#### Example 9.1: Compare Two Assignees
**User Question:** "who is busier: Ajith or Karthik in NDP project?"

**AI Analysis:**
```
Query Intent: comparison between two assignees
Project: NDP
Comparison Type: assignee_comparison
Entities: ["Ajith", "Karthik"]
Reasoning: User wants to compare workload between two team members
```

**Generated JQL (Multiple):**
```
Query 1: project = "NDP" AND assignee ~ "Ajith" AND status in ("In Progress", "Pending Approval", "Ready To Start", "Development Complete", "In Test", "In Review")
Query 2: project = "NDP" AND assignee ~ "Karthik" AND status in ("In Progress", "Pending Approval", "Ready To Start", "Development Complete", "In Test", "In Review")
```

**Response Format:** Comparison analysis with metrics

---

### Category 10: Metric Calculation Queries

#### Example 10.1: Defect Leakage
**User Question:** "what is the defect leakage for NDP project in October 2025?"

**AI Analysis:**
```
Query Intent: metric calculation
Metric Type: defect_leakage
Project: NDP
Time Period: October 2025
Reasoning: User wants quality metric calculation
```

**Generated JQL (Multiple for metric calculation):**
```
Query 1: project = "NDP" AND type= "Defect" AND created >= "2025-10-01" AND created <= "2025-10-31"
Query 2: project = "NDP" AND type= "Bug" AND created >= "2025-10-01" AND created <= "2025-10-31"
```

**Response Format:** Metric calculation with formula and analysis

---

## AI Understanding Process Flow

1. **Query Understanding Phase:**
   - AI extracts: project, issue types, status filters, time period, assignee, etc.
   - Uses project-specific mappings to validate values
   - Determines query intent (count, list, comparison, metric)

2. **JQL Generation Phase:**
   - Uses extracted information
   - Applies project-specific field mappings
   - Generates syntactically correct JQL
   - Handles edge cases (normalization, date ranges, etc.)

3. **Response Format Selection:**
   - Leadership Report: Bug/issue queries with multiple results
   - Count Response: Simple count queries
   - List Response: Detailed item listings
   - Comparison Analysis: Multi-entity comparisons
   - Metric Calculation: Quality metric queries

---

## Key AI Capabilities

✅ **Natural Language Understanding:** Handles various phrasings of the same question
✅ **Project-Specific Mappings:** Uses exact field values from your Jira configuration
✅ **Context Awareness:** Remembers previous queries for follow-up questions
✅ **Smart Defaults:** Infers missing information (e.g., defaults to NDP if not specified)
✅ **Error Prevention:** Validates field names and values against project mappings
✅ **Multi-Intent Detection:** Handles complex queries with multiple criteria`