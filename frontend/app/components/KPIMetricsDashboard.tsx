'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  RefreshCw, Download, AlertTriangle, Bug, AlertCircle, 
  CheckCircle, Activity, BarChart3, PieChart, Award, FileText, Sheet,
  ChevronRight, Building2, Code, Zap
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getApiUrl } from '../../lib/api-config';
import { LoadingSkeleton } from './figma/InsightsDashboard/components/LoadingSkeleton';

interface KPIMetricsData {
  defect_count: number;
  bug_count: number;
  defect_rca_breakdown: Record<string, number>;
  bug_rca_breakdown: Record<string, number>;
  automation_metrics: {
    completion_percentage: number;
    automation_percentage: number;
    committed_tc_count: number;
    completed_tc_count: number;
    total_projects: number;
  };
  projects_list: Array<{
    project_key: string;
    project_name: string;
    defect_count: number;
    bug_count: number;
    automation_percentage: number;
    completion_percentage: number;
  }>;
  defect_details: Array<{
    issue_key: string;
    summary: string;
    priority: string;
    severity: string;
    sprint: string;
    assignee_name: string;
    assignee_from_tao: string;
    missed_by_tao_qe: string;
    linked_story: string;
    rca: string;
    justification: string;
  }>;
  bug_details: Array<{
    issue_key: string;
    summary: string;
    priority: string;
    severity: string;
    sprint: string;
    assignee_name: string;
    assignee_from_tao: string;
    caused_by_tao_dev: string;
    linked_story: string;
    rca: string;
    justification: string;
  }>;
  automation_details: Array<{
    project_key: string;
    project_name: string;
    project_type: string;
    tool_framework: string;
    ai_assistant_integration_enabled: string;
    ai_assistant: string;
    usage_level_of_ai_assistant: string;
    impact_on_productivity: string;
    ai_usage_inference: string;
    qa_owner: string;
    committed_tc_count: number;
    completed_tc_count: number;
    completion_percentage: number;
    automation_percentage: number;
  }>;
  filters: {
    portfolio: string;
    project_key: string;
    project_name: string;
    rca: string;
  };
}

interface DropdownOptions {
  portfolios: string[];
  project_keys: string[];
  project_names: string[];
  rca_values: string[];
}

