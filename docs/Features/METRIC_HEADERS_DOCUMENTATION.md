# QCOE Metrics Headers Documentation

## All Metrics and Their Headers

### 1. Defect Leakage Rate
**Metric ID:** `defect_leakage`

**Headers (Single Period Mode):**
- Portfolio
- Bugs Count
- Defects Count
- Leakage %
- Comments

**Headers (Comparison Mode):**
- Portfolio
- Bugs Count
- Defects Count
- [Previous Period] Leakage %
- [Current Period] Leakage %
- Change
- Comments

---

### 2. Regression Test Automation
**Metric ID:** `regression_automation`

**Headers (Single Period Mode):**
- Portfolio
- Regression Test Case Count
- [Current Period] Automated
- [Current Period] Manual
- Comments

**Headers (Comparison Mode):**
- Portfolio
- Regression Test Case Count
- [Previous Period] Automated
- [Previous Period] Manual
- [Current Period] Automated
- [Current Period] Manual
- Change
- Comments

---

### 3. Overall Test Automation
**Metric ID:** `overall_automation`

**Headers (Single Period Mode):**
- Portfolio
- Total Test Case Count
- [Current Period] Automated
- [Current Period] Manual
- Comments

**Headers (Comparison Mode):**
- Portfolio
- Total Test Case Count
- [Previous Period] Automated
- [Previous Period] Manual
- [Current Period] Automated
- [Current Period] Manual
- Change
- Comments

---

### 4. Test Coverage
**Metric ID:** `test_coverage`

**Headers (Single Period Mode):**
- Portfolio
- Total Stories
- [Current Period] Stories with Tests
- [Current Period] Stories without Tests
- Comments

**Headers (Comparison Mode):**
- Portfolio
- Total Stories
- [Previous Period] Stories with Tests
- [Previous Period] Stories without Tests
- [Current Period] Stories with Tests
- [Current Period] Stories without Tests
- Change
- Comments

---

### 5. Test to Story Ratio
**Metric ID:** `test_story_ratio`

**Headers (Single Period Mode):**
- Portfolio
- Test Cases
- [Current Period] Stories
- [Current Period] Ratio
- Comments

**Headers (Comparison Mode):**
- Portfolio
- Test Cases
- [Previous Period] Stories
- [Previous Period] Ratio
- [Current Period] Stories
- [Current Period] Ratio
- Change
- Comments

---

### 6. Bug Discovery Ratio
**Metric ID:** `bug_ratio`

**Headers (Single Period Mode):**
- Portfolio
- Bugs Found
- [Current Period] Tests Executed
- [Current Period] Ratio
- Comments

**Headers (Comparison Mode):**
- Portfolio
- Bugs Found
- [Previous Period] Tests Executed
- [Previous Period] Ratio
- [Current Period] Tests Executed
- [Current Period] Ratio
- Change
- Comments

---

### 7. Test Case Review Status
**Metric ID:** `test_review_status`

**Headers (Single Period Mode):**
- Portfolio
- Total Stories
- [Current Period] Reviewed Yes
- [Current Period] Reviewed No
- Comments

**Headers (Comparison Mode):**
- Portfolio
- Total Stories
- [Previous Period] Reviewed Yes
- [Previous Period] Reviewed No
- [Current Period] Reviewed Yes
- [Current Period] Reviewed No
- Change
- Comments

---

## Notes:
- All metrics support both **Single Period** and **Comparison** modes
- "Change" column only appears in Comparison mode
- Period labels (e.g., "Dec 14, 2025") are displayed above the metric-specific columns
- "Comments" column always appears last and contains AI-generated analysis

