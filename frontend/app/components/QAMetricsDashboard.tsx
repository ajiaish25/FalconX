'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  RefreshCw, Download, AlertTriangle, Target, Users, TrendingUp, 
  CheckCircle, Activity, BarChart3, PieChart, Award, FileText, Sheet
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getApiUrl } from '../../lib/api-config';
import { LoadingSkeleton } from './figma/InsightsDashboard/components/LoadingSkeleton';

interface QEMetricsData {
  // Main Percentages
  automation_percentage: number;
  bugs_story_ratio: number;
  defect_leakage_percentage: number;
  functional_automation_percentage: number;
  test_coverage_percentage: number;
  project_automation_percentage: number;
  
  // Test Counts
  overall_testcases: number;
  tcs_requires_automation: number;
  automated_testcases: number;
  count_of_stories: number;
  
  // Defects and Bugs
  count_of_defects: number;
  count_of_bugs: number;
  bug_density: string;
  
  // Environment Flags
  dedicated_qe_env: string;
  dedicated_perf_env: string;
  automation_stability: string;
  test_data_refresh: string;
  performance_tested: string;
  dev_qe_ratio: string;
  
  // Team Counts
  tao_qe_count: number;
  tao_gp_cdk_count: number;
  sdet_assignment: number;
  manual_assignment: number;
  sdet_skillset: number;
  manual_skillset: number;
  
  // Metadata
  total_projects: number;
  unique_products: number;
  portfolio: string;
}

interface DropdownOptions {
  portfolios: string[];
  timelines: string[];
  products?: string[];
  containers?: string[];
}

interface AllOptions {
  portfolios: string[];
  timelines: string[];
  products: string[];
  containers: string[];
}

