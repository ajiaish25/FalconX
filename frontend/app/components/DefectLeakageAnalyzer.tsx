'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  AlertTriangle, 
  RefreshCw, Calendar, Activity,
  FileText, Download, Info, Zap, Check,
  TrendingUp, TrendingDown, Minus, Sparkles, BarChart3,
  ArrowUp, ArrowDown, Equal, Table2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { getApiUrl } from '../../lib/api-config';
import { useTheme } from '../contexts/ThemeContext';
import { exportTcoeReportAsPDF, exportTcoeReportAsExcel, exportTcoeReportAsExcelMulti } from '../utils/exportUtils';
import { jobTracker } from '../utils/jobTracker';

interface WeekMetrics {
  bugs_count: number;
  defects_count: number;
  leakage_percentage: number;
  total_issues: number;
  date_range: string;
  bugs_list?: any[];
  defects_list?: any[];
  bugs_keys?: string[];
  defects_keys?: string[];
  bugs_jql?: string;
  defects_jql?: string;
}

interface Comparison {
  leakage_change: number;
  leakage_change_percentage: number;
  bugs_change: number;
  defects_change: number;
  trend: 'improving' | 'worsening' | 'stable';
  severity: 'critical' | 'warning' | 'attention' | 'normal';
}

interface PeriodMetrics {
  from: string;
  to: string;
  automated_count?: number;
  manual_count?: number;
  automation_percentage?: number;
  // Test Coverage fields
  stories_with_tests?: number;
  stories_without_tests?: number;
  coverage_percentage?: number;
  // Test Story Ratio fields
  total_test_cases?: number;
  total_stories?: number;
  ratio?: number;
  // Bug Ratio fields
  bugs_found?: number;
  test_cases_executed?: number;
  // Test Review Status fields
  reviewed_yes?: number;
  reviewed_no?: number;
  not_set?: number;
  review_percentage?: number;
}

interface RegressionProgress {
  percentage_change?: number;
  new_automated_tests?: number;
  trend: 'improving' | 'declining' | 'stable';
  // Additional progress fields
  ratio_change?: number;
  new_stories_with_tests?: number;
  new_reviewed?: number;
  bugs_change?: number;
  tests_change?: number;
  stories_change?: number;
}

interface Analysis {
  portfolio: string;
  current_week: WeekMetrics;
  previous_week: WeekMetrics;
  comparison: Comparison;
  ai_insights: string;
  generated_at: string;
  project_key?: string;
  project_label?: string;
  portfolio_display?: string;
  metric?: string;
  metric_label?: string;
  ai_metadata?: {
    is_ai_generated?: boolean;
    model?: string;
    provider?: string;
    generated_at?: string;
  };
  // Regression/Overall automation fields
  total_regression_tests?: number;
  total_test_cases?: number;
  total_stories?: number; // For test_coverage, test_review_status, test_story_ratio
  period1?: PeriodMetrics; // Only present when comparison enabled
  period2?: PeriodMetrics; // Only present when comparison enabled
  period?: PeriodMetrics; // Only present when single period mode
  progress?: RegressionProgress; // Only present when comparison enabled
  ai_analysis?: string;
}
  
interface MetricOption {
  value: string;
  label: string;
  description: string;
  disabled?: boolean;
}

// KPI-style dropdown options
interface DropdownOptions {
  portfolios: string[];
  project_keys: string[];
  project_names: string[];
  projectKeyToPortfolio: Record<string, string>; // Maps project key to portfolio
}

const METRIC_OPTIONS: MetricOption[] = [
  // Top 3 Priority - Automation & Coverage
  { value: 'overall_automation', label: 'Overall Test Automation', description: 'Automated Test Cases / Total Test Cases', disabled: false },
  { value: 'regression_automation', label: 'Regression Test Automation', description: 'Automated Regression Tests / Total Regression Tests', disabled: false },
  { value: 'test_coverage', label: 'Test Coverage', description: 'Stories with linked Test Cases / Total Stories', disabled: false },
  { value: 'bug_ratio', label: 'Bug Discovery Ratio', description: 'Bugs found / Test Cases executed', disabled: false },
  
  // Next 3 - Quality Metrics
  { value: 'defect_leakage', label: 'Defect Leakage Rate', description: 'Production Defects / (Lower Env Bugs + Production Defects)', disabled: false },
  { value: 'test_story_ratio', label: 'Test to Story Ratio', description: 'Test Cases / User Stories', disabled: false },
  { value: 'unit_test_coverage', label: 'Unit Test Coverage', description: 'Unit test coverage from code analysis', disabled: true },
  
  // Next 3 - Advanced Metrics
  { value: 'test_review_status', label: 'Test Case Review Status', description: 'Reviewed Test Cases / Total Test Cases', disabled: false },
  { value: 'performance_status', label: 'Performance Test Status', description: 'Performance test execution status', disabled: true },
  { value: 'env_data_status', label: 'Environment & Data Availability', description: 'Test environment and data readiness status', disabled: true },
];

// Date filter modes
type DateFilterMode = 'custom' | 'pi' | 'sprint' | 'month';

// PI Calendar (Program Increments) - Based on CY25 and CY26 schedules
// Using Commit Start to Commit End dates for each PI
const PI_OPTIONS = [
  // CY25 PIs
  { value: 'PI1_CY25', label: 'PI 1 - CY25 (Jan 15 - Mar 25, 2025)', startDate: '2025-01-15', endDate: '2025-03-25', commitStart: '2025-01-15', commitEnd: '2025-03-25' },
  { value: 'PI2_CY25', label: 'PI 2 - CY25 (Apr 16 - Jun 24, 2025)', startDate: '2025-04-16', endDate: '2025-06-24', commitStart: '2025-04-16', commitEnd: '2025-06-24' },
  { value: 'PI3_CY25', label: 'PI 3 - CY25 (Jul 16 - Sep 23, 2025)', startDate: '2025-07-16', endDate: '2025-09-23', commitStart: '2025-07-16', commitEnd: '2025-09-23' },
  { value: 'PI4_CY25', label: 'PI 4 - CY25 (Oct 15 - Dec 23, 2025)', startDate: '2025-10-15', endDate: '2025-12-23', commitStart: '2025-10-15', commitEnd: '2025-12-23' },
  // CY26 PIs
  { value: 'PI1_CY26', label: 'PI 1 - CY26 (Jan 14 - Mar 24, 2026)', startDate: '2026-01-14', endDate: '2026-03-24', commitStart: '2026-01-14', commitEnd: '2026-03-24' },
  { value: 'PI2_CY26', label: 'PI 2 - CY26 (Apr 15 - Jun 23, 2026)', startDate: '2026-04-15', endDate: '2026-06-23', commitStart: '2026-04-15', commitEnd: '2026-06-23' },
  { value: 'PI3_CY26', label: 'PI 3 - CY26 (Jul 15 - Sep 22, 2026)', startDate: '2026-07-15', endDate: '2026-09-22', commitStart: '2026-07-15', commitEnd: '2026-09-22' },
  { value: 'PI4_CY26', label: 'PI 4 - CY26 (Oct 14 - Dec 22, 2026)', startDate: '2026-10-14', endDate: '2026-12-22', commitStart: '2026-10-14', commitEnd: '2026-12-22' },
];

// Sprint Options - 2-week sprints within each PI for TCOE metrics
// Each PI has approximately 5 sprints (10 weeks / 2 weeks per sprint)
const SPRINT_OPTIONS = [
  // PI1_CY25 Sprints
  { value: 'S1_PI1_CY25', label: 'Sprint 1 - PI1 CY25 (Jan 15 - Jan 28, 2025)', startDate: '2025-01-15', endDate: '2025-01-28', pi: 'PI1_CY25' },
  { value: 'S2_PI1_CY25', label: 'Sprint 2 - PI1 CY25 (Jan 29 - Feb 11, 2025)', startDate: '2025-01-29', endDate: '2025-02-11', pi: 'PI1_CY25' },
  { value: 'S3_PI1_CY25', label: 'Sprint 3 - PI1 CY25 (Feb 12 - Feb 25, 2025)', startDate: '2025-02-12', endDate: '2025-02-25', pi: 'PI1_CY25' },
  { value: 'S4_PI1_CY25', label: 'Sprint 4 - PI1 CY25 (Feb 26 - Mar 11, 2025)', startDate: '2025-02-26', endDate: '2025-03-11', pi: 'PI1_CY25' },
  { value: 'S5_PI1_CY25', label: 'Sprint 5 - PI1 CY25 (Mar 12 - Mar 25, 2025)', startDate: '2025-03-12', endDate: '2025-03-25', pi: 'PI1_CY25' },
  
  // PI2_CY25 Sprints
  { value: 'S1_PI2_CY25', label: 'Sprint 1 - PI2 CY25 (Apr 16 - Apr 29, 2025)', startDate: '2025-04-16', endDate: '2025-04-29', pi: 'PI2_CY25' },
  { value: 'S2_PI2_CY25', label: 'Sprint 2 - PI2 CY25 (Apr 30 - May 13, 2025)', startDate: '2025-04-30', endDate: '2025-05-13', pi: 'PI2_CY25' },
  { value: 'S3_PI2_CY25', label: 'Sprint 3 - PI2 CY25 (May 14 - May 27, 2025)', startDate: '2025-05-14', endDate: '2025-05-27', pi: 'PI2_CY25' },
  { value: 'S4_PI2_CY25', label: 'Sprint 4 - PI2 CY25 (May 28 - Jun 10, 2025)', startDate: '2025-05-28', endDate: '2025-06-10', pi: 'PI2_CY25' },
  { value: 'S5_PI2_CY25', label: 'Sprint 5 - PI2 CY25 (Jun 11 - Jun 24, 2025)', startDate: '2025-06-11', endDate: '2025-06-24', pi: 'PI2_CY25' },
  
  // PI3_CY25 Sprints
  { value: 'S1_PI3_CY25', label: 'Sprint 1 - PI3 CY25 (Jul 16 - Jul 29, 2025)', startDate: '2025-07-16', endDate: '2025-07-29', pi: 'PI3_CY25' },
  { value: 'S2_PI3_CY25', label: 'Sprint 2 - PI3 CY25 (Jul 30 - Aug 12, 2025)', startDate: '2025-07-30', endDate: '2025-08-12', pi: 'PI3_CY25' },
  { value: 'S3_PI3_CY25', label: 'Sprint 3 - PI3 CY25 (Aug 13 - Aug 26, 2025)', startDate: '2025-08-13', endDate: '2025-08-26', pi: 'PI3_CY25' },
  { value: 'S4_PI3_CY25', label: 'Sprint 4 - PI3 CY25 (Aug 27 - Sep 09, 2025)', startDate: '2025-08-27', endDate: '2025-09-09', pi: 'PI3_CY25' },
  { value: 'S5_PI3_CY25', label: 'Sprint 5 - PI3 CY25 (Sep 10 - Sep 23, 2025)', startDate: '2025-09-10', endDate: '2025-09-23', pi: 'PI3_CY25' },
  
  // PI4_CY25 Sprints
  { value: 'S1_PI4_CY25', label: 'Sprint 1 - PI4 CY25 (Oct 15 - Oct 28, 2025)', startDate: '2025-10-15', endDate: '2025-10-28', pi: 'PI4_CY25' },
  { value: 'S2_PI4_CY25', label: 'Sprint 2 - PI4 CY25 (Oct 29 - Nov 11, 2025)', startDate: '2025-10-29', endDate: '2025-11-11', pi: 'PI4_CY25' },
  { value: 'S3_PI4_CY25', label: 'Sprint 3 - PI4 CY25 (Nov 12 - Nov 25, 2025)', startDate: '2025-11-12', endDate: '2025-11-25', pi: 'PI4_CY25' },
  { value: 'S4_PI4_CY25', label: 'Sprint 4 - PI4 CY25 (Nov 26 - Dec 09, 2025)', startDate: '2025-11-26', endDate: '2025-12-09', pi: 'PI4_CY25' },
  { value: 'S5_PI4_CY25', label: 'Sprint 5 - PI4 CY25 (Dec 10 - Dec 23, 2025)', startDate: '2025-12-10', endDate: '2025-12-23', pi: 'PI4_CY25' },
  
  // PI1_CY26 Sprints
  { value: 'S1_PI1_CY26', label: 'Sprint 1 - PI1 CY26 (Jan 14 - Jan 27, 2026)', startDate: '2026-01-14', endDate: '2026-01-27', pi: 'PI1_CY26' },
  { value: 'S2_PI1_CY26', label: 'Sprint 2 - PI1 CY26 (Jan 28 - Feb 10, 2026)', startDate: '2026-01-28', endDate: '2026-02-10', pi: 'PI1_CY26' },
  { value: 'S3_PI1_CY26', label: 'Sprint 3 - PI1 CY26 (Feb 11 - Feb 24, 2026)', startDate: '2026-02-11', endDate: '2026-02-24', pi: 'PI1_CY26' },
  { value: 'S4_PI1_CY26', label: 'Sprint 4 - PI1 CY26 (Feb 25 - Mar 10, 2026)', startDate: '2026-02-25', endDate: '2026-03-10', pi: 'PI1_CY26' },
  { value: 'S5_PI1_CY26', label: 'Sprint 5 - PI1 CY26 (Mar 11 - Mar 24, 2026)', startDate: '2026-03-11', endDate: '2026-03-24', pi: 'PI1_CY26' },
  
  // PI2_CY26 Sprints
  { value: 'S1_PI2_CY26', label: 'Sprint 1 - PI2 CY26 (Apr 15 - Apr 28, 2026)', startDate: '2026-04-15', endDate: '2026-04-28', pi: 'PI2_CY26' },
  { value: 'S2_PI2_CY26', label: 'Sprint 2 - PI2 CY26 (Apr 29 - May 12, 2026)', startDate: '2026-04-29', endDate: '2026-05-12', pi: 'PI2_CY26' },
  { value: 'S3_PI2_CY26', label: 'Sprint 3 - PI2 CY26 (May 13 - May 26, 2026)', startDate: '2026-05-13', endDate: '2026-05-26', pi: 'PI2_CY26' },
  { value: 'S4_PI2_CY26', label: 'Sprint 4 - PI2 CY26 (May 27 - Jun 09, 2026)', startDate: '2026-05-27', endDate: '2026-06-09', pi: 'PI2_CY26' },
  { value: 'S5_PI2_CY26', label: 'Sprint 5 - PI2 CY26 (Jun 10 - Jun 23, 2026)', startDate: '2026-06-10', endDate: '2026-06-23', pi: 'PI2_CY26' },
  
  // PI3_CY26 Sprints
  { value: 'S1_PI3_CY26', label: 'Sprint 1 - PI3 CY26 (Jul 15 - Jul 28, 2026)', startDate: '2026-07-15', endDate: '2026-07-28', pi: 'PI3_CY26' },
  { value: 'S2_PI3_CY26', label: 'Sprint 2 - PI3 CY26 (Jul 29 - Aug 11, 2026)', startDate: '2026-07-29', endDate: '2026-08-11', pi: 'PI3_CY26' },
  { value: 'S3_PI3_CY26', label: 'Sprint 3 - PI3 CY26 (Aug 12 - Aug 25, 2026)', startDate: '2026-08-12', endDate: '2026-08-25', pi: 'PI3_CY26' },
  { value: 'S4_PI3_CY26', label: 'Sprint 4 - PI3 CY26 (Aug 26 - Sep 08, 2026)', startDate: '2026-08-26', endDate: '2026-09-08', pi: 'PI3_CY26' },
  { value: 'S5_PI3_CY26', label: 'Sprint 5 - PI3 CY26 (Sep 09 - Sep 22, 2026)', startDate: '2026-09-09', endDate: '2026-09-22', pi: 'PI3_CY26' },
  
  // PI4_CY26 Sprints
  { value: 'S1_PI4_CY26', label: 'Sprint 1 - PI4 CY26 (Oct 14 - Oct 27, 2026)', startDate: '2026-10-14', endDate: '2026-10-27', pi: 'PI4_CY26' },
  { value: 'S2_PI4_CY26', label: 'Sprint 2 - PI4 CY26 (Oct 28 - Nov 10, 2026)', startDate: '2026-10-28', endDate: '2026-11-10', pi: 'PI4_CY26' },
  { value: 'S3_PI4_CY26', label: 'Sprint 3 - PI4 CY26 (Nov 11 - Nov 24, 2026)', startDate: '2026-11-11', endDate: '2026-11-24', pi: 'PI4_CY26' },
  { value: 'S4_PI4_CY26', label: 'Sprint 4 - PI4 CY26 (Nov 25 - Dec 08, 2026)', startDate: '2026-11-25', endDate: '2026-12-08', pi: 'PI4_CY26' },
  { value: 'S5_PI4_CY26', label: 'Sprint 5 - PI4 CY26 (Dec 09 - Dec 22, 2026)', startDate: '2026-12-09', endDate: '2026-12-22', pi: 'PI4_CY26' },
];