export function KPIMetricsDashboard() {
  const { currentTheme, isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<KPIMetricsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dataKey, setDataKey] = useState(0);
  const [aiInsights, setAiInsights] = useState<{
    comment: string;
    recommendations: string[];
    prediction: string;
    leakage_percentage: number;
    change_percentage: number | null;
  } | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  
  const [options, setOptions] = useState<DropdownOptions>({
    portfolios: ['All'],
    project_keys: ['All'],
    project_names: ['All'],
    rca_values: ['All']
  });
  
  const [selectedPortfolio, setSelectedPortfolio] = useState('All');
  const [selectedProjectKey, setSelectedProjectKey] = useState('All');
  const [selectedProjectName, setSelectedProjectName] = useState('All');
  const [selectedRCA, setSelectedRCA] = useState('All');

  useEffect(() => {
    fetchDropdownOptions();
  }, []);

  useEffect(() => {
    if (selectedPortfolio !== 'All') {
      fetchDropdownOptions(selectedPortfolio);
    }
  }, [selectedPortfolio]);

  useEffect(() => {
    fetchKPIMetrics();
  }, [selectedPortfolio, selectedProjectKey, selectedProjectName, selectedRCA]);

  const fetchDropdownOptions = async (portfolio?: string) => {
    try {
      const url = portfolio && portfolio !== 'All' 
        ? `/api/kpi-metrics/options?portfolio=${encodeURIComponent(portfolio)}`
        : '/api/kpi-metrics/options';
      const response = await fetch(getApiUrl(url));
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setOptions({
            portfolios: result.options.portfolios || ['All'],
            project_keys: result.options.project_keys || ['All'],
            project_names: result.options.project_names || ['All'],
            rca_values: result.options.rca_values || ['All']
          });
        }
      }
    } catch (err) {
      console.error('Error fetching dropdown options:', err);
    }
  };

  const fetchKPIMetrics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(getApiUrl('/api/kpi-metrics'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolio: selectedPortfolio,
          project_key: selectedProjectKey,
          project_name: selectedProjectName,
          rca: selectedRCA
        })
      });

      if (!response.ok) throw new Error('Failed to fetch KPI metrics');
      
      const result = await response.json();
      if (result.success) {
        // Ensure all arrays exist with defaults
        const dataWithDefaults = {
          ...result.data,
          defect_details: result.data.defect_details || [],
          bug_details: result.data.bug_details || [],
          automation_details: result.data.automation_details || [],
          projects_list: result.data.projects_list || []
        };
        console.log('KPI Metrics Data:', {
          defect_details_count: dataWithDefaults.defect_details?.length || 0,
          bug_details_count: dataWithDefaults.bug_details?.length || 0,
          automation_details_count: dataWithDefaults.automation_details?.length || 0,
          selectedPortfolio,
          selectedProjectKey,
          selectedProjectName
        });
        setData(dataWithDefaults);
        setDataKey(prev => prev + 1);
        
        // Fetch AI insights after data is loaded
        fetchAIInsights(selectedPortfolio, selectedProjectKey, selectedProjectName, selectedRCA);
      } else {
        setError(result.error || 'Failed to load data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error fetching KPI metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAIInsights = async (portfolio: string, projectKey: string, projectName: string, rca: string) => {
    setLoadingInsights(true);
    try {
      const response = await fetch(getApiUrl('/api/kpi-metrics/ai-insights'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolio,
          project_key: projectKey,
          project_name: projectName,
          rca
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.insights) {
          setAiInsights(result.insights);
        }
      }
    } catch (err) {
      console.error('Error fetching AI insights:', err);
    } finally {
      setLoadingInsights(false);
    }
  };

  const exportToCSV = () => {
    if (!data) return;
    
    const csv = [
      ['Metric', 'Value'],
      ['Defect Count', data.defect_count || 0],
      ['Bug Count', data.bug_count || 0],
      ['Automation %', data.automation_metrics?.automation_percentage || 0],
      ['Completion %', data.automation_metrics?.completion_percentage || 0],
      ['Committed TC', data.automation_metrics?.committed_tc_count || 0],
      ['Completed TC', data.automation_metrics?.completed_tc_count || 0]
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `KPI-Metrics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    if (!data) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>KPI Metrics Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #333; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
              th { background-color: #f5f5f5; }
            </style>
          </head>
          <body>
            <h1>KPI Metrics Report</h1>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <table>
              <tr><th>Metric</th><th>Value</th></tr>
              <tr><td>Defect Count</td><td>${data.defect_count || 0}</td></tr>
              <tr><td>Bug Count</td><td>${data.bug_count || 0}</td></tr>
              <tr><td>Automation %</td><td>${data.automation_metrics?.automation_percentage || 0}%</td></tr>
              <tr><td>Completion %</td><td>${data.automation_metrics?.completion_percentage || 0}%</td></tr>
            </table>
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 250);
    }
  };

  if (loading && !data) {
    return <LoadingSkeleton />;
  }

  if (error && !data) {
    return (
      <div className="h-full p-6" style={{ backgroundColor: currentTheme.colors.background }}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) return null;

  const totalDefects = data.defect_count || 0;
  const totalBugs = data.bug_count || 0;
  const automationPct = data.automation_metrics?.automation_percentage || 0;
  const completionPct = data.automation_metrics?.completion_percentage || 0;

  return (
    <div 
      className="h-full overflow-auto transition-all duration-300 bg-slate-50 dark:bg-slate-900"
    >
      <div className="p-6 w-full space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 
              className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
            >
              CDK KPI METRICS
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-lg text-slate-700 dark:text-slate-300">
                Comprehensive Performance Indicators Dashboard
              </p>
              {data?.projects_list?.length > 0 && (
                <Badge 
                  variant="outline"
                  className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-100"
                >
                  {data.projects_list.length} Projects
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-4">
            <Button
              onClick={fetchKPIMetrics}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Generate Report
            </Button>
            <Button
              onClick={exportToCSV}
              className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg px-4 py-2 text-sm font-medium"
              disabled={!data}
            >
              <Sheet className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              onClick={exportToPDF}
              className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg px-4 py-2 text-sm font-medium"
              disabled={!data}
            >
              <FileText className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block text-slate-900 dark:text-slate-100">
              Portfolio
            </label>
            <Select value={selectedPortfolio} onValueChange={(value) => {
              setSelectedPortfolio(value);
              setSelectedProjectKey('All');
              setSelectedProjectName('All');
            }}>
              <SelectTrigger className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.portfolios.map((portfolio) => (
                  <SelectItem key={portfolio} value={portfolio}>
                    {portfolio}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block text-slate-900 dark:text-slate-100">
              Project Key
            </label>
            <Select value={selectedProjectKey} onValueChange={setSelectedProjectKey}>
              <SelectTrigger className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.project_keys.map((key) => (
                  <SelectItem key={key} value={key}>
                    {key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block text-slate-900 dark:text-slate-100">
              Project Name
            </label>
            <Select value={selectedProjectName} onValueChange={setSelectedProjectName}>
              <SelectTrigger className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.project_names.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block text-slate-900 dark:text-slate-100">
              RCA (Root Cause)
              <span className="text-xs ml-1 text-slate-600 dark:text-slate-400">
                (Bug & Defect only)
              </span>
            </label>
            <Select value={selectedRCA} onValueChange={setSelectedRCA}>
              <SelectTrigger className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.rca_values.map((rca) => (
                  <SelectItem key={rca} value={rca}>
                    {rca}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          </div>
        </motion.div>

        {/* AI Insights Section */}
        {(aiInsights || loadingInsights) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-6 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">AI Insights</h2>
              {loadingInsights && (
                <RefreshCw className="h-4 w-4 animate-spin text-slate-500" />
              )}
            </div>
            
            {loadingInsights ? (
              <div className="text-sm text-slate-600 dark:text-slate-400">Generating AI insights...</div>
            ) : aiInsights ? (
              <>
                {/* Dynamic Comment */}
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Analysis</p>
                  <p className="text-sm text-slate-900 dark:text-slate-100">{aiInsights.comment}</p>
                </div>
                
                {/* Recommendations */}
                {aiInsights.recommendations && aiInsights.recommendations.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Recommendations to Reduce Leakage</p>
                    <ul className="space-y-2">
                      {aiInsights.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-slate-900 dark:text-slate-100">
                          <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Prediction */}
                {aiInsights.prediction && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Future Prediction</p>
                    <p className="text-sm text-blue-900 dark:text-blue-100">{aiInsights.prediction}</p>
                  </div>
                )}
              </>
            ) : null}
          </motion.div>
        )}

        {/* Summary Metrics Cards */}
        <motion.div
          key={`summary-${dataKey}`}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 100, damping: 15 }}
        >
          <SummaryCard
            title="Defects"
            value={totalDefects}
            icon={<AlertCircle />}
            color="#FF6B6B"
            gradientStart="#FF6B6B"
            gradientEnd="#FF8E53"
            isDarkMode={isDarkMode}
            currentTheme={currentTheme}
            dataKey={dataKey}
          />
          <SummaryCard
            title="Bugs"
            value={totalBugs}
            icon={<Bug />}
            color="#FFD93D"
            gradientStart="#FFD93D"
            gradientEnd="#FFA500"
            isDarkMode={isDarkMode}
            currentTheme={currentTheme}
            dataKey={dataKey}
          />
          <SummaryCard
            title="Automation %"
            value={automationPct}
            icon={<Zap />}
            color="#4ECDC4"
            gradientStart="#4ECDC4"
            gradientEnd="#6C5CE7"
            isDarkMode={isDarkMode}
            currentTheme={currentTheme}
            dataKey={dataKey}
            isPercentage={true}
          />
          <SummaryCard
            title="Completion %"
            value={completionPct}
            icon={<CheckCircle />}
            color="#51CF66"
            gradientStart="#51CF66"
            gradientEnd="#20C997"
            isDarkMode={isDarkMode}
            currentTheme={currentTheme}
            dataKey={dataKey}
            isPercentage={true}
          />
        </motion.div>

        {/* Projects List - Only show when portfolio is selected */}
        {selectedPortfolio !== 'All' && data?.projects_list?.length > 0 && (
          <motion.div
            key={`projects-${dataKey}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 100, damping: 15 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-slate-900 dark:text-slate-100" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Projects ({data.projects_list.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.projects_list.map((project, index) => (
                <ProjectCard
                  key={`${project.project_key}-${index}`}
                  project={project}
                  isDarkMode={isDarkMode}
                  currentTheme={currentTheme}
                  dataKey={dataKey}
                  index={index}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Detailed Metrics Section */}
        <motion.div
          key={`details-${dataKey}`}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 100, damping: 15 }}
        >
          {/* Defect Analysis Panel */}
          <AnalysisPanel
            title="Defect Analysis"
            icon={<AlertCircle />}
            totalCount={totalDefects}
            rcaBreakdown={data.defect_rca_breakdown || {}}
            color="#FF6B6B"
            gradientStart="#FF6B6B"
            gradientEnd="#FF8E53"
            isDarkMode={isDarkMode}
            currentTheme={currentTheme}
            dataKey={dataKey}
          />

          {/* Bug Analysis Panel */}
          <AnalysisPanel
            title="Bug Analysis"
            icon={<Bug />}
            totalCount={totalBugs}
            rcaBreakdown={data.bug_rca_breakdown || {}}
            color="#FFD93D"
            gradientStart="#FFD93D"
            gradientEnd="#FFA500"
            isDarkMode={isDarkMode}
            currentTheme={currentTheme}
            dataKey={dataKey}
          />
        </motion.div>

        {/* Automation Metrics Panel */}
        <motion.div
          key={`automation-${dataKey}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 100, damping: 15 }}
        >
          <AutomationPanel
            automationMetrics={data.automation_metrics || {
              completion_percentage: 0,
              automation_percentage: 0,
              committed_tc_count: 0,
              completed_tc_count: 0,
              total_projects: 0
            }}
            projectsList={data.projects_list || []}
            isDarkMode={isDarkMode}
            currentTheme={currentTheme}
            dataKey={dataKey}
          />
        </motion.div>

        {/* Detailed Information - Show when specific portfolio and project key are selected */}
        {selectedPortfolio !== 'All' && selectedProjectKey !== 'All' && (
          <>
            {/* Defects and Bugs Details - Table Layout */}
            {(data.defect_details?.length > 0 || data.bug_details?.length > 0) && (
              <motion.div
                key={`defects-bugs-details-${dataKey}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, type: "spring", stiffness: 120, damping: 20 }}
                className="space-y-6"
              >
                {/* Defect Details Table */}
                {data.defect_details?.length > 0 && (
                  <Card className="overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-900/40">
                          <AlertCircle className="h-6 w-6 text-rose-700 dark:text-rose-300" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            Defect Details
                          </h3>
                          <p className="text-sm mt-1 text-slate-600 dark:text-slate-400">
                            {data.defect_details.length} defect{data.defect_details.length !== 1 ? 's' : ''} found
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                            <th className="px-6 py-4 text-left font-semibold text-sm text-slate-900 dark:text-slate-100">Issue Key</th>
                            <th className="px-6 py-4 text-left font-semibold text-sm text-slate-900 dark:text-slate-100">Description</th>
                            <th className="px-6 py-4 text-left font-semibold text-sm text-slate-900 dark:text-slate-100">Assignee</th>
                            <th className="px-6 py-4 text-left font-semibold text-sm text-slate-900 dark:text-slate-100">Justification</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.defect_details.map((defect, index) => (
                            <motion.tr
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.7 + index * 0.05, duration: 0.4 }}
                              className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                            >
                              <td className="px-6 py-4">
                                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                  {defect.issue_key || 'N/A'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm max-w-md text-slate-900 dark:text-slate-100">
                                  {defect.summary || 'N/A'}
                                </p>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100">
                                    {(defect.assignee_name || 'N/A').charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-sm text-slate-900 dark:text-slate-100">
                                    {defect.assignee_name || 'N/A'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm max-w-md text-slate-600 dark:text-slate-400">
                                  {aiInsights?.comment || defect.justification || '-'}
                                </p>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}

                {/* Bug Details Table */}
                {data.bug_details?.length > 0 && (
                  <Card className="overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/40">
                          <Bug className="h-6 w-6 text-amber-700 dark:text-amber-300" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            Bug Details
                          </h3>
                          <p className="text-sm mt-1 text-slate-600 dark:text-slate-400">
                            {data.bug_details.length} bug{data.bug_details.length !== 1 ? 's' : ''} found
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                            <th className="px-6 py-4 text-left font-semibold text-sm text-slate-900 dark:text-slate-100">Issue Key</th>
                            <th className="px-6 py-4 text-left font-semibold text-sm text-slate-900 dark:text-slate-100">Description</th>
                            <th className="px-6 py-4 text-left font-semibold text-sm text-slate-900 dark:text-slate-100">Assignee</th>
                            <th className="px-6 py-4 text-left font-semibold text-sm text-slate-900 dark:text-slate-100">Justification</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.bug_details.map((bug, index) => (
                            <motion.tr
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.8 + index * 0.05, duration: 0.4 }}
                              className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                            >
                              <td className="px-6 py-4">
                                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                  {bug.issue_key || 'N/A'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm max-w-md text-slate-900 dark:text-slate-100">
                                  {bug.summary || 'N/A'}
                                </p>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100">
                                    {(bug.assignee_name || 'N/A').charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-sm text-slate-900 dark:text-slate-100">
                                    {bug.assignee_name || 'N/A'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm max-w-md text-slate-600 dark:text-slate-400">
                                  {aiInsights?.comment || bug.justification || '-'}
                                </p>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </motion.div>
            )}

            {/* Automation Details Table */}
            {data.automation_details?.length > 0 && (
              <motion.div
                key={`automation-details-${dataKey}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, type: "spring", stiffness: 120, damping: 20 }}
              >
                <Card className="overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/40">
                        <Zap className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                          Automation Details
                        </h3>
                        <p className="text-sm mt-1 text-slate-600 dark:text-slate-400">
                          {data.automation_details.length} project{data.automation_details.length !== 1 ? 's' : ''} found
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                          <th className="px-6 py-4 text-left font-semibold text-sm text-slate-900 dark:text-slate-100">Project</th>
                          <th className="px-6 py-4 text-left font-semibold text-sm text-slate-900 dark:text-slate-100">Project Type</th>
                          <th className="px-6 py-4 text-left font-semibold text-sm text-slate-900 dark:text-slate-100">Tool/Framework</th>
                          <th className="px-6 py-4 text-left font-semibold text-sm text-slate-900 dark:text-slate-100">AI Integration</th>
                          <th className="px-6 py-4 text-left font-semibold text-sm text-slate-900 dark:text-slate-100">AI Usage Level</th>
                          <th className="px-6 py-4 text-left font-semibold text-sm text-slate-900 dark:text-slate-100">Productivity Impact</th>
                          <th className="px-6 py-4 text-left font-semibold text-sm text-slate-900 dark:text-slate-100">AI Inference</th>
                          <th className="px-6 py-4 text-left font-semibold text-sm text-slate-900 dark:text-slate-100">QA Owner</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.automation_details.map((automation, index) => (
                          <motion.tr
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 1.0 + index * 0.05, duration: 0.4 }}
                            className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-bold text-sm mb-1 text-slate-900 dark:text-slate-100">
                                  {automation.project_key}
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                  {automation.project_name}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="outline" className="text-xs border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300">
                                {automation.project_type || 'N/A'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-slate-900 dark:text-slate-100">
                                {automation.tool_framework || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <Badge 
                                variant={automation.ai_assistant_integration_enabled?.toLowerCase() === 'yes' ? 'default' : 'outline'}
                                className={`text-xs ${
                                  automation.ai_assistant_integration_enabled?.toLowerCase() === 'yes' 
                                    ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700' 
                                    : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {automation.ai_assistant_integration_enabled || 'N/A'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-slate-900 dark:text-slate-100">
                                {automation.usage_level_of_ai_assistant || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-slate-900 dark:text-slate-100">
                                {automation.impact_on_productivity || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm max-w-xs truncate block text-slate-600 dark:text-slate-400">
                                {automation.ai_usage_inference || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100">
                                  {(automation.qa_owner || 'N/A').charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm text-slate-900 dark:text-slate-100">
                                  {automation.qa_owner || 'N/A'}
                                </span>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Summary Card Component
interface SummaryCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  gradientStart: string;
  gradientEnd: string;
  isDarkMode: boolean;
  currentTheme: any;
  dataKey: number;
  isPercentage?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  icon,
  color,
  gradientStart,
  gradientEnd,
  isDarkMode,
  currentTheme,
  dataKey,
  isPercentage = false
}) => {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    const duration = 1500;
    const startTime = Date.now();
    const startValue = displayValue;
    const endValue = value;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = startValue + (endValue - startValue) * easeOutQuart;
      
      setDisplayValue(isPercentage ? currentValue : Math.floor(currentValue));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
      }
    };

    animate();
  }, [value, dataKey, isPercentage]);

  return (
    <motion.div
      key={`summary-card-${title}-${dataKey}`}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ 
        duration: 0.6, 
        type: "spring",
        stiffness: 200,
        damping: 20
      }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="relative"
    >
      <Card 
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm relative overflow-hidden"
      >
        {/* Gradient overlay */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`
          }}
        />
        
        <CardHeader className="relative z-10 pb-2">
          <CardTitle 
            className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100"
          >
            <span style={{ color: color }}>{icon}</span>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10 pt-2">
          <motion.div 
            className="text-5xl font-black text-slate-900 dark:text-slate-100"
          >
            {isPercentage ? `${displayValue.toFixed(1)}%` : displayValue.toLocaleString()}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Project Card Component
interface ProjectCardProps {
  project: {
    project_key: string;
    project_name: string;
    defect_count: number;
    bug_count: number;
    automation_percentage: number;
    completion_percentage: number;
  };
  isDarkMode: boolean;
  currentTheme: any;
  dataKey: number;
  index: number;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  isDarkMode,
  currentTheme,
  dataKey,
  index
}) => {
  return (
    <motion.div
      key={`project-${project.project_key}-${dataKey}`}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ 
        delay: 0.3 + index * 0.1, 
        type: "spring", 
        stiffness: 200, 
        damping: 20 
      }}
      whileHover={{ scale: 1.02, y: -5 }}
    >
      <Card 
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm"
      >
        <CardHeader>
          <CardTitle 
            className="flex items-center gap-2 text-slate-900 dark:text-slate-100"
          >
            <Code className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            <div>
              <div className="font-bold">{project.project_key}</div>
              <div className="text-sm font-normal text-slate-600 dark:text-slate-400">
                {project.project_name}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs mb-1 text-slate-600 dark:text-slate-400">Defects</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {project.defect_count}
              </div>
            </div>
            <div>
              <div className="text-xs mb-1 text-slate-600 dark:text-slate-400">Bugs</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {project.bug_count}
              </div>
            </div>
            <div>
              <div className="text-xs mb-1 text-slate-600 dark:text-slate-400">Automation</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {project.automation_percentage.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-xs mb-1 text-slate-600 dark:text-slate-400">Completion</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {project.completion_percentage.toFixed(1)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Analysis Panel Component (for Defects and Bugs)
interface AnalysisPanelProps {
  title: string;
  icon: React.ReactNode;
  totalCount: number;
  rcaBreakdown: Record<string, number>;
  color: string;
  gradientStart: string;
  gradientEnd: string;
  isDarkMode: boolean;
  currentTheme: any;
  dataKey: number;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  title,
  icon,
  totalCount,
  rcaBreakdown,
  color,
  gradientStart,
  gradientEnd,
  isDarkMode,
  currentTheme,
  dataKey
}) => {
  const rcaEntries = Object.entries(rcaBreakdown).sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(...rcaEntries.map(([_, count]) => count), 1);

  return (
    <motion.div
      key={`panel-${title}-${dataKey}`}
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ 
        duration: 0.8, 
        ease: [0.34, 1.56, 0.64, 1],
        type: "spring",
        stiffness: 200,
        damping: 20
      }}
    >
      <Card 
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm relative overflow-hidden"
      >
        <CardHeader className="relative z-10">
          <CardTitle 
            className="flex items-center justify-between text-slate-900 dark:text-slate-100"
          >
            <div className="flex items-center gap-2">
              {icon}
              <span>{title}</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Total: {totalCount}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10 space-y-4">
          <div className="text-sm font-semibold mb-3 text-slate-600 dark:text-slate-400">
            Breakdown by RCA:
          </div>
          {rcaEntries.length > 0 ? (
            rcaEntries.map(([rca, count], index) => {
              const percentage = (count / totalCount) * 100;
              const barWidth = (count / maxCount) * 100;
              
              return (
                <motion.div
                  key={rca}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-900 dark:text-slate-100">{rca}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {count}
                      </span>
                      <span className="text-slate-600 dark:text-slate-400">
                        ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div 
                    className="h-3 rounded-full overflow-hidden relative"
                    style={{ 
                      backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
                    }}
                  >
                    <motion.div
                      className="h-full rounded-full relative overflow-hidden"
                      style={{
                        background: `linear-gradient(90deg, ${gradientStart}, ${gradientEnd})`,
                        boxShadow: `0 0 10px ${color}60`
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 1.5, ease: "easeOut", delay: 0.6 + index * 0.1 }}
                    >
                      <motion.div
                        className="absolute inset-0"
                        style={{
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)'
                        }}
                        animate={{
                          x: ['-100%', '200%']
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "linear",
                          repeatDelay: 1
                        }}
                      />
                    </motion.div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="text-sm text-slate-600 dark:text-slate-400">
              No RCA data available
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Automation Panel Component
interface AutomationPanelProps {
  automationMetrics: {
    completion_percentage: number;
    automation_percentage: number;
    committed_tc_count: number;
    completed_tc_count: number;
    total_projects: number;
  };
  projectsList: Array<{
    project_key: string;
    project_name: string;
    automation_percentage: number;
    completion_percentage: number;
  }>;
  isDarkMode: boolean;
  currentTheme: any;
  dataKey: number;
}

const AutomationPanel: React.FC<AutomationPanelProps> = ({
  automationMetrics,
  projectsList,
  isDarkMode,
  currentTheme,
  dataKey
}) => {
  return (
    <motion.div
      key={`automation-panel-${dataKey}`}
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ 
        duration: 0.8, 
        ease: [0.34, 1.56, 0.64, 1],
        type: "spring",
        stiffness: 200,
        damping: 20
      }}
    >
      <Card 
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm relative overflow-hidden"
      >
        <CardHeader className="relative z-10">
          <CardTitle 
            className="flex items-center gap-2 text-slate-900 dark:text-slate-100"
          >
            <Zap className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            Automation Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10 space-y-6">
          {/* Overall Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <div className="text-xs mb-1 text-slate-600 dark:text-slate-400">Committed TC</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {automationMetrics.committed_tc_count}
              </div>
            </div>
            <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <div className="text-xs mb-1 text-slate-600 dark:text-slate-400">Completed TC</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {automationMetrics.completed_tc_count}
              </div>
            </div>
            <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <div className="text-xs mb-1 text-slate-600 dark:text-slate-400">Automation %</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {automationMetrics.automation_percentage.toFixed(1)}%
              </div>
            </div>
            <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <div className="text-xs mb-1 text-slate-600 dark:text-slate-400">Completion %</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {automationMetrics.completion_percentage.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Projects Breakdown */}
          {projectsList.length > 0 && (
            <div className="space-y-4">
              <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Projects Breakdown:
              </div>
              {projectsList.map((project, index) => {
                const completionWidth = project.completion_percentage || 0;
                
                return (
                  <motion.div
                    key={`automation-project-${project.project_key}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {project.project_key} - {project.project_name}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          Automation: {project.automation_percentage.toFixed(1)}% | Completion: {project.completion_percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div 
                      className="h-2 rounded-full overflow-hidden relative"
                      style={{ 
                        backgroundColor: isDarkMode ? '#4B5563' : '#E5E7EB',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
                      }}
                    >
                      <motion.div
                        className="h-full rounded-full relative overflow-hidden"
                        style={{
                          background: `linear-gradient(90deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
                          boxShadow: `0 0 10px ${currentTheme.colors.primary}60`
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${completionWidth}%` }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.7 + index * 0.1 }}
                      >
                        <motion.div
                          className="absolute inset-0"
                          style={{
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)'
                          }}
                          animate={{
                            x: ['-100%', '200%']
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear",
                            repeatDelay: 1
                          }}
                        />
                      </motion.div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
