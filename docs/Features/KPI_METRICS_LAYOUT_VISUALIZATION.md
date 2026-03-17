# KPI Metrics Dashboard Layout - Data Solutions & NDP Selected

## Visual Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CDK KPI METRICS                                    [Refresh] [CSV] [PDF]   │
│  Comprehensive Performance Indicators Dashboard                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  FILTERS SECTION                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│  │ Portfolio    │ │ Project Key  │ │ Project Name│ │ RCA          │      │
│  │ Data Solutions│ │ NDP          │ │ CDK...      │ │ All          │      │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  SUMMARY METRICS CARDS (4 Cards in a row)                                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│  │   Defects    │ │    Bugs      │ │ Automation % │ │ Completion % │      │
│  │      3       │ │      4       │ │    0.0%      │ │    77.4%     │      │
│  │  [Gradient]  │ │  [Gradient]  │ │  [Gradient]  │ │  [Gradient]  │      │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  PROJECTS LIST (Only when Portfolio is selected)                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 🏢 Projects (1)                                                      │    │
│  │ ┌───────────────────────────────────────────────────────────────┐   │    │
│  │ │ NDP - CDK Intelligent Suite                                    │   │    │
│  │ │ Defects: 3 | Bugs: 4 | Automation: 0.0% | Completion: 77.4%  │   │    │
│  │ └───────────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  DETAILED METRICS SECTION (2 Panels Side by Side)                            │
│  ┌──────────────────────────────┐ ┌──────────────────────────────┐        │
│  │  Defect Analysis              │ │  Bug Analysis                │        │
│  │  Breakdown by RCA:            │ │  Breakdown by RCA:           │        │
│  │  ──────────────────────────── │ │  ──────────────────────────── │        │
│  │  Code Error: 3 (100.0%)       │ │  Code Error: 4 (100.0%)       │        │
│  │  [Progress Bar - Red]         │ │  [Progress Bar - Yellow]      │        │
│  └──────────────────────────────┘ └──────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  AUTOMATION METRICS PANEL (Full Width)                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ ⚡ Automation Metrics                                                │    │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                 │    │
│  │ │Committed │ │Completed │ │Automation│ │Completion│                 │    │
│  │ │   TC    │ │   TC    │ │    %    │ │    %    │                 │    │
│  │ │   31    │ │   24    │ │  0.0%  │ │ 77.4%  │                 │    │
│  │ └──────────┘ └──────────┘ └──────────┘ └──────────┘                 │    │
│  │                                                                      │    │
│  │ Projects Breakdown:                                                 │    │
│  │ NDP - CDK Intelligent Suite                                         │    │
│  │ Automation: 0.0% | Completion: 77.4%                                │    │
│  │ [Progress Bar]                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
  ⚠ DETAILED INFORMATION SECTIONS (Only visible when Portfolio ≠ "All" 
    AND Project Key ≠ "All")
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│  DEFECT & BUG DETAILS (2 Cards Side by Side)                                 │
│  ┌──────────────────────────────┐ ┌──────────────────────────────┐        │
│  │ ⚠ Defect Details (3)         │ │ 🐛 Bug Details (4)            │        │
│  │ ┌──────────────────────────┐ │ │ ┌──────────────────────────┐ │        │
│  │ │ NDP-12345                 │ │ │ │ NDP-67890                │ │        │
│  │ │ Description: Issue desc... │ │ │ │ Description: Bug desc... │ │        │
│  │ │ Assignee: John Doe        │ │ │ │ Assignee: Jane Smith    │ │        │
│  │ │ Justification: Reason...   │ │ │ │ Justification: Reason... │ │        │
│  │ └──────────────────────────┘ │ │ └──────────────────────────┘ │        │
│  │ ┌──────────────────────────┐ │ │ ┌──────────────────────────┐ │        │
│  │ │ NDP-12346                 │ │ │ │ NDP-67891                │ │        │
│  │ │ Description: Issue desc... │ │ │ │ Description: Bug desc... │ │        │
│  │ │ Assignee: John Doe        │ │ │ │ Assignee: Jane Smith    │ │        │
│  │ │ Justification: Reason...   │ │ │ │ Justification: Reason... │ │        │
│  │ └──────────────────────────┘ │ │ └──────────────────────────┘ │        │
│  │ [Scrollable - Max 600px]     │ │ │ [Scrollable - Max 600px]   │ │        │
│  └──────────────────────────────┘ └──────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  AUTOMATION DETAILS (Full Width Card)                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ ⚡ Automation Details (1)                                            │    │
│  │ ┌─────────────────────────────────────────────────────────────────┐ │    │
│  │ │ NDP - CDK Intelligent Suite                                     │ │    │
│  │ │ ┌──────────────────┐ ┌──────────────────┐                      │ │    │
│  │ │ │ Project Type     │ │ Tool/Framework   │                      │ │    │
│  │ │ │ Web Application  │ │ Selenium        │                      │ │    │
│  │ │ └──────────────────┘ └──────────────────┘                      │ │    │
│  │ │ ┌──────────────────┐ ┌──────────────────┐                      │ │    │
│  │ │ │ AI Integration   │ │ AI Usage Level   │                      │ │    │
│  │ │ │ Enabled          │ │ High            │                      │ │    │
│  │ │ └──────────────────┘ └──────────────────┘                      │ │    │
│  │ │ ┌──────────────────┐ ┌──────────────────┐                      │ │    │
│  │ │ │ Impact on Prod.  │ │ AI Inference     │                      │ │    │
│  │ │ │ Significant      │ │ Positive         │                      │ │    │
│  │ │ └──────────────────┘ └──────────────────┘                      │ │    │
│  │ │ ┌──────────────────┐                                            │ │    │
│  │ │ │ QA Owner         │                                            │ │    │
│  │ │ │ John Doe         │                                            │ │    │
│  │ │ └──────────────────┘                                            │ │    │
│  │ └─────────────────────────────────────────────────────────────────┘ │    │
│  │ [Scrollable - Max 600px]                                             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Layout Flow