// Generate year options
const YEAR_OPTIONS = [2024, 2025, 2026];
const MONTH_OPTIONS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
  { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
  { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

// TCOE Portfolio → Product → Project mapping (hardcoded as per requirements)
const TCOE_PORTFOLIO_STRUCTURE: Record<string, { products: Record<string, { name: string; key: string }[]> }> = {
  'SERVICE': {
    products: {
      'CDK Service – Classic': [
        { name: 'DMS Agnostics', key: 'ADMSE' },
        { name: 'RO Service (ROS)', key: 'FXDOPSINSP' },
      ],
      'Tech Pic': [
        { name: 'Pick Mod', key: '' },
      ],
    }
  },
  'MODERN RETAIL': {
    products: {
      'CRM': [
        { name: 'Sales CRM', key: 'ELSCRM' },
        { name: 'Call Center', key: 'CCEL' },
        { name: 'Desking', key: 'DESKEL' },
        { name: 'Communications', key: 'ELCOMT' },
        { name: 'Retail Mobile', key: 'RM' },
        { name: 'Modern Retail Digital Retailing', key: 'MRDRT' },
        { name: 'Embedded Reporting', key: 'ELEMRS' },
        { name: 'Elead Sales Modernization', key: 'ELSMOD' },
      ],
      'CRM Marketing': [
        { name: 'Data Mining', key: 'ELDM' },
        { name: 'PoH Convertor eForms', key: 'MODTAO' },
      ],
      'CRM Forms': [
        { name: 'Modern Retail Forms', key: 'EFORMS' },
      ],
    }
  },
  'PARTS': {
    products: {
      'Parts (Modernized)': [
        { name: 'Parts Inventory', key: 'MPDS' },
        { name: 'Parts Master', key: 'MODPRT' },
        { name: 'Back Counter', key: 'FIX' },
        { name: 'Front Counter', key: 'FIX' },
        { name: 'Electronic Part Catalogue', key: 'FIX' },
      ],
    }
  },
  'SHARED SERVICES': {
    products: {
      'Vehicle Cloud': [
        { name: 'CDK Vehicle Cloud', key: '' },
      ],
      'Lot Merchandizer': [
        { name: 'Modernization Vehicle', key: 'MODVHCL' },
      ],
      'VIN Cleanse': [
        { name: 'CDS Convergence to MDM', key: '' },
      ],
      'Single Customer Identification': [
        { name: 'Single Customer Identification', key: '' },
      ],
    }
  },
  'DMS': {
    products: {
      'Drive OEM Integrations (Modern)': [
        { name: 'Modernization OEMi', key: '' },
      ],
    }
  },
  'DATA SOLUTIONS': {
    products: {
      'Modern APIs': [
        { name: 'APITRON - MBD Modernization for Data Your Way!', key: 'APITRON' },
      ],
      'Data Integration Platform': [
        { name: 'Data Integration Platform', key: '' },
      ],
      'CDK Intelligence Suite': [
        { name: 'Intelligence Suite (CDK IS)', key: 'NDP' },
        { name: 'Intelligence Suite (BYOD on IS)', key: 'SSBYOD' },
        { name: 'Yassi Integration', key: '' },
      ],
    }
  },
  'PAYMENTS': {
    products: {
      'CDK SimplePay': [
        { name: 'Payments', key: '' },
      ],
    }
  },
  'DATA PLATFORM': {
    products: {
      'Enterprise Data Pipeline (EDP)': [
        { name: 'EDP Integration', key: 'DNAST' },
      ],
    }
  },
};

// Build flat lists from TCOE structure
const buildTcoeOptions = (): { 
  portfolios: string[]; 
  allProjectKeys: string[]; 
  allProjectNames: string[]; 
  projectKeyToPortfolio: Record<string, string>;
  projectKeyToName: Record<string, string>;
} => {
  const portfolios = ['All', ...Object.keys(TCOE_PORTFOLIO_STRUCTURE)];
  const projectKeyToPortfolio: Record<string, string> = {};
  const projectKeyToName: Record<string, string> = {};
  const allProjectKeys: string[] = ['All'];
  const allProjectNames: string[] = ['All'];
  
  Object.entries(TCOE_PORTFOLIO_STRUCTURE).forEach(([portfolio, { products }]) => {
    Object.values(products).forEach(projects => {
      projects.forEach(({ name, key }) => {
        if (key && key !== '') {
          projectKeyToPortfolio[key] = portfolio;
          projectKeyToName[key] = name;
          if (!allProjectKeys.includes(key)) {
            allProjectKeys.push(key);
          }
          if (!allProjectNames.includes(name)) {
            allProjectNames.push(name);
          }
        }
      });
    });
  });
  
  return { portfolios, allProjectKeys, allProjectNames, projectKeyToPortfolio, projectKeyToName };
};

// Get project keys for specific portfolios
const getProjectKeysForPortfolios = (portfolios: string[]): string[] => {
  const keys: string[] = [];
  portfolios.forEach(portfolio => {
    const portfolioData = TCOE_PORTFOLIO_STRUCTURE[portfolio];
    if (portfolioData) {
      Object.values(portfolioData.products).forEach(projects => {
        projects.forEach(({ key }) => {
          if (key && key !== '' && !keys.includes(key)) {
            keys.push(key);
          }
        });
      });
    }
  });
  return keys;
};

const TCOE_OPTIONS = buildTcoeOptions();

export function DefectLeakageAnalyzer() {
  const { currentTheme, isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  // rows → table data (can be aggregated); rawRows → always project-level for graphs
  const [rows, setRows] = useState<Analysis[] | null>(null);
  const [rawRows, setRawRows] = useState<Analysis[] | null>(null);
  const [reportGenerationTime, setReportGenerationTime] = useState<number | null>(null);
  const [debugBreakdown, setDebugBreakdown] = useState<{
    projectKey: string;
    projectLabel: string;
    current: { bugs: number; defects: number; total: number };
    previous: { bugs: number; defects: number; total: number };
  }[] | null>(null);
  
  // TCOE dropdown options (using hardcoded TCOE structure)
  const [options, setOptions] = useState<DropdownOptions>({
    portfolios: TCOE_OPTIONS.portfolios,
    project_keys: TCOE_OPTIONS.allProjectKeys,
    project_names: TCOE_OPTIONS.allProjectNames,
    projectKeyToPortfolio: TCOE_OPTIONS.projectKeyToPortfolio,
  });
  
  // Selected filters – same pattern as KPI
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('All');
  const [selectedProjectKey, setSelectedProjectKey] = useState<string>('All');
  const [selectedProjectName, setSelectedProjectName] = useState<string>('All');
  
  // Multi-select for portfolios
  const [portfolioMultiSelectOpen, setPortfolioMultiSelectOpen] = useState(false);
  const [selectedPortfolios, setSelectedPortfolios] = useState<string[]>([]);
  const [tempSelectedPortfolios, setTempSelectedPortfolios] = useState<string[]>([]); // Temporary selections before Apply
  const [usePortfolioMultiSelect, setUsePortfolioMultiSelect] = useState(false);
  
  // Multi-select for project keys
  const [multiSelectOpen, setMultiSelectOpen] = useState(false);
  const [selectedProjectKeys, setSelectedProjectKeys] = useState<string[]>([]);
  const [tempSelectedProjectKeys, setTempSelectedProjectKeys] = useState<string[]>([]); // Temporary selections before Apply
  const [selectedProjectNames, setSelectedProjectNames] = useState<string[]>([]);
  const [useMultiSelect, setUseMultiSelect] = useState(false);
  
  // Aggregation setting (tables aggregated by portfolio by default; graphs use raw rows)
  const [aggregateByPortfolio, setAggregateByPortfolio] = useState(true);
  
  // Date filter mode and comparison
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('custom');
  const [enableComparison, setEnableComparison] = useState(false);
  
  // View mode toggle (table/graph) - per metric
  const [viewMode, setViewMode] = useState<Record<string, 'table' | 'graph'>>({});
  // Graph portfolio selection per metric (when multiple portfolios selected)
  const [graphPortfolioSelection, setGraphPortfolioSelection] = useState<Record<string, string>>({});
  
  // PI selection
  const [selectedPI, setSelectedPI] = useState<string>('PI3');
  const [comparisonPI, setComparisonPI] = useState<string>('PI2_CY25');
  
  // Sprint selection
  const [selectedSprint, setSelectedSprint] = useState<string>('All');
  const [comparisonSprint, setComparisonSprint] = useState<string>('All');
  
  // Month/Year selection
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [comparisonYear, setComparisonYear] = useState<number>(2025);
  const [comparisonMonth, setComparisonMonth] = useState<number>(new Date().getMonth());
  
  const defaultMetric = METRIC_OPTIONS.find(option => !option.disabled) || METRIC_OPTIONS[4]; // defect_leakage
  const [selectedMetric, setSelectedMetric] = useState<string>('defect_leakage');
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  
  // Multi-select for metrics
  const [metricMultiSelectOpen, setMetricMultiSelectOpen] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [tempSelectedMetrics, setTempSelectedMetrics] = useState<string[]>([]);
  const [useMetricMultiSelect, setUseMetricMultiSelect] = useState(false);
  
  // Calculate current week dates (Monday to Sunday)
  const getCurrentWeekDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return {
      currentFrom: monday.toISOString().split('T')[0],
      currentTo: sunday.toISOString().split('T')[0],
      previousFrom: new Date(monday.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      previousTo: new Date(sunday.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
  };
  
  const currentWeek = getCurrentWeekDates();
  
  // Date states - default to current week
  // Initialize dates based on default PI selection
  const defaultPI = PI_OPTIONS.find(p => p.value === 'PI3_CY25');
  const defaultComparisonPI = PI_OPTIONS.find(p => p.value === 'PI2_CY25');
  
  const [currentFrom, setCurrentFrom] = useState(defaultPI?.startDate || currentWeek.currentFrom);
  const [currentTo, setCurrentTo] = useState(defaultPI?.endDate || currentWeek.currentTo);
  const [previousFrom, setPreviousFrom] = useState(defaultComparisonPI?.startDate || currentWeek.previousFrom);
  const [previousTo, setPreviousTo] = useState(defaultComparisonPI?.endDate || currentWeek.previousTo);
  
  const [error, setError] = useState<string | null>(null);

  // Auto-apply portfolio selections when dropdown closes
  useEffect(() => {
    if (!portfolioMultiSelectOpen && tempSelectedPortfolios.length > 0) {
      // Dropdown closed - auto-apply the temporary selections if they changed
      const hasChanges = JSON.stringify(tempSelectedPortfolios.sort()) !== JSON.stringify(selectedPortfolios.sort());
      if (hasChanges) {
        setSelectedPortfolios([...tempSelectedPortfolios]);
        setUsePortfolioMultiSelect(true);
        setSelectedPortfolio('All');
      }
    }
  }, [portfolioMultiSelectOpen, tempSelectedPortfolios, selectedPortfolios]);

  // Auto-apply project key selections when dropdown closes
  useEffect(() => {
    if (!multiSelectOpen && tempSelectedProjectKeys.length > 0) {
      // Dropdown closed - auto-apply the temporary selections if they changed
      const hasChanges = JSON.stringify(tempSelectedProjectKeys.sort()) !== JSON.stringify(selectedProjectKeys.sort());
      if (hasChanges) {
        setSelectedProjectKeys([...tempSelectedProjectKeys]);
        setUseMultiSelect(true);
        setSelectedProjectKey('All');
        const tempNames = tempSelectedProjectKeys.map(key => findProjectNameForKey(key)).filter((name): name is string => name !== null);
        if (tempNames.length === 1) {
          setSelectedProjectName(tempNames[0]);
        } else if (tempNames.length > 1) {
          setSelectedProjectName('All');
        }
      }
    }
  }, [multiSelectOpen, tempSelectedProjectKeys, selectedProjectKeys]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        // Auto-apply before closing
        if (portfolioMultiSelectOpen && tempSelectedPortfolios.length > 0) {
          const hasChanges = JSON.stringify(tempSelectedPortfolios.sort()) !== JSON.stringify(selectedPortfolios.sort());
          if (hasChanges) {
            setSelectedPortfolios([...tempSelectedPortfolios]);
            setUsePortfolioMultiSelect(true);
            setSelectedPortfolio('All');
          }
        }
        if (multiSelectOpen && tempSelectedProjectKeys.length > 0) {
          const hasChanges = JSON.stringify(tempSelectedProjectKeys.sort()) !== JSON.stringify(selectedProjectKeys.sort());
          if (hasChanges) {
            setSelectedProjectKeys([...tempSelectedProjectKeys]);
            setUseMultiSelect(true);
            setSelectedProjectKey('All');
            const tempNames = tempSelectedProjectKeys.map(key => findProjectNameForKey(key)).filter((name): name is string => name !== null);
            if (tempNames.length === 1) {
              setSelectedProjectName(tempNames[0]);
            } else if (tempNames.length > 1) {
              setSelectedProjectName('All');
            }
          }
        }
        setPortfolioMultiSelectOpen(false);
        setMultiSelectOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [portfolioMultiSelectOpen, multiSelectOpen, tempSelectedPortfolios, tempSelectedProjectKeys, selectedPortfolios, selectedProjectKeys]);

  const activeMetricOption = METRIC_OPTIONS.find(option => option.value === selectedMetric) || defaultMetric;

  // Update dropdown options based on selected portfolio(s) - uses hardcoded TCOE structure
  const updateDropdownOptions = (portfolios?: string[]) => {
    if (!portfolios || portfolios.length === 0 || (portfolios.length === 1 && portfolios[0] === 'All')) {
      // Show all options
      setOptions({
        portfolios: TCOE_OPTIONS.portfolios,
        project_keys: TCOE_OPTIONS.allProjectKeys,
        project_names: TCOE_OPTIONS.allProjectNames,
        projectKeyToPortfolio: TCOE_OPTIONS.projectKeyToPortfolio,
      });
    } else {
      // Filter to selected portfolios only
      const filteredKeys = getProjectKeysForPortfolios(portfolios);
      const filteredNames = filteredKeys.map(key => TCOE_OPTIONS.projectKeyToName[key] || key);
      
      setOptions({
        portfolios: TCOE_OPTIONS.portfolios,
        project_keys: ['All', ...filteredKeys],
        project_names: ['All', ...filteredNames],
        projectKeyToPortfolio: TCOE_OPTIONS.projectKeyToPortfolio,
      });
    }
  };

  // Build portfolio mapping for SELECTED portfolios only - uses hardcoded TCOE structure
  const buildPortfolioMapping = (portfoliosToUse?: string[]): Record<string, string> => {
    // Use the hardcoded TCOE mapping
    const fullMapping = TCOE_OPTIONS.projectKeyToPortfolio;
    
    if (!portfoliosToUse || portfoliosToUse.length === 0) {
      console.log('📋 Using full TCOE portfolio mapping:', fullMapping);
      return fullMapping;
    }
    
    // Filter to only selected portfolios
    const filteredMapping: Record<string, string> = {};
    const portfoliosSet = new Set(portfoliosToUse.filter(p => p !== 'All'));
    
    Object.entries(fullMapping).forEach(([key, portfolio]) => {
      if (portfoliosSet.has(portfolio)) {
        filteredMapping[key] = portfolio;
      }
    });
    
    console.log('📋 Filtered TCOE portfolio mapping for', portfoliosToUse, ':', filteredMapping);
    return filteredMapping;
  };

  // Initialize options on mount (using hardcoded TCOE structure)
  useEffect(() => {
    updateDropdownOptions();
  }, []);

  // Handle sprint selection - update dates when sprint changes
  // Update dates when sprint is selected in sprint mode
  useEffect(() => {
    if (dateFilterMode === 'sprint' && selectedSprint !== 'All') {
      const sprint = SPRINT_OPTIONS.find(s => s.value === selectedSprint);
      if (sprint) {
        setCurrentFrom(sprint.startDate);
        setCurrentTo(sprint.endDate);
      }
    }
  }, [selectedSprint, dateFilterMode]);

  // Handle comparison sprint selection
  // Update comparison dates when comparison sprint is selected in sprint mode
  useEffect(() => {
    if (enableComparison && dateFilterMode === 'sprint' && comparisonSprint !== 'All') {
      const sprint = SPRINT_OPTIONS.find(s => s.value === comparisonSprint);
      if (sprint) {
        setPreviousFrom(sprint.startDate);
        setPreviousTo(sprint.endDate);
      }
    }
  }, [comparisonSprint, enableComparison, dateFilterMode]);

  // When portfolio changes, update project key options
  useEffect(() => {
    if (selectedPortfolios.length > 0) {
      updateDropdownOptions(selectedPortfolios);
    } else if (selectedPortfolio && selectedPortfolio !== 'All') {
      updateDropdownOptions([selectedPortfolio]);
    } else {
      updateDropdownOptions();
    }
    // Reset project filters on portfolio change
    setSelectedProjectKey('All');
    setSelectedProjectName('All');
    setSelectedProjectKeys([]);
    setSelectedProjectNames([]);
    setUseMultiSelect(false);
  }, [selectedPortfolio, selectedPortfolios]);

  // Helper: Find matching project name for a project key (uses hardcoded TCOE mapping)
  const findProjectNameForKey = (key: string): string | null => {
    if (!key || key === 'All') return null;
    
    // Direct lookup from TCOE mapping
    return TCOE_OPTIONS.projectKeyToName[key] || null;
  };

  // Helper: Find matching project names for multiple keys
  const findProjectNamesForKeys = (keys: string[]): string[] => {
    const names: string[] = [];
    keys.forEach(key => {
      const name = findProjectNameForKey(key);
      if (name && !names.includes(name)) {
        names.push(name);
      }
    });
    return names;
  };

  // Auto-select project name when project key changes
  useEffect(() => {
    if (selectedProjectKey && selectedProjectKey !== 'All' && !useMultiSelect) {
      const matchingName = findProjectNameForKey(selectedProjectKey);
      if (matchingName) {
        setSelectedProjectName(matchingName);
      } else {
        // If no match found, keep current selection or set to 'All'
        // Don't force a selection if we can't find a match
        if (selectedProjectName === 'All' || !options.project_names.includes(selectedProjectName)) {
          // Only reset if current selection doesn't make sense
        }
      }
    } else if (selectedProjectKey === 'All' && !useMultiSelect) {
      setSelectedProjectName('All');
    }
  }, [selectedProjectKey, options.project_names]);

  const handleMetricChange = (value: string) => {
    if (value === 'all') {
      setSelectedMetric('all');
      setUseMetricMultiSelect(false);
      setSelectedMetrics([]);
    } else {
      const option = METRIC_OPTIONS.find(item => item.value === value);
      if (option && !option.disabled) {
        setSelectedMetric(option.value);
        setUseMetricMultiSelect(false);
        setSelectedMetrics([]);
      }
    }
  };

  // Metric multi-select functions
  const toggleMetric = (metric: string) => {
    if (metric === 'all') return;
    setTempSelectedMetrics(prev => 
      prev.includes(metric) ? prev.filter(m => m !== metric) : [...prev, metric]
    );
  };

  const selectAllMetrics = () => {
    const allMetrics = METRIC_OPTIONS.filter(m => !m.disabled).map(m => m.value);
    setTempSelectedMetrics(allMetrics);
  };

  const clearMetricMultiSelect = () => {
    setTempSelectedMetrics([]);
  };

  const applyMetricMultiSelect = () => {
    if (tempSelectedMetrics.length > 0) {
      setSelectedMetrics([...tempSelectedMetrics]);
      setUseMetricMultiSelect(true);
      setSelectedMetric('all'); // Reset single select
    } else {
      setSelectedMetrics([]);
      setUseMetricMultiSelect(false);
    }
    setMetricMultiSelectOpen(false);
  };

  const cancelMetricMultiSelect = () => {
    setTempSelectedMetrics([...selectedMetrics]);
    setMetricMultiSelectOpen(false);
  };

  // Toggle project key in multi-select - work with temporary selections
  const toggleProjectKey = (key: string) => {
    if (key === 'All') return;
    setTempSelectedProjectKeys(prev => {
      return prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
    });
  };

  // Select all project keys - work with temporary selections
  const selectAllProjectKeys = () => {
    const allKeys = options.project_keys.filter(k => k !== 'All');
    setTempSelectedProjectKeys(allKeys);
  };

  // Clear multi-select - clear temporary selections
  const clearMultiSelect = () => {
    setTempSelectedProjectKeys([]);
  };

  // Apply multi-select - apply temporary selections
  const applyMultiSelect = () => {
    if (tempSelectedProjectKeys.length > 0) {
      setSelectedProjectKeys([...tempSelectedProjectKeys]); // Apply temporary selections
      setUseMultiSelect(true);
      setSelectedProjectKey('All'); // Reset single select
      // Set display project name based on multi-selection
      const tempNames = tempSelectedProjectKeys.map(key => findProjectNameForKey(key)).filter((name): name is string => name !== null);
      if (tempNames.length === 1) {
        setSelectedProjectName(tempNames[0]);
      } else if (tempNames.length > 1) {
        setSelectedProjectName('All'); // Show "All" when multiple selected
      }
    } else {
      // If no selections, clear everything
      setSelectedProjectKeys([]);
      setUseMultiSelect(false);
    }
    setMultiSelectOpen(false);
  };
  
  // Cancel multi-select - reset temporary selections to current applied
  const cancelMultiSelect = () => {
    setTempSelectedProjectKeys([...selectedProjectKeys]); // Reset to current applied selections
    setMultiSelectOpen(false);
  };

  // Portfolio multi-select functions - work with temporary selections
  const togglePortfolio = (portfolio: string) => {
    if (portfolio === 'All') return;
    setTempSelectedPortfolios(prev => 
      prev.includes(portfolio) ? prev.filter(p => p !== portfolio) : [...prev, portfolio]
    );
  };

  const selectAllPortfolios = () => {
    const allPortfolios = options.portfolios.filter(p => p !== 'All');
    setTempSelectedPortfolios(allPortfolios);
  };

  const clearPortfolioMultiSelect = () => {
    setTempSelectedPortfolios([]);
  };

  const applyPortfolioMultiSelect = () => {
    if (tempSelectedPortfolios.length > 0) {
      setSelectedPortfolios([...tempSelectedPortfolios]); // Apply temporary selections
      setUsePortfolioMultiSelect(true);
      setSelectedPortfolio('All');
    } else {
      // If no selections, clear everything
      setSelectedPortfolios([]);
      setUsePortfolioMultiSelect(false);
    }
    setPortfolioMultiSelectOpen(false);
  };
  
  // Cancel portfolio multi-select - reset temporary selections to current applied
  const cancelPortfolioMultiSelect = () => {
    setTempSelectedPortfolios([...selectedPortfolios]); // Reset to current applied selections
    setPortfolioMultiSelectOpen(false);
  };

  const analyzeLeakage = async () => {
    const startTime = Date.now();
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setRows(null);
    setRawRows(null);
    setDebugBreakdown(null);
    setReportGenerationTime(null);
    
    try {
      // STEP 1: Determine which portfolios to use for mapping
      let portfoliosForMapping: string[] = [];
      
      if (selectedPortfolios.length > 0) {
        // User selected specific portfolios via multi-select
        portfoliosForMapping = selectedPortfolios;
      } else if (selectedPortfolio && selectedPortfolio !== 'All') {
        // User selected a single portfolio
        portfoliosForMapping = [selectedPortfolio];
      }
      // If no portfolios selected (All), portfoliosForMapping stays empty and we'll use all
      
      // STEP 2: Get portfolio mapping from hardcoded TCOE structure
      console.log('📋 Getting portfolio mapping for:', portfoliosForMapping.length > 0 ? portfoliosForMapping : 'ALL');
      const portfolioMapping = buildPortfolioMapping(portfoliosForMapping.length > 0 ? portfoliosForMapping : undefined);
      console.log('📋 Portfolio mapping ready:', portfolioMapping);
      
      console.log('🔍 Analyzing defect leakage...', {
        portfolio: selectedPortfolio,
        portfolios_multi: selectedPortfolios,
        project_key: selectedProjectKey,
        project_name: selectedProjectName,
        multi_select: useMultiSelect,
        selected_keys: selectedProjectKeys,
        aggregate: aggregateByPortfolio,
        mapping: portfolioMapping,
      });

      // Determine which project keys to run
      let projectsToRun: string[] = [];
      
      if (useMultiSelect && selectedProjectKeys.length > 0) {
        // Use multi-selected keys
        projectsToRun = selectedProjectKeys;
      } else if (selectedProjectKey === 'All') {
        // Run for all project keys (excluding 'All' itself)
        projectsToRun = options.project_keys.filter(k => k && k !== 'All');
      } else if (selectedProjectKey && selectedProjectKey !== 'All') {
        // Single project key selected
        projectsToRun = [selectedProjectKey];
      }

      if (!projectsToRun.length) {
        setError('No project keys available for the selected filters.');
        setLoading(false);
        return;
      }

      // Helper to build payload - project key and metric are passed here
        const payload = (projectKey: string, metric: string) => {
          // All new metrics use period-based payload
          const periodBasedMetrics = ['regression_automation', 'overall_automation', 'test_coverage', 'test_story_ratio', 'bug_ratio', 'test_review_status'];
          
          if (periodBasedMetrics.includes(metric)) {
            // For period-based metrics, check if comparison is enabled
            if (enableComparison) {
              // Comparison mode - use period1 and period2
              return {
                portfolio: projectKey,
                period1_from: previousFrom,
                period1_to: previousTo,
                period2_from: currentFrom,
                period2_to: currentTo,
                enable_comparison: true,
                metric: metric
              };
            } else {
              // Single period mode - only use current period
              return {
                portfolio: projectKey,
                period_from: currentFrom,
                period_to: currentTo,
                enable_comparison: false,
                metric: metric
              };
            }
          } else {
            // For defect leakage, use current_week and previous_week
            return {
              portfolio: projectKey,
              current_week_from: currentFrom,
              current_week_to: currentTo,
              previous_week_from: previousFrom,
              previous_week_to: previousTo,
              metric: metric
            };
          }
        };

      // Determine which metrics to analyze
      let metricsToAnalyze: string[] = [];
      if (useMetricMultiSelect && selectedMetrics.length > 0) {
        metricsToAnalyze = selectedMetrics;
      } else if (selectedMetric === 'all') {
        // Get all enabled metrics
        metricsToAnalyze = METRIC_OPTIONS.filter(opt => !opt.disabled).map(opt => opt.value);
      } else {
        metricsToAnalyze = [selectedMetric];
      }

      // Helper function to analyze a single metric
      const analyzeSingleMetric = async (metric: string): Promise<Analysis[]> => {
        const metricOption = METRIC_OPTIONS.find(opt => opt.value === metric);
        const apiEndpoint = metric === 'regression_automation' 
          ? '/api/quality/regression-automation-analysis'
          : metric === 'overall_automation'
          ? '/api/quality/overall-automation-analysis'
          : metric === 'test_coverage'
          ? '/api/quality/test-coverage-analysis'
          : metric === 'test_story_ratio'
          ? '/api/quality/test-story-ratio-analysis'
          : metric === 'bug_ratio'
          ? '/api/quality/bug-ratio-analysis'
          : metric === 'test_review_status'
          ? '/api/quality/test-case-review-status-analysis'
          : '/api/quality/defect-leakage-analysis';

        if (projectsToRun.length > 1) {
          // Multi-project case - use background jobs so processing continues even if user navigates away
          const jobPromises = projectsToRun.map(async (pk) => {
            const requestPayload = payload(pk, metric);
            requestPayload.metric = metric; // Ensure metric is included
            
            // Start background job
            const jobResponse = await fetch(getApiUrl('/api/quality/tcoe-report-background'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestPayload)
            });
            
            if (!jobResponse.ok) {
              throw new Error(`Failed to start background job for ${pk}`);
            }
            
            const jobData = await jobResponse.json();
            const jobId = jobData.job_id;
            
            // Store job ID in localStorage for tracking across navigation
            localStorage.setItem(`tcoe_job_${jobId}`, JSON.stringify({
              job_id: jobId,
              status: 'pending',
              project_key: pk,
              metric: metric,
              created_at: new Date().toISOString()
            }));
            
            // Poll for job completion - this will continue even if component unmounts
            return new Promise<{ res: any; pk: string }>((resolve, reject) => {
              jobTracker.startJob(jobId, (status: any) => {
                if (status.status === 'completed' && status.result) {
                  resolve({ res: status.result, pk });
                } else if (status.status === 'failed') {
                  reject(new Error(status.error || 'Job failed'));
                }
              });
            });
          });
          
          const responses = await Promise.all(jobPromises);

          const builtRows: Analysis[] = responses
            .map(({ res, pk }) => ({ res, pk }))
            .filter(({ res }) => res?.success)
            .map(({ res, pk }) => {
              const projectName = options.project_names.find(n => n.includes(pk)) || pk;
              // Use the portfolioMapping we built at the start (guaranteed to be ready)
              const actualPortfolio = portfolioMapping[pk] || res.analysis?.portfolio || 'Unknown';
              console.log(`🔗 Project ${pk} → Portfolio: ${actualPortfolio}`);
              
              // Map period-based metrics response to Analysis format
              const periodBasedMetrics = ['regression_automation', 'overall_automation', 'test_coverage', 'test_story_ratio', 'bug_ratio', 'test_review_status'];
              if (periodBasedMetrics.includes(metric) && res.analysis) {
                console.log(`📊 ${metricOption?.label} Response for ${pk}:`, res.analysis);
                console.log(`📊 Period data:`, { period: res.analysis.period, period1: res.analysis.period1, period2: res.analysis.period2 });
                // Preserve all data from backend response, then add frontend-specific fields
                const mappedRow = {
                  ...res.analysis, // Spread all backend data first
                  portfolio: res.analysis.portfolio || pk,
                  project_key: pk,
                  project_label: projectName,
                  portfolio_display: actualPortfolio,
                  metric: metric,
                  metric_label: metricOption?.label || 'Metric',
                  // Ensure these fields are set (may already be in res.analysis)
                  total_regression_tests: res.analysis.total_regression_tests || res.analysis.total_test_cases || 0,
                  total_test_cases: res.analysis.total_test_cases || res.analysis.total_regression_tests || 0,
                  total_stories: res.analysis.total_stories || 0,
                  period1: res.analysis.period1, // Only present if comparison enabled
                  period2: res.analysis.period2, // Only present if comparison enabled
                  period: res.analysis.period, // Only present if single period mode
                  progress: res.analysis.progress, // Only present if comparison enabled
                  ai_analysis: res.analysis.ai_analysis || '',
                  ai_insights: res.analysis.ai_analysis || res.analysis.ai_insights || '',
                  generated_at: res.analysis.generated_at || new Date().toISOString(),
                  // Dummy fields for compatibility (only if not already present)
                  current_week: res.analysis.current_week || { bugs_count: 0, defects_count: 0, leakage_percentage: 0, total_issues: 0, date_range: '' },
                  previous_week: res.analysis.previous_week || { bugs_count: 0, defects_count: 0, leakage_percentage: 0, total_issues: 0, date_range: '' },
                  comparison: res.analysis.comparison || { leakage_change: 0, leakage_change_percentage: 0, bugs_change: 0, defects_change: 0, trend: 'stable', severity: 'normal' }
                } as Analysis;
                console.log(`📊 Mapped row for ${pk}:`, {
                  total_stories: mappedRow.total_stories,
                  period: mappedRow.period,
                  period1: mappedRow.period1,
                  period2: mappedRow.period2
                });
                console.log(`✅ Mapped row for ${pk}:`, {
                  total_regression_tests: mappedRow.total_regression_tests,
                  total_test_cases: mappedRow.total_test_cases,
                  period: mappedRow.period,
                  period1: mappedRow.period1,
                  period2: mappedRow.period2
                });
                return mappedRow;
              } else {
                return {
                  ...res.analysis,
                  project_key: pk,
                  project_label: projectName,
                  portfolio_display: actualPortfolio,
                  metric: metric,
                  metric_label: metricOption?.label || 'Defect Leakage Rate'
                } as Analysis;
              }
            });
          
          return builtRows;
        } else {
          // Single project key case
          const pk = projectsToRun[0];
          const response = await fetch(getApiUrl(apiEndpoint), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload(pk, metric))
          });
          const data = await response.json();
          if (data.success) {
            const projectName = options.project_names.find(n => n.includes(pk)) || pk;
            // Use the portfolioMapping we built at the start
            const actualPortfolio = portfolioMapping[pk] || data.analysis?.portfolio || 'Unknown';
            console.log(`🔗 Single project ${pk} → Portfolio: ${actualPortfolio}`);
            
            // Map period-based metrics response to Analysis format
            const periodBasedMetrics = ['regression_automation', 'overall_automation', 'test_coverage', 'test_story_ratio', 'bug_ratio', 'test_review_status'];
            if (periodBasedMetrics.includes(metric) && data.analysis) {
              console.log(`📊 Single ${metricOption?.label} Response for ${pk}:`, data.analysis);
              console.log(`📊 Period data:`, { period: data.analysis.period, period1: data.analysis.period1, period2: data.analysis.period2 });
              // Preserve all data from backend response, then add frontend-specific fields
              const mappedAnalysis = {
                ...data.analysis, // Spread all backend data first
                portfolio: data.analysis.portfolio || pk,
                project_key: pk,
                project_label: projectName,
                portfolio_display: actualPortfolio,
                metric: metric,
                metric_label: metricOption?.label || 'Metric',
                // Ensure these fields are set (may already be in data.analysis)
                total_regression_tests: data.analysis.total_regression_tests || data.analysis.total_test_cases || 0,
                total_test_cases: data.analysis.total_test_cases || data.analysis.total_regression_tests || 0,
                total_stories: data.analysis.total_stories || 0,
                period1: data.analysis.period1, // Only present if comparison enabled
                period2: data.analysis.period2, // Only present if comparison enabled
                period: data.analysis.period, // Only present if single period mode
                progress: data.analysis.progress, // Only present if comparison enabled
                ai_analysis: data.analysis.ai_analysis || '',
                ai_insights: data.analysis.ai_analysis || data.analysis.ai_insights || '',
                generated_at: data.analysis.generated_at || new Date().toISOString(),
                // Dummy fields for compatibility (only if not already present)
                current_week: data.analysis.current_week || { bugs_count: 0, defects_count: 0, leakage_percentage: 0, total_issues: 0, date_range: '' },
                previous_week: data.analysis.previous_week || { bugs_count: 0, defects_count: 0, leakage_percentage: 0, total_issues: 0, date_range: '' },
                comparison: data.analysis.comparison || { leakage_change: 0, leakage_change_percentage: 0, bugs_change: 0, defects_change: 0, trend: 'stable', severity: 'normal' }
              } as Analysis;
              console.log(`📊 Mapped analysis for ${pk}:`, {
                total_stories: mappedAnalysis.total_stories,
                period: mappedAnalysis.period,
                period1: mappedAnalysis.period1,
                period2: mappedAnalysis.period2
              });
              return [mappedAnalysis];
            } else {
              return [{
                ...data.analysis,
                project_key: pk,
                project_label: projectName,
                portfolio_display: actualPortfolio,
                metric: metric,
                metric_label: metricOption?.label || 'Defect Leakage Rate'
              } as Analysis];
            }
          } else {
            throw new Error(data.error || 'Analysis failed');
          }
        }
      };

      // Analyze all metrics
      const allResults: Analysis[] = [];
      for (const metric of metricsToAnalyze) {
        try {
          const metricResults = await analyzeSingleMetric(metric);
          allResults.push(...metricResults);
        } catch (error) {
          console.error(`❌ Failed to analyze metric ${metric}:`, error);
          // Continue with other metrics even if one fails
        }
      }

      if (allResults.length === 0) {
        setError('No results obtained for any metric.');
        setLoading(false);
        return;
      }

      // Use the results
      const builtRows = allResults;

      // Aggregation helper
      const aggregateRows = (rowsToAgg: Analysis[], portfolioName: string, projectKeys: string[]): Analysis => {
        const base: any = {
          portfolio: portfolioName,
          current_week: { bugs_count: 0, defects_count: 0, total_issues: 0, leakage_percentage: 0 },
          previous_week: { bugs_count: 0, defects_count: 0, total_issues: 0, leakage_percentage: 0 },
          comparison: { leakage_change: 0, leakage_change_percentage: 0, bugs_change: 0, defects_change: 0, trend: 'stable', severity: 'normal' },
          ai_insights: (rowsToAgg[0]?.ai_insights || ''),
          ai_metadata: rowsToAgg[0]?.ai_metadata,
          project_key: projectKeys.join(', '),
          project_label: `${rowsToAgg.length} projects combined`,
          portfolio_display: portfolioName,
          metric: rowsToAgg[0]?.metric,
          metric_label: rowsToAgg[0]?.metric_label
        };
        
        // Check metric type so we can aggregate correctly
        const metricKey = rowsToAgg[0]?.metric;
        const isAutomationMetric = metricKey === 'regression_automation' || metricKey === 'overall_automation';
        const isTestCoverageMetric = metricKey === 'test_coverage';
        const isTestStoryRatioMetric = metricKey === 'test_story_ratio';
        const isBugRatioMetric = metricKey === 'bug_ratio';
        const isTestReviewStatusMetric = metricKey === 'test_review_status';
        
        if (isAutomationMetric) {
          // Aggregate regression/overall automation fields
          base.total_regression_tests = 0;
          base.total_test_cases = 0;
          base.period = { from: '', to: '', automated_count: 0, manual_count: 0, automation_percentage: 0 };
          base.period1 = { from: '', to: '', automated_count: 0, manual_count: 0, automation_percentage: 0 };
          base.period2 = { from: '', to: '', automated_count: 0, manual_count: 0, automation_percentage: 0 };
          base.ai_analysis = '';
          base.ai_insights = '';
          
          // Combine AI analysis from all projects
          const aiAnalyses: string[] = [];
          
          rowsToAgg.forEach((row) => {
            // Sum total regression tests (for regression automation) or total test cases (for overall automation)
            base.total_regression_tests += row.total_regression_tests || row.total_test_cases || 0;
            base.total_test_cases += row.total_test_cases || row.total_regression_tests || 0;
            
            // Aggregate period data (single period mode)
            if (row.period) {
              base.period.automated_count += row.period.automated_count || 0;
              base.period.manual_count += row.period.manual_count || 0;
              if (!base.period.from) base.period.from = row.period.from || '';
              if (!base.period.to) base.period.to = row.period.to || '';
            }
            
            // Aggregate period1 data (comparison mode)
            if (row.period1) {
              base.period1.automated_count += row.period1.automated_count || 0;
              base.period1.manual_count += row.period1.manual_count || 0;
              if (!base.period1.from) base.period1.from = row.period1.from || '';
              if (!base.period1.to) base.period1.to = row.period1.to || '';
            }
            
            // Aggregate period2 data (comparison mode)
            if (row.period2) {
              base.period2.automated_count += row.period2.automated_count || 0;
              base.period2.manual_count += row.period2.manual_count || 0;
              if (!base.period2.from) base.period2.from = row.period2.from || '';
              if (!base.period2.to) base.period2.to = row.period2.to || '';
            }
            
            // Collect AI analyses
            if (row.ai_analysis) {
              aiAnalyses.push(row.ai_analysis);
            }
          });
          
          // Calculate aggregated percentages
          const totalCount = base.total_test_cases || base.total_regression_tests;
          if (totalCount > 0) {
            if (base.period.automated_count > 0 || base.period.manual_count > 0) {
              base.period.automation_percentage = (base.period.automated_count / totalCount) * 100;
            }
            if (base.period1.automated_count > 0 || base.period1.manual_count > 0) {
              base.period1.automation_percentage = (base.period1.automated_count / totalCount) * 100;
            }
            if (base.period2.automated_count > 0 || base.period2.manual_count > 0) {
              base.period2.automation_percentage = (base.period2.automated_count / totalCount) * 100;
            }
          }
          
          // Calculate progress (percentage change) for comparison mode
          if (!base.progress) {
            base.progress = { percentage_change: 0, new_automated_tests: 0, trend: 'stable' };
          }
          // Calculate percentage change if we have both periods
          if (base.period1 && base.period2 && 
              base.period1.automation_percentage !== undefined && 
              base.period2.automation_percentage !== undefined) {
            const p1Pct = base.period1.automation_percentage || 0;
            const p2Pct = base.period2.automation_percentage || 0;
            const deltaPct = p2Pct - p1Pct;
            base.progress.percentage_change = deltaPct;
            base.progress.new_automated_tests = (base.period2.automated_count || 0) - (base.period1.automated_count || 0);
            base.progress.trend = deltaPct > 0 ? 'improving' : deltaPct < 0 ? 'declining' : 'stable';
          }
          
          // Combine AI analyses
          base.ai_analysis = aiAnalyses.join('\n\n');
          base.ai_insights = base.ai_analysis;
          
          // Store individual project data for portfolio insights
          base._projectDetails = rowsToAgg.map(r => ({
            project_label: r.project_label || r.project_key || 'Unknown',
            project_key: r.project_key || '',
            period: r.period,
            period1: r.period1,
            period2: r.period2,
            total_regression_tests: r.total_regression_tests || r.total_test_cases || 0,
            total_test_cases: r.total_test_cases || r.total_regression_tests || 0
          }));
        } else {
          // New period-based metrics aggregation
          if (isTestCoverageMetric) {
            // Test Coverage: stories with tests / total stories
            base.total_stories = 0;
            base.period = { from: '', to: '', stories_with_tests: 0, stories_without_tests: 0, coverage_percentage: 0 };
            base.period1 = { from: '', to: '', stories_with_tests: 0, stories_without_tests: 0, coverage_percentage: 0 };
            base.period2 = { from: '', to: '', stories_with_tests: 0, stories_without_tests: 0, coverage_percentage: 0 };
            base.progress = { percentage_change: 0, new_stories_with_tests: 0, trend: 'stable' };
            const aiAnalyses: string[] = [];

            rowsToAgg.forEach((row) => {
              base.total_stories += row.total_stories || 0;

              if (row.period) {
                base.period.stories_with_tests += row.period.stories_with_tests || 0;
                base.period.stories_without_tests += row.period.stories_without_tests || 0;
                if (!base.period.from) base.period.from = row.period.from || '';
                if (!base.period.to) base.period.to = row.period.to || '';
              }

              if (row.period1) {
                base.period1.stories_with_tests += row.period1.stories_with_tests || 0;
                base.period1.stories_without_tests += row.period1.stories_without_tests || 0;
                if (!base.period1.from) base.period1.from = row.period1.from || '';
                if (!base.period1.to) base.period1.to = row.period1.to || '';
              }

              if (row.period2) {
                base.period2.stories_with_tests += row.period2.stories_with_tests || 0;
                base.period2.stories_without_tests += row.period2.stories_without_tests || 0;
                if (!base.period2.from) base.period2.from = row.period2.from || '';
                if (!base.period2.to) base.period2.to = row.period2.to || '';
              }

              if (row.progress) {
                base.progress.new_stories_with_tests += row.progress.new_stories_with_tests || 0;
              }

              if (row.ai_analysis) {
                aiAnalyses.push(row.ai_analysis);
              }
            });

            const totalStoriesCurrent = base.period.stories_with_tests + base.period.stories_without_tests || base.total_stories || 0;
            if (totalStoriesCurrent > 0) {
              base.period.coverage_percentage = (base.period.stories_with_tests / totalStoriesCurrent) * 100;
            }

            // For comparison mode, calculate percentages from aggregated totals
            const totalStoriesP1 = base.period1.stories_with_tests + base.period1.stories_without_tests || base.total_stories || 0;
            const totalStoriesP2 = base.period2.stories_with_tests + base.period2.stories_without_tests || base.total_stories || 0;
            const p1Pct = totalStoriesP1 > 0 ? (base.period1.stories_with_tests / totalStoriesP1) * 100 : 0;
            const p2Pct = totalStoriesP2 > 0 ? (base.period2.stories_with_tests / totalStoriesP2) * 100 : 0;
            if (totalStoriesP1 > 0 || totalStoriesP2 > 0) {
              base.period1.coverage_percentage = p1Pct;
              base.period2.coverage_percentage = p2Pct;
              const deltaPct = p2Pct - p1Pct;
              base.progress.percentage_change = deltaPct;
              base.progress.trend = deltaPct > 0 ? 'improving' : deltaPct < 0 ? 'declining' : 'stable';
            }

            base.ai_analysis = aiAnalyses.join('\n\n');
            base.ai_insights = base.ai_analysis;
          } else if (isTestStoryRatioMetric) {
            // Test to Story Ratio: test cases per story
            base.total_test_cases = 0;
            base.total_stories = 0;
            base.period = { from: '', to: '', total_test_cases: 0, total_stories: 0, ratio: 0 };
            base.period1 = { from: '', to: '', total_test_cases: 0, total_stories: 0, ratio: 0 };
            base.period2 = { from: '', to: '', total_test_cases: 0, total_stories: 0, ratio: 0 };
            base.progress = { ratio_change: 0, test_cases_change: 0, stories_change: 0, trend: 'stable' };
            const aiAnalyses: string[] = [];

            rowsToAgg.forEach((row) => {
              base.total_test_cases += row.total_test_cases || 0;
              base.total_stories += row.total_stories || 0;

              if (row.period) {
                base.period.total_test_cases += row.period.total_test_cases || 0;
                base.period.total_stories += row.period.total_stories || 0;
                if (!base.period.from) base.period.from = row.period.from || '';
                if (!base.period.to) base.period.to = row.period.to || '';
              }

              if (row.period1) {
                base.period1.total_test_cases += row.period1.total_test_cases || 0;
                base.period1.total_stories += row.period1.total_stories || 0;
                if (!base.period1.from) base.period1.from = row.period1.from || '';
                if (!base.period1.to) base.period1.to = row.period1.to || '';
              }

              if (row.period2) {
                base.period2.total_test_cases += row.period2.total_test_cases || 0;
                base.period2.total_stories += row.period2.total_stories || 0;
                if (!base.period2.from) base.period2.from = row.period2.from || '';
                if (!base.period2.to) base.period2.to = row.period2.to || '';
              }

              if (row.progress) {
                // Re‑use generic tests_change/stories_change fields for this metric
                base.progress.tests_change = (base.progress.tests_change || 0) + (row.progress.tests_change || 0);
                base.progress.stories_change = (base.progress.stories_change || 0) + (row.progress.stories_change || 0);
              }

              if (row.ai_analysis) {
                aiAnalyses.push(row.ai_analysis);
              }
            });

            const totalStoriesCurrent = base.period.total_stories || 0;
            if (totalStoriesCurrent > 0) {
              base.period.ratio = base.period.total_test_cases / totalStoriesCurrent;
            }

            const storiesP1 = base.period1.total_stories || 0;
            const storiesP2 = base.period2.total_stories || 0;
            const ratio1 = storiesP1 > 0 ? base.period1.total_test_cases / storiesP1 : 0;
            const ratio2 = storiesP2 > 0 ? base.period2.total_test_cases / storiesP2 : 0;
            if (storiesP1 > 0 || storiesP2 > 0) {
              base.period1.ratio = ratio1;
              base.period2.ratio = ratio2;
              const ratioDelta = ratio2 - ratio1;
              base.progress.ratio_change = ratioDelta;
              base.progress.trend = ratioDelta > 0 ? 'improving' : ratioDelta < 0 ? 'declining' : 'stable';
            }

            base.ai_analysis = aiAnalyses.join('\n\n');
            base.ai_insights = base.ai_analysis;
          } else if (isBugRatioMetric) {
            // Bug Discovery Ratio: bugs found per test executed
            base.period = { from: '', to: '', bugs_found: 0, test_cases_executed: 0, ratio: 0 };
            base.period1 = { from: '', to: '', bugs_found: 0, test_cases_executed: 0, ratio: 0 };
            base.period2 = { from: '', to: '', bugs_found: 0, test_cases_executed: 0, ratio: 0 };
            base.progress = { ratio_change: 0, bugs_change: 0, tests_change: 0, trend: 'stable' };
            const aiAnalyses: string[] = [];

            rowsToAgg.forEach((row) => {
              if (row.period) {
                base.period.bugs_found += row.period.bugs_found || 0;
                base.period.test_cases_executed += row.period.test_cases_executed || 0;
                if (!base.period.from) base.period.from = row.period.from || '';
                if (!base.period.to) base.period.to = row.period.to || '';
              }

              if (row.period1) {
                base.period1.bugs_found += row.period1.bugs_found || 0;
                base.period1.test_cases_executed += row.period1.test_cases_executed || 0;
                if (!base.period1.from) base.period1.from = row.period1.from || '';
                if (!base.period1.to) base.period1.to = row.period1.to || '';
              }

              if (row.period2) {
                base.period2.bugs_found += row.period2.bugs_found || 0;
                base.period2.test_cases_executed += row.period2.test_cases_executed || 0;
                if (!base.period2.from) base.period2.from = row.period2.from || '';
                if (!base.period2.to) base.period2.to = row.period2.to || '';
              }

              if (row.progress) {
                base.progress.bugs_change += row.progress.bugs_change || 0;
                base.progress.tests_change += row.progress.tests_change || 0;
              }

              if (row.ai_analysis) {
                aiAnalyses.push(row.ai_analysis);
              }
            });

            if (base.period.test_cases_executed > 0) {
              base.period.ratio = base.period.bugs_found / base.period.test_cases_executed;
            }

            const testsP1 = base.period1.test_cases_executed || 0;
            const testsP2 = base.period2.test_cases_executed || 0;
            const ratio1 = testsP1 > 0 ? base.period1.bugs_found / testsP1 : 0;
            const ratio2 = testsP2 > 0 ? base.period2.bugs_found / testsP2 : 0;
            if (testsP1 > 0 || testsP2 > 0) {
              base.period1.ratio = ratio1;
              base.period2.ratio = ratio2;
              const ratioDelta = ratio2 - ratio1;
              base.progress.ratio_change = ratioDelta;
              // Note: lower ratio is better for bug discovery metric
              base.progress.trend = ratioDelta < 0 ? 'improving' : ratioDelta > 0 ? 'declining' : 'stable';
            }

            base.ai_analysis = aiAnalyses.join('\n\n');
            base.ai_insights = base.ai_analysis;
          } else if (isTestReviewStatusMetric) {
            // Test Case Review Status: reviewed_yes / total stories
            base.total_stories = 0;
            base.period = { from: '', to: '', reviewed_yes: 0, reviewed_no: 0, not_set: 0, review_percentage: 0 };
            base.period1 = { from: '', to: '', reviewed_yes: 0, reviewed_no: 0, not_set: 0, review_percentage: 0 };
            base.period2 = { from: '', to: '', reviewed_yes: 0, reviewed_no: 0, not_set: 0, review_percentage: 0 };
            base.progress = { percentage_change: 0, new_reviewed: 0, trend: 'stable' };
            const aiAnalyses: string[] = [];

            rowsToAgg.forEach((row) => {
              base.total_stories += row.total_stories || 0;

              if (row.period) {
                base.period.reviewed_yes += row.period.reviewed_yes || 0;
                base.period.reviewed_no += row.period.reviewed_no || 0;
                base.period.not_set += row.period.not_set || 0;
                if (!base.period.from) base.period.from = row.period.from || '';
                if (!base.period.to) base.period.to = row.period.to || '';
              }

              if (row.period1) {
                base.period1.reviewed_yes += row.period1.reviewed_yes || 0;
                base.period1.reviewed_no += row.period1.reviewed_no || 0;
                base.period1.not_set += row.period1.not_set || 0;
                if (!base.period1.from) base.period1.from = row.period1.from || '';
                if (!base.period1.to) base.period1.to = row.period1.to || '';
              }

              if (row.period2) {
                base.period2.reviewed_yes += row.period2.reviewed_yes || 0;
                base.period2.reviewed_no += row.period2.reviewed_no || 0;
                base.period2.not_set += row.period2.not_set || 0;
                if (!base.period2.from) base.period2.from = row.period2.from || '';
                if (!base.period2.to) base.period2.to = row.period2.to || '';
              }

              if (row.progress) {
                base.progress.new_reviewed += row.progress.new_reviewed || 0;
              }

              if (row.ai_analysis) {
                aiAnalyses.push(row.ai_analysis);
              }
            });

            const totalStoriesCurrent = base.period.reviewed_yes + base.period.reviewed_no + base.period.not_set || base.total_stories || 0;
            if (totalStoriesCurrent > 0) {
              base.period.review_percentage = (base.period.reviewed_yes / totalStoriesCurrent) * 100;
            }

            // For comparison mode, calculate percentages from aggregated totals
            const totalStoriesP1 = base.period1.reviewed_yes + base.period1.reviewed_no + base.period1.not_set || base.total_stories || 0;
            const totalStoriesP2 = base.period2.reviewed_yes + base.period2.reviewed_no + base.period2.not_set || base.total_stories || 0;
            const p1Pct = totalStoriesP1 > 0 ? (base.period1.reviewed_yes / totalStoriesP1) * 100 : 0;
            const p2Pct = totalStoriesP2 > 0 ? (base.period2.reviewed_yes / totalStoriesP2) * 100 : 0;
            if (totalStoriesP1 > 0 || totalStoriesP2 > 0) {
              base.period1.review_percentage = p1Pct;
              base.period2.review_percentage = p2Pct;
              const deltaPct = p2Pct - p1Pct;
              base.progress.percentage_change = deltaPct;
              base.progress.trend = deltaPct > 0 ? 'improving' : deltaPct < 0 ? 'declining' : 'stable';
            }

            base.ai_analysis = aiAnalyses.join('\n\n');
            base.ai_insights = base.ai_analysis;
        } else {
          // Original defect leakage aggregation
          rowsToAgg.forEach((row) => {
            base.current_week.bugs_count += row.current_week.bugs_count || 0;
            base.current_week.defects_count += row.current_week.defects_count || 0;
            base.current_week.total_issues += row.current_week.total_issues || 0;
            base.previous_week.bugs_count += row.previous_week.bugs_count || 0;
            base.previous_week.defects_count += row.previous_week.defects_count || 0;
            base.previous_week.total_issues += row.previous_week.total_issues || 0;
          });
          const currTotal = base.current_week.bugs_count + base.current_week.defects_count;
          const prevTotal = base.previous_week.bugs_count + base.previous_week.defects_count;
          const currLeak = currTotal > 0 ? (base.current_week.defects_count / currTotal) * 100 : 0;
          const prevLeak = prevTotal > 0 ? (base.previous_week.defects_count / prevTotal) * 100 : 0;
          base.current_week.leakage_percentage = Number(currLeak.toFixed(1));
          base.previous_week.leakage_percentage = Number(prevLeak.toFixed(1));
          const delta = Number((currLeak - prevLeak).toFixed(1));
          base.comparison.leakage_change = delta;
          base.comparison.leakage_change_percentage = Number((prevLeak ? (delta / prevLeak) * 100 : 0).toFixed(1));
          base.comparison.bugs_change = base.current_week.bugs_count - base.previous_week.bugs_count;
          base.comparison.defects_change = base.current_week.defects_count - base.previous_week.defects_count;
          base.comparison.trend = delta > 2 ? 'worsening' : delta < -2 ? 'improving' : 'stable';
          base.comparison.severity = (currLeak > 50 || delta > 15) ? 'critical' : (currLeak > 40 || delta > 10) ? 'warning' : (currLeak > 30 || delta > 5) ? 'attention' : 'normal';
          }
        }
        
        return base as Analysis;
      };

      // Build debug breakdown (only for defect leakage metrics)
      const defectLeakageRows = builtRows.filter(r => r.metric === 'defect_leakage');
      if (defectLeakageRows.length > 0) {
        const breakdown = defectLeakageRows.map(r => ({
          projectKey: r.project_key || '',
          projectLabel: r.project_label || (r.project_key || ''),
          current: {
            bugs: r.current_week.bugs_count || 0,
            defects: r.current_week.defects_count || 0,
            total: (r.current_week.bugs_count || 0) + (r.current_week.defects_count || 0)
          },
          previous: {
            bugs: r.previous_week.bugs_count || 0,
            defects: r.previous_week.defects_count || 0,
            total: (r.previous_week.bugs_count || 0) + (r.previous_week.defects_count || 0)
          }
        }));
        setDebugBreakdown(breakdown);
      }

      // Handle results display
      if (selectedMetric === 'all' || projectsToRun.length > 1 || builtRows.length > 1) {
        // Show individual rows for each project/metric combination
        // Aggregate by portfolio if needed
        if (aggregateByPortfolio && builtRows.length > 0) {
          console.log('📊 Aggregating by portfolio...');
          
          // Group by portfolio and metric
          const portfolioGroups: Record<string, Analysis[]> = {};
          builtRows.forEach(row => {
            const portfolio = row.portfolio_display || row.portfolio || 'Unknown';
            const key = `${portfolio}_${row.metric}`;
            console.log(`  → Grouping ${row.project_key} under "${portfolio}" for metric "${row.metric}"`);
            if (!portfolioGroups[key]) {
              portfolioGroups[key] = [];
            }
            portfolioGroups[key].push(row);
          });

          console.log('📊 Portfolio groups:', Object.keys(portfolioGroups));

          // Create aggregated rows - one per portfolio/metric combination
          const aggregatedRows: Analysis[] = [];
          
          // Process each portfolio/metric group (using for...of to support await)
          for (const [key, portfolioRows] of Object.entries(portfolioGroups)) {
            // Get portfolio name and metric directly from row data (not from parsing key)
            // This is necessary because metric names can contain underscores (e.g., "overall_automation")
            const portfolioName = portfolioRows[0]?.portfolio_display || portfolioRows[0]?.portfolio || 'Unknown';
            const metricKey = portfolioRows[0]?.metric || '';
            const projectKeys = portfolioRows.map(r => r.project_key || '').filter(Boolean);
            console.log(`📊 Processing "${portfolioName}" with ${portfolioRows.length} projects for metric "${metricKey}"`);
            
            let portfolioLevelAnalysisUsed = false;
            
            // If portfolio has 2+ projects, get portfolio-level analysis from backend
            if (portfolioRows.length >= 2) {
              const periodBasedMetrics = ['regression_automation', 'overall_automation', 'test_coverage', 'test_story_ratio', 'bug_ratio', 'test_review_status'];
              
              if (periodBasedMetrics.includes(metricKey)) {
                try {
                  // Prepare project_metrics for backend
                  const projectMetrics = portfolioRows.map(row => ({
                    project_key: row.project_key,
                    project_name: row.project_label || row.project_key,
                    total_test_cases: row.total_test_cases || row.total_regression_tests || 0,
                    total_regression_tests: row.total_regression_tests || row.total_test_cases || 0,
                    total_stories: row.total_stories || 0,
                    automation_percentage: enableComparison 
                      ? (row.period2?.automation_percentage || row.period?.automation_percentage || 0)
                      : (row.period?.automation_percentage || 0),
                    period1_percentage: row.period1?.automation_percentage || row.period1?.coverage_percentage || 0,
                    period2_percentage: row.period2?.automation_percentage || row.period2?.coverage_percentage || row.period?.automation_percentage || row.period?.coverage_percentage || 0,
                    period: row.period,
                    period1: row.period1,
                    period2: row.period2
                  }));
                  
                  // Determine API endpoint
                  const apiEndpoint = metricKey === 'regression_automation' 
                    ? '/api/quality/regression-automation-analysis'
                    : metricKey === 'overall_automation'
                    ? '/api/quality/overall-automation-analysis'
                    : metricKey === 'test_coverage'
                    ? '/api/quality/test-coverage-analysis'
                    : metricKey === 'test_story_ratio'
                    ? '/api/quality/test-story-ratio-analysis'
                    : metricKey === 'bug_ratio'
                    ? '/api/quality/bug-ratio-analysis'
                    : metricKey === 'test_review_status'
                    ? '/api/quality/test-case-review-status-analysis'
                    : null;
                  
                  if (apiEndpoint) {
                    // Use portfolio display name (e.g., "Data Solutions") for the API call
                    // The backend will resolve this to the correct project key
                    const portfolioForApi = portfolioName; // Use the portfolio display name
                    
                    // Prepare payload with project_metrics
                    const portfolioPayload = enableComparison ? {
                      portfolio: portfolioForApi,
                      period1_from: previousFrom,
                      period1_to: previousTo,
                      period2_from: currentFrom,
                      period2_to: currentTo,
                      enable_comparison: true,
                      project_metrics: projectMetrics
                    } : {
                      portfolio: portfolioForApi,
                      period_from: currentFrom,
                      period_to: currentTo,
                      enable_comparison: false,
                      project_metrics: projectMetrics
                    };
                    
                    console.log(`📊 Requesting portfolio-level analysis for "${portfolioName}" (${portfolioForApi}) with ${projectMetrics.length} projects`);
                    console.log(`📊 Payload:`, JSON.stringify(portfolioPayload, null, 2));
                    
                    try {
                      const portfolioResponse = await fetch(getApiUrl(apiEndpoint), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(portfolioPayload)
                      });
                      
                      if (!portfolioResponse.ok) {
                        const errorText = await portfolioResponse.text();
                        throw new Error(`API returned ${portfolioResponse.status}: ${portfolioResponse.statusText}. Response: ${errorText}`);
                      }
                      
                      const portfolioData = await portfolioResponse.json();
                      console.log(`📊 Portfolio API response for ${portfolioName}:`, portfolioData);
                    
                      if (portfolioData.success && portfolioData.analysis) {
                        // Build aggregated row from portfolio-level response (don't use aggregateRows which joins individual analyses)
                        const portfolioAnalysis = portfolioData.analysis;
                        const aggregatedRow: Analysis = {
                          ...portfolioAnalysis,
                          portfolio: portfolioName,
                          portfolio_display: portfolioName,
                          project_key: projectKeys.join(', '),
                          project_label: `${portfolioRows.length} projects combined`,
                          metric: metricKey,
                          metric_label: portfolioRows[0]?.metric_label || '',
                          // Use portfolio-level AI analysis (not individual project analyses)
                          ai_analysis: portfolioAnalysis.ai_analysis || '',
                          ai_insights: portfolioAnalysis.ai_analysis || '',
                          // Preserve period data from portfolio response
                          total_test_cases: portfolioAnalysis.total_test_cases || 0,
                          total_regression_tests: portfolioAnalysis.total_regression_tests || portfolioAnalysis.total_test_cases || 0,
                          total_stories: portfolioAnalysis.total_stories || 0,
                          period: portfolioAnalysis.period,
                          period1: portfolioAnalysis.period1,
                          period2: portfolioAnalysis.period2,
                          progress: portfolioAnalysis.progress,
                          // Dummy fields for compatibility
                          current_week: { bugs_count: 0, defects_count: 0, leakage_percentage: 0, total_issues: 0, date_range: '' },
                          previous_week: { bugs_count: 0, defects_count: 0, leakage_percentage: 0, total_issues: 0, date_range: '' },
                          comparison: { leakage_change: 0, leakage_change_percentage: 0, bugs_change: 0, defects_change: 0, trend: 'stable', severity: 'normal' }
                        } as Analysis;
                        
                        aggregatedRows.push(aggregatedRow);
                        portfolioLevelAnalysisUsed = true;
                        console.log(`✅ Got portfolio-level analysis for ${portfolioName}:`, portfolioAnalysis.ai_analysis?.substring(0, 100));
                      } else {
                        console.warn(`⚠️ Portfolio-level analysis failed or not returned for ${portfolioName}. Response:`, portfolioData);
                      }
                    } catch (error) {
                      console.error(`❌ Failed to get portfolio-level analysis for ${portfolioName}:`, error);
                      // Will fall back to frontend aggregation below
                    }
                  }
                } catch (error) {
                  console.error(`❌ Error in portfolio-level analysis logic for ${portfolioName}:`, error);
                  // Fall back to frontend aggregation
                }
              } else if (metricKey === 'defect_leakage') {
                // Handle defect_leakage with portfolio-level backend analysis
                try {
                  // Prepare project_metrics for defect leakage (uses current_week and previous_week)
                  const projectMetrics = portfolioRows.map(row => ({
                    project_key: row.project_key,
                    project_name: row.project_label || row.project_key,
                    current_week: row.current_week || { bugs_count: 0, defects_count: 0, leakage_percentage: 0, total_issues: 0, date_range: '' },
                    previous_week: row.previous_week || { bugs_count: 0, defects_count: 0, leakage_percentage: 0, total_issues: 0, date_range: '' }
                  }));
                  
                  const apiEndpoint = '/api/quality/defect-leakage-analysis';
                  const portfolioForApi = portfolioName; // Use the portfolio display name
                  
                  // Prepare payload with project_metrics (defect leakage uses current_week/previous_week structure)
                  const portfolioPayload = {
                    portfolio: portfolioForApi,
                    current_week_from: currentFrom,
                    current_week_to: currentTo,
                    previous_week_from: previousFrom,
                    previous_week_to: previousTo,
                    metric: 'defect_leakage',
                    project_metrics: projectMetrics
                  };
                  
                  console.log(`📊 Requesting portfolio-level defect leakage analysis for "${portfolioName}" (${portfolioForApi}) with ${projectMetrics.length} projects`);
                  console.log(`📊 Payload:`, JSON.stringify(portfolioPayload, null, 2));
                  
                  try {
                    const portfolioResponse = await fetch(getApiUrl(apiEndpoint), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(portfolioPayload)
                    });
                    
                    if (!portfolioResponse.ok) {
                      const errorText = await portfolioResponse.text();
                      throw new Error(`API returned ${portfolioResponse.status}: ${portfolioResponse.statusText}. Response: ${errorText}`);
                    }
                    
                    const portfolioData = await portfolioResponse.json();
                    console.log(`📊 Portfolio API response for ${portfolioName}:`, portfolioData);
                  
                    if (portfolioData.success && portfolioData.analysis) {
                      // Build aggregated row from portfolio-level response
                      const portfolioAnalysis = portfolioData.analysis;
                      const aggregatedRow: Analysis = {
                        ...portfolioAnalysis,
                        portfolio: portfolioName,
                        portfolio_display: portfolioName,
                        project_key: projectKeys.join(', '),
                        project_label: `${portfolioRows.length} projects combined`,
                        metric: 'defect_leakage',
                        metric_label: portfolioRows[0]?.metric_label || 'Defect Leakage Rate',
                        // Use portfolio-level AI analysis
                        ai_analysis: portfolioAnalysis.ai_analysis || '',
                        ai_insights: portfolioAnalysis.ai_analysis || portfolioAnalysis.ai_insights || '',
                        // Preserve defect leakage data from portfolio response
                        current_week: portfolioAnalysis.current_week || { bugs_count: 0, defects_count: 0, leakage_percentage: 0, total_issues: 0, date_range: '' },
                        previous_week: portfolioAnalysis.previous_week || { bugs_count: 0, defects_count: 0, leakage_percentage: 0, total_issues: 0, date_range: '' },
                        comparison: portfolioAnalysis.comparison || { leakage_change: 0, leakage_change_percentage: 0, bugs_change: 0, defects_change: 0, trend: 'stable', severity: 'normal' },
                        // Dummy fields for compatibility with period-based metrics
                        total_test_cases: 0,
                        total_regression_tests: 0,
                        total_stories: 0
                      } as Analysis;
                      
                      aggregatedRows.push(aggregatedRow);
                      portfolioLevelAnalysisUsed = true;
                      console.log(`✅ Got portfolio-level defect leakage analysis for ${portfolioName}:`, portfolioAnalysis.ai_analysis?.substring(0, 100));
                    } else {
                      console.warn(`⚠️ Portfolio-level defect leakage analysis failed or not returned for ${portfolioName}. Response:`, portfolioData);
                    }
                  } catch (error) {
                    console.error(`❌ Failed to get portfolio-level defect leakage analysis for ${portfolioName}:`, error);
                    // Will fall back to frontend aggregation below
                  }
                } catch (error) {
                  console.error(`❌ Error in portfolio-level defect leakage analysis logic for ${portfolioName}:`, error);
                  // Fall back to frontend aggregation
                }
              }
            }
            
            // Fallback: Use frontend aggregation (for single project, non-period-based metrics, or if portfolio-level API call failed)
            if (!portfolioLevelAnalysisUsed) {
              console.log(`📊 Creating aggregated row for "${portfolioName}" with keys: ${projectKeys.join(', ')} (using frontend aggregation)`);
            aggregatedRows.push(aggregateRows(portfolioRows, portfolioName, projectKeys));
            }
          }

          console.log(`📊 Final output: ${aggregatedRows.length} rows`);
          setRows(aggregatedRows);
          setRawRows(builtRows);
        } else {
          // Show individual rows for each project/metric
          setRows(builtRows);
          setRawRows(builtRows);
        }
      } else {
        // Single result - set as analysis
        if (builtRows.length === 1) {
          setAnalysis(builtRows[0]);
          setRawRows(builtRows);
        } else if (builtRows.length > 1) {
          setRows(builtRows);
          setRawRows(builtRows);
        } else {
          setError('No results obtained.');
        }
      }
      
      // Calculate and set report generation time (in seconds with full precision)
      const endTime = Date.now();
      const elapsedTime = (endTime - startTime) / 1000;
      setReportGenerationTime(elapsedTime);
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // PDF Export Formatting Helpers
  const formatNumber = (value?: number | null): string => {
    if (value === undefined || value === null || Number.isNaN(value)) return '0';
    return Math.round(value).toString();
  };

  const formatPercentage = (value?: number | null): string => {
    if (value === undefined || value === null || Number.isNaN(value)) return '0.0%';
    return `${Number(value).toFixed(1)}%`;
  };

  const formatRatio = (value?: number | null, decimals: number = 4): string => {
    if (value === undefined || value === null || Number.isNaN(value)) return '0.0000';
    return Number(value).toFixed(decimals);
  };

  const formatChange = (value?: number) => {
    if (value === undefined || value === null || Number.isNaN(value)) return '0.0%';
    const formatted = Number(value).toFixed(1);
    return `${value > 0 ? '+' : ''}${formatted}%`;
  };

  // Get metric title for PDF (enterprise terminology)
  const getMetricTitleForPDF = (metricKey: string): string => {
    const titles: Record<string, string> = {
      'overall_automation': 'Automation Coverage (Overall)',
      'regression_automation': 'Regression Automation Coverage',
      'test_coverage': 'Functional Test Coverage',
      'bug_ratio': 'Bug Discovery Effectiveness',
      'defect_leakage': 'Defect Leakage Overview',
      'test_story_ratio': 'Test-to-Story Completeness',
      'test_review_status': 'Test Case Review Compliance'
    };
    return titles[metricKey] || metricKey;
  };

  const createBadgeStyle = (baseColor: string) => ({
    backgroundColor: `${baseColor}20`,
    color: baseColor,
    fontWeight: 600,
    borderRadius: '9999px',
    padding: '4px 12px',
    display: 'inline-block'
  });

  const getLeakageStyle = (value: number) => {
    if (value >= 60) return createBadgeStyle(currentTheme.colors.error);
    if (value >= 40) return createBadgeStyle(currentTheme.colors.warning);
    return createBadgeStyle(currentTheme.colors.success);
  };

  const getWoWStyle = (value: number) => {
    if (value > 0.1) return createBadgeStyle(currentTheme.colors.error);
    if (value < -0.1) return createBadgeStyle(currentTheme.colors.success);
    return createBadgeStyle(currentTheme.colors.info);
  };

  const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

  const buildProjection = (prev: number, curr: number) => {
    const delta = (curr || 0) - (prev || 0);
    const projected = clamp((curr || 0) + delta);
    const volatility = Math.abs(delta);
    const confidence = volatility < 5 ? 'high' : volatility < 12 ? 'medium' : 'low';
    return { projected, confidence };
  };

  const buildSeverity = (curr: number, delta: number) => {
    if (curr > 50 || delta > 15) return 'Critical';
    if (curr > 40 || delta > 10) return 'Warning';
    if (curr > 30 || delta > 5) return 'Attention';
    return 'Normal';
  };

  // Generate professional AI-style comment with analysis and recommendations
  const buildCommentText = (row: Analysis, _metricLabel: string): string => {
    const prevLeak = Number(row.previous_week.leakage_percentage ?? 0);
    const currLeak = Number(row.current_week.leakage_percentage ?? 0);
    const delta = enableComparison ? Number(row.comparison.leakage_change ?? (currLeak - prevLeak)) : 0;
    const absDelta = Math.abs(delta);
    const defects = row.current_week.defects_count ?? 0;
    const bugs = row.current_week.bugs_count ?? 0;
    const total = bugs + defects;
    
    let analysis = '';
    let recommendation = '';
    
    // Single analysis mode (no comparison)
    if (!enableComparison) {
      if (currLeak === 0) {
        analysis = `Achieved 0% defect leakage with ${bugs} bugs caught in lower environments and no production defects.`;
        recommendation = `Excellent quality! Continue current testing practices.`;
      } else if (currLeak <= 10) {
        analysis = `Maintained healthy defect leakage at ${currLeak.toFixed(1)}% with ${defects} defects from ${total} total issues.`;
        recommendation = `Good performance. Focus on automation to maintain quality.`;
      } else if (currLeak <= 25) {
        analysis = `Defect leakage at ${currLeak.toFixed(1)}% - ${defects} production defects detected from ${total} issues.`;
        recommendation = `Review test coverage for high-risk areas. Consider adding more integration tests.`;
      } else if (currLeak <= 40) {
        analysis = `Elevated defect leakage at ${currLeak.toFixed(1)}% with ${defects} escaped defects requiring attention.`;
        recommendation = `Conduct RCA on escaped defects. Strengthen pre-release validation.`;
      } else {
        analysis = `Critical defect leakage at ${currLeak.toFixed(1)}% - ${defects} defects escaped to production.`;
        recommendation = `Immediate action required: Review testing process, add gate checks, and improve test coverage.`;
      }
    } 
    // Comparison mode
    else {
      if (currLeak === 0 && prevLeak === 0) {
        analysis = `Maintained 0% defect leakage across periods, demonstrating strong quality practices.`;
        recommendation = `Continue current testing strategies.`;
      } else if (delta < -10) {
        analysis = `Achieved significant ${absDelta.toFixed(0)}% reduction in defect leakage (${prevLeak.toFixed(0)}% to ${currLeak.toFixed(0)}%).`;
        recommendation = `Share learnings with other teams.`;
      } else if (delta < -5) {
        analysis = `Saw healthy ${absDelta.toFixed(0)}% dip in defect leakage.`;
        recommendation = `Keep momentum with test automation.`;
      } else if (delta < 0) {
        analysis = `Showed improvement with leakage down ${absDelta.toFixed(1)}%.`;
        recommendation = `Focus on regression coverage.`;
      } else if (delta > 15) {
        analysis = `Concerning ${absDelta.toFixed(0)}% spike with ${defects} production defects.`;
        recommendation = `Conduct RCA, strengthen pre-release gates.`;
      } else if (delta > 5) {
        analysis = `Elevated leakage at ${currLeak.toFixed(0)}% (up ${absDelta.toFixed(0)}%).`;
        recommendation = `Review failure patterns, add smoke tests.`;
      } else if (delta > 0) {
        analysis = `Slight ${absDelta.toFixed(1)}% increase in defect leakage.`;
        recommendation = `Monitor closely next sprint.`;
      } else {
        analysis = `Stable defect leakage at ${currLeak.toFixed(0)}%.`;
        recommendation = `Focus on incremental improvements.`;
      }
    }
    
    // Check if we have meaningful AI insights from the backend
    const aiSummary = (row.ai_insights || '').split('\n').map(s => s.trim()).filter(Boolean)[0];
    if (aiSummary && aiSummary.length > 20 && !aiSummary.includes('Summary not available')) {
      return aiSummary + ` Recommendation: ${recommendation}`;
    }
    
    return `${analysis} Recommendation: ${recommendation}`;
  };
  
  // Generate unique AI analysis for Grand Total based on aggregated data
  const generateGrandTotalAnalysis = (
    totalTests: number,
    periodAutomated: number,
    periodManual: number,
    periodPercentage: number,
    period1Automated?: number,
    period1Manual?: number,
    period1Percentage?: number,
    period2Automated?: number,
    period2Manual?: number,
    period2Percentage?: number,
    periodTo?: string,
    metricType?: string
  ): string => {
    const isRegression = metricType === 'regression_automation';
    const metricLabel = isRegression ? 'Regression automation' : 'Overall automation';
    const testLabel = isRegression ? 'regression tests' : 'test cases';
    
    if (enableComparison && period1Automated !== undefined && period2Automated !== undefined) {
      // Comparison mode - AI-style natural analysis
      const percentageChange = (period2Percentage || 0) - (period1Percentage || 0);
      const newAutomated = period2Automated - period1Automated;
      const absChange = Math.abs(percentageChange);
      
      if (percentageChange > 5) {
        return `Across all portfolios, ${metricLabel} has shown strong improvement, rising from ${(period1Percentage || 0).toFixed(1)}% to ${(period2Percentage || 0).toFixed(1)}%—a gain of ${absChange.toFixed(1)} percentage points. ${newAutomated > 0 ? `With ${newAutomated} additional ${testLabel} now automated, ` : ''}the current state stands at ${period2Automated} of ${totalTests} ${testLabel} automated. This momentum positions us well toward the 80%+ industry benchmark. Recommendation: maintain focus on high-impact automation initiatives to sustain this trajectory.`;
      } else if (percentageChange < -5) {
        return `A concerning decline in ${metricLabel} has been observed across portfolios, dropping from ${(period1Percentage || 0).toFixed(1)}% to ${(period2Percentage || 0).toFixed(1)}% (${percentageChange.toFixed(1)} percentage points). Currently, ${period2Automated} of ${totalTests} ${testLabel} are automated, leaving ${period2Manual} requiring manual execution. Immediate action needed: conduct root cause analysis to identify factors driving this regression and prioritize re-automation of critical test scenarios to restore coverage.`;
      } else if (percentageChange > 0) {
        return `${metricLabel} demonstrates modest progress, advancing from ${(period1Percentage || 0).toFixed(1)}% to ${(period2Percentage || 0).toFixed(1)}% (+${absChange.toFixed(1)}pp) across portfolios. The current footprint shows ${period2Automated} automated ${testLabel} out of ${totalTests} total. To accelerate toward the 80%+ target, prioritize automation of the remaining ${period2Manual} manual ${testLabel}, focusing on high-impact scenarios that will strengthen overall coverage.`;
      } else {
        return `${metricLabel} remains relatively stable at ${(period2Percentage || 0).toFixed(1)}% across portfolios, with ${period2Automated} of ${totalTests} ${testLabel} automated and ${period2Manual} still manual. While stability is positive, there's a clear opportunity to enhance CI/CD readiness by increasing automation investment. Strategic focus on the remaining manual ${testLabel} will reduce testing overhead and improve deployment velocity.`;
      }
    } else {
      // Single period mode - AI-style natural analysis
      if (periodPercentage >= 90) {
        return `${metricLabel} across portfolios is excellent at ${periodPercentage.toFixed(1)}%, with ${periodAutomated} of ${totalTests} ${testLabel} automated. This high automation rate reflects strong CI/CD maturity and readiness. The remaining ${periodManual} manual ${testLabel} should be reviewed to determine automation feasibility or intentional exclusion from automation scope.`;
      } else if (periodPercentage >= 80) {
        return `${metricLabel} is strong at ${periodPercentage.toFixed(1)}% across portfolios (${periodAutomated}/${totalTests} ${testLabel} automated), meeting the industry standard for automation coverage. To further strengthen our position, evaluate the remaining ${periodManual} manual ${testLabel} for automation potential, particularly those critical to regression coverage.`;
      } else if (periodPercentage >= 60) {
        return `${metricLabel} stands at ${periodPercentage.toFixed(1)}% across portfolios, with ${periodAutomated} of ${totalTests} ${testLabel} automated. While this represents solid progress, there's meaningful opportunity to reach the 80%+ industry benchmark. Recommendation: prioritize automation of high-impact tests from the remaining ${periodManual} manual ${testLabel} to enhance CI/CD readiness and reduce manual testing burden.`;
      } else if (periodPercentage >= 40) {
        return `${metricLabel} is moderate at ${periodPercentage.toFixed(1)}% across portfolios (${periodAutomated}/${totalTests} ${testLabel} automated). The ${periodManual} remaining manual ${testLabel} represent a significant opportunity to strengthen coverage and improve CI/CD readiness. Strategic investment in automation will reduce manual overhead and enhance deployment confidence.`;
      } else {
        return `${metricLabel} requires attention at ${periodPercentage.toFixed(1)}% across portfolios, with ${periodAutomated} of ${totalTests} ${testLabel} automated. The ${periodManual} remaining manual ${testLabel} represent a critical gap that impacts production risk. Immediate priority: automate core regression scenarios to enhance test coverage, improve CI/CD readiness, and mitigate the risk of missed issues in production.`;
      }
    }
  };

  // Calculate grand totals from all rows
  const calculateGrandTotal = (dataRows: Analysis[]): Analysis => {
    const metric = dataRows[0]?.metric;
    const periodBasedMetrics = ['regression_automation', 'overall_automation', 'test_coverage', 'test_story_ratio', 'bug_ratio', 'test_review_status'];
    const isPeriodBasedMetric = metric && periodBasedMetrics.includes(metric);
    const isAutomationMetric = metric === 'regression_automation' || metric === 'overall_automation';
    
    if (isPeriodBasedMetric) {
      if (isAutomationMetric) {
      // Calculate regression/overall automation totals
      let totalRegressionTests = 0;
      let totalTestCases = 0;
      let periodAutomated = 0;
      let periodManual = 0;
      let period1Automated = 0;
      let period1Manual = 0;
      let period2Automated = 0;
      let period2Manual = 0;
      
      dataRows.forEach(row => {
        totalRegressionTests += row.total_regression_tests || row.total_test_cases || 0;
        totalTestCases += row.total_test_cases || row.total_regression_tests || 0;
        
        // Single period mode
        if (row.period) {
          periodAutomated += row.period.automated_count || 0;
          periodManual += row.period.manual_count || 0;
        }
        
        // Comparison mode
        if (row.period1) {
          period1Automated += row.period1.automated_count || 0;
          period1Manual += row.period1.manual_count || 0;
        }
        if (row.period2) {
          period2Automated += row.period2.automated_count || 0;
          period2Manual += row.period2.manual_count || 0;
        }
      });
      
      // Calculate percentages
      const totalCount = totalTestCases || totalRegressionTests;
      const periodPercentage = totalCount > 0 
        ? (periodAutomated / totalCount) * 100 
        : 0;
      const period1Percentage = totalCount > 0 
        ? (period1Automated / totalCount) * 100 
        : 0;
      const period2Percentage = totalCount > 0 
        ? (period2Automated / totalCount) * 100 
        : 0;
      
      // Calculate progress (percentage change) for comparison mode
      let progress: RegressionProgress | undefined = undefined;
      if (enableComparison && period1Percentage !== undefined && period2Percentage !== undefined) {
        const deltaPct = period2Percentage - period1Percentage;
        progress = {
          percentage_change: deltaPct,
          new_automated_tests: period2Automated - period1Automated,
          trend: deltaPct > 0 ? 'improving' : deltaPct < 0 ? 'declining' : 'stable'
        };
      }
      
      const metricType = dataRows[0]?.metric || 'regression_automation';
      const metricLabel = dataRows[0]?.metric_label || (metricType === 'regression_automation' ? 'Regression Automation %' : 'Overall Automation %');
      
      // Generate unique AI analysis based on aggregated totals
      const uniqueAnalysis = generateGrandTotalAnalysis(
        totalCount,
        periodAutomated,
        periodManual,
        periodPercentage,
        period1Automated,
        period1Manual,
        period1Percentage,
        period2Automated,
        period2Manual,
        period2Percentage,
        enableComparison ? dataRows[0]?.period2?.to : dataRows[0]?.period?.to,
        metricType
      );
      
      return {
        portfolio: 'Grand Total',
        portfolio_display: 'Grand Total',
        project_key: '',
        metric: metricType,
        metric_label: metricLabel,
        total_regression_tests: totalRegressionTests,
        total_test_cases: totalTestCases,
        period: {
          from: dataRows[0]?.period?.from || '',
          to: dataRows[0]?.period?.to || '',
          automated_count: periodAutomated,
          manual_count: periodManual,
          automation_percentage: Number(periodPercentage.toFixed(1))
        },
        period1: enableComparison ? {
          from: dataRows[0]?.period1?.from || '',
          to: dataRows[0]?.period1?.to || '',
          automated_count: period1Automated,
          manual_count: period1Manual,
          automation_percentage: Number(period1Percentage.toFixed(1))
        } : undefined,
        period2: enableComparison ? {
          from: dataRows[0]?.period2?.from || '',
          to: dataRows[0]?.period2?.to || '',
          automated_count: period2Automated,
          manual_count: period2Manual,
          automation_percentage: Number(period2Percentage.toFixed(1))
        } : undefined,
        progress: progress,
        ai_analysis: uniqueAnalysis,
        ai_insights: uniqueAnalysis,
        generated_at: new Date().toISOString(),
        // Dummy fields for compatibility
        current_week: { bugs_count: 0, defects_count: 0, leakage_percentage: 0, total_issues: 0, date_range: '' },
        previous_week: { bugs_count: 0, defects_count: 0, leakage_percentage: 0, total_issues: 0, date_range: '' },
        comparison: { leakage_change: 0, leakage_change_percentage: 0, bugs_change: 0, defects_change: 0, trend: 'stable', severity: 'normal' }
      } as Analysis;
      } else if (metric === 'test_coverage') {
        // Test Coverage grand total
        let totalStories = 0;
        let periodStoriesWithTests = 0;
        let periodStoriesWithoutTests = 0;
        let period1StoriesWithTests = 0;
        let period1StoriesWithoutTests = 0;
        let period2StoriesWithTests = 0;
        let period2StoriesWithoutTests = 0;
        
        dataRows.forEach(row => {
          totalStories += row.total_stories || 0;
          // Single period mode
          if (row.period) {
            periodStoriesWithTests += row.period.stories_with_tests || 0;
            periodStoriesWithoutTests += row.period.stories_without_tests || 0;
          }
          // Comparison mode
          if (row.period1) {
            period1StoriesWithTests += row.period1.stories_with_tests || 0;
            period1StoriesWithoutTests += row.period1.stories_without_tests || 0;
          }
          if (row.period2) {
            period2StoriesWithTests += row.period2.stories_with_tests || 0;
            period2StoriesWithoutTests += row.period2.stories_without_tests || 0;
          }
        });
        
        const totalStoriesCurrent = periodStoriesWithTests + periodStoriesWithoutTests || totalStories || 0;
        const totalStoriesP1 = period1StoriesWithTests + period1StoriesWithoutTests || totalStories || 0;
        const totalStoriesP2 = period2StoriesWithTests + period2StoriesWithoutTests || totalStories || 0;
        const currentPct = totalStoriesCurrent > 0 ? (periodStoriesWithTests / totalStoriesCurrent) * 100 : 0;
        const p1Pct = totalStoriesP1 > 0 ? (period1StoriesWithTests / totalStoriesP1) * 100 : 0;
        const p2Pct = totalStoriesP2 > 0 ? (period2StoriesWithTests / totalStoriesP2) * 100 : 0;
        const deltaPct = p2Pct - p1Pct;
        
        return {
          portfolio: 'Grand Total',
          portfolio_display: 'Grand Total',
          project_key: '',
          metric: 'test_coverage',
          metric_label: 'Test Coverage',
          total_stories: totalStories,
          period: {
            from: dataRows[0]?.period?.from || '',
            to: dataRows[0]?.period?.to || '',
            stories_with_tests: periodStoriesWithTests,
            stories_without_tests: periodStoriesWithoutTests,
            coverage_percentage: Number(currentPct.toFixed(1))
          },
          period1: enableComparison ? {
            from: dataRows[0]?.period1?.from || '',
            to: dataRows[0]?.period1?.to || '',
            stories_with_tests: period1StoriesWithTests,
            stories_without_tests: period1StoriesWithoutTests,
            coverage_percentage: Number(p1Pct.toFixed(1))
          } : undefined,
          period2: enableComparison ? {
            from: dataRows[0]?.period2?.from || '',
            to: dataRows[0]?.period2?.to || '',
            stories_with_tests: period2StoriesWithTests,
            stories_without_tests: period2StoriesWithoutTests,
            coverage_percentage: Number(p2Pct.toFixed(1))
          } : undefined,
          progress: enableComparison ? {
            percentage_change: deltaPct,
            new_stories_with_tests: period2StoriesWithTests - period1StoriesWithTests,
            trend: deltaPct > 0 ? 'improving' : deltaPct < 0 ? 'declining' : 'stable'
          } : undefined,
          ai_analysis: enableComparison 
            ? (() => {
                const change = deltaPct > 0 ? 'improved' : deltaPct < 0 ? 'declined' : 'remained stable';
                const changeText = deltaPct > 0 ? `rising from ${p1Pct.toFixed(1)}% to ${p2Pct.toFixed(1)}% (+${deltaPct.toFixed(1)}pp)` : deltaPct < 0 ? `dropping from ${p1Pct.toFixed(1)}% to ${p2Pct.toFixed(1)}% (${deltaPct.toFixed(1)}pp)` : `maintaining at ${p2Pct.toFixed(1)}%`;
                const recommendation = deltaPct < 0 ? 'Immediate action: investigate coverage gaps and prioritize test case creation for uncovered stories to restore quality assurance standards.' : deltaPct > 0 ? 'Recommendation: continue expanding test coverage initiatives to further strengthen quality assurance and reduce risk exposure.' : 'Focus area: increase test coverage for the remaining uncovered stories to enhance overall quality assurance posture.';
                return `Test coverage across portfolios has ${change}, ${changeText}. Currently, ${period2StoriesWithTests} of ${totalStoriesP2} stories have associated test cases. ${recommendation}`;
              })()
            : (() => {
                const status = currentPct < 50 ? 'requires attention' : currentPct < 75 ? 'shows progress' : 'demonstrates strong coverage';
                const recommendation = currentPct < 50 ? 'Priority: create test cases for uncovered stories to improve quality assurance and reduce risk.' : currentPct < 75 ? 'Next step: continue expanding test coverage to reach the 75%+ target and enhance quality assurance.' : 'Maintenance: review remaining uncovered stories to ensure comprehensive coverage is maintained.';
                return `Test coverage across portfolios ${status} at ${currentPct.toFixed(1)}%, with ${periodStoriesWithTests} of ${totalStoriesCurrent} stories having test cases and ${periodStoriesWithoutTests} without. ${recommendation}`;
              })(),
          ai_insights: enableComparison 
            ? (() => {
                const change = deltaPct > 0 ? 'improved' : deltaPct < 0 ? 'declined' : 'remained stable';
                const changeText = deltaPct > 0 ? `rising from ${p1Pct.toFixed(1)}% to ${p2Pct.toFixed(1)}% (+${deltaPct.toFixed(1)}pp)` : deltaPct < 0 ? `dropping from ${p1Pct.toFixed(1)}% to ${p2Pct.toFixed(1)}% (${deltaPct.toFixed(1)}pp)` : `maintaining at ${p2Pct.toFixed(1)}%`;
                const recommendation = deltaPct < 0 ? 'Immediate action: investigate coverage gaps and prioritize test case creation for uncovered stories to restore quality assurance standards.' : deltaPct > 0 ? 'Recommendation: continue expanding test coverage initiatives to further strengthen quality assurance and reduce risk exposure.' : 'Focus area: increase test coverage for the remaining uncovered stories to enhance overall quality assurance posture.';
                return `Test coverage across portfolios has ${change}, ${changeText}. Currently, ${period2StoriesWithTests} of ${totalStoriesP2} stories have associated test cases. ${recommendation}`;
              })()
            : (() => {
                const status = currentPct < 50 ? 'requires attention' : currentPct < 75 ? 'shows progress' : 'demonstrates strong coverage';
                const recommendation = currentPct < 50 ? 'Priority: create test cases for uncovered stories to improve quality assurance and reduce risk.' : currentPct < 75 ? 'Next step: continue expanding test coverage to reach the 75%+ target and enhance quality assurance.' : 'Maintenance: review remaining uncovered stories to ensure comprehensive coverage is maintained.';
                return `Test coverage across portfolios ${status} at ${currentPct.toFixed(1)}%, with ${periodStoriesWithTests} of ${totalStoriesCurrent} stories having test cases and ${periodStoriesWithoutTests} without. ${recommendation}`;
              })(),
          generated_at: new Date().toISOString(),
          current_week: { bugs_count: 0, defects_count: 0, leakage_percentage: 0, total_issues: 0, date_range: '' },
          previous_week: { bugs_count: 0, defects_count: 0, leakage_percentage: 0, total_issues: 0, date_range: '' },
          comparison: { leakage_change: 0, leakage_change_percentage: 0, bugs_change: 0, defects_change: 0, trend: 'stable', severity: 'normal' }
        } as Analysis;
      } else if (metric === 'test_story_ratio') {
        // Test to Story Ratio grand total
        let totalTestCases = 0;
        let totalStories = 0;
        let periodTestCases = 0;
        let periodStories = 0;
        let period1TestCases = 0;
        let period1Stories = 0;
        let period2TestCases = 0;
        let period2Stories = 0;
        
        dataRows.forEach(row => {
          totalTestCases += row.total_test_cases || 0;
          totalStories += row.total_stories || 0;
          // Single period mode
          if (row.period) {
            periodTestCases += row.period.total_test_cases || 0;
            periodStories += row.period.total_stories || 0;
          }
          // Comparison mode
          if (row.period1) {
            period1TestCases += row.period1.total_test_cases || 0;
            period1Stories += row.period1.total_stories || 0;
          }
          if (row.period2) {
            period2TestCases += row.period2.total_test_cases || 0;
            period2Stories += row.period2.total_stories || 0;
          }
        });
        
        const currentRatio = periodStories > 0 ? periodTestCases / periodStories : 0;
        const ratio1 = period1Stories > 0 ? period1TestCases / period1Stories : 0;
        const ratio2 = period2Stories > 0 ? period2TestCases / period2Stories : 0;
        const ratioDelta = ratio2 - ratio1;
        
        return {
          portfolio: 'Grand Total',
          portfolio_display: 'Grand Total',
          project_key: '',
          metric: 'test_story_ratio',
          metric_label: 'Test to Story Ratio',
          total_test_cases: totalTestCases,
          total_stories: totalStories,
          period: {
            from: dataRows[0]?.period?.from || '',
            to: dataRows[0]?.period?.to || '',
            total_test_cases: periodTestCases,
            total_stories: periodStories,
            ratio: Number(currentRatio.toFixed(2))
          },
          period1: enableComparison ? {
            from: dataRows[0]?.period1?.from || '',
            to: dataRows[0]?.period1?.to || '',
            total_test_cases: period1TestCases,
            total_stories: period1Stories,
            ratio: Number(ratio1.toFixed(2))
          } : undefined,
          period2: enableComparison ? {
            from: dataRows[0]?.period2?.from || '',
            to: dataRows[0]?.period2?.to || '',
            total_test_cases: period2TestCases,
            total_stories: period2Stories,
            ratio: Number(ratio2.toFixed(2))
          } : undefined,
          progress: enableComparison ? {
            ratio_change: ratioDelta,
            tests_change: period2TestCases - period1TestCases,
            stories_change: period2Stories - period1Stories,
            trend: ratioDelta > 0 ? 'improving' : ratioDelta < 0 ? 'declining' : 'stable'
          } : undefined,
          ai_analysis: enableComparison
            ? (() => {
                const change = ratioDelta > 0 ? 'improved' : ratioDelta < 0 ? 'declined' : 'remained stable';
                const changeText = ratioDelta > 0 ? `rising from ${ratio1.toFixed(2)} to ${ratio2.toFixed(2)} (+${ratioDelta.toFixed(2)})` : ratioDelta < 0 ? `dropping from ${ratio1.toFixed(2)} to ${ratio2.toFixed(2)} (${ratioDelta.toFixed(2)})` : `maintaining at ${ratio2.toFixed(2)}`;
                const recommendation = ratioDelta < 0 ? 'Recommendation: increase test case creation to improve test coverage per story and strengthen quality assurance.' : ratioDelta > 0 ? 'This positive trend indicates good progress. Continue maintaining the test-to-story ratio while ensuring test quality remains high.' : 'Focus area: maintain the current ratio while prioritizing test case quality and comprehensive coverage.';
                return `The test-to-story ratio across portfolios has ${change}, ${changeText}. The current state shows ${period2TestCases} test cases for ${period2Stories} stories. ${recommendation}`;
              })()
            : (() => {
                const status = currentRatio < 1.0 ? 'is below target' : currentRatio < 1.5 ? 'shows good progress' : 'demonstrates strong coverage';
                const recommendation = currentRatio < 1.0 ? 'Priority: increase test case creation to improve coverage, targeting 1.0+ tests per story to enhance quality assurance.' : currentRatio < 1.5 ? 'Next step: continue expanding test coverage to reach the 1.5+ target and further strengthen quality assurance.' : 'Maintenance: focus on maintaining quality and comprehensive coverage while preserving the strong ratio achieved.';
                return `Test-to-story ratio across portfolios ${status} at ${currentRatio.toFixed(2)}, with ${periodTestCases} test cases for ${periodStories} stories. ${recommendation}`;
              })(),
          ai_insights: enableComparison
            ? (() => {
                const change = ratioDelta > 0 ? 'improved' : ratioDelta < 0 ? 'declined' : 'remained stable';
                const changeText = ratioDelta > 0 ? `rising from ${ratio1.toFixed(2)} to ${ratio2.toFixed(2)} (+${ratioDelta.toFixed(2)})` : ratioDelta < 0 ? `dropping from ${ratio1.toFixed(2)} to ${ratio2.toFixed(2)} (${ratioDelta.toFixed(2)})` : `maintaining at ${ratio2.toFixed(2)}`;
                const recommendation = ratioDelta < 0 ? 'Recommendation: increase test case creation to improve test coverage per story and strengthen quality assurance.' : ratioDelta > 0 ? 'This positive trend indicates good progress. Continue maintaining the test-to-story ratio while ensuring test quality remains high.' : 'Focus area: maintain the current ratio while prioritizing test case quality and comprehensive coverage.';
                return `The test-to-story ratio across portfolios has ${change}, ${changeText}. The current state shows ${period2TestCases} test cases for ${period2Stories} stories. ${recommendation}`;
              })()
            : (() => {
                const status = currentRatio < 1.0 ? 'is below target' : currentRatio < 1.5 ? 'shows good progress' : 'demonstrates strong coverage';
                const recommendation = currentRatio < 1.0 ? 'Priority: increase test case creation to improve coverage, targeting 1.0+ tests per story to enhance quality assurance.' : currentRatio < 1.5 ? 'Next step: continue expanding test coverage to reach the 1.5+ target and further strengthen quality assurance.' : 'Maintenance: focus on maintaining quality and comprehensive coverage while preserving the strong ratio achieved.';
                return `Test-to-story ratio across portfolios ${status} at ${currentRatio.toFixed(2)}, with ${periodTestCases} test cases for ${periodStories} stories. ${recommendation}`;
              })(),
          generated_at: new Date().toISOString(),
          current_week: { bugs_count: 0, defects_count: 0, leakage_percentage: 0, total_issues: 0, date_range: '' },
          previous_week: { bugs_count: 0, defects_count: 0, leakage_percentage: 0, total_issues: 0, date_range: '' },
          comparison: { leakage_change: 0, leakage_change_percentage: 0, bugs_change: 0, defects_change: 0, trend: 'stable', severity: 'normal' }
        } as Analysis;
      } else if (metric === 'bug_ratio') {
        // Bug Discovery Ratio grand total
        let periodBugs = 0;
        let periodTests = 0;
        let period1Bugs = 0;
        let period1Tests = 0;
        let period2Bugs = 0;
        let period2Tests = 0;
        
        dataRows.forEach(row => {
          // Single period mode
          if (row.period) {
            periodBugs += row.period.bugs_found || 0;
            periodTests += row.period.test_cases_executed || 0;
          }
          // Comparison mode
          if (row.period1) {
            period1Bugs += row.period1.bugs_found || 0;
            period1Tests += row.period1.test_cases_executed || 0;
          }
          if (row.period2) {
            period2Bugs += row.period2.bugs_found || 0;
            period2Tests += row.period2.test_cases_executed || 0;
          }
        });
        
        const currentRatio = periodTests > 0 ? periodBugs / periodTests : 0;
        const ratio1 = period1Tests > 0 ? period1Bugs / period1Tests : 0;
        const ratio2 = period2Tests > 0 ? period2Bugs / period2Tests : 0;
        const ratioDelta = ratio2 - ratio1;
        
        return {
          portfolio: 'Grand Total',
          portfolio_display: 'Grand Total',
          project_key: '',
          metric: 'bug_ratio',
          metric_label: 'Bug Discovery Ratio',
          period: {
            from: dataRows[0]?.period?.from || '',
            to: dataRows[0]?.period?.to || '',
            bugs_found: periodBugs,
            test_cases_executed: periodTests,
            ratio: Number(currentRatio.toFixed(4))
          },
          period1: enableComparison ? {
            from: dataRows[0]?.period1?.from || '',
            to: dataRows[0]?.period1?.to || '',
            bugs_found: period1Bugs,
            test_cases_executed: period1Tests,
            ratio: Number(ratio1.toFixed(4))
          } : undefined,
          period2: enableComparison ? {
            from: dataRows[0]?.period2?.from || '',
            to: dataRows[0]?.period2?.to || '',
            bugs_found: period2Bugs,
            test_cases_executed: period2Tests,
            ratio: Number(ratio2.toFixed(4))
          } : undefined,
          progress: enableComparison ? {
            ratio_change: ratioDelta,
            bugs_change: period2Bugs - period1Bugs,
            tests_change: period2Tests - period1Tests,
            trend: ratioDelta < 0 ? 'improving' : ratioDelta > 0 ? 'declining' : 'stable' // Lower is better
          } : undefined,
          ai_analysis: enableComparison
            ? (() => {
                const change = ratioDelta < 0 ? 'improved' : ratioDelta > 0 ? 'increased' : 'remained stable';
                const changeText = ratioDelta < 0 ? `declining from ${ratio1.toFixed(4)} to ${ratio2.toFixed(4)} (${ratioDelta.toFixed(4)})` : ratioDelta > 0 ? `rising from ${ratio1.toFixed(4)} to ${ratio2.toFixed(4)} (+${ratioDelta.toFixed(4)})` : `maintaining at ${ratio2.toFixed(4)}`;
                const recommendation = ratioDelta > 0 ? 'Immediate action: investigate root causes of increased bug discovery, review test effectiveness, and assess product quality trends to identify areas requiring attention.' : ratioDelta < 0 ? 'This positive trend reflects effective quality practices. Continue maintaining quality standards and test effectiveness to sustain this improvement.' : 'Monitoring: track bug discovery patterns and maintain test quality standards to ensure consistent product quality.';
                return `Bug discovery ratio across portfolios has ${change}, ${changeText}. During this period, ${period2Bugs} bugs were discovered across ${period2Tests} executed tests. ${recommendation}`;
              })()
            : (() => {
                const status = currentRatio > 0.1 ? 'indicates elevated bug discovery' : currentRatio > 0.05 ? 'shows moderate bug discovery' : 'reflects low bug discovery';
                const recommendation = currentRatio > 0.1 ? 'Priority: investigate root causes and implement quality improvements to reduce bug discovery rate and enhance product stability.' : currentRatio > 0.05 ? 'Monitoring: track patterns and maintain test effectiveness while continuing to monitor product quality trends.' : 'Maintenance: the low ratio indicates strong product quality. Continue maintaining these standards and test effectiveness.';
                return `Bug discovery ratio across portfolios ${status} at ${currentRatio.toFixed(4)}, with ${periodBugs} bugs found across ${periodTests} executed tests. ${recommendation}`;
              })(),
          ai_insights: enableComparison
            ? (() => {
                const change = ratioDelta < 0 ? 'improved' : ratioDelta > 0 ? 'increased' : 'remained stable';
                const changeText = ratioDelta < 0 ? `declining from ${ratio1.toFixed(4)} to ${ratio2.toFixed(4)} (${ratioDelta.toFixed(4)})` : ratioDelta > 0 ? `rising from ${ratio1.toFixed(4)} to ${ratio2.toFixed(4)} (+${ratioDelta.toFixed(4)})` : `maintaining at ${ratio2.toFixed(4)}`;
                const recommendation = ratioDelta > 0 ? 'Immediate action: investigate root causes of increased bug discovery, review test effectiveness, and assess product quality trends to identify areas requiring attention.' : ratioDelta < 0 ? 'This positive trend reflects effective quality practices. Continue maintaining quality standards and test effectiveness to sustain this improvement.' : 'Monitoring: track bug discovery patterns and maintain test quality standards to ensure consistent product quality.';
                return `Bug discovery ratio across portfolios has ${change}, ${changeText}. During this period, ${period2Bugs} bugs were discovered across ${period2Tests} executed tests. ${recommendation}`;
              })()
            : (() => {
                const status = currentRatio > 0.1 ? 'indicates elevated bug discovery' : currentRatio > 0.05 ? 'shows moderate bug discovery' : 'reflects low bug discovery';
                const recommendation = currentRatio > 0.1 ? 'Priority: investigate root causes and implement quality improvements to reduce bug discovery rate and enhance product stability.' : currentRatio > 0.05 ? 'Monitoring: track patterns and maintain test effectiveness while continuing to monitor product quality trends.' : 'Maintenance: the low ratio indicates strong product quality. Continue maintaining these standards and test effectiveness.';
                return `Bug discovery ratio across portfolios ${status} at ${currentRatio.toFixed(4)}, with ${periodBugs} bugs found across ${periodTests} executed tests. ${recommendation}`;
              })(),
          generated_at: new Date().toISOString(),
          current_week: { bugs_count: 0, defects_count: 0, leakage_percentage: 0, total_issues: 0, date_range: '' },
          previous_week: { bugs_count: 0, defects_count: 0, leakage_percentage: 0, total_issues: 0, date_range: '' },
          comparison: { leakage_change: 0, leakage_change_percentage: 0, bugs_change: 0, defects_change: 0, trend: 'stable', severity: 'normal' }
        } as Analysis;
      } else if (metric === 'test_review_status') {
        // Test Case Review Status grand total
        let totalStories = 0;
        let periodReviewedYes = 0;
        let periodReviewedNo = 0;
        let periodNotSet = 0;
        let period1ReviewedYes = 0;
        let period1ReviewedNo = 0;
        let period1NotSet = 0;
        let period2ReviewedYes = 0;
        let period2ReviewedNo = 0;
        let period2NotSet = 0;
        
        dataRows.forEach(row => {
          totalStories += row.total_stories || 0;
          // Single period mode
          if (row.period) {
            periodReviewedYes += row.period.reviewed_yes || 0;
            periodReviewedNo += row.period.reviewed_no || 0;
            periodNotSet += row.period.not_set || 0;
          }
          // Comparison mode
          if (row.period1) {
            period1ReviewedYes += row.period1.reviewed_yes || 0;
            period1ReviewedNo += row.period1.reviewed_no || 0;
            period1NotSet += row.period1.not_set || 0;
          }
          if (row.period2) {
            period2ReviewedYes += row.period2.reviewed_yes || 0;
            period2ReviewedNo += row.period2.reviewed_no || 0;
            period2NotSet += row.period2.not_set || 0;
          }
        });
        
        const totalStoriesCurrent = periodReviewedYes + periodReviewedNo + periodNotSet || totalStories || 0;
        const totalStoriesP1 = period1ReviewedYes + period1ReviewedNo + period1NotSet || totalStories || 0;
        const totalStoriesP2 = period2ReviewedYes + period2ReviewedNo + period2NotSet || totalStories || 0;
        const currentPct = totalStoriesCurrent > 0 ? (periodReviewedYes / totalStoriesCurrent) * 100 : 0;
        const p1Pct = totalStoriesP1 > 0 ? (period1ReviewedYes / totalStoriesP1) * 100 : 0;
        const p2Pct = totalStoriesP2 > 0 ? (period2ReviewedYes / totalStoriesP2) * 100 : 0;
        const deltaPct = p2Pct - p1Pct;
        
        return {
          portfolio: 'Grand Total',
          portfolio_display: 'Grand Total',
          project_key: '',
          metric: 'test_review_status',
          metric_label: 'Test Case Review Status',
          total_stories: totalStories,
          period: {
            from: dataRows[0]?.period?.from || '',
            to: dataRows[0]?.period?.to || '',
            reviewed_yes: periodReviewedYes,
            reviewed_no: periodReviewedNo,
            not_set: periodNotSet,
            review_percentage: Number(currentPct.toFixed(1))
          },
          period1: enableComparison ? {
            from: dataRows[0]?.period1?.from || '',
            to: dataRows[0]?.period1?.to || '',
            reviewed_yes: period1ReviewedYes,
            reviewed_no: period1ReviewedNo,
            not_set: period1NotSet,
            review_percentage: Number(p1Pct.toFixed(1))
          } : undefined,
          period2: enableComparison ? {
            from: dataRows[0]?.period2?.from || '',
            to: dataRows[0]?.period2?.to || '',
            reviewed_yes: period2ReviewedYes,
            reviewed_no: period2ReviewedNo,
            not_set: period2NotSet,
            review_percentage: Number(p2Pct.toFixed(1))
          } : undefined,
          progress: enableComparison ? {
            percentage_change: deltaPct,
            new_reviewed: period2ReviewedYes - period1ReviewedYes,
            trend: deltaPct > 0 ? 'improving' : deltaPct < 0 ? 'declining' : 'stable'
          } : undefined,
          ai_analysis: enableComparison
            ? (() => {
                const change = deltaPct > 0 ? 'improved' : deltaPct < 0 ? 'declined' : 'remained stable';
                const changeText = deltaPct > 0 ? `rising from ${p1Pct.toFixed(1)}% to ${p2Pct.toFixed(1)}% (+${deltaPct.toFixed(1)}pp)` : deltaPct < 0 ? `dropping from ${p1Pct.toFixed(1)}% to ${p2Pct.toFixed(1)}% (${deltaPct.toFixed(1)}pp)` : `maintaining at ${p2Pct.toFixed(1)}%`;
                const recommendation = deltaPct < 0 ? 'Immediate action: prioritize test case reviews to ensure quality standards are maintained and coverage gaps are addressed.' : deltaPct > 0 ? 'This positive trend demonstrates good review discipline. Continue maintaining review practices to sustain quality assurance standards.' : 'Focus area: complete reviews for the remaining unreviewed stories to enhance overall quality assurance and ensure comprehensive coverage.';
                return `Test review status across portfolios has ${change}, ${changeText}. Currently, ${period2ReviewedYes} of ${totalStoriesP2} stories have been reviewed, with ${period2ReviewedNo} pending review. ${recommendation}`;
              })()
            : (() => {
                const status = currentPct < 70 ? 'requires attention' : currentPct < 90 ? 'shows good progress' : 'demonstrates strong review coverage';
                const recommendation = currentPct < 70 ? 'Priority: prioritize test case reviews to ensure quality standards and comprehensive coverage are maintained across all stories.' : currentPct < 90 ? 'Next step: complete reviews for remaining stories to reach the 90%+ target and further strengthen quality assurance.' : 'Maintenance: excellent review coverage achieved. Continue maintaining review discipline and address the remaining unreviewed stories.';
                return `Test review status across portfolios ${status} at ${currentPct.toFixed(1)}%, with ${periodReviewedYes} of ${totalStoriesCurrent} stories reviewed and ${periodReviewedNo} not yet reviewed. ${recommendation}`;
              })(),
          ai_insights: enableComparison
            ? (() => {
                const change = deltaPct > 0 ? 'improved' : deltaPct < 0 ? 'declined' : 'remained stable';
                const changeText = deltaPct > 0 ? `rising from ${p1Pct.toFixed(1)}% to ${p2Pct.toFixed(1)}% (+${deltaPct.toFixed(1)}pp)` : deltaPct < 0 ? `dropping from ${p1Pct.toFixed(1)}% to ${p2Pct.toFixed(1)}% (${deltaPct.toFixed(1)}pp)` : `maintaining at ${p2Pct.toFixed(1)}%`;
                const recommendation = deltaPct < 0 ? 'Immediate action: prioritize test case reviews to ensure quality standards are maintained and coverage gaps are addressed.' : deltaPct > 0 ? 'This positive trend demonstrates good review discipline. Continue maintaining review practices to sustain quality assurance standards.' : 'Focus area: complete reviews for the remaining unreviewed stories to enhance overall quality assurance and ensure comprehensive coverage.';
                return `Test review status across portfolios has ${change}, ${changeText}. Currently, ${period2ReviewedYes} of ${totalStoriesP2} stories have been reviewed, with ${period2ReviewedNo} pending review. ${recommendation}`;
              })()
            : (() => {
                const status = currentPct < 70 ? 'requires attention' : currentPct < 90 ? 'shows good progress' : 'demonstrates strong review coverage';
                const recommendation = currentPct < 70 ? 'Priority: prioritize test case reviews to ensure quality standards and comprehensive coverage are maintained across all stories.' : currentPct < 90 ? 'Next step: complete reviews for remaining stories to reach the 90%+ target and further strengthen quality assurance.' : 'Maintenance: excellent review coverage achieved. Continue maintaining review discipline and address the remaining unreviewed stories.';
                return `Test review status across portfolios ${status} at ${currentPct.toFixed(1)}%, with ${periodReviewedYes} of ${totalStoriesCurrent} stories reviewed and ${periodReviewedNo} not yet reviewed. ${recommendation}`;
              })(),
          generated_at: new Date().toISOString(),
          current_week: { bugs_count: 0, defects_count: 0, leakage_percentage: 0, total_issues: 0, date_range: '' },
          previous_week: { bugs_count: 0, defects_count: 0, leakage_percentage: 0, total_issues: 0, date_range: '' },
          comparison: { leakage_change: 0, leakage_change_percentage: 0, bugs_change: 0, defects_change: 0, trend: 'stable', severity: 'normal' }
        } as Analysis;
      }
    }
    
    // Original defect leakage calculation
    const totals = {
      bugs: 0,
      defects: 0,
      prevBugs: 0,
      prevDefects: 0,
    };
    
    dataRows.forEach(row => {
      totals.bugs += row.current_week.bugs_count ?? 0;
      totals.defects += row.current_week.defects_count ?? 0;
      totals.prevBugs += row.previous_week.bugs_count ?? 0;
      totals.prevDefects += row.previous_week.defects_count ?? 0;
    });
    
    const currTotal = totals.bugs + totals.defects;
    const prevTotal = totals.prevBugs + totals.prevDefects;
    const currLeakage = currTotal > 0 ? (totals.defects / currTotal) * 100 : 0;
    const prevLeakage = prevTotal > 0 ? (totals.prevDefects / prevTotal) * 100 : 0;
    const delta = currLeakage - prevLeakage;
    
    return {
      portfolio: 'Grand Total',
      portfolio_display: 'Grand Total',
      project_key: '',
      current_week: {
        bugs_count: totals.bugs,
        defects_count: totals.defects,
        leakage_percentage: Number(currLeakage.toFixed(2)),
        total_issues: currTotal,
        date_range: '',
      },
      previous_week: {
        bugs_count: totals.prevBugs,
        defects_count: totals.prevDefects,
        leakage_percentage: Number(prevLeakage.toFixed(2)),
        total_issues: prevTotal,
        date_range: '',
      },
      comparison: {
        leakage_change: Number(delta.toFixed(2)),
        leakage_change_percentage: prevLeakage > 0 ? Number(((delta / prevLeakage) * 100).toFixed(2)) : 0,
        bugs_change: totals.bugs - totals.prevBugs,
        defects_change: totals.defects - totals.prevDefects,
        trend: delta > 2 ? 'worsening' : delta < -2 ? 'improving' : 'stable',
        severity: 'normal',
      },
      ai_insights: enableComparison 
      ? (() => {
          const absDelta = Math.abs(delta);
          if (delta < -10) {
            return `Leakage improved by ${absDelta.toFixed(1)}% (${prevLeakage.toFixed(1)}% to ${currLeakage.toFixed(1)}%). Positive movement. Continue reuse of automation framework and expand coverage.`;
          } else if (delta > 15) {
            return `Leakage increased sharply by ${absDelta.toFixed(1)}% (${totals.defects} defect${totals.defects !== 1 ? 's' : ''} leaked). High-risk module. Recommendation: Strengthen regression suite, perform RCA, review unit test coverage.`;
          } else if (delta > 0) {
            return `Defect leakage has increased by ~${absDelta.toFixed(0)}% compared to previous period. Conduct RCA, strengthen pre-release gates.`;
          } else if (delta < 0) {
            return `Defect leakage has reduced by ~${absDelta.toFixed(0)}% compared to previous period. Positive movement. Continue current testing strategies.`;
          } else {
            return `Defect leakage has remained stable at ${currLeakage.toFixed(1)}% compared to previous period.`;
          }
        })()
      : `Overall defect leakage for the period is ${currLeakage.toFixed(1)}% with ${totals.defects} defect${totals.defects !== 1 ? 's' : ''} from ${currTotal} total issues.`,
      generated_at: new Date().toISOString(),
    };
  };

  const extractWeekEnding = (range?: string) => {
    if (!range) return '';
    const parts = range.split('to');
    const raw = (parts.length > 1 ? parts[1] : parts[0]).trim();
    return formatDate(raw);
  };

  // Helper to extract date labels from report data (frozen at generation time)
  // This ensures headers don't change when date filters are modified after report generation
  const getDateLabelsFromReportData = () => {
    // For single analysis (defect leakage)
    if (analysis) {
      // Check if it's defect leakage with date_range
      if (analysis.current_week?.date_range) {
        return {
          current: extractWeekEnding(analysis.current_week.date_range),
          previous: analysis.previous_week?.date_range 
            ? extractWeekEnding(analysis.previous_week.date_range)
            : formatDate(previousTo)
        };
      }
      // For period-based metrics, use period.to dates
      if (analysis.period?.to) {
        return {
          current: formatDate(analysis.period.to),
          previous: enableComparison && analysis.period1?.to 
            ? formatDate(analysis.period1.to)
            : formatDate(previousTo)
        };
      }
      if (analysis.period2?.to) {
        return {
          current: formatDate(analysis.period2.to),
          previous: analysis.period1?.to 
            ? formatDate(analysis.period1.to)
            : formatDate(previousTo)
        };
      }
    }
    
    // For rows (multi-project/multi-metric), extract from first row
    if (rows && rows.length > 0) {
      const firstRow = rows[0];
      // Check for defect leakage date_range
      if (firstRow.current_week?.date_range) {
        return {
          current: extractWeekEnding(firstRow.current_week.date_range),
          previous: firstRow.previous_week?.date_range
            ? extractWeekEnding(firstRow.previous_week.date_range)
            : formatDate(previousTo)
        };
      }
      // Check for period-based metrics
      if (firstRow.period?.to) {
        return {
          current: formatDate(firstRow.period.to),
          previous: enableComparison && firstRow.period1?.to
            ? formatDate(firstRow.period1.to)
            : formatDate(previousTo)
        };
      }
      if (firstRow.period2?.to) {
        return {
          current: formatDate(firstRow.period2.to),
          previous: firstRow.period1?.to
            ? formatDate(firstRow.period1.to)
            : formatDate(previousTo)
        };
      }
    }
    
    // Fallback to current filter state (only if no report data exists)
    return {
      current: formatDate(currentTo),
      previous: formatDate(previousTo)
    };
  };

  const reportDateLabels = getDateLabelsFromReportData();
  const selectedWeekEndingPrevious = formatDate(previousTo);
  const selectedWeekEndingCurrent = formatDate(currentTo);
  const previousWeekEndingLabel = reportDateLabels.previous;
  const currentWeekEndingLabel = reportDateLabels.current;

  // Display labels
  const portfolioLabel = analysis?.portfolio_display || selectedPortfolio || 'All';
  const projectLabel = analysis?.project_label || (
    useMultiSelect && selectedProjectKeys.length > 0
      ? `${selectedProjectKeys.length} projects selected`
      : selectedProjectKey !== 'All' 
        ? selectedProjectKey 
        : 'All'
  );
  const projectKeyDisplay = analysis?.project_key || (
    useMultiSelect && selectedProjectKeys.length > 0
      ? selectedProjectKeys.join(', ')
      : selectedProjectKey
  );
  const metricLabel = analysis?.metric_label || activeMetricOption?.label || 'Weekly Defects Leakage';
  const metricDescription = activeMetricOption?.description || 'Defects / [Defects + Bugs] for the reporting period';
  const commentText = analysis ? buildCommentText(analysis as any, metricLabel) : '';
  const currentWeekDebug = analysis?.current_week;
  const bugKeys = currentWeekDebug?.bugs_keys ?? [];
  const defectKeys = currentWeekDebug?.defects_keys ?? [];
  const bugsJql = currentWeekDebug?.bugs_jql || '';
  const defectsJql = currentWeekDebug?.defects_jql || '';

  const handleExportPDF = async () => {
    if (!(analysis || (rows && rows.length))) return;
    try {
      setExportingPDF(true);
      const filenameLabel = (currentWeekEndingLabel || 'tcoe').replace(/[\s,]/g, '-');
      await exportTcoeReportAsPDF('tcoe-report', `tcoe-report-${filenameLabel}.pdf`);
    } catch (error) {
      console.error('Failed to export TCOE report PDF:', error);
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportExcel = async () => {
    if (!(analysis || (rows && rows.length))) return;
    try {
      setExportingExcel(true);
      const filenameLabel = (currentWeekEndingLabel || 'tcoe').replace(/[\s,]/g, '-');
      if (rows && rows.length) {
        const exportRows = rows.map((row) => ({
          portfolio: row.portfolio_display || row.portfolio,
          projectLabel: row.project_label || '',
          projectKey: row.project_key || '',
          metricName: metricLabel,
          bugs: row.current_week.bugs_count,
          defects: row.current_week.defects_count,
          previousLabel: previousWeekEndingLabel,
          previousLeakage: row.previous_week.leakage_percentage,
          currentLabel: currentWeekEndingLabel,
          currentLeakage: row.current_week.leakage_percentage,
          wowProgress: row.comparison.leakage_change,
          comments: buildCommentText(row as any, metricLabel),
          bugKeys: row.current_week.bugs_keys ?? [],
          defectKeys: row.current_week.defects_keys ?? [],
          bugsJql: row.current_week.bugs_jql || '',
          defectsJql: row.current_week.defects_jql || ''
        }));
        await exportTcoeReportAsExcelMulti(exportRows, `tcoe-report-${filenameLabel}.xlsx`);
      } else if (analysis) {
        await exportTcoeReportAsExcel({
          portfolio: portfolioLabel,
          projectLabel,
          metricName: metricLabel,
          projectKey: projectKeyDisplay,
          bugs: analysis.current_week.bugs_count,
          defects: analysis.current_week.defects_count,
          previousLabel: previousWeekEndingLabel,
          previousLeakage: analysis.previous_week.leakage_percentage,
          currentLabel: currentWeekEndingLabel,
          currentLeakage: analysis.current_week.leakage_percentage,
          wowProgress: analysis.comparison.leakage_change,
          comments: commentText,
          bugKeys,
          defectKeys,
          bugsJql,
          defectsJql
        }, `tcoe-report-${filenameLabel}.xlsx`);
      }
    } catch (error) {
      console.error('Failed to export TCOE report Excel:', error);
    } finally {
      setExportingExcel(false);
    }
  };

  // Color palette from design
  const colorPalette = {
    positive: {
      icon: '#718539',      // green.600
      background: '#E8F0D1' // green.50
    },
    warning: {
      icon: '#E5B176',      // peach.500
      text: '#C77F2E',      // peach.600
      background: '#FEF3C7' // amber.50
    },
    negative: {
      icon: '#A33030',      // red.600
      background: '#F6EAEA' // red.50
    }
  };

  // Get status icon based on leakage value and change
  const getStatusIcon = (leakage: number, change?: number) => {
    if (change !== undefined) {
      if (change < -10) return { icon: TrendingDown, color: colorPalette.positive.icon, label: 'Great' };
      if (change < -2) return { icon: TrendingDown, color: colorPalette.positive.icon, label: 'Good' };
      if (change > 10) return { icon: TrendingUp, color: colorPalette.negative.icon, label: 'Bad' };
      if (change > 2) return { icon: TrendingUp, color: colorPalette.warning.icon, label: 'Warning' };
      if (Math.abs(change) <= 2) return { icon: Equal, color: '#9CA3AF', label: 'Equal' };
      return { icon: Minus, color: '#9CA3AF', label: 'Neutral' };
    }
    
    if (leakage >= 60) return { icon: AlertTriangle, color: colorPalette.negative.icon, label: 'Bad' };
    if (leakage >= 40) return { icon: AlertTriangle, color: colorPalette.warning.icon, label: 'Warning' };
    if (leakage <= 10) return { icon: Check, color: colorPalette.positive.icon, label: 'Great' };
    if (leakage <= 25) return { icon: Check, color: colorPalette.positive.icon, label: 'Good' };
    return { icon: Minus, color: '#9CA3AF', label: 'Neutral' };
  };

  const cardBackground = isDarkMode ? 'rgba(30, 41, 59, 0.8)' : '#FFFFFF';
  const borderColor = isDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(226, 232, 240, 1)';
  const headingColor = isDarkMode ? '#F1F5F9' : '#0F172A';
  const subheadingColor = isDarkMode ? '#94A3B8' : '#64748B';
  const tableHeaderBg = isDarkMode ? 'rgba(148, 163, 184, 0.12)' : '#F3F4F6';
  const tableHeaderText = isDarkMode ? '#E2E8F0' : '#1F2937';
  const tableBorderColor = isDarkMode ? 'rgba(148, 163, 184, 0.3)' : borderColor;
  const pdfContainerBg = isDarkMode ? currentTheme.colors.background : '#ffffff';
  const pdfHeaderBg = isDarkMode ? 'rgba(148, 163, 184, 0.16)' : '#F3F4F6';
  const pdfHeaderText = isDarkMode ? '#E2E8F0' : '#1F2937';
  const pdfGrandTotalBg = isDarkMode ? 'rgba(15, 23, 42, 0.9)' : '#1E293B';
  const pdfGrandTotalText = isDarkMode ? '#E2E8F0' : '#F8FAFC';

  return (
    <div
      className="h-full overflow-auto transition-all duration-300"
      style={{ 
        background: isDarkMode 
          ? `linear-gradient(135deg, ${currentTheme.colors.background} 0%, ${currentTheme.colors.surface} 50%, ${currentTheme.colors.background} 100%)`
          : `linear-gradient(135deg, ${currentTheme.colors.background} 0%, ${currentTheme.colors.surface || '#F1F5F9'} 50%, ${currentTheme.colors.background} 100%)`
        ,
        color: headingColor
      }}
    >
      <div className="p-6 space-y-8 w-full">
        {/* Header with Gradient */}
        <div className="flex items-center justify-between">
          <div>
            <h1 
              className="text-4xl font-bold tracking-tight"
              style={{
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                background: `linear-gradient(135deg, ${currentTheme.colors.primary} 0%, ${currentTheme.colors.secondary || currentTheme.colors.primary} 50%, ${currentTheme.colors.primary} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                color: 'transparent',
                transition: 'background 0.3s ease'
              }}
            >
              CDK QCOE METRICS
            </h1>
            {(useMultiSelect && selectedProjectKeys.length > 0) && (
              <div className="mt-2">
                <Badge 
                  className="bg-blue-600 dark:bg-blue-500 text-white border-0 px-3 py-1 rounded-lg shadow-sm"
                  style={{
                    backgroundColor: currentTheme.colors.primary
                  }}
                >
                  {selectedProjectKeys.length} Projects Selected
                </Badge>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              onClick={analyzeLeakage}
              className="flex items-center gap-2 text-white rounded-xl px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2"
              style={{
                backgroundColor: currentTheme.colors.primary,
                borderRadius: '12px'
              }}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Generate'}
            </Button>
            <Button
              onClick={handleExportExcel}
              className="rounded-xl px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200"
              style={{
                backgroundColor: cardBackground,
                color: headingColor,
                borderColor: borderColor,
                borderWidth: '1px',
                borderStyle: 'solid',
                borderRadius: '12px'
              }}
              disabled={!analysis && !(rows && rows.length)}
            >
              <FileText className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button
              onClick={handleExportPDF}
              className="rounded-xl px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200"
              style={{
                backgroundColor: cardBackground,
                color: headingColor,
                borderColor: borderColor,
                borderWidth: '1px',
                borderStyle: 'solid',
                borderRadius: '12px'
              }}
              disabled={!analysis && !(rows && rows.length)}
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* Filters Card with Gradient */}
        <div 
          className="rounded-xl shadow-sm p-4"
          style={{
            backgroundColor: cardBackground,
            borderColor: borderColor,
            borderWidth: '1px',
            borderStyle: 'solid'
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Portfolio - Multi-select dropdown */}
            <div className="relative">
            <label className="text-sm font-medium mb-2 block" style={{ color: headingColor, fontFamily: 'Inter, sans-serif' }}>
              Portfolio
            </label>
              <div 
                className="w-full px-3 py-2 rounded-xl border cursor-pointer flex items-center justify-between transition-all duration-200 hover:shadow-md focus-within:ring-2 focus-within:ring-blue-500/70 focus-within:border-blue-500"
                style={{
                  background: isDarkMode 
                    ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(51, 65, 85, 0.8))'
                    : 'linear-gradient(135deg, #FFFFFF, #F8FAFC)',
                  borderColor: portfolioMultiSelectOpen ? currentTheme.colors.primary : borderColor,
                  color: headingColor,
                  borderRadius: '12px',
                  boxShadow: portfolioMultiSelectOpen 
                    ? `0 4px 12px ${currentTheme.colors.primary}25` 
                    : '0 1px 2px rgba(0, 0, 0, 0.05)'
                }}
                onClick={() => {
                if (portfolioMultiSelectOpen) {
                  // Closing - auto-apply temporary selections if they changed
                  const hasChanges = JSON.stringify(tempSelectedPortfolios.sort()) !== JSON.stringify(selectedPortfolios.sort());
                  if (hasChanges && tempSelectedPortfolios.length > 0) {
                    setSelectedPortfolios([...tempSelectedPortfolios]);
                    setUsePortfolioMultiSelect(true);
                    setSelectedPortfolio('All');
                  }
                } else {
                  // Opening - initialize temp selections with current applied selections
                  setTempSelectedPortfolios([...selectedPortfolios]);
                }
                setPortfolioMultiSelectOpen(!portfolioMultiSelectOpen);
              }}
            >
              <span>
                {selectedPortfolios.length > 0 
                  ? `${selectedPortfolios.length} selected`
                  : selectedPortfolio}
              </span>
              <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            
            {/* Portfolio Multi-select dropdown with gradient */}
            {portfolioMultiSelectOpen && (
              <div 
                className="absolute left-0 top-full z-[9999] mt-2 p-4 rounded-xl border w-full backdrop-blur-sm"
                  style={{
                    background: isDarkMode 
                      ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(51, 65, 85, 0.95))'
                      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98))',
                    borderColor: currentTheme.colors.primary,
                    minWidth: '280px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    boxShadow: isDarkMode
                      ? `0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3), 0 0 0 1px ${currentTheme.colors.primary}40`
                      : `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px ${currentTheme.colors.primary}30`
                }}
              >
                <div className="flex items-center justify-between mb-3 pb-3 border-b" style={{ borderColor: currentTheme.colors.border }}>
                  <span className="text-sm font-semibold" style={{ color: headingColor }}>Select Portfolios</span>
                  <div className="flex gap-1">
                    <button 
                      className="text-xs px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                      onClick={(e) => { e.stopPropagation(); selectAllPortfolios(); }}
                      style={{ color: currentTheme.colors.primary, borderRadius: '8px' }}
                    >
                      All
                    </button>
                    <button 
                      className="text-xs px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                      onClick={(e) => { e.stopPropagation(); setTempSelectedPortfolios([]); }}
                      style={{ color: currentTheme.colors.textSecondary, borderRadius: '8px' }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  {options.portfolios.map((portfolio) => {
                    const isAll = portfolio === 'All';
                    const isSelected = isAll 
                      ? tempSelectedPortfolios.length === 0 && selectedPortfolio === 'All'
                      : tempSelectedPortfolios.includes(portfolio);
                    return (
                      <div 
                        key={portfolio}
                        className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all duration-150"
                      style={{
                          backgroundColor: isSelected ? `${currentTheme.colors.primary}15` : 'transparent',
                          border: `1px solid ${isSelected ? currentTheme.colors.primary : 'transparent'}`
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isAll) {
                            setTempSelectedPortfolios([]);
                            setSelectedPortfolios([]); // Clear applied selections
                            setSelectedPortfolio('All');
                            setUsePortfolioMultiSelect(false);
                            setPortfolioMultiSelectOpen(false);
                          } else {
                            togglePortfolio(portfolio);
                          }
                        }}
                      >
                        <div 
                          className="w-5 h-5 rounded flex items-center justify-center transition-all duration-150"
                          style={{ 
                            borderWidth: '2px',
                            borderStyle: 'solid',
                            borderColor: isSelected ? currentTheme.colors.primary : currentTheme.colors.border,
                            backgroundColor: isSelected ? currentTheme.colors.primary : 'transparent'
                          }}
                        >
                          {isSelected && <Check className="h-3 w-3 text-white" />}
            </div>
                        <span className="text-sm font-medium" style={{ color: headingColor }}>{portfolio}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: currentTheme.colors.border }}>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1" 
                    onClick={(e) => { e.stopPropagation(); cancelPortfolioMultiSelect(); }}
                    style={{
                      borderColor: currentTheme.colors.border,
                      color: currentTheme.colors.textSecondary
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1" 
                    onClick={(e) => { e.stopPropagation(); applyPortfolioMultiSelect(); }}
                    disabled={tempSelectedPortfolios.length === 0}
                    style={{
                      backgroundColor: tempSelectedPortfolios.length > 0 ? currentTheme.colors.primary : currentTheme.colors.border,
                      color: '#FFFFFF',
                      opacity: tempSelectedPortfolios.length > 0 ? 1 : 0.5
                    }}
                  >
                    Apply {tempSelectedPortfolios.length > 0 ? `(${tempSelectedPortfolios.length})` : ''}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Project Key - Multi-select dropdown */}
          <div className="relative">
            <label className="text-sm font-medium mb-2 block" style={{ color: headingColor, fontFamily: 'Inter, sans-serif' }}>
              Project Key
            </label>
            <div 
              className="w-full px-3 py-2 rounded-xl border cursor-pointer flex items-center justify-between transition-all duration-200 hover:shadow-md focus-within:ring-2 focus-within:ring-blue-500/70 focus-within:border-blue-500"
                style={{
                  background: isDarkMode 
                    ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(51, 65, 85, 0.8))'
                    : 'linear-gradient(135deg, #FFFFFF, #F8FAFC)',
                  borderColor: multiSelectOpen ? currentTheme.colors.primary : borderColor,
                  color: headingColor,
                  borderRadius: '12px',
                  boxShadow: multiSelectOpen 
                    ? `0 4px 12px ${currentTheme.colors.primary}25` 
                    : '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}
              onClick={() => {
                if (multiSelectOpen) {
                  // Closing - auto-apply temporary selections if they changed
                  const hasChanges = JSON.stringify(tempSelectedProjectKeys.sort()) !== JSON.stringify(selectedProjectKeys.sort());
                  if (hasChanges && tempSelectedProjectKeys.length > 0) {
                    setSelectedProjectKeys([...tempSelectedProjectKeys]);
                    setUseMultiSelect(true);
                    setSelectedProjectKey('All');
                    const tempNames = tempSelectedProjectKeys.map(key => findProjectNameForKey(key)).filter((name): name is string => name !== null);
                    if (tempNames.length === 1) {
                      setSelectedProjectName(tempNames[0]);
                    } else if (tempNames.length > 1) {
                      setSelectedProjectName('All');
                    }
                  }
                } else {
                  // Opening - initialize temp selections with current applied selections
                  setTempSelectedProjectKeys([...selectedProjectKeys]);
                }
                setMultiSelectOpen(!multiSelectOpen);
              }}
            >
              <span>
                {useMultiSelect && selectedProjectKeys.length > 0 
                  ? `${selectedProjectKeys.length} selected`
                  : selectedProjectKey}
              </span>
              <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            
            {/* Project Key Multi-select dropdown with gradient */}
            {multiSelectOpen && (
              <div 
                className="absolute left-0 top-full z-[9999] mt-2 p-4 rounded-xl border w-full backdrop-blur-sm"
                style={{
                  background: isDarkMode 
                    ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(51, 65, 85, 0.95))'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98))',
                  borderColor: currentTheme.colors.primary,
                  minWidth: '300px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  boxShadow: isDarkMode
                    ? `0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3), 0 0 0 1px ${currentTheme.colors.primary}40`
                    : `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px ${currentTheme.colors.primary}30`
                }}
              >
                <div className="flex items-center justify-between mb-3 pb-3 border-b" style={{ borderColor: currentTheme.colors.border }}>
                  <span className="text-sm font-semibold" style={{ color: headingColor }}>Select Project Keys</span>
                  <div className="flex gap-1">
                    <button 
                      className="text-xs px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                      onClick={(e) => { e.stopPropagation(); selectAllProjectKeys(); }}
                      style={{ color: currentTheme.colors.primary, borderRadius: '8px' }}
                    >
                      All
                    </button>
                    <button 
                      className="text-xs px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                      onClick={(e) => { e.stopPropagation(); setTempSelectedProjectKeys([]); }}
                      style={{ color: currentTheme.colors.textSecondary, borderRadius: '8px' }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  {options.project_keys.map((key) => {
                    const isAll = key === 'All';
                    const isSelected = isAll 
                      ? tempSelectedProjectKeys.length === 0 && selectedProjectKey === 'All'
                      : tempSelectedProjectKeys.includes(key);
                    const matchingName = !isAll ? findProjectNameForKey(key) : null;
                    return (
                      <div 
                        key={key}
                        className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all duration-150"
                        style={{ 
                          backgroundColor: isSelected ? `${currentTheme.colors.primary}15` : 'transparent',
                          border: `1px solid ${isSelected ? currentTheme.colors.primary : 'transparent'}`
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isAll) {
                            setTempSelectedProjectKeys([]);
                            setSelectedProjectKeys([]); // Clear applied selections
                            setSelectedProjectKey('All');
                            setUseMultiSelect(false);
                            setMultiSelectOpen(false);
                          } else {
                            toggleProjectKey(key);
                          }
                        }}
                      >
                        <div 
                          className="w-5 h-5 rounded flex items-center justify-center transition-all duration-150"
                          style={{ 
                            borderWidth: '2px',
                            borderStyle: 'solid',
                            borderColor: isSelected ? currentTheme.colors.primary : currentTheme.colors.border,
                            backgroundColor: isSelected ? currentTheme.colors.primary : 'transparent'
                          }}
                        >
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium" style={{ color: headingColor }}>{key}</span>
                          {matchingName && (
                            <span className="text-xs block" style={{ color: currentTheme.colors.textSecondary }}>
                              {matchingName}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: currentTheme.colors.border }}>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1" 
                    onClick={(e) => { e.stopPropagation(); cancelMultiSelect(); }}
                    style={{
                      borderColor: currentTheme.colors.border,
                      color: currentTheme.colors.textSecondary
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1" 
                    onClick={(e) => { e.stopPropagation(); applyMultiSelect(); }}
                    disabled={tempSelectedProjectKeys.length === 0}
                    style={{
                      backgroundColor: tempSelectedProjectKeys.length > 0 ? currentTheme.colors.primary : currentTheme.colors.border,
                      color: '#FFFFFF',
                      opacity: tempSelectedProjectKeys.length > 0 ? 1 : 0.5
                    }}
                  >
                    Apply {tempSelectedProjectKeys.length > 0 ? `(${tempSelectedProjectKeys.length})` : ''}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Metric */}
          <div className="relative">
            <label className="text-sm font-medium mb-2 block" style={{ color: headingColor, fontFamily: 'Inter, sans-serif' }}>
              Metric
            </label>
            <div 
              className="w-full rounded-xl px-3 py-2 text-sm border cursor-pointer transition-all duration-200 hover:shadow-md flex items-center justify-between"
              style={{
                borderColor: currentTheme.colors.border,
                backgroundColor: isDarkMode ? currentTheme.colors.surface : '#FFFFFF',
                color: headingColor,
                borderRadius: '12px'
              }}
              onClick={() => {
                if (metricMultiSelectOpen) {
                  // Closing - auto-apply temporary selections if they changed
                  const hasChanges = JSON.stringify(tempSelectedMetrics.sort()) !== JSON.stringify(selectedMetrics.sort());
                  if (hasChanges && tempSelectedMetrics.length > 0) {
                    setSelectedMetrics([...tempSelectedMetrics]);
                    setUseMetricMultiSelect(true);
                    setSelectedMetric('all');
                  }
                } else {
                  // Opening - initialize temp selections with current applied selections
                  setTempSelectedMetrics([...selectedMetrics]);
                }
                setMetricMultiSelectOpen(!metricMultiSelectOpen);
              }}
            >
              <span className="flex items-center gap-2">
                {useMetricMultiSelect && selectedMetrics.length > 0 
                  ? `${selectedMetrics.length} selected`
                  : selectedMetric === 'all' ? 'ALL' : METRIC_OPTIONS.find(m => m.value === selectedMetric)?.label || 'Select Metric'}
              </span>
              <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            
            {/* Metric Multi-select dropdown */}
            {metricMultiSelectOpen && (
              <div 
                className="absolute left-0 top-full z-[9999] mt-2 p-4 rounded-xl border w-full backdrop-blur-sm"
                style={{
                  background: isDarkMode 
                    ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(51, 65, 85, 0.95))'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98))',
                  borderColor: currentTheme.colors.primary,
                  minWidth: '300px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  boxShadow: isDarkMode
                    ? `0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3), 0 0 0 1px ${currentTheme.colors.primary}40`
                    : `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px ${currentTheme.colors.primary}30`
                }}
              >
                <div className="flex items-center justify-between mb-3 pb-3 border-b" style={{ borderColor: currentTheme.colors.border }}>
                  <span className="text-sm font-semibold" style={{ color: headingColor }}>Select Metrics</span>
                  <div className="flex gap-1">
                    <button 
                      className="text-xs px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                      onClick={(e) => { e.stopPropagation(); selectAllMetrics(); }}
                      style={{ color: currentTheme.colors.primary, borderRadius: '8px' }}
                    >
                      All
                    </button>
                    <button 
                      className="text-xs px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                      onClick={(e) => { e.stopPropagation(); clearMetricMultiSelect(); }}
                      style={{ color: currentTheme.colors.textSecondary, borderRadius: '8px' }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <div 
                    className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all duration-150"
                    style={{ 
                      backgroundColor: selectedMetric === 'all' && !useMetricMultiSelect ? `${currentTheme.colors.primary}15` : 'transparent',
                      border: `1px solid ${selectedMetric === 'all' && !useMetricMultiSelect ? currentTheme.colors.primary : 'transparent'}`
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMetric('all');
                      setUseMetricMultiSelect(false);
                      setSelectedMetrics([]);
                      setMetricMultiSelectOpen(false);
                    }}
                  >
                    <div 
                      className="w-5 h-5 rounded flex items-center justify-center transition-all duration-150"
                      style={{ 
                        borderWidth: '2px',
                        borderStyle: 'solid',
                        borderColor: selectedMetric === 'all' && !useMetricMultiSelect ? currentTheme.colors.primary : currentTheme.colors.border,
                        backgroundColor: selectedMetric === 'all' && !useMetricMultiSelect ? currentTheme.colors.primary : 'transparent'
                      }}
                    >
                      {selectedMetric === 'all' && !useMetricMultiSelect && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-semibold" style={{ color: headingColor }}>ALL</span>
                    </div>
                  </div>
                  {METRIC_OPTIONS.map((option) => {
                    // When dropdown is open, always check tempSelectedMetrics for display
                    const isSelected = metricMultiSelectOpen
                      ? tempSelectedMetrics.includes(option.value)
                      : useMetricMultiSelect 
                      ? tempSelectedMetrics.includes(option.value)
                      : selectedMetric === option.value;
                    return (
                      <div 
                        key={option.value}
                        className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all duration-150"
                        style={{ 
                          backgroundColor: isSelected ? `${currentTheme.colors.primary}15` : 'transparent',
                          border: `1px solid ${isSelected ? currentTheme.colors.primary : 'transparent'}`,
                          opacity: option.disabled ? 0.5 : 1
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (option.disabled) return;
                          // When dropdown is open, always use multi-select toggle behavior
                            toggleMetric(option.value);
                        }}
                      >
                        <div 
                          className="w-5 h-5 rounded flex items-center justify-center transition-all duration-150"
                          style={{ 
                            borderWidth: '2px',
                            borderStyle: 'solid',
                            borderColor: isSelected ? currentTheme.colors.primary : currentTheme.colors.border,
                            backgroundColor: isSelected ? currentTheme.colors.primary : 'transparent'
                          }}
                        >
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium" style={{ color: headingColor }}>{option.label}</span>
                          {option.disabled && (
                            <span className="text-xs block mt-1" style={{ color: currentTheme.colors.textSecondary }}>
                              Coming Soon
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: currentTheme.colors.border }}>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1" 
                    onClick={(e) => { e.stopPropagation(); cancelMetricMultiSelect(); }}
                    style={{
                      borderColor: currentTheme.colors.border,
                      color: currentTheme.colors.textSecondary
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1" 
                    onClick={(e) => { e.stopPropagation(); applyMetricMultiSelect(); }}
                    disabled={tempSelectedMetrics.length === 0}
                    style={{
                      backgroundColor: tempSelectedMetrics.length > 0 ? currentTheme.colors.primary : currentTheme.colors.border,
                      color: '#FFFFFF',
                      opacity: tempSelectedMetrics.length > 0 ? 1 : 0.5
                    }}
                  >
                    Apply {tempSelectedMetrics.length > 0 ? `(${tempSelectedMetrics.length})` : ''}
                  </Button>
                </div>
              </div>
            )}
          </div>

          </div>
        </div>

        {/* Date Filter Options with Gradient Card */}
        <Card 
          className="rounded-xl shadow-sm"
          style={{
            backgroundColor: cardBackground,
            borderColor: borderColor,
            borderWidth: '1px',
            borderStyle: 'solid'
          }}
        >
          <CardContent className="p-4">
            {/* Filter Mode & Comparison Toggle */}
            <div className="flex flex-wrap items-center gap-6 mb-4">
              {/* Date Filter Mode */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium" style={{ color: headingColor, fontFamily: 'Inter, sans-serif' }}>Date Filter:</span>
                <div className="flex gap-2">
                  {[
                    { value: 'custom', label: 'Custom Range' },
                    { value: 'pi', label: 'By PI' },
                    { value: 'sprint', label: 'By Sprint' },
                    { value: 'month', label: 'By Month/Year' },
                  ].map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() => setDateFilterMode(mode.value as DateFilterMode)}
                      className="px-3 py-1.5 text-sm rounded-xl border transition-all duration-200 font-medium"
                      style={{
                        background: dateFilterMode === mode.value 
                          ? `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary || currentTheme.colors.primary})`
                          : isDarkMode 
                            ? `linear-gradient(135deg, ${currentTheme.colors.surface}, ${currentTheme.colors.background})`
                            : `linear-gradient(135deg, ${cardBackground}, ${currentTheme.colors.background})`,
                        borderColor: dateFilterMode === mode.value ? currentTheme.colors.primary : borderColor,
                        color: dateFilterMode === mode.value ? '#FFFFFF' : headingColor,
                        borderRadius: '12px',
                        boxShadow: dateFilterMode === mode.value 
                          ? `0 4px 12px ${currentTheme.colors.primary}40` 
                          : '0 1px 2px rgba(0, 0, 0, 0.05)',
                        fontFamily: 'Inter, sans-serif'
                      }}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comparison Toggle - Neat Switch like Dark Mode */}
              <div className="flex items-center gap-3">
                <label htmlFor="enableComparison" className="text-sm font-medium cursor-pointer" style={{ color: headingColor, fontFamily: 'Inter, sans-serif' }}>
                  Enable Comparison
                </label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enableComparison}
                  onClick={() => setEnableComparison(!enableComparison)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:ring-offset-2 ${
                    enableComparison 
                      ? 'bg-blue-600 dark:bg-blue-500' 
                      : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      enableComparison ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Date Inputs based on mode */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Analysis Period */}
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700" style={{ 
                background: isDarkMode 
                  ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.5), rgba(51, 65, 85, 0.5))'
                  : 'linear-gradient(135deg, #F8FAFC, #FFFFFF)'
              }}>
                  <label className="text-sm font-medium mb-2 block" style={{ color: headingColor, fontFamily: 'Inter, sans-serif' }}>
                  {enableComparison ? 'Current Period' : 'Analysis Period'}
                </label>
                
                {dateFilterMode === 'custom' && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs mb-1 block" style={{ color: subheadingColor, fontFamily: 'Inter, sans-serif' }}>From</label>
                  <input
                    type="date"
                    value={currentFrom}
                    onChange={(e) => {
                      setCurrentFrom(e.target.value);
                      setSelectedSprint('All'); // Clear sprint selection when manually changing dates
                    }}
                        className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all duration-200"
                        style={{ 
                          fontFamily: 'Inter, sans-serif',
                          backgroundColor: cardBackground,
                          borderColor: borderColor,
                          color: headingColor,
                          borderRadius: '12px'
                        }}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs mb-1 block" style={{ color: subheadingColor, fontFamily: 'Inter, sans-serif' }}>To</label>
                  <input
                    type="date"
                    value={currentTo}
                    onChange={(e) => {
                      setCurrentTo(e.target.value);
                      setSelectedSprint('All'); // Clear sprint selection when manually changing dates
                    }}
                        className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all duration-200"
                        style={{ 
                          fontFamily: 'Inter, sans-serif',
                          backgroundColor: cardBackground,
                          borderColor: borderColor,
                          color: headingColor,
                          borderRadius: '12px'
                        }}
                  />
                </div>
              </div>
                )}

                {dateFilterMode === 'pi' && (
                  <Select value={selectedPI} onValueChange={(v) => {
                    setSelectedPI(v);
                    const pi = PI_OPTIONS.find(p => p.value === v);
                    if (pi) {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const commitStartDate = new Date(pi.commitStart);
                      commitStartDate.setHours(0, 0, 0, 0);
                      const isUpcoming = commitStartDate > today;
                      
                      // Only set dates if PI has started
                      if (!isUpcoming) {
                        setCurrentFrom(pi.startDate); 
                        setCurrentTo(pi.endDate);
                      }
                    }
                  }}>
                    <SelectTrigger 
                      className="w-full rounded-xl px-3 py-2 text-sm focus:ring-2 transition-all duration-200 hover:shadow-md"
                    >
                      <SelectValue placeholder="Select PI" />
                    </SelectTrigger>
                    <SelectContent>
                      {PI_OPTIONS.map((pi) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const commitStartDate = new Date(pi.commitStart);
                        commitStartDate.setHours(0, 0, 0, 0);
                        const isUpcoming = commitStartDate > today;
                        
                        return (
                          <SelectItem 
                            key={pi.value} 
                            value={pi.value}
                            disabled={isUpcoming}
                            className={isUpcoming ? 'opacity-50 cursor-not-allowed' : ''}
                          >
                            {isUpcoming ? `${pi.label} - PI yet to start` : pi.label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}

                {dateFilterMode === 'sprint' && (
                  <Select value={selectedSprint} onValueChange={(v) => {
                    setSelectedSprint(v);
                    if (v !== 'All') {
                      const sprint = SPRINT_OPTIONS.find(s => s.value === v);
                      if (sprint) {
                        setCurrentFrom(sprint.startDate);
                        setCurrentTo(sprint.endDate);
                      }
                    }
                  }}>
                    <SelectTrigger 
                      className="w-full rounded-xl px-3 py-2 text-sm focus:ring-2 transition-all duration-200 hover:shadow-md"
                    >
                      <SelectValue placeholder="Select Sprint" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Sprints</SelectItem>
                      {SPRINT_OPTIONS.map((sprint) => (
                        <SelectItem 
                          key={sprint.value} 
                          value={sprint.value}
                        >
                          {sprint.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {dateFilterMode === 'month' && (
                  <div className="flex gap-2">
                    <Select value={selectedMonth.toString()} onValueChange={(v) => {
                      const month = parseInt(v);
                      setSelectedMonth(month);
                      const lastDay = new Date(selectedYear, month, 0).getDate();
                      setCurrentFrom(`${selectedYear}-${month.toString().padStart(2, '0')}-01`);
                      setCurrentTo(`${selectedYear}-${month.toString().padStart(2, '0')}-${lastDay}`);
                    }}>
                      <SelectTrigger 
                        className="flex-1 rounded-xl px-3 py-2 text-sm focus:ring-2 transition-all duration-200 hover:shadow-md"
                      >
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTH_OPTIONS.map((m) => (
                          <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedYear.toString()} onValueChange={(v) => {
                      const year = parseInt(v);
                      setSelectedYear(year);
                      const lastDay = new Date(year, selectedMonth, 0).getDate();
                      setCurrentFrom(`${year}-${selectedMonth.toString().padStart(2, '0')}-01`);
                      setCurrentTo(`${year}-${selectedMonth.toString().padStart(2, '0')}-${lastDay}`);
                    }}>
                      <SelectTrigger 
                        className="w-24 rounded-xl px-3 py-2 text-sm focus:ring-2 transition-all duration-200 hover:shadow-md"
                      >
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {YEAR_OPTIONS.map((y) => (
                          <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
            </div>

              {/* Comparison Period - only show when comparison enabled */}
              {enableComparison && (
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700" style={{ 
                  background: isDarkMode 
                    ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.5), rgba(51, 65, 85, 0.5))'
                    : 'linear-gradient(135deg, #F8FAFC, #FFFFFF)'
                }}>
                  <label className="text-sm font-medium mb-2 block" style={{ color: headingColor, fontFamily: 'Inter, sans-serif' }}>
                    Comparison Period
              </label>
                  
                  {dateFilterMode === 'sprint' && (
                    <Select value={comparisonSprint} onValueChange={(v) => {
                      setComparisonSprint(v);
                      if (v !== 'All') {
                        const sprint = SPRINT_OPTIONS.find(s => s.value === v);
                        if (sprint) {
                          setPreviousFrom(sprint.startDate);
                          setPreviousTo(sprint.endDate);
                        }
                      }
                    }}>
                      <SelectTrigger 
                        className="w-full rounded-xl px-3 py-2 text-sm focus:ring-2 transition-all duration-200 hover:shadow-md"
                      >
                        <SelectValue placeholder="Select Comparison Sprint" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All Sprints</SelectItem>
                        {SPRINT_OPTIONS.map((sprint) => (
                          <SelectItem 
                            key={sprint.value} 
                            value={sprint.value}
                          >
                            {sprint.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {dateFilterMode === 'custom' && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs mb-1 block" style={{ color: subheadingColor, fontFamily: 'Inter, sans-serif' }}>From</label>
                  <input
                    type="date"
                    value={previousFrom}
                    onChange={(e) => {
                      setPreviousFrom(e.target.value);
                      setComparisonSprint('All'); // Clear sprint selection when manually changing dates
                    }}
                          className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all duration-200"
                          style={{ 
                            fontFamily: 'Inter, sans-serif',
                            backgroundColor: cardBackground,
                            borderColor: borderColor,
                            color: headingColor,
                            borderRadius: '12px'
                          }}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs mb-1 block" style={{ color: subheadingColor, fontFamily: 'Inter, sans-serif' }}>To</label>
                  <input
                    type="date"
                    value={previousTo}
                    onChange={(e) => {
                      setPreviousTo(e.target.value);
                      setComparisonSprint('All'); // Clear sprint selection when manually changing dates
                    }}
                          className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all duration-200"
                          style={{ 
                            fontFamily: 'Inter, sans-serif',
                            backgroundColor: cardBackground,
                            borderColor: borderColor,
                            color: headingColor,
                            borderRadius: '12px'
                          }}
                  />
                </div>
              </div>
                  )}

                  {dateFilterMode === 'pi' && (
                    <Select value={comparisonPI} onValueChange={(v) => {
                      setComparisonPI(v);
                      const pi = PI_OPTIONS.find(p => p.value === v);
                      if (pi) {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const commitStartDate = new Date(pi.commitStart);
                        commitStartDate.setHours(0, 0, 0, 0);
                        const isUpcoming = commitStartDate > today;
                        
                        // Only set dates if PI has started
                        if (!isUpcoming) {
                          setPreviousFrom(pi.startDate); 
                          setPreviousTo(pi.endDate);
                        }
                      }
                    }}>
                      <SelectTrigger 
                        className="w-full rounded-lg px-3 py-2 text-sm focus:ring-2 transition-all duration-200 hover:shadow-md"
                      >
                        <SelectValue placeholder="Select PI" />
                      </SelectTrigger>
                      <SelectContent>
                        {PI_OPTIONS.map((pi) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const commitStartDate = new Date(pi.commitStart);
                          commitStartDate.setHours(0, 0, 0, 0);
                          const isUpcoming = commitStartDate > today;
                          
                          return (
                            <SelectItem 
                              key={pi.value} 
                              value={pi.value}
                              disabled={isUpcoming}
                              className={isUpcoming ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                              {isUpcoming ? `${pi.label} - PI yet to start` : pi.label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}

                  {dateFilterMode === 'month' && (
                    <div className="flex gap-2">
                      <Select value={comparisonMonth.toString()} onValueChange={(v) => {
                        const month = parseInt(v);
                        setComparisonMonth(month);
                        const lastDay = new Date(comparisonYear, month, 0).getDate();
                        setPreviousFrom(`${comparisonYear}-${month.toString().padStart(2, '0')}-01`);
                        setPreviousTo(`${comparisonYear}-${month.toString().padStart(2, '0')}-${lastDay}`);
                      }}>
                        <SelectTrigger 
                          className="flex-1 rounded-lg px-3 py-2 text-sm focus:ring-2 transition-all duration-200 hover:shadow-md"
                        >
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTH_OPTIONS.map((m) => (
                            <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={comparisonYear.toString()} onValueChange={(v) => {
                        const year = parseInt(v);
                        setComparisonYear(year);
                        const lastDay = new Date(year, comparisonMonth, 0).getDate();
                        setPreviousFrom(`${year}-${comparisonMonth.toString().padStart(2, '0')}-01`);
                        setPreviousTo(`${year}-${comparisonMonth.toString().padStart(2, '0')}-${lastDay}`);
                      }}>
                        <SelectTrigger 
                          className="w-24 rounded-lg px-3 py-2 text-sm focus:ring-2 transition-all duration-200 hover:shadow-md"
                        >
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {YEAR_OPTIONS.map((y) => (
                            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
            </div>
                  )}
          </div>
              )}
            </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert
          className="border flex items-start gap-3"
          style={{
            backgroundColor: isDarkMode ? `${currentTheme.colors.error}20` : '#FEF2F2',
            borderColor: isDarkMode ? `${currentTheme.colors.error}60` : '#FCA5A5',
            color: isDarkMode ? '#FECACA' : '#991B1B'
          }}
        >
          <AlertTriangle className="h-4 w-4" style={{ color: isDarkMode ? '#FECACA' : currentTheme.colors.error }} />
          <AlertDescription className="text-sm" style={{ color: isDarkMode ? '#FECACA' : '#991B1B' }}>
            {error}
          </AlertDescription>
        </Alert>
      )}

        {/* Loading State */}
      {loading && (
        <div
          className="rounded-2xl border px-4 py-3 flex items-center gap-3"
          style={{ backgroundColor: cardBackground, borderColor }}
        >
          <RefreshCw className="h-4 w-4 animate-spin" style={{ color: currentTheme.colors.primary }} />
          <div>
            <p className="text-sm font-medium" style={{ color: headingColor }}>
              Fetching Jira metrics for {portfolioLabel} (Project {projectKeyDisplay})...
            </p>
            <p className="text-xs" style={{ color: subheadingColor }}>
              Comparing weeks ending {selectedWeekEndingPrevious} and {selectedWeekEndingCurrent}
            </p>
          </div>
        </div>
      )}

        {/* Results Table - Professional Corporate Design */}
      {(analysis || (rows && rows.length)) && (() => {
        const dataRows = rows && rows.length ? rows : (analysis ? [analysis] : []);
        const rawDataRows = rawRows && rawRows.length ? rawRows : dataRows;
        if (!dataRows.length) return null;
        
        // Format report generation time to hours, minutes, seconds
        const formatGenerationTime = (seconds: number): string => {
          const hours = Math.floor(seconds / 3600);
          const minutes = Math.floor((seconds % 3600) / 60);
          const secs = Math.floor(seconds % 60);
          const milliseconds = Math.floor((seconds % 1) * 1000);
          
          const parts: string[] = [];
          if (hours > 0) parts.push(`${hours}h`);
          if (minutes > 0) parts.push(`${minutes}m`);
          if (secs > 0 || parts.length === 0) {
            // Show milliseconds only if less than 1 second total, otherwise show seconds
            if (seconds < 1) {
              parts.push(`${milliseconds}ms`);
            } else {
              parts.push(`${secs}s`);
            }
          }
          
          return parts.join(' ');
        };
        
        // Report generation time indicator
        const timeDisplay = reportGenerationTime !== null 
          ? `Report generated in ${formatGenerationTime(reportGenerationTime)}`
          : null;
        
        // Group rows by metric when "All Metrics" is selected
        const groupedRows = selectedMetric === 'all' 
          ? dataRows.reduce((acc, row) => {
              const metricKey = row.metric || 'defect_leakage';
              if (!acc[metricKey]) acc[metricKey] = [];
              acc[metricKey].push(row);
              return acc;
            }, {} as Record<string, Analysis[]>)
          : { [selectedMetric]: dataRows };
        
        // Always keep project-level grouping available for graphs
        const groupedRawRows = selectedMetric === 'all'
          ? rawDataRows.reduce((acc, row) => {
              const metricKey = row.metric || 'defect_leakage';
              if (!acc[metricKey]) acc[metricKey] = [];
              acc[metricKey].push(row);
              return acc;
            }, {} as Record<string, Analysis[]>)
          : { [selectedMetric]: rawDataRows };
        
        // Helper function to get metric-specific headers
        const getMetricHeaders = (metric: string, enableComparison: boolean) => {
          const periodBasedMetrics = ['regression_automation', 'overall_automation', 'test_coverage', 'test_story_ratio', 'bug_ratio', 'test_review_status'];
          
          if (metric === 'regression_automation' || metric === 'overall_automation') {
            return {
              firstCol: metric === 'regression_automation' ? 'Regression Test Case Count' : 'Total Test Case Count',
              period1Col1: 'Automated',
              period1Col2: 'Manual',
              period2Col1: 'Automated',
              period2Col2: 'Manual',
              type: 'automation'
            };
          } else if (metric === 'test_coverage') {
            return {
              firstCol: 'Total Stories',
              period1Col1: 'Stories with Tests',
              period1Col2: 'Stories without Tests',
              period2Col1: 'Stories with Tests',
              period2Col2: 'Stories without Tests',
              percentageLabel: 'Coverage %',
              type: 'coverage'
            };
          } else if (metric === 'test_story_ratio') {
            return {
              firstCol: 'Test Cases',
              period1Col1: 'Stories',
              period1Col2: 'Ratio',
              period2Col1: 'Stories',
              period2Col2: 'Ratio',
              type: 'ratio'
            };
          } else if (metric === 'bug_ratio') {
            return {
              firstCol: 'Bugs Found',
              period1Col1: 'Tests Executed',
              period1Col2: 'Ratio',
              period2Col1: 'Tests Executed',
              period2Col2: 'Ratio',
              type: 'ratio'
            };
          } else if (metric === 'test_review_status') {
            return {
              firstCol: 'Total Stories',
              period1Col1: 'Reviewed Yes',
              period1Col2: 'Reviewed No',
              period2Col1: 'Reviewed Yes',
              period2Col2: 'Reviewed No',
              percentageLabel: 'Review %',
              type: 'review'
            };
          } else {
            // Default: defect_leakage
            return {
              firstCol: 'Bugs Count',
              period1Col1: 'Defects Count',
              period1Col2: 'Leakage %',
              period2Col1: 'Defects Count',
              period2Col2: 'Leakage %',
              type: 'leakage'
            };
          }
        };
        
        // Wrap all cards in a container for PDF export
        const cards = Object.entries(groupedRows).map(([metricKey, metricRows], cardIdx) => {
          const metricRawRows = groupedRawRows[metricKey] || metricRows;
          const isAutomation = metricKey === 'regression_automation' || metricKey === 'overall_automation';
          const periodBasedMetrics = ['regression_automation', 'overall_automation', 'test_coverage', 'test_story_ratio', 'bug_ratio', 'test_review_status'];
          const isPeriodBased = periodBasedMetrics.includes(metricKey);
          const metricOption = METRIC_OPTIONS.find(opt => opt.value === metricKey);
          const metricLabel = metricOption?.label || (isAutomation ? (metricKey === 'regression_automation' ? 'Regression Test Automation' : 'Overall Test Automation') : 'Defect Leakage Rate');
          const metricDescription = metricOption?.description || '';
          const headers = getMetricHeaders(metricKey, enableComparison);
          
          return (
            <Card
              key={`metric-card-${metricKey}-${cardIdx}`}
              id={`tcoe-report-card-${metricKey}`}
              className="overflow-hidden border rounded-xl shadow-sm"
              style={{ 
                backgroundColor: cardBackground,
                borderRadius: '12px',
                border: `1px solid ${borderColor}`,
                boxShadow: isDarkMode 
                  ? `0 1px 3px rgba(0, 0, 0, 0.3)`
                  : '0 1px 3px rgba(0, 0, 0, 0.1)',
                marginTop: cardIdx > 0 ? '24px' : '0'
              }}
            >
              {/* Professional Header with Theme Gradient */}
              <div
                className="px-6 py-5"
                style={{
                  background: isDarkMode 
                    ? `linear-gradient(135deg, ${currentTheme.colors.surface} 0%, ${currentTheme.colors.background} 100%)`
                    : `linear-gradient(135deg, ${currentTheme.colors.primary} 0%, ${currentTheme.colors.secondary || currentTheme.colors.primary} 100%)`,
                  borderBottom: `2px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)'}`,
                  boxShadow: isDarkMode ? '0 2px 4px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0,0,0,0.05)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white mb-1" style={{ 
                      fontFamily: 'Inter, sans-serif', 
                      letterSpacing: '0.025em',
                      textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                    }}>
                      {metricLabel} {enableComparison ? 'Comparison' : 'Analysis'}
                    </h2>
                    <p className="text-sm mt-1.5" style={{ 
                      color: 'rgba(255,255,255,0.9)', 
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 500
                    }}>
                      {metricDescription}
                    </p>
                    <p className="text-xs mt-1.5" style={{ 
                      color: 'rgba(255,255,255,0.75)', 
                      fontFamily: 'Inter, sans-serif'
                    }}>
                      {enableComparison 
                        ? `Period: ${previousWeekEndingLabel} vs ${currentWeekEndingLabel}`
                        : `Reporting Period: ${currentWeekEndingLabel}`
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {(() => {
                      const portfoliosForGraph = Array.from(
                        new Set(
                          metricRawRows
                            .filter(r => r.portfolio && r.portfolio !== 'Grand Total')
                            .map(r => r.portfolio_display || r.portfolio || 'Unknown')
                        )
                      );
                      const hasMultiplePortfolios = portfoliosForGraph.length > 1;
                      const currentSelection = graphPortfolioSelection[metricKey] || 'All';
                      return hasMultiplePortfolios && viewMode[metricKey] === 'graph' ? (
                        <div className="flex items-center gap-2 text-white">
                          <span className="text-xs opacity-80">Portfolio</span>
                          <Select
                            value={currentSelection}
                            onValueChange={(val) =>
                              setGraphPortfolioSelection({
                                ...graphPortfolioSelection,
                                [metricKey]: val
                              })
                            }
                          >
                            <SelectTrigger className="h-9 w-40 bg-white/10 border-white/20 text-white">
                              <SelectValue placeholder="All portfolios" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="All">All portfolios</SelectItem>
                              {portfoliosForGraph.map((p) => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null;
                    })()}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentMode = viewMode[metricKey] || 'table';
                        setViewMode({
                          ...viewMode,
                          [metricKey]: currentMode === 'table' ? 'graph' : 'table'
                        });
                      }}
                      className="bg-white/10 hover:bg-white/20 border-white/20 text-white"
                      style={{
                        backdropFilter: 'blur(10px)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {viewMode[metricKey] === 'graph' ? (
                        <>
                          <Table2 className="h-4 w-4 mr-2" />
                          See Table
                        </>
                      ) : (
                        <>
                          <BarChart3 className="h-4 w-4 mr-2" />
                          See Graph
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

            {/* Conditional rendering: Table or Graph */}
            {viewMode[metricKey] === 'graph' ? (
              <div className="p-6" style={{ backgroundColor: cardBackground }}>
                {(() => {
                  // Prepare data for graphs
                  const selectedPortfolio = graphPortfolioSelection[metricKey] || 'All';
                  const chartData = metricRawRows
                    .filter(row => row.portfolio !== 'Grand Total')
                    .filter(row => {
                      if (selectedPortfolio === 'All') return true;
                      const pLabel = row.portfolio_display || row.portfolio || 'Unknown';
                      return pLabel === selectedPortfolio;
                    })
                    .map(row => {
                      const portfolioLabel = row.portfolio_display || row.portfolio || row.project_label || 'Unknown';
                      const projectLabel = row.project_label || row.project_key || portfolioLabel;
                      const displayLabel = projectLabel.length > 30 ? projectLabel.substring(0, 30) + '...' : projectLabel;
                      const period = enableComparison ? (row.period2 || row.period) : row.period;
                      
                      if (isAutomation) {
                        return {
                          name: displayLabel,
                          fullName: portfolioLabel,
                          current: period?.automation_percentage || 0,
                          previous: enableComparison && row.period1 ? (row.period1.automation_percentage || 0) : undefined,
                          total: row.total_regression_tests || row.total_test_cases || 0,
                          automated: period?.automated_count || 0,
                          manual: period?.manual_count || 0
                        };
                      } else if (metricKey === 'test_coverage') {
                        return {
                          name: displayLabel,
                          fullName: portfolioLabel,
                          current: period?.coverage_percentage || 0,
                          previous: enableComparison && row.period1 ? (row.period1.coverage_percentage || 0) : undefined,
                          total: row.total_stories || 0,
                          withTests: period?.stories_with_tests || 0,
                          withoutTests: period?.stories_without_tests || 0
                        };
                      } else if (metricKey === 'test_story_ratio') {
                        return {
                          name: displayLabel,
                          fullName: portfolioLabel,
                          current: period?.ratio || 0,
                          previous: enableComparison && row.period1 ? (row.period1.ratio || 0) : undefined,
                          totalTests: period?.total_test_cases || 0,
                          totalStories: period?.total_stories || 0
                        };
                      } else if (metricKey === 'bug_ratio') {
                        return {
                          name: displayLabel,
                          fullName: portfolioLabel,
                          current: period?.bugs_found && period?.test_cases_executed 
                            ? (period.bugs_found / period.test_cases_executed) * 100 
                            : 0,
                          previous: enableComparison && row.period1 && row.period1.bugs_found && row.period1.test_cases_executed
                            ? (row.period1.bugs_found / row.period1.test_cases_executed) * 100
                            : undefined,
                          bugs: period?.bugs_found || 0,
                          testsExecuted: period?.test_cases_executed || 0
                        };
                      } else if (metricKey === 'test_review_status') {
                        return {
                          name: displayLabel,
                          fullName: portfolioLabel,
                          current: period?.review_percentage || 0,
                          previous: enableComparison && row.period1 ? (row.period1.review_percentage || 0) : undefined,
                          reviewed: period?.reviewed_yes || 0,
                          notReviewed: period?.reviewed_no || 0,
                          notSet: period?.not_set || 0
                        };
                      } else {
                        // Defect leakage
                        return {
                          name: displayLabel,
                          fullName: portfolioLabel,
                          current: row.current_week?.leakage_percentage || 0,
                          previous: enableComparison ? (row.previous_week?.leakage_percentage || 0) : undefined,
                          bugs: row.current_week?.bugs_count || 0,
                          defects: row.current_week?.defects_count || 0
                        };
                      }
                    })
                    .sort((a, b) => b.current - a.current); // Sort by current value descending

                  const chartColors = {
                    primary: isDarkMode ? '#60A5FA' : '#3B82F6',
                    secondary: isDarkMode ? '#34D399' : '#10B981',
                    negative: isDarkMode ? '#F87171' : '#EF4444',
                    text: isDarkMode ? '#E5E7EB' : '#1F2937',
                    grid: isDarkMode ? '#374151' : '#E5E7EB'
                  };

                  return (
                    <div className="space-y-6">
                      {/* Main metric chart */}
                      <div>
                        <h3 className="text-sm font-semibold mb-4" style={{ color: headingColor }}>
                          {isAutomation ? 'Automation %' : 
                           metricKey === 'test_coverage' ? 'Coverage %' : 
                           metricKey === 'test_story_ratio' ? 'Test/Story Ratio' :
                           metricKey === 'bug_ratio' ? 'Bug Ratio (%)' :
                           metricKey === 'test_review_status' ? 'Review %' :
                           'Leakage %'} by Portfolio/Project
                        </h3>
                        <ResponsiveContainer width="100%" height={400}>
                          {enableComparison ? (
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                              <XAxis 
                                dataKey="name" 
                                angle={-45}
                                textAnchor="end"
                                height={100}
                                tick={{ fill: chartColors.text, fontSize: 12 }}
                              />
                              <YAxis 
                                tick={{ fill: chartColors.text, fontSize: 12 }}
                                label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft', fill: chartColors.text }}
                              />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                                  border: `1px solid ${chartColors.grid}`,
                                  borderRadius: '8px'
                                }}
                                labelStyle={{ color: chartColors.text, fontWeight: 'bold' }}
                                formatter={(value: any) => `${Number(value).toFixed(1)}%`}
                              />
                              <Legend 
                                wrapperStyle={{ color: chartColors.text }}
                              />
                              <Bar 
                                dataKey="previous" 
                                fill={chartColors.secondary} 
                                name={enableComparison ? (dateFilterMode === 'pi' ? comparisonPI : previousWeekEndingLabel) : 'Previous'}
                                radius={[4, 4, 0, 0]}
                              />
                              <Bar 
                                dataKey="current" 
                                fill={chartColors.primary} 
                                name={dateFilterMode === 'pi' ? selectedPI : currentWeekEndingLabel}
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          ) : (
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                              <XAxis 
                                dataKey="name" 
                                angle={-45}
                                textAnchor="end"
                                height={100}
                                tick={{ fill: chartColors.text, fontSize: 12 }}
                              />
                              <YAxis 
                                tick={{ fill: chartColors.text, fontSize: 12 }}
                                label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft', fill: chartColors.text }}
                              />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                                  border: `1px solid ${chartColors.grid}`,
                                  borderRadius: '8px'
                                }}
                                labelStyle={{ color: chartColors.text, fontWeight: 'bold' }}
                                formatter={(value: any) => `${Number(value).toFixed(1)}%`}
                              />
                              <Bar 
                                dataKey="current" 
                                fill={chartColors.primary} 
                                name={isAutomation ? 'Automation %' : 
                                      metricKey === 'test_coverage' ? 'Coverage %' : 
                                      metricKey === 'test_story_ratio' ? 'Ratio' :
                                      metricKey === 'bug_ratio' ? 'Bug Ratio %' :
                                      metricKey === 'test_review_status' ? 'Review %' :
                                      'Leakage %'}
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          )}
                        </ResponsiveContainer>
                      </div>

                      {/* Additional breakdown charts for automation metrics */}
                      {isAutomation && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h3 className="text-sm font-semibold mb-4" style={{ color: headingColor }}>
                              Automated vs Manual Tests
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                                <XAxis 
                                  dataKey="name" 
                                  angle={-45}
                                  textAnchor="end"
                                  height={100}
                                  tick={{ fill: chartColors.text, fontSize: 11 }}
                                />
                                <YAxis tick={{ fill: chartColors.text, fontSize: 12 }} />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                                    border: `1px solid ${chartColors.grid}`,
                                    borderRadius: '8px'
                                  }}
                                  labelStyle={{ color: chartColors.text }}
                                />
                                <Legend wrapperStyle={{ color: chartColors.text }} />
                                <Bar dataKey="automated" fill={chartColors.secondary} name="Automated" />
                                <Bar dataKey="manual" fill={chartColors.negative} name="Manual" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold mb-4" style={{ color: headingColor }}>
                              Total Tests by Portfolio/Project
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                                <XAxis 
                                  dataKey="name" 
                                  angle={-45}
                                  textAnchor="end"
                                  height={100}
                                  tick={{ fill: chartColors.text, fontSize: 11 }}
                                />
                                <YAxis tick={{ fill: chartColors.text, fontSize: 12 }} />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                                    border: `1px solid ${chartColors.grid}`,
                                    borderRadius: '8px'
                                  }}
                                  labelStyle={{ color: chartColors.text }}
                                />
                                <Bar dataKey="total" fill={chartColors.primary} name="Total Tests" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : (
            <div className="overflow-x-auto pdf-table" style={{ width: '100%', margin: '0 auto', pageBreakInside: 'avoid' }}>
              <table 
                className="w-full border-collapse pdf-table" 
                style={{ 
                  fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                  width: '100%',
                  tableLayout: 'auto',
                  borderSpacing: 0,
                  borderCollapse: 'collapse',
                  pageBreakInside: 'avoid'
                }}
              >
                  <thead>
                  <tr className="pdf-table-header" style={{ 
                    backgroundColor: tableHeaderBg,
                    color: tableHeaderText,
                    fontWeight: 500
                  }}>
                    <th className="text-left pdf-table-header" style={{ 
                      color: tableHeaderText, 
                      backgroundColor: tableHeaderBg,
                      fontWeight: 500,
                      borderBottom: `2px solid ${tableBorderColor}`, 
                      borderRight: `1px solid ${tableBorderColor}`,
                      fontFamily: 'Inter, sans-serif',
                      padding: '8px 12px',
                      fontSize: '13px'
                    }}>Portfolio</th>
                    {isPeriodBased ? (
                      <>
                        <th className="text-center py-3 px-4 text-xs font-semibold" style={{ 
                          color: headingColor, 
                          borderBottom: `2px solid ${tableBorderColor}`, 
                          borderRight: `1px solid ${tableBorderColor}`,
                          fontFamily: 'Inter, sans-serif'
                        }}>{`${headers.firstCol} (${dateFilterMode === 'pi' ? selectedPI : currentWeekEndingLabel})`}</th>
                        {enableComparison && (
                          <>
                            <th className="text-center py-3 px-4 text-xs font-semibold" style={{ 
                              color: headingColor, 
                              borderBottom: `2px solid ${tableBorderColor}`, 
                              borderRight: `1px solid ${tableBorderColor}`,
                              fontFamily: 'Inter, sans-serif'
                            }}>
                              {dateFilterMode === 'pi' ? comparisonPI : previousWeekEndingLabel}<br/>
                              <span className="font-normal text-[10px]">{headers.period1Col1}</span>
                            </th>
                            <th className="text-center py-3 px-4 text-xs font-semibold" style={{ 
                              color: headingColor, 
                              borderBottom: `2px solid ${tableBorderColor}`, 
                              borderRight: `1px solid ${tableBorderColor}`,
                              fontFamily: 'Inter, sans-serif'
                            }}>
                              {dateFilterMode === 'pi' ? comparisonPI : previousWeekEndingLabel}<br/>
                              <span className="font-normal text-[10px]">{headers.period1Col2}</span>
                            </th>
                          </>
                        )}
                        <th className="text-center py-3 px-4 text-xs font-semibold" style={{ 
                          color: headingColor, 
                          borderBottom: `2px solid ${tableBorderColor}`, 
                          borderRight: `1px solid ${tableBorderColor}`,
                          fontFamily: 'Inter, sans-serif'
                        }}>
                          {dateFilterMode === 'pi' ? selectedPI : currentWeekEndingLabel}<br/>
                          <span className="font-normal text-[10px]">{headers.period2Col1}</span>
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-semibold" style={{ 
                          color: headingColor, 
                          borderBottom: `2px solid ${tableBorderColor}`, 
                          borderRight: `1px solid ${tableBorderColor}`,
                          fontFamily: 'Inter, sans-serif'
                        }}>
                          {dateFilterMode === 'pi' ? selectedPI : currentWeekEndingLabel}<br/>
                          <span className="font-normal text-[10px]">{headers.period2Col2}</span>
                        </th>
                        {enableComparison && (
                          <th className="text-center py-3 px-4 text-xs font-semibold" style={{ 
                            color: headingColor, 
                            borderBottom: `2px solid ${tableBorderColor}`, 
                            borderRight: `1px solid ${tableBorderColor}`,
                            fontFamily: 'Inter, sans-serif'
                          }}>Change</th>
                        )}
                        <th className="text-left py-3 px-4 text-xs font-semibold" style={{ 
                          color: headingColor, 
                          borderBottom: `2px solid ${tableBorderColor}`,
                          fontFamily: 'Inter, sans-serif'
                        }}>Comments</th>
                      </>
                    ) : (
                      <>
                        <th className="text-center py-3 px-4 text-xs font-semibold" style={{ 
                          color: headingColor, 
                          borderBottom: `2px solid ${tableBorderColor}`, 
                          borderRight: `1px solid ${tableBorderColor}`,
                          fontFamily: 'Inter, sans-serif'
                        }}>Bugs Count</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold" style={{ 
                          color: headingColor, 
                          borderBottom: `2px solid ${tableBorderColor}`, 
                          borderRight: `1px solid ${tableBorderColor}`,
                          fontFamily: 'Inter, sans-serif'
                        }}>Defects Count</th>
                        {enableComparison && (
                          <th className="text-center py-3 px-4 text-xs font-semibold" style={{ 
                            color: headingColor, 
                            borderBottom: `2px solid ${tableBorderColor}`, 
                            borderRight: `1px solid ${tableBorderColor}`,
                            fontFamily: 'Inter, sans-serif'
                          }}>
                            {dateFilterMode === 'pi' ? comparisonPI : previousWeekEndingLabel}<br/>
                            <span className="font-normal text-[10px]">Leakage %</span>
                          </th>
                        )}
                        <th className="text-center py-3 px-4 text-xs font-semibold" style={{ 
                          color: headingColor, 
                          borderBottom: `2px solid ${tableBorderColor}`, 
                          borderRight: `1px solid ${tableBorderColor}`,
                          fontFamily: 'Inter, sans-serif'
                        }}>
                          {dateFilterMode === 'pi' ? selectedPI : currentWeekEndingLabel}<br/>
                          <span className="font-normal text-[10px]">Leakage %</span>
                        </th>
                        {enableComparison && (
                          <th className="text-center py-3 px-4 text-xs font-semibold" style={{ 
                            color: headingColor, 
                            borderBottom: `2px solid ${tableBorderColor}`, 
                            borderRight: `1px solid ${tableBorderColor}`,
                            fontFamily: 'Inter, sans-serif'
                          }}>Change</th>
                        )}
                        <th className="text-left py-3 px-4 text-xs font-semibold" style={{ 
                          color: headingColor, 
                          borderBottom: `2px solid ${tableBorderColor}`,
                          fontFamily: 'Inter, sans-serif'
                        }}>Comments</th>
                      </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                  {(() => {
                    const grandTotal = metricRows.length > 1 ? calculateGrandTotal(metricRows) : null;
                    const cellBorder = isDarkMode ? '#374151' : '#E5E7EB';
                    
                    // Professional color scheme
                    // Updated color functions using design palette
                    const getWowBgColor = (change: number) => {
                      if (change < -5) return isDarkMode ? 'rgba(113, 133, 57, 0.2)' : colorPalette.positive.background;
                      if (change < 0) return isDarkMode ? 'rgba(113, 133, 57, 0.15)' : '#ECFDF5';
                      if (change > 5) return isDarkMode ? 'rgba(163, 48, 48, 0.2)' : colorPalette.negative.background;
                      if (change > 0) return isDarkMode ? 'rgba(163, 48, 48, 0.15)' : '#FEF2F2';
                      return isDarkMode ? 'rgba(229, 177, 118, 0.2)' : colorPalette.warning.background;
                    };
                    
                    const getWowTextColor = (change: number) => {
                      if (change < 0) return isDarkMode ? '#A3D9A5' : colorPalette.positive.icon;
                      if (change > 0) return isDarkMode ? '#FCA5A5' : colorPalette.negative.icon;
                      return isDarkMode ? '#FCD34D' : colorPalette.warning.text;
                    };
                    
                    const getLeakageBgColor = (leakage: number) => {
                      if (leakage >= 60) return isDarkMode ? 'rgba(163, 48, 48, 0.2)' : colorPalette.negative.background;
                      if (leakage >= 40) return isDarkMode ? 'rgba(229, 177, 118, 0.2)' : colorPalette.warning.background;
                      return isDarkMode ? 'rgba(113, 133, 57, 0.2)' : colorPalette.positive.background;
                    };
                    
                    const getLeakageTextColor = (leakage: number) => {
                      if (leakage >= 60) return isDarkMode ? '#FCA5A5' : colorPalette.negative.icon;
                      if (leakage >= 40) return isDarkMode ? '#FCD34D' : colorPalette.warning.text;
                      return isDarkMode ? '#A3D9A5' : colorPalette.positive.icon;
                    };

                    const buildRegressionSummary = (rows: Analysis[]): string => {
                      if (!rows.length) return 'No regression automation data available.';

                      const enriched = rows.map((r) => {
                        const label =
                          r.portfolio_display ||
                          r.portfolio ||
                          r.project_label ||
                          'Unknown';
                        const period = enableComparison ? (r.period2 || r.period) : r.period;
                        const pct = period?.automation_percentage ?? 0;
                        const manual = period?.manual_count ?? 0;
                        return { label, pct, manual };
                      }).filter(r => !Number.isNaN(r.pct));

                      if (!enriched.length) return 'No regression automation data available.';

                      enriched.sort((a, b) => b.pct - a.pct);
                      const best = enriched[0];
                      const worst = enriched[enriched.length - 1];
                      const avg =
                        enriched.reduce((sum, r) => sum + r.pct, 0) / enriched.length;

                      let summary = `Overall regression automation averages ${avg.toFixed(
                        1,
                      )}% across ${enriched.length} portfolios.`;

                      if (best) {
                        summary += ` Best coverage is in ${best.label} at ${best.pct.toFixed(
                          1,
                        )}%, with ${best.manual} manual tests remaining.`;
                      }

                      if (worst && worst.label !== best.label) {
                        summary += ` Lowest coverage is in ${worst.label} at ${worst.pct.toFixed(
                          1,
                        )}%, which needs attention due to ${
                          worst.manual
                        } manual tests still not automated.`;
                      }

                      return summary;
                    };

                    // Calculate average automation percentage for comparison
                    const avgAutomation = metricRows.length > 0
                      ? metricRows
                          .map(r => {
                            const p = enableComparison ? (r.period2 || r.period) : r.period;
                            return p?.automation_percentage ?? 0;
                          })
                          .filter(p => !Number.isNaN(p))
                          .reduce((sum, p, _, arr) => sum + p / arr.length, 0)
                      : 0;

                    // Group rows by portfolio to find best/worst projects
                    const portfolioGroups = metricRows.reduce((acc, r) => {
                      const portfolio = r.portfolio_display || r.portfolio || 'Unknown';
                      if (!acc[portfolio]) acc[portfolio] = [];
                      acc[portfolio].push(r);
                      return acc;
                    }, {} as Record<string, Analysis[]>);

                    // Find best and worst project for each portfolio
                    const getPortfolioProjectInsights = (portfolio: string, currentRow?: Analysis): { best?: string; worst?: string } => {
                      // First, try to get project details from the current row (if aggregated)
                      if (currentRow && (currentRow as any)._projectDetails && Array.isArray((currentRow as any)._projectDetails)) {
                        const projectDetails = (currentRow as any)._projectDetails;
                        if (projectDetails.length < 2) return {}; // Need at least 2 projects

                        const withPct = projectDetails.map((p: any) => {
                          const period = enableComparison ? (p.period2 || p.period) : p.period;
                          const pct = period?.automation_percentage ?? 0;
                          return { label: p.project_label || p.project_key || 'Unknown Project', pct };
                        }).filter((p: any) => !Number.isNaN(p.pct));

                        if (withPct.length < 2) return {};

                        const sorted = [...withPct].sort((a, b) => b.pct - a.pct);
                        const best = sorted[0];
                        const worst = sorted[sorted.length - 1];

                        return {
                          best: best.pct > 0 ? `${best.label} (${best.pct.toFixed(1)}%)` : undefined,
                          worst: worst.pct < 80 ? `${worst.label} (${worst.pct.toFixed(1)}%)` : undefined
                        };
                      }

                      // Fallback: use portfolio groups (for non-aggregated rows)
                      const projects = portfolioGroups[portfolio] || [];
                      if (projects.length <= 1) return {}; // Only one project or no projects

                      const withPct = projects.map(r => {
                        const p = enableComparison ? (r.period2 || r.period) : r.period;
                        const pct = p?.automation_percentage ?? 0;
                        const label = r.project_label || r.project_key || 'Unknown Project';
                        return { label, pct, row: r };
                      }).filter(p => !Number.isNaN(p.pct));

                      if (withPct.length < 2) return {}; // Need at least 2 projects to compare

                      const sorted = [...withPct].sort((a, b) => b.pct - a.pct);
                      const best = sorted[0];
                      const worst = sorted[sorted.length - 1];

                      return {
                        best: best.pct > 0 ? `${best.label} (${best.pct.toFixed(1)}%)` : undefined,
                        worst: worst.pct < 80 ? `${worst.label} (${worst.pct.toFixed(1)}%)` : undefined
                      };
                    };

                    const buildRegressionRowSummary = (row: Analysis): string => {
                      const label =
                        row.portfolio_display ||
                        row.portfolio ||
                        row.project_label ||
                        'This portfolio';
                      const period = enableComparison ? (row.period2 || row.period) : row.period;
                      const period1 = enableComparison ? row.period1 : null;
                      const pct = period?.automation_percentage ?? 0;
                      const automated = period?.automated_count ?? 0;
                      const manual = period?.manual_count ?? 0;
                      const totalTests = row.total_regression_tests ?? 0;

                      if (Number.isNaN(pct)) {
                        return `${label}: No regression automation data available.`;
                      }

                      // Analyze trends if comparison mode
                      let trendAnalysis = '';
                      if (enableComparison && period1) {
                        const prevPct = period1.automation_percentage ?? 0;
                        const prevManual = period1.manual_count ?? 0;
                        const pctChange = pct - prevPct;
                        const manualChange = manual - prevManual;

                        if (manualChange > 0 && pctChange <= 0) {
                          trendAnalysis = `Manual tests increased by ${manualChange} while automation stayed flat - new tests are being added faster than automation. `;
                        } else if (manualChange > 10) {
                          trendAnalysis = `Manual test count increased by ${manualChange} - automation is not keeping pace with test growth. `;
                        } else if (pctChange < -2) {
                          trendAnalysis = `Automation declined by ${Math.abs(pctChange).toFixed(1)}% - investigate regression in automation coverage. `;
                        } else if (pctChange > 2) {
                          trendAnalysis = `Automation improved by ${pctChange.toFixed(1)}% - good progress, maintain momentum. `;
                        }
                      }

                      // Identify primary concern and recommendation
                      let concern = '';
                      let recommendation = '';

                      // Priority 1: High manual test count (most actionable)
                      if (manual > 200) {
                        concern = `${label} has ${manual} manual test cases`;
                        recommendation = 'which needs attention. Consider prioritizing automation for high-frequency and critical regression scenarios.';
                      } else if (manual > 100) {
                        concern = `${label} has ${manual} manual test cases`;
                        recommendation = 'which needs attention. Focus on automating frequently executed tests to reduce manual overhead.';
                      } else if (manual > 50 && pct < 50) {
                        concern = `${label} has ${manual} manual test cases`;
                        recommendation = 'which needs attention. Consider doing more automation focus to improve coverage.';
                      }
                      // Priority 2: Low automation percentage
                      else if (pct < 30) {
                        concern = `${label} automation is at ${pct.toFixed(1)}%`;
                        recommendation = 'which needs urgent attention. Prioritize automation for core regression flows to reduce risk.';
                      } else if (pct < 50) {
                        concern = `${label} automation is at ${pct.toFixed(1)}%`;
                        recommendation = 'which needs attention. Increase automation investment to reach industry standard (60%+).';
                      }
                      // Priority 3: Below average performance
                      else if (metricRows.length > 1 && !Number.isNaN(avgAutomation) && pct < avgAutomation - 10) {
                        concern = `${label} automation is ${(avgAutomation - pct).toFixed(1)}% below average`;
                        recommendation = 'which needs attention. Review automation strategy and allocate dedicated capacity for automation.';
                      }
                      // Priority 4: Good but can improve
                      else if (pct >= 50 && pct < 70 && manual > 30) {
                        concern = `${label} has ${manual} remaining manual tests`;
                        recommendation = 'which needs attention. Consider automating high-value tests to reach 70%+ coverage.';
                      }
                      // Priority 5: Excellent performance
                      else if (pct >= 80) {
                        concern = `${label} is performing well at ${pct.toFixed(1)}% automation`;
                        recommendation = 'with strong coverage. Continue maintaining automation standards and review remaining manual tests.';
                      }
                      // Default: Moderate performance
                      else {
                        concern = `${label} automation is at ${pct.toFixed(1)}%`;
                        recommendation = 'which needs improvement. Focus on automating critical regression paths to enhance coverage.';
                      }

                      // Add portfolio project insights (best/worst project)
                      const portfolio = row.portfolio_display || row.portfolio || '';
                      const projectInsights = getPortfolioProjectInsights(portfolio, row);
                      let projectNote = '';
                      
                      if (projectInsights.best && projectInsights.worst) {
                        projectNote = ` Within ${portfolio}: ${projectInsights.best} is doing well, while ${projectInsights.worst} needs attention.`;
                      } else if (projectInsights.best) {
                        projectNote = ` Within ${portfolio}: ${projectInsights.best} is doing well.`;
                      } else if (projectInsights.worst) {
                        projectNote = ` Within ${portfolio}: ${projectInsights.worst} needs attention.`;
                      }

                      // Build structured bullet-point analysis with numbers and bold text
                      const bullets: string[] = [];
                      
                      // Issue/Current State (with numbers)
                      if (manual > 200) {
                        bullets.push(`• **Issue**: ${label} has **${manual} manual test cases** (${(100 - pct).toFixed(1)}% of ${totalTests} total tests)`);
                        bullets.push(`• **Impact**: Manual execution overhead is high, affecting release velocity`);
                        bullets.push(`• **Action**: Prioritize automating **200+ high-frequency tests** in next sprint`);
                        bullets.push(`• **Target**: Aim for **60%+ automation** (currently at ${pct.toFixed(1)}%)`);
                      } else if (manual > 100) {
                        bullets.push(`• **Issue**: ${label} has **${manual} manual test cases** (${(100 - pct).toFixed(1)}% of ${totalTests} total tests)`);
                        bullets.push(`• **Impact**: Significant manual effort required for regression testing`);
                        bullets.push(`• **Action**: Focus on automating **100+ frequently executed tests**`);
                        bullets.push(`• **Target**: Reach **60%+ automation** (currently at ${pct.toFixed(1)}%)`);
                      } else if (pct < 30) {
                        bullets.push(`• **Issue**: ${label} automation is critically low at **${pct.toFixed(1)}%** (${automated} automated, ${manual} manual)`);
                        bullets.push(`• **Impact**: High risk of production defects due to limited automated coverage`);
                        bullets.push(`• **Action**: Urgently automate **core regression flows** - target **50+ tests** in next 2 sprints`);
                        bullets.push(`• **Target**: Reach **50%+ automation** to reduce risk`);
                      } else if (pct < 50) {
                        bullets.push(`• **Issue**: ${label} automation is at **${pct.toFixed(1)}%** (${automated} automated, ${manual} manual)`);
                        bullets.push(`• **Impact**: Below industry standard (60%+), manual testing overhead is significant`);
                        bullets.push(`• **Action**: Increase automation investment - automate **50+ tests** to reach 60%+`);
                        bullets.push(`• **Target**: Achieve **60%+ automation** (${(60 - pct).toFixed(1)}% improvement needed)`);
                      } else if (pct >= 50 && pct < 70 && manual > 30) {
                        bullets.push(`• **Status**: ${label} has **${manual} remaining manual tests** at ${pct.toFixed(1)}% automation`);
                        bullets.push(`• **Impact**: Good progress, but ${manual} tests still require manual execution`);
                        bullets.push(`• **Action**: Automate **high-value tests** - target **30+ tests** to reach 70%+`);
                        bullets.push(`• **Target**: Reach **70%+ automation** (${(70 - pct).toFixed(1)}% improvement needed)`);
                      } else if (pct >= 80) {
                        bullets.push(`• **Status**: ${label} is performing well at **${pct.toFixed(1)}% automation** (${automated} automated, ${manual} manual)`);
                        bullets.push(`• **Impact**: Strong coverage, minimal manual overhead`);
                        bullets.push(`• **Action**: Maintain standards, review remaining **${manual} manual tests** for automation potential`);
                        bullets.push(`• **Target**: Continue excellence, consider reaching **90%+** if feasible`);
                      } else {
                        bullets.push(`• **Status**: ${label} automation is at **${pct.toFixed(1)}%** (${automated} automated, ${manual} manual)`);
                        bullets.push(`• **Impact**: Moderate coverage, room for improvement`);
                        bullets.push(`• **Action**: Focus on automating **critical regression paths** - target **20+ tests**`);
                        bullets.push(`• **Target**: Improve to **60%+ automation** (${(60 - pct).toFixed(1)}% improvement needed)`);
                      }

                      // Add trend analysis if available
                      if (trendAnalysis) {
                        bullets.unshift(`• **Trend**: ${trendAnalysis.trim()}`);
                      }

                      // Add project insights
                      if (projectInsights.best && projectInsights.worst) {
                        bullets.push(`• **Projects**: Within ${portfolio}, **${projectInsights.best}** is doing well, while **${projectInsights.worst}** needs attention`);
                      } else if (projectInsights.best) {
                        bullets.push(`• **Projects**: Within ${portfolio}, **${projectInsights.best}** is performing well`);
                      } else if (projectInsights.worst) {
                        bullets.push(`• **Projects**: Within ${portfolio}, **${projectInsights.worst}** needs urgent attention`);
                      }

                      // Join bullets with line breaks
                      return bullets.join('\n');
                    };

                    return (
                      <>
                        {metricRows.map((row, idx) => {
                          // Determine if this row is regression automation
                          const periodBasedMetrics = ['regression_automation', 'overall_automation', 'test_coverage', 'test_story_ratio', 'bug_ratio', 'test_review_status'];
                          const rowIsPeriodBased = row.metric && periodBasedMetrics.includes(row.metric);
                          const rowIsAutomation = row.metric === 'regression_automation' || row.metric === 'overall_automation';
                          const wowChange = row.comparison.leakage_change ?? 0;
                          const rowBg = isDarkMode 
                            ? (idx % 2 === 0 ? currentTheme.colors.background : currentTheme.colors.surface) 
                            : (idx % 2 === 0 ? cardBackground : currentTheme.colors.background);
                          
                          return (
                            <tr 
                              key={`${row.portfolio}-${row.project_key ?? idx}-${row.metric || 'unknown'}`}
                              style={{ backgroundColor: rowBg }}
                            >
                              <td className="py-3 px-4 text-sm font-medium" style={{ 
                                borderBottom: `1px solid ${cellBorder}`, 
                                borderRight: `1px solid ${cellBorder}`, 
                                color: isDarkMode ? '#F3F4F6' : '#111827',
                                fontFamily: 'Inter, sans-serif'
                              }}>
                        {row.portfolio_display || row.portfolio}
                    </td>
                              {rowIsPeriodBased ? (() => {
                                // Get period data - handle both single and comparison modes
                                const period = enableComparison ? (row.period2 || row.period) : (row.period || row.period2);
                                const period1 = enableComparison ? (row.period1 || null) : null;
                                
                                // Debug logging for new metrics
                                if (row.metric === 'test_coverage' || row.metric === 'test_story_ratio' || row.metric === 'bug_ratio' || row.metric === 'test_review_status') {
                                  console.log(`🔍 Rendering ${row.metric} for ${row.portfolio}:`, {
                                    total_stories: row.total_stories,
                                    total_test_cases: row.total_test_cases,
                                    period: period,
                                    period1: period1,
                                    enableComparison: enableComparison,
                                    row_period: row.period,
                                    row_period1: row.period1,
                                    row_period2: row.period2,
                                    full_row: row
                                  });
                                  
                                  // If period is undefined, log warning
                                  if (!period) {
                                    console.warn(`⚠️ Period is undefined for ${row.metric} - ${row.portfolio}`);
                                  }
                                }
                                
                                // Render cells based on metric type
                                if (row.metric === 'regression_automation' || row.metric === 'overall_automation') {
                                  return (
                                <>
                                  <td className="py-3 px-4 text-center text-sm font-semibold" style={{ 
                                    borderBottom: `1px solid ${cellBorder}`, 
                                    borderRight: `1px solid ${cellBorder}`, 
                                    color: isDarkMode ? '#60A5FA' : '#1D4ED8',
                                    fontFamily: 'Inter, sans-serif'
                                  }}>
                                        {row.total_regression_tests ?? row.total_test_cases ?? 0}
                                      </td>
                                      {enableComparison && period1 && (
                                        <>
                                          <td className="py-3 px-4 text-center text-sm font-semibold" style={{ 
                                            borderBottom: `1px solid ${cellBorder}`, 
                                            borderRight: `1px solid ${cellBorder}`, 
                                            color: isDarkMode ? '#34D399' : '#059669',
                                            fontFamily: 'Inter, sans-serif'
                                          }}>
                                            {period1.automated_count ?? 0}
                                            <span className="block text-xs text-gray-500 mt-1">
                                              ({formatPercentage(period1.automation_percentage ?? 0)})
                                            </span>
                                          </td>
                                          <td className="py-3 px-4 text-center text-sm font-semibold" style={{ 
                                            borderBottom: `1px solid ${cellBorder}`, 
                                            borderRight: `1px solid ${cellBorder}`, 
                                            color: isDarkMode ? '#F87171' : '#DC2626',
                                            fontFamily: 'Inter, sans-serif'
                                          }}>
                                            {period1.manual_count ?? 0}
                                          </td>
                                        </>
                                      )}
                                      <td className="py-3 px-4 text-center text-sm font-semibold" style={{ 
                                        borderBottom: `1px solid ${cellBorder}`, 
                                        borderRight: `1px solid ${cellBorder}`, 
                                        color: isDarkMode ? '#34D399' : '#059669',
                                        fontFamily: 'Inter, sans-serif'
                                      }}>
                                        {period?.automated_count ?? 0}
                                        <span className="block text-xs text-gray-500 mt-1">
                                          ({formatPercentage(period?.automation_percentage ?? 0)})
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 text-center text-sm font-semibold" style={{ 
                                        borderBottom: `1px solid ${cellBorder}`, 
                                        borderRight: `1px solid ${cellBorder}`, 
                                        color: isDarkMode ? '#F87171' : '#DC2626',
                                        fontFamily: 'Inter, sans-serif'
                                      }}>
                                        {period?.manual_count ?? 0}
                                  </td>
                                  {enableComparison && (
                                        <td className="py-3 px-4 text-center text-sm font-bold" style={{ 
                                          borderBottom: `1px solid ${cellBorder}`, 
                                          borderRight: `1px solid ${cellBorder}`,
                                          backgroundColor: getWowBgColor((row.progress?.percentage_change ?? 0)),
                                          color: getWowTextColor((row.progress?.percentage_change ?? 0)),
                                          fontFamily: 'Inter, sans-serif'
                                        }}>
                                          {formatChange(row.progress?.percentage_change ?? 0)}
                                        </td>
                                      )}
                                      <td className="py-3 px-4 text-sm" style={{ 
                                        borderBottom: `1px solid ${cellBorder}`,
                                        backgroundColor: isDarkMode ? currentTheme.colors.surface : currentTheme.colors.background,
                                        color: isDarkMode ? currentTheme.colors.text : currentTheme.colors.text,
                                        maxWidth: '500px',
                                        fontFamily: 'Inter, sans-serif',
                                        lineHeight: '1.6',
                                        whiteSpace: 'pre-line'
                                      }}>
                                        <div 
                                          style={{ 
                                            color: isDarkMode ? '#E5E7EB' : '#374151',
                                          }}
                                          dangerouslySetInnerHTML={{
                                            __html: (row.ai_analysis || row.ai_insights || '')
                                              .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 700; color: ' + (isDarkMode ? '#F3F4F6' : '#111827') + ';">$1</strong>')
                                          }}
                                        />
                                      </td>
                                    </>
                                  );
                                } else if (row.metric === 'test_coverage') {
                                  return (
                                    <>
                                      <td className="py-3 px-4 text-center text-sm font-semibold" style={{ 
                                        borderBottom: `1px solid ${cellBorder}`, 
                                        borderRight: `1px solid ${cellBorder}`, 
                                        color: isDarkMode ? '#60A5FA' : '#1D4ED8',
                                        fontFamily: 'Inter, sans-serif'
                                      }}>
                                        {row.total_stories ?? 0}
                                      </td>
                                      {enableComparison && period1 && (
                                    <>
                                      <td className="py-3 px-4 text-center text-sm font-semibold" style={{ 
                                        borderBottom: `1px solid ${cellBorder}`, 
                                        borderRight: `1px solid ${cellBorder}`, 
                                        color: isDarkMode ? '#34D399' : '#059669',
                                        fontFamily: 'Inter, sans-serif'
                                      }}>
                                            {period1.stories_with_tests ?? 0}
                                        <span className="block text-xs text-gray-500 mt-1">
                                              ({formatPercentage(period1.coverage_percentage ?? 0)})
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 text-center text-sm font-semibold" style={{ 
                                        borderBottom: `1px solid ${cellBorder}`, 
                                        borderRight: `1px solid ${cellBorder}`, 
                                        color: isDarkMode ? '#F87171' : '#DC2626',
                                        fontFamily: 'Inter, sans-serif'
                                      }}>
                                            {period1.stories_without_tests ?? 0}
                                      </td>
                                    </>
                                  )}
                                  <td className="py-3 px-4 text-center text-sm font-semibold" style={{ 
                                    borderBottom: `1px solid ${cellBorder}`, 
                                    borderRight: `1px solid ${cellBorder}`, 
                                    color: isDarkMode ? '#34D399' : '#059669',
                                    fontFamily: 'Inter, sans-serif'
                                  }}>
                                        {period?.stories_with_tests ?? 0}
                                    <span className="block text-xs text-gray-500 mt-1">
                                          ({formatPercentage(period?.coverage_percentage ?? 0)})
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center text-sm font-semibold" style={{ 
                                    borderBottom: `1px solid ${cellBorder}`, 
                                    borderRight: `1px solid ${cellBorder}`, 
                                    color: isDarkMode ? '#F87171' : '#DC2626',
                                    fontFamily: 'Inter, sans-serif'
                                  }}>
                                        {period?.stories_without_tests ?? 0}
                                  </td>
                                      {enableComparison && (
                                        <td className="py-3 px-4 text-center text-sm font-bold" style={{ 
                                          borderBottom: `1px solid ${cellBorder}`, 
                                          borderRight: `1px solid ${cellBorder}`,
                                          backgroundColor: getWowBgColor((row.progress?.percentage_change ?? 0)),
                                          color: getWowTextColor((row.progress?.percentage_change ?? 0)),
                                          fontFamily: 'Inter, sans-serif'
                                        }}>
                                          {formatChange(row.progress?.percentage_change ?? 0)}
                                        </td>
                                      )}
                                  <td className="py-3 px-4 text-sm" style={{ 
                                    borderBottom: `1px solid ${cellBorder}`,
                                    backgroundColor: isDarkMode ? currentTheme.colors.surface : currentTheme.colors.background,
                                    color: isDarkMode ? currentTheme.colors.text : currentTheme.colors.text,
                                    maxWidth: '500px',
                                    fontFamily: 'Inter, sans-serif',
                                    lineHeight: '1.6',
                                    whiteSpace: 'pre-line'
                                  }}>
                                    <div 
                                      style={{ 
                                        color: isDarkMode ? '#E5E7EB' : '#374151',
                                      }}
                                      dangerouslySetInnerHTML={{
                                            __html: (row.ai_analysis || row.ai_insights || '')
                                          .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 700; color: ' + (isDarkMode ? '#F3F4F6' : '#111827') + ';">$1</strong>')
                                      }}
                                    />
                                  </td>
                                </>
                                  );
                                } else if (row.metric === 'test_story_ratio') {
                                  return (
                                    <>
                                      <td className="py-3 px-4 text-center text-sm font-semibold" style={{ 
                                        borderBottom: `1px solid ${cellBorder}`, 
                                        borderRight: `1px solid ${cellBorder}`, 
                                        color: isDarkMode ? '#60A5FA' : '#1D4ED8',
                                        fontFamily: 'Inter, sans-serif'
                                      }}>
                                        {period?.total_test_cases ?? 0}
                                      </td>
                                      {enableComparison && period1 && (
                                        <>
                                          <td className="py-3 px-4 text-center text-sm font-semibold" style={{ 
                                            borderBottom: `1px solid ${cellBorder}`, 
                                            borderRight: `1px solid ${cellBorder}`, 
                                            color: isDarkMode ? '#34D399' : '#059669',
                                            fontFamily: 'Inter, sans-serif'
                                          }}>
                                            {period1.total_stories ?? 0}
                                          </td>
                                          <td className="py-3 px-4 text-center text-sm font-semibold" style={{ 
                                            borderBottom: `1px solid ${cellBorder}`, 
                                            borderRight: `1px solid ${cellBorder}`, 
                                            color: isDarkMode ? '#F87171' : '#DC2626',
                                            fontFamily: 'Inter, sans-serif'
                                          }}>
                                            {(period1.ratio?.toFixed(2) ?? '0.00')} tests per story
                                          </td>
                                        </>
                                      )}
                                      <td className="py-3 px-4 text-center text-sm font-semibold" style={{ 
                                        borderBottom: `1px solid ${cellBorder}`, 
                                        borderRight: `1px solid ${cellBorder}`, 
                                        color: isDarkMode ? '#34D399' : '#059669',
                                        fontFamily: 'Inter, sans-serif'
                                      }}>
                                        {period?.total_stories ?? 0}
                                      </td>
                                      <td className="py-3 px-4 text-center text-sm font-semibold" style={{ 
                                        borderBottom: `1px solid ${cellBorder}`, 
                                        borderRight: `1px solid ${cellBorder}`, 
                                        color: isDarkMode ? '#F87171' : '#DC2626',
                                        fontFamily: 'Inter, sans-serif'
                                      }}>
                                        {(period?.ratio?.toFixed(2) ?? '0.00')} tests per story
                                      </td>
                                      {enableComparison && (
                                        <td className="py-3 px-4 text-center text-sm font-bold" style={{ 
                                          borderBottom: `1px solid ${cellBorder}`, 
                                          borderRight: `1px solid ${cellBorder}`,
                                          backgroundColor: getWowBgColor((row.progress?.ratio_change ?? 0)),
                                          color: getWowTextColor((row.progress?.ratio_change ?? 0)),
                                          fontFamily: 'Inter, sans-serif'
                                        }}>
                                          {formatChange(row.progress?.ratio_change ?? 0)}
                                        </td>
                                      )}
                                      <td className="py-3 px-4 text-sm" style={{ 
                                        borderBottom: `1px solid ${cellBorder}`,
                                        backgroundColor: isDarkMode ? currentTheme.colors.surface : currentTheme.colors.background,
                                        color: isDarkMode ? currentTheme.colors.text : currentTheme.colors.text,
                                        maxWidth: '500px',
                                        fontFamily: 'Inter, sans-serif',
                                        lineHeight: '1.6',
                                        whiteSpace: 'pre-line'
                                      }}>
                                        <div 
                                          style={{ 
                                            color: isDarkMode ? '#E5E7EB' : '#374151',
                                          }}
                                          dangerouslySetInnerHTML={{
                                            __html: (row.ai_analysis || row.ai_insights || '')
                                              .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 700; color: ' + (isDarkMode ? '#F3F4F6' : '#111827') + ';">$1</strong>')
                                          }}
                                        />
                                      </td>
                                    </>
                                  );
                                } else if (row.metric === 'bug_ratio') {
                                  return (
                                    <>
                                      <td className="py-3 px-4 text-center text-sm font-semibold" style={{ 
                                        borderBottom: `1px solid ${cellBorder}`, 
                                        borderRight: `1px solid ${cellBorder}`, 
                                        color: isDarkMode ? '#60A5FA' : '#1D4ED8',
                                        fontFamily: 'Inter, sans-serif'
                                      }}>
                                        {period?.bugs_found ?? 0}
                                      </td>
                                      {enableComparison && period1 && (
                                        <>
                                          <td className="py-3 px-4 text-center text-sm font-semibold" style={{ 
                                            borderBottom: `1px solid ${cellBorder}`, 
                                            borderRight: `1px solid ${cellBorder}`, 
                                            color: isDarkMode ? '#34D399' : '#059669',
                                            fontFamily: 'Inter, sans-serif'
                                          }}>
                                            {period1.test_cases_executed ?? 0}
                                          </td>
                                          <td className="py-3 px-4 text-center text-sm font-semibold" style={{ 
                                            borderBottom: `1px solid ${cellBorder}`, 
                                            borderRight: `1px solid ${cellBorder}`, 
                                            color: isDarkMode ? '#F87171' : '#DC2626',
                                            fontFamily: 'Inter, sans-serif'
                                          }}>
                                            {period1.ratio?.toFixed(4) ?? '0.0000'}
                                          </td>
                                        </>
                                      )}
                                      <td className="py-3 px-4 text-center text-sm font-semibold" style={{ 
                                        borderBottom: `1px solid ${cellBorder}`, 
                                        borderRight: `1px solid ${cellBorder}`, 
                                        color: isDarkMode ? '#34D399' : '#059669',
                                        fontFamily: 'Inter, sans-serif'
                                      }}>
                                        {period?.test_cases_executed ?? 0}
                                      </td>
                                      <td className="py-3 px-4 text-center text-sm font-semibold" style={{ 
                                        borderBottom: `1px solid ${cellBorder}`, 
                                        borderRight: `1px solid ${cellBorder}`, 
                                        color: isDarkMode ? '#F87171' : '#DC2626',
                                        fontFamily: 'Inter, sans-serif'
                                      }}>
                                        {period?.ratio?.toFixed(4) ?? '0.0000'}
                                      </td>
                                      {enableComparison && (
                                        <td className="py-3 px-4 text-center text-sm font-bold" style={{ 
                                          borderBottom: `1px solid ${cellBorder}`, 
                                          borderRight: `1px solid ${cellBorder}`,
                                          backgroundColor: getWowBgColor((row.progress?.ratio_change ?? 0)),
                                          color: getWowTextColor((row.progress?.ratio_change ?? 0)),
                                          fontFamily: 'Inter, sans-serif'
                                        }}>
                                          {formatChange(row.progress?.ratio_change ?? 0)}
                                        </td>
                                      )}
                                      <td className="py-3 px-4 text-sm" style={{ 
                                        borderBottom: `1px solid ${cellBorder}`,
                                        backgroundColor: isDarkMode ? currentTheme.colors.surface : currentTheme.colors.background,
                                        color: isDarkMode ? currentTheme.colors.text : currentTheme.colors.text,
                                        maxWidth: '500px',
                                        fontFamily: 'Inter, sans-serif',
                                        lineHeight: '1.6',
                                        whiteSpace: 'pre-line'
                                      }}>
                                        <div 
                                          style={{ 
                                            color: isDarkMode ? '#E5E7EB' : '#374151',
                                          }}
                                          dangerouslySetInnerHTML={{
                                            __html: (row.ai_analysis || row.ai_insights || '')
                                              .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 700; color: ' + (isDarkMode ? '#F3F4F6' : '#111827') + ';">$1</strong>')
                                          }}
                                        />
                                      </td>
                                    </>
                                  );
                                } else if (row.metric === 'test_review_status') {
                                  return (
                                    <>
                                      <td className="py-3 px-4 text-center text-sm font-semibold" style={{ 
                                        borderBottom: `1px solid ${cellBorder}`, 
                                        borderRight: `1px solid ${cellBorder}`, 
                                        color: isDarkMode ? '#60A5FA' : '#1D4ED8',
                                        fontFamily: 'Inter, sans-serif'
                                      }}>
                                        {row.total_stories ?? 0}
                                      </td>
                                      {enableComparison && period1 && (
                                        <>
                                          <td className="py-3 px-4 text-center text-sm font-semibold" style={{ 
                                            borderBottom: `1px solid ${cellBorder}`, 
                                            borderRight: `1px solid ${cellBorder}`, 
                                            color: isDarkMode ? '#34D399' : '#059669',
                                            fontFamily: 'Inter, sans-serif'
                                          }}>
                                            {period1.reviewed_yes ?? 0}
                                            <span className="block text-xs text-gray-500 mt-1">
                                              ({formatPercentage(period1.review_percentage ?? 0)})
                                            </span>
                                          </td>
                                          <td className="py-3 px-4 text-center text-sm font-semibold" style={{ 
                                            borderBottom: `1px solid ${cellBorder}`, 
                                            borderRight: `1px solid ${cellBorder}`, 
                                            color: isDarkMode ? '#F87171' : '#DC2626',
                                            fontFamily: 'Inter, sans-serif'
                                          }}>
                                            {period1.reviewed_no ?? 0}
                                          </td>
                                        </>
                                      )}
                                      <td className="py-3 px-4 text-center text-sm font-semibold" style={{ 
                                        borderBottom: `1px solid ${cellBorder}`, 
                                        borderRight: `1px solid ${cellBorder}`, 
                                        color: isDarkMode ? '#34D399' : '#059669',
                                        fontFamily: 'Inter, sans-serif'
                                      }}>
                                        {period?.reviewed_yes ?? 0}
                                        <span className="block text-xs text-gray-500 mt-1">
                                          ({formatPercentage(period?.review_percentage ?? 0)})
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 text-center text-sm font-semibold" style={{ 
                                        borderBottom: `1px solid ${cellBorder}`, 
                                        borderRight: `1px solid ${cellBorder}`, 
                                        color: isDarkMode ? '#F87171' : '#DC2626',
                                        fontFamily: 'Inter, sans-serif'
                                      }}>
                                        {period?.reviewed_no ?? 0}
                                      </td>
                                      {enableComparison && (
                                        <td className="py-3 px-4 text-center text-sm font-bold" style={{ 
                                          borderBottom: `1px solid ${cellBorder}`, 
                                          borderRight: `1px solid ${cellBorder}`,
                                          backgroundColor: getWowBgColor((row.progress?.percentage_change ?? 0)),
                                          color: getWowTextColor((row.progress?.percentage_change ?? 0)),
                                          fontFamily: 'Inter, sans-serif'
                                        }}>
                                          {formatChange(row.progress?.percentage_change ?? 0)}
                                        </td>
                                      )}
                                      <td className="py-3 px-4 text-sm" style={{ 
                                        borderBottom: `1px solid ${cellBorder}`,
                                        backgroundColor: isDarkMode ? currentTheme.colors.surface : currentTheme.colors.background,
                                        color: isDarkMode ? currentTheme.colors.text : currentTheme.colors.text,
                                        maxWidth: '500px',
                                        fontFamily: 'Inter, sans-serif',
                                        lineHeight: '1.6',
                                        whiteSpace: 'pre-line'
                                      }}>
                                        <div 
                                          style={{ 
                                            color: isDarkMode ? '#E5E7EB' : '#374151',
                                          }}
                                          dangerouslySetInnerHTML={{
                                            __html: (row.ai_analysis || row.ai_insights || '')
                                              .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 700; color: ' + (isDarkMode ? '#F3F4F6' : '#111827') + ';">$1</strong>')
                                          }}
                                        />
                                      </td>
                                    </>
                                  );
                                }
                                return null;
                              })() : (
                                <>
                                  <td className="py-3 px-4 text-center text-sm font-semibold" style={{ 
                                    borderBottom: `1px solid ${cellBorder}`, 
                                    borderRight: `1px solid ${cellBorder}`, 
                                    color: isDarkMode ? '#60A5FA' : '#1D4ED8',
                                    fontFamily: 'Inter, sans-serif'
                                  }}>
                            {row.current_week.bugs_count ?? 0}
                        </td>
                                  <td className="py-3 px-4 text-center text-sm font-semibold" style={{ 
                                    borderBottom: `1px solid ${cellBorder}`, 
                                    borderRight: `1px solid ${cellBorder}`, 
                                    color: isDarkMode ? '#F87171' : '#DC2626',
                                    fontFamily: 'Inter, sans-serif'
                                  }}>
                            {row.current_week.defects_count ?? 0}
                        </td>
                                  {enableComparison && (
                                    <td className="py-3 px-4 text-center text-sm font-semibold" style={{ 
                                      borderBottom: `1px solid ${cellBorder}`, 
                                      borderRight: `1px solid ${cellBorder}`,
                                      backgroundColor: getLeakageBgColor(row.previous_week.leakage_percentage ?? 0),
                                      color: getLeakageTextColor(row.previous_week.leakage_percentage ?? 0),
                                      fontFamily: 'Inter, sans-serif'
                                    }}>
                            {formatPercentage(row.previous_week.leakage_percentage)}
                          </td>
                                  )}
                                  <td className="py-3 px-4 text-center text-sm font-semibold" style={{ 
                                    borderBottom: `1px solid ${cellBorder}`, 
                                    borderRight: `1px solid ${cellBorder}`,
                                    backgroundColor: getLeakageBgColor(row.current_week.leakage_percentage ?? 0),
                                    color: getLeakageTextColor(row.current_week.leakage_percentage ?? 0),
                                    fontFamily: 'Inter, sans-serif'
                                  }}>
                                    <div className="flex items-center justify-center gap-2">
                                      {(() => {
                                        const status = getStatusIcon(row.current_week.leakage_percentage ?? 0);
                                        const StatusIcon = status.icon;
                                        return (
                                          <>
                                            <StatusIcon className="h-4 w-4" style={{ color: status.color }} />
                                            {formatPercentage(row.current_week.leakage_percentage)}
                                          </>
                                        );
                                      })()}
                                    </div>
                          </td>
                                  {enableComparison && (
                                    <td className="py-3 px-4 text-center text-sm font-bold" style={{ 
                                      borderBottom: `1px solid ${cellBorder}`, 
                                      borderRight: `1px solid ${cellBorder}`,
                                      backgroundColor: getWowBgColor(wowChange),
                                      color: getWowTextColor(wowChange),
                                      fontFamily: 'Inter, sans-serif'
                                    }}>
                                      <div className="flex items-center justify-center gap-2">
                                        {(() => {
                                          const status = getStatusIcon(row.current_week.leakage_percentage ?? 0, wowChange);
                                          const StatusIcon = status.icon;
                                          return (
                                            <>
                                              <StatusIcon className="h-4 w-4" style={{ color: status.color }} />
                                              {formatChange(wowChange)}
                                            </>
                                          );
                                        })()}
                                      </div>
                          </td>
                                  )}
                                  <td className="py-3 px-4 text-sm" style={{ 
                                    borderBottom: `1px solid ${cellBorder}`,
                                    backgroundColor: isDarkMode ? currentTheme.colors.surface : currentTheme.colors.background,
                                    color: isDarkMode ? currentTheme.colors.text : currentTheme.colors.text,
                                    maxWidth: '400px',
                                    fontFamily: 'Inter, sans-serif',
                                    lineHeight: '1.5'
                                  }}>
                                    <span>
                                      <strong style={{ color: isDarkMode ? '#F3F4F6' : '#111827' }}>{row.portfolio_display || row.portfolio}</strong> {buildCommentText(row as Analysis, metricLabel)}
                                    </span>
                          </td>
                                </>
                              )}
                    </tr>
                          );
                        })}
                        
                        {/* Grand Total Row */}
                        {grandTotal && (() => {
                          const gtWowChange = grandTotal.comparison.leakage_change;
                          const periodBasedMetrics = ['regression_automation', 'overall_automation', 'test_coverage', 'test_story_ratio', 'bug_ratio', 'test_review_status'];
                          const grandTotalIsPeriodBased = grandTotal.metric && periodBasedMetrics.includes(grandTotal.metric);
                          const grandTotalIsAutomation = grandTotal.metric === 'regression_automation' || grandTotal.metric === 'overall_automation';
              return (
                            <tr className="pdf-grand-total-row" style={{ backgroundColor: '#1E293B' }}>
                              <td className="py-4 px-4 text-sm font-bold pdf-grand-total-row" style={{ 
                                borderTop: `2px solid #1E293B`, 
                                borderRight: `1px solid #1E293B`, 
                                backgroundColor: '#1E293B',
                                color: '#F8FAFC',
                                fontFamily: 'Inter, sans-serif',
                                padding: '10px 12px',
                                fontWeight: 600
                              }}>
                                Grand Total
                              </td>
                              {grandTotalIsPeriodBased ? (() => {
                                const gtPeriod = enableComparison ? (grandTotal.period2 || grandTotal.period) : grandTotal.period;
                                const gtPeriod1 = enableComparison ? grandTotal.period1 : null;
                                
                                if (grandTotalIsAutomation) {
                                  return (
                                <>
                                  <td className="py-4 px-4 text-center text-sm font-bold pdf-grand-total-row" style={{ 
                                    borderTop: `2px solid #1E293B`, 
                                    borderRight: `1px solid #1E293B`, 
                                    backgroundColor: '#1E293B',
                                    color: '#F8FAFC',
                                    fontFamily: 'Inter, sans-serif',
                                    padding: '10px 12px',
                                    fontWeight: 600
                                  }}>
                                        {formatNumber(grandTotal.total_regression_tests ?? grandTotal.total_test_cases ?? 0)}
                                  </td>
                                      {enableComparison && gtPeriod1 && (
                                    <>
                                      <td className="py-4 px-4 text-center text-sm font-bold pdf-grand-total-row" style={{ 
                                        borderTop: `2px solid #1E293B`, 
                                        borderRight: `1px solid #1E293B`, 
                                        backgroundColor: '#1E293B',
                                        color: '#F8FAFC',
                                        fontFamily: 'Inter, sans-serif',
                                        padding: '10px 12px',
                                        fontWeight: 600
                                      }}>
                                            {formatNumber(gtPeriod1.automated_count ?? 0)}
                                        <span className="block text-xs text-white/80 mt-1">
                                              ({formatPercentage(gtPeriod1.automation_percentage ?? 0)})
                                        </span>
                                      </td>
                                      <td className="py-4 px-4 text-center text-sm font-bold pdf-grand-total-row" style={{ 
                                        borderTop: `2px solid #1E293B`, 
                                        borderRight: `1px solid #1E293B`, 
                                        backgroundColor: '#1E293B',
                                        color: '#F8FAFC',
                                        fontFamily: 'Inter, sans-serif',
                                        padding: '10px 12px',
                                        fontWeight: 600
                                      }}>
                                            {formatNumber(gtPeriod1.manual_count ?? 0)}
                                      </td>
                                    </>
                                  )}
                                  <td className="py-4 px-4 text-center text-sm font-bold pdf-grand-total-row" style={{ 
                                    borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                    borderRight: `1px solid ${currentTheme.colors.primary}`, 
                                    backgroundColor: '#1E293B',
                                    color: '#F8FAFC',
                                    fontFamily: 'Inter, sans-serif',
                                    padding: '10px 12px'
                                  }}>
                                        {formatNumber(gtPeriod?.automated_count ?? 0)}
                                    <span className="block text-xs text-white/80 mt-1">
                                          ({formatPercentage(gtPeriod?.automation_percentage ?? 0)})
                                    </span>
                                  </td>
                                  <td className="py-4 px-4 text-center text-sm font-bold pdf-grand-total-row" style={{ 
                                    borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                    borderRight: `1px solid ${currentTheme.colors.primary}`, 
                                    backgroundColor: '#1E293B',
                                    color: '#F8FAFC',
                                    fontFamily: 'Inter, sans-serif',
                                    padding: '10px 12px'
                                  }}>
                                        {formatNumber(gtPeriod?.manual_count ?? 0)}
                                  </td>
                                      {enableComparison && (
                                        <td className="py-4 px-4 text-center text-sm font-bold" style={{ 
                                          borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                          borderRight: `1px solid ${currentTheme.colors.primary}`,
                                          color: '#FFFFFF',
                                          fontFamily: 'Inter, sans-serif'
                                        }}>
                                          {formatChange(grandTotal.progress?.percentage_change ?? 0)}
                                        </td>
                                      )}
                                  <td className="py-4 px-4 text-sm pdf-comment-text pdf-grand-total-row" style={{ 
                                    borderTop: `2px solid #1E293B`, 
                                    backgroundColor: '#1E293B',
                                    color: '#F8FAFC',
                                    fontFamily: 'Inter, sans-serif',
                                    maxWidth: '500px',
                                    lineHeight: '1.45',
                                    padding: '10px 12px'
                                  }}>
                                        {grandTotal.ai_analysis || buildRegressionSummary(metricRows)}
                                  </td>
                                </>
                                  );
                                } else if (grandTotal.metric === 'test_coverage') {
                                  return (
                                <>
                                  <td className="py-4 px-4 text-center text-sm font-bold pdf-grand-total-row" style={{ 
                                    borderTop: `2px solid #1E293B`, 
                                    borderRight: `1px solid #1E293B`, 
                                    backgroundColor: '#1E293B',
                                    color: '#F8FAFC',
                                    fontFamily: 'Inter, sans-serif',
                                    padding: '10px 12px',
                                    fontWeight: 600
                                  }}>
                                        {formatNumber(grandTotal.total_stories ?? 0)}
                                  </td>
                                      {enableComparison && gtPeriod1 && (
                                        <>
                                  <td className="py-4 px-4 text-center text-sm font-bold pdf-grand-total-row" style={{ 
                                    borderTop: `2px solid #1E293B`, 
                                    borderRight: `1px solid #1E293B`, 
                                    backgroundColor: '#1E293B',
                                    color: '#F8FAFC',
                                    fontFamily: 'Inter, sans-serif',
                                    padding: '10px 12px',
                                    fontWeight: 600
                                  }}>
                                            {formatNumber(gtPeriod1.stories_with_tests ?? 0)}
                                            <span className="block text-xs text-white/80 mt-1">
                                              ({formatPercentage(gtPeriod1.coverage_percentage ?? 0)})
                                            </span>
                                  </td>
                                    <td className="py-4 px-4 text-center text-sm font-bold pdf-grand-total-row" style={{ 
                                      borderTop: `2px solid #1E293B`, 
                                      borderRight: `1px solid #1E293B`, 
                                      backgroundColor: '#1E293B',
                                      color: '#F8FAFC',
                                      fontFamily: 'Inter, sans-serif',
                                      padding: '10px 12px',
                                      fontWeight: 600
                                    }}>
                                            {formatNumber(gtPeriod1.stories_without_tests ?? 0)}
                                    </td>
                                        </>
                                  )}
                                  <td className="py-4 px-4 text-center text-sm font-bold pdf-grand-total-row" style={{ 
                                    borderTop: `2px solid #1E293B`, 
                                    borderRight: `1px solid #1E293B`, 
                                    backgroundColor: '#1E293B',
                                    color: '#F8FAFC',
                                    fontFamily: 'Inter, sans-serif',
                                    padding: '10px 12px',
                                    fontWeight: 600
                                  }}>
                                        {formatNumber(gtPeriod?.stories_with_tests ?? 0)}
                                        <span className="block text-xs text-white/80 mt-1">
                                          ({formatPercentage(gtPeriod?.coverage_percentage ?? 0)})
                                        </span>
                                      </td>
                                      <td className="py-4 px-4 text-center text-sm font-bold pdf-grand-total-row" style={{ 
                                        borderTop: `2px solid #1E293B`, 
                                        borderRight: `1px solid #1E293B`, 
                                        backgroundColor: '#1E293B',
                                        color: '#F8FAFC',
                                        fontFamily: 'Inter, sans-serif',
                                        padding: '10px 12px',
                                        fontWeight: 600
                                      }}>
                                        {formatNumber(gtPeriod?.stories_without_tests ?? 0)}
                                  </td>
                                  {enableComparison && (
                                    <td className="py-4 px-4 text-center text-sm font-bold pdf-grand-total-row" style={{ 
                                      borderTop: `2px solid #1E293B`, 
                                      borderRight: `1px solid #1E293B`,
                                      backgroundColor: '#1E293B',
                                      color: '#F8FAFC',
                                      fontFamily: 'Inter, sans-serif',
                                      padding: '10px 12px',
                                      fontWeight: 600
                                    }}>
                                          {formatChange(grandTotal.progress?.percentage_change ?? 0)}
                                        </td>
                                      )}
                                      <td className="py-4 px-4 text-sm pdf-comment-text pdf-grand-total-row" style={{ 
                                        borderTop: `2px solid #1E293B`, 
                                        backgroundColor: '#1E293B',
                                        color: '#F8FAFC',
                                        fontFamily: 'Inter, sans-serif',
                                        maxWidth: '500px',
                                        lineHeight: '1.45',
                                        padding: '10px 12px'
                                      }}>
                                        {grandTotal.ai_analysis || ''}
                                      </td>
                                    </>
                                  );
                                } else if (grandTotal.metric === 'test_story_ratio') {
                                          return (
                                            <>
                                      <td className="py-4 px-4 text-center text-sm font-bold" style={{ 
                                        borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                        borderRight: `1px solid ${currentTheme.colors.primary}`, 
                                        color: '#FFFFFF',
                                        fontFamily: 'Inter, sans-serif'
                                      }}>
                                        {gtPeriod?.total_test_cases ?? 0}
                                      </td>
                                      {enableComparison && gtPeriod1 && (
                                        <>
                                          <td className="py-4 px-4 text-center text-sm font-bold" style={{ 
                                            borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                            borderRight: `1px solid ${currentTheme.colors.primary}`, 
                                            color: '#FFFFFF',
                                            fontFamily: 'Inter, sans-serif'
                                          }}>
                                            {gtPeriod1.total_stories ?? 0}
                                          </td>
                                          <td className="py-4 px-4 text-center text-sm font-bold" style={{ 
                                            borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                            borderRight: `1px solid ${currentTheme.colors.primary}`, 
                                            color: '#FFFFFF',
                                            fontFamily: 'Inter, sans-serif'
                                          }}>
                                            {(gtPeriod1.ratio?.toFixed(2) ?? '0.00')} tests per story
                                          </td>
                                        </>
                                      )}
                                      <td className="py-4 px-4 text-center text-sm font-bold" style={{ 
                                        borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                        borderRight: `1px solid ${currentTheme.colors.primary}`, 
                                        color: '#FFFFFF',
                                        fontFamily: 'Inter, sans-serif'
                                      }}>
                                        {gtPeriod?.total_stories ?? 0}
                                      </td>
                                      <td className="py-4 px-4 text-center text-sm font-bold" style={{ 
                                        borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                        borderRight: `1px solid ${currentTheme.colors.primary}`, 
                                        color: '#FFFFFF',
                                        fontFamily: 'Inter, sans-serif'
                                      }}>
                                        {(gtPeriod?.ratio?.toFixed(2) ?? '0.00')} tests per story
                                      </td>
                                      {enableComparison && (
                                        <td className="py-4 px-4 text-center text-sm font-bold" style={{ 
                                          borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                          borderRight: `1px solid ${currentTheme.colors.primary}`,
                                          color: '#FFFFFF',
                                          fontFamily: 'Inter, sans-serif'
                                        }}>
                                          {formatChange(grandTotal.progress?.ratio_change ?? 0)}
                                    </td>
                                  )}
                                  <td className="py-4 px-4 text-sm" style={{ 
                                    borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                    color: '#FFFFFF',
                                        fontFamily: 'Inter, sans-serif',
                                        maxWidth: '500px',
                                        lineHeight: '1.5'
                                  }}>
                                        {grandTotal.ai_analysis || ''}
                                  </td>
                                </>
                                  );
                                } else if (grandTotal.metric === 'bug_ratio') {
                                  return (
                                    <>
                                      <td className="py-4 px-4 text-center text-sm font-bold" style={{ 
                                        borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                        borderRight: `1px solid ${currentTheme.colors.primary}`, 
                                        color: '#FFFFFF',
                              fontFamily: 'Inter, sans-serif'
                            }}>
                                        {gtPeriod?.bugs_found ?? 0}
                            </td>
                                      {enableComparison && gtPeriod1 && (
                                        <>
                                          <td className="py-4 px-4 text-center text-sm font-bold" style={{ 
                                            borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                            borderRight: `1px solid ${currentTheme.colors.primary}`, 
                                            color: '#FFFFFF',
                                  fontFamily: 'Inter, sans-serif'
                                }}>
                                            {gtPeriod1.test_cases_executed ?? 0}
                                          </td>
                                          <td className="py-4 px-4 text-center text-sm font-bold" style={{ 
                                            borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                            borderRight: `1px solid ${currentTheme.colors.primary}`, 
                                            color: '#FFFFFF',
                                            fontFamily: 'Inter, sans-serif'
                                          }}>
                                            {gtPeriod1.ratio?.toFixed(4) ?? '0.0000'}
                                          </td>
                                        </>
                                      )}
                                      <td className="py-4 px-4 text-center text-sm font-bold" style={{ 
                                        borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                        borderRight: `1px solid ${currentTheme.colors.primary}`, 
                                        color: '#FFFFFF',
                                        fontFamily: 'Inter, sans-serif'
                                      }}>
                                        {gtPeriod?.test_cases_executed ?? 0}
                                      </td>
                                      <td className="py-4 px-4 text-center text-sm font-bold" style={{ 
                                        borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                        borderRight: `1px solid ${currentTheme.colors.primary}`, 
                                        color: '#FFFFFF',
                                        fontFamily: 'Inter, sans-serif'
                                      }}>
                                        {gtPeriod?.ratio?.toFixed(4) ?? '0.0000'}
                                </td>
                                {enableComparison && (
                                        <td className="py-4 px-4 text-center text-sm font-bold" style={{ 
                                          borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                          borderRight: `1px solid ${currentTheme.colors.primary}`,
                                          color: '#FFFFFF',
                                          fontFamily: 'Inter, sans-serif'
                                        }}>
                                          {formatChange(grandTotal.progress?.ratio_change ?? 0)}
                                        </td>
                                      )}
                                      <td className="py-4 px-4 text-sm" style={{ 
                                        borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                        color: '#FFFFFF',
                                        fontFamily: 'Inter, sans-serif',
                                        maxWidth: '500px',
                                        lineHeight: '1.5'
                                      }}>
                                        {grandTotal.ai_analysis || ''}
                                      </td>
                                    </>
                                  );
                                } else if (grandTotal.metric === 'test_review_status') {
                                  return (
                                    <>
                                      <td className="py-4 px-4 text-center text-sm font-bold" style={{ 
                                        borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                        borderRight: `1px solid ${currentTheme.colors.primary}`, 
                                        color: '#FFFFFF',
                                      fontFamily: 'Inter, sans-serif'
                                    }}>
                                        {grandTotal.total_stories ?? 0}
                                      </td>
                                      {enableComparison && gtPeriod1 && (
                                        <>
                                          <td className="py-4 px-4 text-center text-sm font-bold" style={{ 
                                            borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                            borderRight: `1px solid ${currentTheme.colors.primary}`, 
                                            color: '#FFFFFF',
                                            fontFamily: 'Inter, sans-serif'
                                          }}>
                                            {gtPeriod1.reviewed_yes ?? 0}
                                            <span className="block text-xs text-white/80 mt-1">
                                              ({formatPercentage(gtPeriod1.review_percentage ?? 0)})
                                      </span>
                                    </td>
                                          <td className="py-4 px-4 text-center text-sm font-bold" style={{ 
                                            borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                            borderRight: `1px solid ${currentTheme.colors.primary}`, 
                                            color: '#FFFFFF',
                                      fontFamily: 'Inter, sans-serif'
                                    }}>
                                            {gtPeriod1.reviewed_no ?? 0}
                                    </td>
                                  </>
                                )}
                                      <td className="py-4 px-4 text-center text-sm font-bold" style={{ 
                                        borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                        borderRight: `1px solid ${currentTheme.colors.primary}`, 
                                        color: '#FFFFFF',
                                  fontFamily: 'Inter, sans-serif'
                                }}>
                                        {gtPeriod?.reviewed_yes ?? 0}
                                        <span className="block text-xs text-white/80 mt-1">
                                          ({formatPercentage(gtPeriod?.review_percentage ?? 0)})
                                  </span>
                                </td>
                                      <td className="py-4 px-4 text-center text-sm font-bold" style={{ 
                                        borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                        borderRight: `1px solid ${currentTheme.colors.primary}`, 
                                        color: '#FFFFFF',
                                  fontFamily: 'Inter, sans-serif'
                                }}>
                                        {gtPeriod?.reviewed_no ?? 0}
                                </td>
                                      {enableComparison && (
                                        <td className="py-4 px-4 text-center text-sm font-bold" style={{ 
                                          borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                          borderRight: `1px solid ${currentTheme.colors.primary}`,
                                          color: '#FFFFFF',
                                  fontFamily: 'Inter, sans-serif'
                                }}>
                                          {formatChange(grandTotal.progress?.percentage_change ?? 0)}
                                        </td>
                                      )}
                                      <td className="py-4 px-4 text-sm" style={{ 
                                        borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                        color: '#FFFFFF',
                                        fontFamily: 'Inter, sans-serif',
                                        maxWidth: '500px',
                                        lineHeight: '1.5'
                                      }}>
                                        {grandTotal.ai_analysis || ''}
                                </td>
                              </>
                                  );
                                }
                                return null;
                              })() : (
                                <>
                                  <td className="py-4 px-4 text-center text-sm font-bold" style={{ 
                                    borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                    borderRight: `1px solid ${currentTheme.colors.primary}`, 
                                    color: '#FFFFFF',
                                  fontFamily: 'Inter, sans-serif'
                                }}>
                                    {grandTotal.current_week.bugs_count}
                                </td>
                                  <td className="py-4 px-4 text-center text-sm font-bold" style={{ 
                                    borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                    borderRight: `1px solid ${currentTheme.colors.primary}`, 
                                    color: '#FFFFFF',
                                  fontFamily: 'Inter, sans-serif'
                                }}>
                                    {grandTotal.current_week.defects_count}
                                </td>
                                {enableComparison && (
                                    <td className="py-4 px-4 text-center text-sm font-bold" style={{ 
                                      borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                      borderRight: `1px solid ${currentTheme.colors.primary}`, 
                                      color: '#FFFFFF',
                                    fontFamily: 'Inter, sans-serif'
                                  }}>
                                    {formatPercentage(grandTotal.previous_week.leakage_percentage)}
                                  </td>
                                )}
                                  <td className="py-4 px-4 text-center text-sm font-bold" style={{ 
                                    borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                    borderRight: `1px solid ${currentTheme.colors.primary}`, 
                                    color: '#FFFFFF',
                                  fontFamily: 'Inter, sans-serif'
                                }}>
                                  {formatPercentage(grandTotal.current_week.leakage_percentage)}
                                </td>
                                {enableComparison && (
                                    <td className="py-4 px-4 text-center text-sm font-bold" style={{ 
                                      borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                      borderRight: `1px solid ${currentTheme.colors.primary}`,
                                      backgroundColor: getWowBgColor(gtWowChange),
                                      color: getWowTextColor(gtWowChange),
                                    fontFamily: 'Inter, sans-serif'
                                  }}>
                                      <div className="flex items-center justify-center gap-2">
                                        {(() => {
                                          const status = getStatusIcon(0, gtWowChange);
                                          const StatusIcon = status.icon;
                                          return (
                                            <>
                                              <StatusIcon className="h-4 w-4" style={{ color: status.color }} />
                                              {formatChange(gtWowChange)}
                                            </>
                                          );
                                        })()}
                                      </div>
                                  </td>
                                )}
                                  <td className="py-4 px-4 text-sm" style={{ 
                                    borderTop: `2px solid ${currentTheme.colors.primary}`, 
                                    color: '#FFFFFF',
                                  fontFamily: 'Inter, sans-serif'
                                }}>
                                    {grandTotal.ai_insights}
                                </td>
                              </>
                            )}
                          </tr>
                          );
                        })()}
                      </>
                    );
                  })()}
                  </tbody>
                </table>
              </div>
            )}
            </Card>
          );
        });
        
        // Return wrapped cards in a container for PDF export
        return (
          <div 
            id="tcoe-report" 
            className="space-y-6 pdf-export-container"
            style={{
              width: '100%',
              maxWidth: '100%',
              padding: '20px',
                backgroundColor: pdfContainerBg,
              fontFamily: 'Inter, sans-serif'
            }}
          >
            {/* PDF-specific styles injected via style tag */}
            <style>{`
              @media print {
                .pdf-export-container * {
                  page-break-inside: avoid;
                }
                .pdf-metric-card {
                  page-break-after: always;
                  page-break-inside: avoid;
                }
                .pdf-table {
                  page-break-inside: avoid;
                }
                .pdf-comment-section {
                  page-break-inside: avoid;
                }
              }
              .pdf-table-cell {
                padding: 8px 12px !important;
                vertical-align: middle !important;
              }
              .pdf-table-header {
                background-color: ${pdfHeaderBg} !important;
                color: ${pdfHeaderText} !important;
                font-weight: 500 !important;
                padding: 8px 12px !important;
              }
              .pdf-grand-total-row {
                background-color: ${pdfGrandTotalBg} !important;
                color: ${pdfGrandTotalText} !important;
                font-weight: 600 !important;
                padding: 10px 12px !important;
              }
              .pdf-comment-text {
                line-height: 1.45 !important;
                padding: 8px 12px !important;
              }
              .pdf-section-header {
                height: 60px !important;
                page-break-after: avoid;
              }
              .pdf-metric-title {
                font-size: 18px !important;
                margin-bottom: 24px !important;
              }
            `}</style>
            
            {/* Report Generation Time Indicator */}
            {timeDisplay && (
              <div 
                className="pdf-time-indicator"
                style={{
                  textAlign: 'right',
                  fontSize: '12px',
                  color: isDarkMode ? '#94A3B8' : '#64748B',
                  fontFamily: 'Inter, sans-serif',
                  marginBottom: '8px',
                  paddingRight: '4px'
                }}
              >
                {timeDisplay}
              </div>
            )}
            {cards}
          </div>
        );
      })()}

        {/* Info Box when no data */}
      {!analysis && !(rows && rows.length) && !loading && (
        <Alert
          className="border flex items-start gap-3"
          style={{
            backgroundColor: isDarkMode ? `${currentTheme.colors.info}15` : '#EFF6FF',
            borderColor: isDarkMode ? `${currentTheme.colors.info}40` : '#BFDBFE',
            color: isDarkMode ? '#93C5FD' : '#1E3A8A'
          }}
        >
          <Info className="h-4 w-4" style={{ color: isDarkMode ? '#60A5FA' : currentTheme.colors.info }} />
          <AlertDescription className="text-sm" style={{ color: isDarkMode ? '#E0F2FE' : '#1E3A8A' }}>
              <strong>TCOE Report:</strong> Select filters above and click "Generate" to analyze defect leakage.
              Click on Portfolio or Project Key dropdown to select multiple items with checkboxes.
          </AlertDescription>
        </Alert>
      )}
    </div>
    </div>
  );
}
