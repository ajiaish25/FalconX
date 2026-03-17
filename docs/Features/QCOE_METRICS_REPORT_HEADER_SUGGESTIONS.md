# QCOE Metrics Report - Header Suggestions

## Current Report Structure
The QCOE metrics report currently displays:
- **Portfolio / Project** - Project identification
- **Metric** - Metric name (e.g., "Defect Leakage")
- **Bugs Count** - Number of bugs
- **Defects Count** - Number of defects
- **Previous Week Ending** - Previous period leakage %
- **Current Week Ending** - Current period leakage %
- **WoW Progress** - Week-over-week change
- **Comments** - Additional notes

---

## Proposed Header Options for Regression Automation % Metric

### Option 1: Minimal Addition (Recommended)
**Add a single "Regression Automation %" column alongside existing metrics**

| Column | Header | Description |
|--------|--------|-------------|
| Portfolio / Project | Portfolio / Project | Project identification |
| Metric | Metric | Metric name (e.g., "Regression Automation %") |
| Bugs Count | Bugs Count | Number of bugs (if applicable) |
| Defects Count | Defects Count | Number of defects (if applicable) |
| **Regression Tests Total** | **Regression Tests Total** | Total regression test cases |
| **Automated Regression Tests** | **Automated Regression Tests** | Count of automated regression tests |
| **Regression Automation %** | **Regression Automation %** | Percentage of automated regression tests |
| Previous Period | Previous Period<br/><span style="font-size: 10px">Automation %</span> | Previous period automation % (if comparison enabled) |
| Current Period | Current Period<br/><span style="font-size: 10px">Automation %</span> | Current period automation % |
| Change | Change | Period-over-period change |
| Comments | Comments | Additional notes |

**Pros:**
- Clean, focused on regression automation
- Easy to understand
- Minimal changes to existing structure

**Cons:**
- Doesn't show trend over multiple periods

---

### Option 2: Comprehensive Metrics View
**Show both counts and percentages with trend analysis**

| Column | Header | Description |
|--------|--------|-------------|
| Portfolio / Project | Portfolio / Project | Project identification |
| Metric | Metric | Metric name |
| Total Regression Tests | Total Regression Tests | All regression test cases |
| Automated Tests | Automated Tests | Automated regression test cases |
| Manual Tests | Manual Tests<br/><span style="font-size: 10px">(Non-Automated)</span> | Non-automated regression tests |
| **Current Automation %** | **Current Automation %** | Current period automation percentage |
| Previous Automation % | Previous Automation %<br/><span style="font-size: 10px">Week ending [date]</span> | Previous period automation % |
| Change | Change<br/><span style="font-size: 10px">(Percentage Points)</span> | Change in automation % |
| Trend | Trend | Visual indicator (↑/↓/→) |
| Target | Target % | Target automation percentage (if set) |
| Gap to Target | Gap to Target | Difference from target |
| Comments | Comments | Additional notes |

**Pros:**
- Comprehensive view with all relevant data
- Shows progress toward targets
- Includes trend indicators

**Cons:**
- More columns, may be wide for some screens
- More complex to implement

---

### Option 3: Comparison-Focused (Similar to Defect Leakage)
**Mirror the defect leakage report structure for consistency**

| Column | Header | Description |
|--------|--------|-------------|
| Portfolio / Project | Portfolio / Project | Project identification |
| Metric | Metric | "Regression Automation %" |
| Regression Tests Total | Regression Tests Total | Total regression test cases |
| Automated Tests | Automated Tests | Automated regression test cases |
| Previous Period | Previous Period<br/><span style="font-size: 10px">Automation %</span> | Previous period automation % |
| Current Period | Current Period<br/><span style="font-size: 10px">Automation %</span> | Current period automation % |
| Change | Change<br/><span style="font-size: 10px">(WoW Progress)</span> | Week-over-week change |
| Status | Status | Indicator (On Track / At Risk / Behind) |
| Comments | Comments | Additional notes |

**Pros:**
- Consistent with existing defect leakage report
- Familiar format for users
- Easy to compare metrics side-by-side

**Cons:**
- Less detailed than Option 2

---

### Option 4: Executive Summary View
**High-level view for leadership dashboards**

| Column | Header | Description |
|--------|--------|-------------|
| Portfolio / Project | Portfolio / Project | Project identification |
| Metric | Metric | "Regression Automation %" |
| Current % | Current Automation % | Current period percentage |
| Previous % | Previous Automation % | Previous period percentage |
| Change | Change | Period-over-period change |
| Status | Status | Visual status indicator |
| Trend (3M) | 3-Month Trend | 3-month trend indicator |
| Target | Target % | Target automation percentage |
| Comments | Comments | Key insights |

**Pros:**
- Clean, executive-friendly format
- Focus on key metrics
- Easy to scan

**Cons:**
- Less detail for operational teams

---

## Recommendation: **Option 1 (Minimal Addition)**

### Why Option 1?
1. **Consistency**: Matches the existing defect leakage report structure
2. **Simplicity**: Easy to understand and implement
3. **Flexibility**: Can be extended later if needed
4. **User Familiarity**: Users already understand this format

### Implementation Details for Option 1:

**New Columns to Add:**
1. **Regression Tests Total** - Total count of regression test cases
2. **Automated Regression Tests** - Count of automated regression tests
3. **Regression Automation %** - Calculated percentage

**Conditional Columns (if comparison enabled):**
4. **Previous Period** - Previous period automation %
5. **Change** - Period-over-period change

**Data Source:**
- Query: `project = "PROJECT" AND type = Test AND "Test Type" = "Regression Testing"`
- Automated Query: `project = "PROJECT" AND type = Test AND "Test Type" = "Regression Testing" AND "Test Status" = Automated`

---

## Additional Suggestions

### Color Coding
- **Green**: Automation % ≥ 80%
- **Yellow**: Automation % 60-79%
- **Red**: Automation % < 60%

### Status Indicators
- ✅ **On Track**: Meeting or exceeding target
- ⚠️ **At Risk**: Below target but improving
- ❌ **Behind**: Below target and declining

### Tooltips/Help Text
- Hover over "Regression Automation %" to show: "Percentage of regression test cases that are automated"
- Show formula: "Automated Regression Tests / Total Regression Tests × 100"

---

## Questions for Approval

1. **Which option do you prefer?** (Option 1, 2, 3, or 4)
2. **Do you want comparison columns?** (Previous period, change)
3. **Should we include target percentages?** (If yes, where should targets be configured?)
4. **Color coding preferences?** (Use the suggested colors or different ones?)
5. **Any additional columns needed?** (e.g., Test Type breakdown, Component-wise breakdown)

---

## Next Steps (After Approval)

1. ✅ Fix JQL query (already done - changed `type` to `type`)
2. Enable "Regression Automation %" in metric options
3. Add backend API endpoint to calculate regression automation
4. Update frontend to display new columns
5. Update export functions (Excel/PDF) to include new columns
6. Add color coding and status indicators
7. Test with real data

---

**Ready for your approval!** 🚀