### 1. **Top Section** (Always Visible)
   - Header with title and action buttons
   - Filter dropdowns (Portfolio, Project Key, Project Name, RCA)

### 2. **Summary Cards** (Always Visible)
   - 4 cards in a row: Defects, Bugs, Automation %, Completion %
   - Gradient colors with increment animations

### 3. **Projects List** (Visible when Portfolio ≠ "All")
   - Shows individual project metrics
   - Displays: Defects, Bugs, Automation %, Completion % per project

### 4. **Analysis Panels** (Always Visible)
   - Defect Analysis: RCA breakdown with progress bars
   - Bug Analysis: RCA breakdown with progress bars

### 5. **Automation Metrics Panel** (Always Visible)
   - 4 metric cards: Committed TC, Completed TC, Automation %, Completion %
   - Projects breakdown section

### 6. **Detailed Information Sections** ⭐ (Only when Portfolio ≠ "All" AND Project Key ≠ "All")

   **a. Defect & Bug Details** (Side by Side - 2 columns on desktop, 1 on mobile)
   - Left: Defect Details card
     - Shows each defect with:
       - Issue Key (bold, primary color)
       - Description (Summary field)
       - Assignee
       - Justification (if available)
     - Scrollable (max height 600px)
     - Color-coded: Light red background with red border
   
   - Right: Bug Details card
     - Shows each bug with:
       - Issue Key (bold, primary color)
       - Description (Summary field)
       - Assignee
       - Justification (if available)
     - Scrollable (max height 600px)
     - Color-coded: Light yellow background with yellow border

   **b. Automation Details** (Full width, below defects/bugs)
   - Shows automation project details:
     - Project Key & Name (header)
     - Project Type
     - Tool/Framework
     - AI Assistant Integration Enabled
     - Usage Level of AI Assistant
     - Impact on Productivity
     - AI Usage Inference/Derivation
     - QA Owner
   - Scrollable (max height 600px)
   - Color-coded: Light teal background with teal border
   - Grid layout: 2 columns on desktop, 1 on mobile

## Visual Styling

- **Defect Cards**: Red theme (#FF6B6B)
  - Background: rgba(255, 107, 107, 0.05) dark / rgba(255, 107, 107, 0.02) light
  - Border: rgba(255, 107, 107, 0.2) dark / rgba(255, 107, 107, 0.3) light

- **Bug Cards**: Yellow theme (#FFD93D)
  - Background: rgba(255, 217, 61, 0.05) dark / rgba(255, 217, 61, 0.02) light
  - Border: rgba(255, 217, 61, 0.2) dark / rgba(255, 217, 61, 0.3) light

- **Automation Cards**: Teal theme (#4ECDC4)
  - Background: rgba(78, 205, 196, 0.05) dark / rgba(78, 205, 196, 0.02) light
  - Border: rgba(78, 205, 196, 0.2) dark / rgba(78, 205, 196, 0.3) light

## Responsive Behavior

- **Desktop (lg)**: 2-column layout for Defect/Bug details
- **Tablet (md)**: 2-column layout for automation details grid
- **Mobile**: Single column layout for all sections

## Animation

- All detail sections fade in with spring animation
- Delay: 0.6s for Defects/Bugs, 0.7s for Automation
- Smooth entry from bottom (y: 20 → 0)