export function QAMetricsDashboard() {
  const { currentTheme, isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<QEMetricsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dataKey, setDataKey] = useState(0); // Key to trigger animations on data change
  const [allOptions, setAllOptions] = useState<AllOptions>({
    portfolios: ['All'],
    timelines: ['All'],
    products: ['All'],
    containers: ['All']
  });
  
  const [options, setOptions] = useState<DropdownOptions>({
    portfolios: ['All'],
    timelines: ['All'],
    products: ['All'],
    containers: ['All']
  });
  
  const [selectedPortfolio, setSelectedPortfolio] = useState('All');
  const [selectedTimeline, setSelectedTimeline] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState('All');
  const [selectedContainer, setSelectedContainer] = useState('All');

  useEffect(() => {
    fetchAllDropdownOptions();
  }, []);

  // Update filtered options when portfolio changes
  useEffect(() => {
    if (selectedPortfolio !== 'All') {
      fetchFilteredOptions(selectedPortfolio);
    } else {
      // Show all options when "All" is selected
      setOptions(allOptions);
    }
    // Always reset product and container when portfolio changes (including when "All" is selected)
    setSelectedProduct('All');
    setSelectedContainer('All');
  }, [selectedPortfolio, allOptions]);

  useEffect(() => {
    fetchQEMetrics();
  }, [selectedPortfolio, selectedTimeline, selectedProduct, selectedContainer]);

  const fetchAllDropdownOptions = async () => {
    try {
      const response = await fetch(getApiUrl('/api/qe-metrics/options'));
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const allOpts = {
            portfolios: result.options.portfolios || ['All'],
            timelines: result.options.timelines || ['All'],
            products: result.options.products || ['All'],
            containers: result.options.containers || ['All']
          };
          setAllOptions(allOpts);
          setOptions(allOpts);
          console.log('✅ Loaded all dropdown options:', allOpts);
        }
      }
    } catch (err) {
      console.error('Error fetching dropdown options:', err);
    }
  };

  const fetchFilteredOptions = async (portfolio: string) => {
    try {
      const response = await fetch(getApiUrl(`/api/qe-metrics/options?portfolio=${encodeURIComponent(portfolio)}`));
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setOptions({
            portfolios: allOptions.portfolios, // Keep all portfolios
            timelines: result.options.timelines || ['All'],
            products: result.options.products || ['All'],
            containers: result.options.containers || ['All']
          });
          console.log(`✅ Loaded filtered options for portfolio '${portfolio}':`, result.options);
        }
      }
    } catch (err) {
      console.error('Error fetching filtered dropdown options:', err);
    }
  };

  const fetchQEMetrics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(getApiUrl('/api/qe-metrics'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolio: selectedPortfolio,
          product: selectedProduct,
          container: selectedContainer,
          timeline: selectedTimeline
        })
      });

      if (!response.ok) throw new Error('Failed to fetch QE metrics');
      
      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setDataKey(prev => prev + 1); // Increment key to trigger animations
      } else {
        setError(result.error || 'Failed to load data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error fetching QE metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!data) return;
    
    const csv = [
      ['Metric', 'Value'],
      ['Portfolio', data.portfolio],
      ['Automation %', data.automation_percentage],
      ['Bugs - Story Ratio', data.bugs_story_ratio],
      ['Defect Leakage %', data.defect_leakage_percentage],
      ['Overall Testcases', data.overall_testcases],
      ['TCs Requires Automation', data.tcs_requires_automation],
      ['Automated Testcases', data.automated_testcases],
      ['Count of Stories', data.count_of_stories],
      ['Count of Defects', data.count_of_defects],
      ['Count of Bugs', data.count_of_bugs],
      ['Bug Density', data.bug_density],
      ['Dedicated QE Env', data.dedicated_qe_env],
      ['Dedicated PERF Env', data.dedicated_perf_env],
      ['Automation Stability', data.automation_stability],
      ['Test Data Refresh', data.test_data_refresh],
      ['Performance Tested', data.performance_tested],
      ['TAO QE Count', data.tao_qe_count],
      ['TAO + GP + CDK Count', data.tao_gp_cdk_count],
      ['DEV - QE Ratio', data.dev_qe_ratio]
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QE-Metrics-${selectedPortfolio}-${new Date().toISOString().split('T')[0]}.csv`;
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
            <title>QE Metrics Report - ${selectedPortfolio}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #333; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
              th { background-color: #f5f5f5; }
              .metric-row { page-break-inside: avoid; }
            </style>
          </head>
          <body>
            <h1>QE Metrics Report</h1>
            <p><strong>Portfolio:</strong> ${data.portfolio}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <table>
              <tr><th>Metric</th><th>Value</th></tr>
              <tr><td>Automation %</td><td>${data.automation_percentage}%</td></tr>
              <tr><td>Bugs - Story Ratio</td><td>${data.bugs_story_ratio}%</td></tr>
              <tr><td>Defect Leakage %</td><td>${data.defect_leakage_percentage}%</td></tr>
              <tr><td>Overall Testcases</td><td>${data.overall_testcases}</td></tr>
              <tr><td>TCs Requires Automation</td><td>${data.tcs_requires_automation}</td></tr>
              <tr><td>Automated Testcases</td><td>${data.automated_testcases}</td></tr>
              <tr><td>Count of Stories</td><td>${data.count_of_stories}</td></tr>
              <tr><td>Count of Defects</td><td>${data.count_of_defects}</td></tr>
              <tr><td>Count of Bugs</td><td>${data.count_of_bugs}</td></tr>
              <tr><td>Bug Density</td><td>${data.bug_density}</td></tr>
              <tr><td>Dedicated QE Env</td><td>${data.dedicated_qe_env}</td></tr>
              <tr><td>Dedicated PERF Env</td><td>${data.dedicated_perf_env}</td></tr>
              <tr><td>Automation Stability</td><td>${data.automation_stability}</td></tr>
              <tr><td>Test Data Refresh</td><td>${data.test_data_refresh}</td></tr>
              <tr><td>Performance Tested</td><td>${data.performance_tested}</td></tr>
              <tr><td>TAO QE Count</td><td>${data.tao_qe_count}</td></tr>
              <tr><td>TAO + GP + CDK Count</td><td>${data.tao_gp_cdk_count}</td></tr>
              <tr><td>DEV - QE Ratio</td><td>${data.dev_qe_ratio}</td></tr>
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

  return (
    <div 
      className="h-full overflow-auto transition-all duration-300"
      style={{ backgroundColor: currentTheme.colors.background }}
    >
      <div className="p-6 space-y-6 w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 
              className="text-4xl font-bold tracking-tight"
              style={{
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                color: currentTheme.colors.primary,
                background: `linear-gradient(90deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              CDK QE METRICS
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-lg" style={{ color: currentTheme.colors.textSecondary }}>
                Comprehensive Quality Engineering Dashboard
              </p>
              <Badge 
                variant="outline"
                style={{
                  backgroundColor: isDarkMode ? currentTheme.colors.surface : currentTheme.colors.background,
                  borderColor: currentTheme.colors.border,
                  color: currentTheme.colors.text
                }}
              >
                {data.total_projects} Projects • {data.unique_products} Products
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={fetchQEMetrics}
              variant="outline"
              className="flex items-center gap-2"
              disabled={loading}
              style={{
                borderColor: currentTheme.colors.border,
                color: currentTheme.colors.text,
                backgroundColor: isDarkMode ? currentTheme.colors.surface : 'transparent'
              }}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={exportToExcel}
              variant="outline"
              className="flex items-center gap-2"
              disabled={!data}
              style={{
                borderColor: currentTheme.colors.border,
                color: currentTheme.colors.text,
                backgroundColor: isDarkMode ? currentTheme.colors.surface : 'transparent'
              }}
            >
              <Sheet className="h-4 w-4" />
              CSV
            </Button>
            <Button
              onClick={exportToPDF}
              variant="outline"
              className="flex items-center gap-2"
              disabled={!data}
              style={{
                borderColor: currentTheme.colors.border,
                color: currentTheme.colors.text,
                backgroundColor: isDarkMode ? currentTheme.colors.surface : 'transparent'
              }}
            >
              <FileText className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-4 gap-4"
        >
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: currentTheme.colors.text }}>
              Portfolio
            </label>
            <Select value={selectedPortfolio} onValueChange={setSelectedPortfolio}>
              <SelectTrigger 
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.portfolios && options.portfolios.length > 0 ? (
                  options.portfolios.map((portfolio) => (
                  <SelectItem key={portfolio} value={portfolio}>
                    {portfolio}
                  </SelectItem>
                  ))
                ) : (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: currentTheme.colors.text }}>
              Product
            </label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger 
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.products && options.products.length > 0 ? (
                  options.products.map((product) => (
                    <SelectItem key={product} value={product}>
                      {product}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: currentTheme.colors.text }}>
              Container
            </label>
            <Select value={selectedContainer} onValueChange={setSelectedContainer}>
              <SelectTrigger 
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.containers && options.containers.length > 0 ? (
                  options.containers.map((container) => (
                    <SelectItem key={container} value={container}>
                      {container}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: currentTheme.colors.text }}>
              Timeline
            </label>
            <Select value={selectedTimeline} onValueChange={setSelectedTimeline}>
              <SelectTrigger 
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.timelines?.map((timeline) => (
                  <SelectItem key={timeline} value={timeline}>
                    {timeline}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Main Metrics - Circular Charts (Top 3) */}
        <motion.div
          key={`gauges-${dataKey}`}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 100, damping: 15 }}
        >
          {/* Automation % Gauge - Yellow */}
          <GaugeCard
            title="Automation %"
            value={data.automation_percentage}
            color="#FFD700"
            isDarkMode={isDarkMode}
            currentTheme={currentTheme}
            dataKey={dataKey}
          />

          {/* Bugs - Story Ratio Gauge - Dark Blue */}
          <GaugeCard
            title="Bugs - Story Ratio"
            value={data.bugs_story_ratio}
            color="#1E3A8A"
            isDarkMode={isDarkMode}
            currentTheme={currentTheme}
            dataKey={dataKey}
          />

          {/* Defect Leakage % Gauge - Silver */}
          <GaugeCard
            title="Defect Leakage %"
            value={data.defect_leakage_percentage}
            color="#94A3B8"
            isDarkMode={isDarkMode}
            currentTheme={currentTheme}
            dataKey={dataKey}
          />
        </motion.div>

        {/* Test Metrics Cards */}
        <motion.div
          key={`test-metrics-${dataKey}`}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 100, damping: 15 }}
        >
          <MetricCountCard
            label="Overall Testcases"
            value={data.overall_testcases}
            bgColor="#E0F2FE"
            isDarkMode={isDarkMode}
            currentTheme={currentTheme}
          />
          <MetricCountCard
            label="TCs Requires Automation"
            value={data.tcs_requires_automation}
            bgColor="#E0F2FE"
            isDarkMode={isDarkMode}
            currentTheme={currentTheme}
          />
          <MetricCountCard
            label="Automated Testcases"
            value={data.automated_testcases}
            bgColor="#E0F2FE"
            isDarkMode={isDarkMode}
            currentTheme={currentTheme}
          />
          <MetricCountCard
            label="Count of Stories"
            value={data.count_of_stories}
            bgColor="#E0F2FE"
            isDarkMode={isDarkMode}
            currentTheme={currentTheme}
          />
        </motion.div>

        {/* Defects & Bugs Cards */}
        <motion.div
          key={`defects-bugs-${dataKey}`}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 100, damping: 15 }}
        >
          <MetricCountCard
            label="Count of Defects"
            value={data.count_of_defects}
            bgColor="#FED7AA"
            isDarkMode={isDarkMode}
            currentTheme={currentTheme}
          />
          <MetricCountCard
            label="Count of Bugs"
            value={data.count_of_bugs}
            bgColor="#FED7AA"
            isDarkMode={isDarkMode}
            currentTheme={currentTheme}
          />
          <MetricStringCard
            label="Bug Density"
            value={data.bug_density}
            bgColor="#FED7AA"
            isDarkMode={isDarkMode}
            currentTheme={currentTheme}
          />
        </motion.div>

        {/* Environment & Quality Flags */}
        <motion.div
          key={`env-flags-${dataKey}`}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 100, damping: 15 }}
        >
          <MetricStringCard
            label="Dedicated QE Env"
            value={data.dedicated_qe_env}
            bgColor="#FEF3C7"
            isDarkMode={isDarkMode}
            currentTheme={currentTheme}
          />
          <MetricStringCard
            label="Dedicated PERF Env"
            value={data.dedicated_perf_env}
            bgColor="#FEF3C7"
            isDarkMode={isDarkMode}
            currentTheme={currentTheme}
          />
          <MetricStringCard
            label="Automation Stability"
            value={data.automation_stability}
            bgColor="#FEF3C7"
            isDarkMode={isDarkMode}
            currentTheme={currentTheme}
          />
          <MetricStringCard
            label="Test Data Refresh"
            value={data.test_data_refresh}
            bgColor="#FEF3C7"
            isDarkMode={isDarkMode}
            currentTheme={currentTheme}
          />
          <MetricStringCard
            label="Performance Tested"
            value={data.performance_tested}
            bgColor="#FEF3C7"
            isDarkMode={isDarkMode}
            currentTheme={currentTheme}
          />
        </motion.div>

        {/* Team Composition */}
        <motion.div
          key={`team-composition-${dataKey}`}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, type: "spring", stiffness: 100, damping: 15 }}
        >
          {/* Assignment Distribution */}
          <TeamCompositionCard
            title="CDK Assignment"
            sdetCount={data.sdet_assignment}
            manualCount={data.manual_assignment}
            icon={<Users />}
            isDarkMode={isDarkMode}
            currentTheme={currentTheme}
          />

          {/* Skillset Distribution */}
          <TeamCompositionCard
            title="Skillset Distribution"
            sdetCount={data.sdet_skillset}
            manualCount={data.manual_skillset}
            icon={<Award />}
            isDarkMode={isDarkMode}
            currentTheme={currentTheme}
          />
        </motion.div>

        {/* Team Count Cards */}
        <motion.div
          key={`team-counts-${dataKey}`}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, type: "spring", stiffness: 100, damping: 15 }}
        >
          <TeamCountCard
            title="TAO QE Count"
            count={data.tao_qe_count}
            isDarkMode={isDarkMode}
            currentTheme={currentTheme}
          />

          <TeamCountCard
            title="TAO + GP + CDK Count"
            count={data.tao_gp_cdk_count}
            isDarkMode={isDarkMode}
            currentTheme={currentTheme}
          />

          <TeamRatioCard
            title="DEV - QE Ratio"
            ratio={data.dev_qe_ratio}
            isDarkMode={isDarkMode}
            currentTheme={currentTheme}
            dataKey={dataKey}
          />
        </motion.div>
      </div>
    </div>
  );
}

// Circular Metric Card Component
interface CircularMetricCardProps {
  title: string;
  percentage: number;
  icon: React.ReactNode;
  color: string;
  isDarkMode: boolean;
  currentTheme: any;
  inverted?: boolean;
}

const CircularMetricCard: React.FC<CircularMetricCardProps> = ({
  title,
  percentage,
  icon,
  color,
  isDarkMode,
  currentTheme,
  inverted = false
}) => {
  const displayPercentage = Math.round(percentage);
  const strokeDasharray = `${displayPercentage * 2.51} 251`;

  return (
    <Card 
      className={`shadow-lg hover:shadow-xl transition-all duration-500 rounded-2xl border ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}
    >
      <CardHeader>
        <CardTitle 
          className="flex items-center text-lg font-semibold tracking-wide"
          style={{ 
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            color: currentTheme.colors.text
          }}
        >
          <span style={{ color }}>{icon}</span>
          <span className="ml-3">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center space-y-4">
          <div className="relative w-48 h-48">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className={isDarkMode ? "text-gray-700" : "text-gray-200"}
              />
              <motion.circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={strokeDasharray}
                initial={{ strokeDasharray: "0 251" }}
                animate={{ strokeDasharray }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div 
                className="text-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
              >
                <div 
                  className="text-4xl font-black"
                  style={{ 
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    color 
                  }}
                >
                  {displayPercentage}%
                </div>
                <div 
                  className="text-xs font-semibold mt-1"
                  style={{ 
                    color: currentTheme.colors.textSecondary,
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}
                >
                  {inverted ? 'Lower is Better' : 'Coverage'}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Horizontal Progress Bar
interface HorizontalProgressBarProps {
  label: string;
  value: number;
  color: string;
  secondaryColor: string;
  isDarkMode: boolean;
  currentTheme: any;
}

const HorizontalProgressBar: React.FC<HorizontalProgressBarProps> = ({
  label,
  value,
  color,
  secondaryColor,
  isDarkMode,
  currentTheme
}) => {
  const displayValue = Math.round(value);
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      whileHover={{ scale: 1.02 }}
    >
    <Card 
        className={`shadow-xl hover:shadow-2xl transition-all duration-500 rounded-3xl border relative overflow-hidden ${
          isDarkMode ? 'bg-gray-800/95 border-gray-700/60' : 'bg-white/98 border-gray-200/60'
        }`}
        style={{
          boxShadow: `0 15px 35px ${color}15, 0 0 0 1px ${color}08`
        }}
      >
        {/* Animated background shimmer */}
        <motion.div
          className="absolute inset-0 opacity-5"
          style={{
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`
          }}
          animate={{
            x: ['-100%', '200%']
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <motion.span 
              className="text-lg font-bold tracking-wide"
            style={{ 
              color: currentTheme.colors.text,
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
          >
            {label}
            </motion.span>
            <motion.span 
              className="text-2xl font-black"
              style={{ 
                background: `linear-gradient(135deg, ${color}, ${secondaryColor})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
            >
              {displayValue}%
            </motion.span>
        </div>
        <div 
            className="h-5 rounded-full overflow-hidden relative"
            style={{ 
              backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            {/* Progress bar with gradient and glow */}
          <motion.div
              className="h-full rounded-full relative overflow-hidden"
            style={{
                background: `linear-gradient(90deg, ${color}, ${secondaryColor}, ${color})`,
                backgroundSize: '200% 100%',
                boxShadow: `0 0 20px ${color}40, inset 0 0 10px ${color}20`
            }}
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }}
              transition={{ duration: 2, ease: "easeOut", delay: 0.3 }}
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)'
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
              {/* Glow effect */}
              <motion.div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(circle at center, ${color}60, transparent 70%)`,
                  filter: 'blur(8px)'
                }}
                animate={{
                  opacity: [0.5, 0.8, 0.5]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </motion.div>
        </div>
      </CardContent>
    </Card>
    </motion.div>
  );
};

// Team Composition Card
interface TeamCompositionCardProps {
  title: string;
  sdetCount: number;
  manualCount: number;
  icon: React.ReactNode;
  isDarkMode: boolean;
  currentTheme: any;
}

const TeamCompositionCard: React.FC<TeamCompositionCardProps> = ({
  title,
  sdetCount,
  manualCount,
  icon,
  isDarkMode,
  currentTheme
}) => {
  const total = sdetCount + manualCount;
  const sdetPercentage = total > 0 ? (sdetCount / total) * 100 : 0;
  const manualPercentage = total > 0 ? (manualCount / total) * 100 : 0;
  
  const sdetColor = currentTheme.colors.primary;
  const manualColor = currentTheme.colors.secondary;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      whileHover={{ scale: 1.03, y: -5 }}
    >
    <Card 
        className={`shadow-xl hover:shadow-2xl transition-all duration-500 rounded-3xl border relative overflow-hidden ${
          isDarkMode ? 'bg-gray-800/95 border-gray-700/60' : 'bg-white/98 border-gray-200/60'
        }`}
        style={{
          boxShadow: `0 15px 35px ${sdetColor}15, 0 0 0 1px ${sdetColor}08`
        }}
      >
        {/* Animated background gradient */}
        <motion.div
          className="absolute inset-0 opacity-5"
          style={{
            background: `linear-gradient(135deg, ${sdetColor}40, ${manualColor}40)`
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.05, 0.1, 0.05]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <CardHeader className="relative z-10">
        <CardTitle 
            className="flex items-center text-lg font-bold tracking-wide"
          style={{ 
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              background: `linear-gradient(135deg, ${sdetColor}, ${manualColor})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            <motion.span 
              style={{ color: sdetColor }}
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              {icon}
            </motion.span>
          <span className="ml-3">{title}</span>
        </CardTitle>
      </CardHeader>
        <CardContent className="relative z-10">
          <div className="space-y-5">
            <motion.div 
              className="flex items-center justify-between"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
            <div className="flex items-center space-x-3">
                <motion.div 
                  className="w-5 h-5 rounded-full shadow-lg"
                  style={{ backgroundColor: sdetColor }}
                  animate={{
                    scale: [1, 1.2, 1],
                    boxShadow: [`0 0 0 0 ${sdetColor}40`, `0 0 0 8px ${sdetColor}00`, `0 0 0 0 ${sdetColor}40`]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
              />
              <span 
                  className="text-sm font-semibold tracking-wide"
                  style={{ 
                    color: currentTheme.colors.text,
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}
              >
                SDET
              </span>
            </div>
            <div className="flex items-center space-x-2">
                <motion.span 
                  className="text-2xl font-black"
                  style={{ 
                    background: `linear-gradient(135deg, ${sdetColor}, ${manualColor})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: `drop-shadow(0 2px 4px ${sdetColor}30)`
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
              >
                {sdetCount}
                </motion.span>
              <span 
                  className="text-sm font-semibold"
                style={{ color: currentTheme.colors.textSecondary }}
              >
                ({Math.round(sdetPercentage)}%)
              </span>
            </div>
            </motion.div>

            <motion.div 
              className="flex items-center justify-between"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
            <div className="flex items-center space-x-3">
                <motion.div 
                  className="w-5 h-5 rounded-full shadow-lg"
                  style={{ backgroundColor: manualColor }}
                  animate={{
                    scale: [1, 1.2, 1],
                    boxShadow: [`0 0 0 0 ${manualColor}40`, `0 0 0 8px ${manualColor}00`, `0 0 0 0 ${manualColor}40`]
                  }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              />
              <span 
                  className="text-sm font-semibold tracking-wide"
                  style={{ 
                    color: currentTheme.colors.text,
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}
              >
                Manual
              </span>
            </div>
            <div className="flex items-center space-x-2">
                <motion.span 
                  className="text-2xl font-black"
                  style={{ 
                    background: `linear-gradient(135deg, ${sdetColor}, ${manualColor})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: `drop-shadow(0 2px 4px ${manualColor}30)`
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
              >
                {manualCount}
                </motion.span>
              <span 
                  className="text-sm font-semibold"
                style={{ color: currentTheme.colors.textSecondary }}
              >
                ({Math.round(manualPercentage)}%)
              </span>
            </div>
            </motion.div>

            <div className="pt-3">
              <motion.div 
                className="text-sm font-bold mb-3 tracking-wide" 
                style={{ 
                  color: currentTheme.colors.textSecondary,
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
              Total: {total}
              </motion.div>
              <div 
                className="h-4 rounded-full overflow-hidden flex relative"
                style={{ 
                  backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                }}
            >
              <motion.div
                  className="h-full relative overflow-hidden"
                  style={{ 
                    background: `linear-gradient(90deg, ${sdetColor}, ${sdetColor}dd)`,
                    boxShadow: `0 0 10px ${sdetColor}40`
                  }}
                initial={{ width: 0 }}
                animate={{ width: `${sdetPercentage}%` }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.7 }}
                >
                  {/* Shimmer effect */}
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)'
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
              <motion.div
                  className="h-full relative overflow-hidden"
                  style={{ 
                    background: `linear-gradient(90deg, ${manualColor}, ${manualColor}dd)`,
                    boxShadow: `0 0 10px ${manualColor}40`
                  }}
                initial={{ width: 0 }}
                animate={{ width: `${manualPercentage}%` }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.8 }}
                >
                  {/* Shimmer effect */}
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)'
                    }}
                    animate={{
                      x: ['-100%', '200%']
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                      repeatDelay: 1.2
                    }}
                  />
                </motion.div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </motion.div>
  );
};

// Team Count Card
interface TeamCountCardProps {
  title: string;
  count: number;
  isDarkMode: boolean;
  currentTheme: any;
}

const TeamCountCard: React.FC<TeamCountCardProps> = ({
  title,
  count,
  isDarkMode,
  currentTheme
}) => {
  return (
    <Card 
      className={`shadow-lg hover:shadow-xl transition-all duration-500 rounded-2xl border overflow-hidden ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}
    >
      <div 
        className="px-6 py-4"
        style={{
          background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
          color: '#FFFFFF'
        }}
      >
        <h3 className="text-lg font-bold text-center" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
          {title}
        </h3>
      </div>
      <CardContent className="p-8" style={{ backgroundColor: isDarkMode ? currentTheme.colors.surface : '#FFFFFF' }}>
        <motion.div 
          className="text-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
        >
          <div 
            className="text-6xl font-black"
            style={{ 
              background: `linear-gradient(90deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
          >
            {count}
          </div>
          <div 
            className="text-sm font-semibold mt-2"
            style={{ color: currentTheme.colors.textSecondary }}
          >
            Team Members
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
};

// Gauge Card Component - Donut Chart Style
interface GaugeCardProps {
  title: string;
  value: number;
  color: string;
  isDarkMode: boolean;
  currentTheme: any;
  dataKey?: number;
}

const GaugeCard: React.FC<GaugeCardProps> = ({
  title,
  value,
  color,
  isDarkMode,
  currentTheme,
  dataKey = 0
}) => {
  const displayValue = Math.round(value);
  const radius = 40;
  const innerRadius = 28; // Creates donut effect
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayValue / 100) * circumference;
  
  // Create gradient color schemes based on the base color
  const getGradientColors = (baseColor: string) => {
    // Yellow gradient
    if (baseColor === '#FFD700') {
      return {
        start: '#FFD700', // Gold
        middle: '#FFA500', // Orange
        end: '#FF8C00' // Dark Orange
      };
    }
    // Dark Blue gradient
    if (baseColor === '#1E3A8A') {
      return {
        start: '#3B82F6', // Bright Blue
        middle: '#2563EB', // Blue
        end: '#1E3A8A' // Dark Blue
      };
    }
    // Silver gradient
    if (baseColor === '#94A3B8') {
      return {
        start: '#E2E8F0', // Light Silver
        middle: '#94A3B8', // Silver
        end: '#64748B' // Dark Silver
      };
    }
    // Default gradient
    return {
      start: baseColor,
      middle: baseColor,
      end: baseColor
    };
  };
  
  const gradientColors = getGradientColors(color);

  return (
    <motion.div
      key={`gauge-${title}-${dataKey}`}
      initial={{ opacity: 0, scale: 0.8, y: 20, rotateY: -15 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotateY: 0 }}
      transition={{ 
        duration: 0.8, 
        ease: [0.34, 1.56, 0.64, 1],
        type: "spring",
        stiffness: 200,
        damping: 20
      }}
      whileHover={{ scale: 1.05, y: -5 }}
    >
      <Card 
        className={`shadow-xl hover:shadow-2xl transition-all duration-500 rounded-3xl border relative overflow-hidden ${
          isDarkMode ? 'bg-gray-800/95 border-gray-700/60' : 'bg-white/98 border-gray-200/60'
        }`}
        style={{
          boxShadow: `0 20px 40px ${color}20, 0 0 0 1px ${color}10`
        }}
      >
        {/* Animated background gradient */}
        <motion.div
          className="absolute inset-0 opacity-10"
          style={{
            background: `radial-gradient(circle at center, ${color}40, transparent 70%)`
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.15, 0.1]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <CardHeader className="relative z-10">
          <CardTitle 
            className="text-lg font-bold text-center tracking-wide"
            style={{ 
              background: `linear-gradient(135deg, ${gradientColors.start}, ${gradientColors.middle}, ${gradientColors.end})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
          >
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Gradient definitions */}
                <defs>
                  {/* Radial gradient for donut ring */}
                  <radialGradient id={`donut-gradient-${title}`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={gradientColors.start} stopOpacity="1" />
                    <stop offset="50%" stopColor={gradientColors.middle} stopOpacity="1" />
                    <stop offset="100%" stopColor={gradientColors.end} stopOpacity="1" />
                  </radialGradient>
                  
                  {/* Linear gradient for donut ring (alternative) */}
                  <linearGradient id={`donut-linear-${title}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={gradientColors.start} stopOpacity="1" />
                    <stop offset="50%" stopColor={gradientColors.middle} stopOpacity="1" />
                    <stop offset="100%" stopColor={gradientColors.end} stopOpacity="1" />
                  </linearGradient>
                  
                  {/* Conic gradient effect using multiple stops */}
                  <linearGradient id={`donut-conic-${title}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="100">
                    <stop offset="0%" stopColor={gradientColors.start} />
                    <stop offset="25%" stopColor={gradientColors.middle} />
                    <stop offset="50%" stopColor={gradientColors.end} />
                    <stop offset="75%" stopColor={gradientColors.middle} />
                    <stop offset="100%" stopColor={gradientColors.start} />
                  </linearGradient>
                  
                  <filter id={`glow-${title}`}>
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                {/* Background circle (outer ring) - unfilled portion */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  className={isDarkMode ? "text-gray-700" : "text-gray-200"}
                />
                
                {/* Progress arc (donut ring) - filled portion with gradient */}
                <motion.circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={`url(#donut-conic-${title})`}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ 
                    transformOrigin: '50px 50px',
                    filter: `url(#glow-${title})`
                  }}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 2, ease: 'easeOut', delay: 0.3 }}
                />
                
                {/* Inner circle to create donut effect - covers center */}
                <circle
                  cx="50"
                  cy="50"
                  r="28"
                  fill={isDarkMode ? '#1F2937' : '#FFFFFF'}
                  className="transition-colors duration-300"
                />
              </svg>
              
              {/* Center text with pulse effect */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.div 
                  className="text-center"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 1, type: "spring", stiffness: 200, damping: 15 }}
                >
                  <motion.div 
                    className="text-4xl font-black"
                    style={{ 
                      background: `linear-gradient(135deg, ${gradientColors.start}, ${gradientColors.middle}, ${gradientColors.end})`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      filter: `drop-shadow(0 0 8px ${color}60)`,
                      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    }}
                    animate={{
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    {displayValue}%
                  </motion.div>
                </motion.div>
              </div>
            </div>
            
            {/* Visual indicator bar below */}
            <div className="w-full px-4">
              <div 
                className="h-2 rounded-full overflow-hidden relative"
                style={{ 
                  backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
                }}
              >
                <motion.div
                  className="h-full rounded-full relative overflow-hidden"
                  style={{
                    background: `linear-gradient(90deg, ${gradientColors.start}, ${gradientColors.middle}, ${gradientColors.end})`,
                    boxShadow: `0 0 10px ${color}60`
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${displayValue}%` }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                >
                  {/* Shimmer effect */}
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
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Metric Count Card for displaying numeric values
interface MetricCountCardProps {
  label: string;
  value: number;
  bgColor: string;
  isDarkMode: boolean;
  currentTheme: any;
}

const MetricCountCard: React.FC<MetricCountCardProps> = ({
  label,
  value,
  bgColor,
  isDarkMode,
  currentTheme
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      whileHover={{ scale: 1.05, y: -5 }}
    >
      <Card 
        className={`shadow-lg hover:shadow-xl rounded-2xl border transition-all duration-500 relative overflow-hidden ${
          isDarkMode ? 'border-gray-700/60' : 'border-gray-200/60'
        }`}
        style={{
          backgroundColor: isDarkMode ? currentTheme.colors.surface : bgColor,
          boxShadow: `0 10px 25px ${currentTheme.colors.primary}10`
        }}
      >
        {/* Animated gradient overlay */}
        <motion.div
          className="absolute inset-0 opacity-0 hover:opacity-10 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle at center, ${currentTheme.colors.primary}40, transparent 70%)`
          }}
        />
        
        <CardContent className="p-5 relative z-10">
          <div className="text-center">
            <motion.div 
              className="text-sm font-semibold mb-3 tracking-wide"
              style={{ 
                color: currentTheme.colors.textSecondary,
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {label}
            </motion.div>
            <motion.div 
              className="text-4xl font-black"
              style={{ 
                background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                color: 'transparent',
                filter: `drop-shadow(0 2px 4px ${currentTheme.colors.primary}20)`,
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 15 }}
            >
              {value.toLocaleString()}
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Metric String Card for displaying string values
interface MetricStringCardProps {
  label: string;
  value: string;
  bgColor: string;
  isDarkMode: boolean;
  currentTheme: any;
}

const MetricStringCard: React.FC<MetricStringCardProps> = ({
  label,
  value,
  bgColor,
  isDarkMode,
  currentTheme
}) => {
  return (
    <Card 
      className={`shadow-md rounded-xl border transition-all duration-300 ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}
      style={{
        backgroundColor: isDarkMode ? currentTheme.colors.surface : bgColor
      }}
    >
      <CardContent className="p-4">
        <div className="text-center">
          <div 
            className="text-sm font-medium mb-2"
            style={{ color: currentTheme.colors.textSecondary }}
          >
            {label}
          </div>
          <motion.div 
            className="text-xl font-bold truncate"
            style={{ 
              background: `linear-gradient(90deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent'
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            {value}
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
};

// Team Ratio Card Component
interface TeamRatioCardProps {
  title: string;
  ratio: string;
  isDarkMode: boolean;
  currentTheme: any;
  dataKey?: number;
}

const TeamRatioCard: React.FC<TeamRatioCardProps> = ({
  title,
  ratio,
  isDarkMode,
  currentTheme,
  dataKey = 0
}) => {
  // Parse and format the ratio properly
  const formatRatio = (ratioStr: string): string => {
    if (!ratioStr || typeof ratioStr !== 'string') return '11:1';
    
    // Remove any extra spaces and split by colon
    const cleaned = ratioStr.trim();
    
    // Check if it's already in correct format (e.g., "11:1")
    if (cleaned.includes(':')) {
      const parts = cleaned.split(':');
      if (parts.length >= 2) {
        const dev = parts[0].trim();
        const qe = parts[1].trim();
        // Return only the first two parts (Dev:QE), ignore any extra parts
        return `${dev}:${qe}`;
      }
    }
    
    // If format is wrong, try to parse it
    // Handle cases like "01:11:00" - take first two parts
    if (cleaned.match(/^\d+:\d+:\d+/)) {
      const parts = cleaned.split(':');
      return `${parseInt(parts[0])}:${parseInt(parts[1])}`;
    }
    
    return cleaned || '11:1';
  };
  
  const formattedRatio = formatRatio(ratio);
  
  return (
    <motion.div
      key={`ratio-${dataKey}`}
      initial={{ opacity: 0, scale: 0.8, y: 20, rotateY: -15 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotateY: 0 }}
      transition={{ 
        duration: 0.8, 
        ease: [0.34, 1.56, 0.64, 1],
        type: "spring",
        stiffness: 200,
        damping: 20
      }}
      whileHover={{ scale: 1.05, y: -5 }}
    >
    <Card 
      className={`shadow-lg hover:shadow-xl transition-all duration-500 rounded-2xl border overflow-hidden ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}
    >
      <div 
        className="px-6 py-4"
        style={{
          background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
          color: '#FFFFFF'
        }}
      >
        <h3 className="text-lg font-bold text-center" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
          {title}
        </h3>
      </div>
      <CardContent className="p-8" style={{ backgroundColor: isDarkMode ? currentTheme.colors.surface : '#FFFFFF' }}>
        <motion.div 
          key={`ratio-value-${dataKey}`}
          className="text-center"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 20,
            delay: 0.3 
          }}
        >
          <motion.div 
            className="text-5xl font-black"
            style={{ 
              background: `linear-gradient(90deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 0.6,
              delay: 0.5,
              ease: "easeOut"
            }}
          >
            {formattedRatio}
          </motion.div>
          <div 
            className="text-sm font-semibold mt-2"
            style={{ color: currentTheme.colors.textSecondary }}
          >
            Development to QE
          </div>
        </motion.div>
      </CardContent>
    </Card>
    </motion.div>
  );
};
