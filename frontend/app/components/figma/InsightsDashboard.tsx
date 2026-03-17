'use client'

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { RefreshCw, TrendingUp, Users, Clock, Target, AlertTriangle, CheckCircle, BarChart3, PieChart, Activity, Zap, Sparkles, ArrowUpRight, Trophy, Crown, Star, Medal, Award, Download, FileText, Brain, Lightbulb, Info, X, TrendingDown, LineChart, Settings, Maximize2, Minimize2, ChevronDown, ChevronUp, Calendar, Layers, Eye, EyeOff } from 'lucide-react';
import { Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart, Scatter } from 'recharts';
import { exportInsightsAsPDF } from '../../utils/exportUtils';
import { useTheme } from '../../contexts/ThemeContext';
import { getApiUrl } from '../../../lib/api-config';
import { LoadingSkeleton } from './InsightsDashboard/components/LoadingSkeleton';

interface Project {
  id: string;
  key: string;
  name: string;
}

interface JiraMetrics {
  totalIssues: number;
  resolvedIssues: number;
  openIssues: number;
  bugs: number;
  stories: number;
  tasks: number;
  epics: number;
  subtasks: number;
  storyPoints: number;
  sprintVelocity: number;
  avgResolutionTime: number;
  issuesByStatus: Record<string, number>;
  issuesByPriority: Record<string, number>;
  issuesByAssignee: Record<string, number>;
  totalIssuesAll?: number;
  filters?: {
    projectKey?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
  };
}

// Enhanced interfaces for new features
interface SprintVelocity {
  sprintName: string;
  startDate: string;
  endDate: string;
  committedPoints: number;
  completedPoints: number;
  velocity: number;
}

interface BurndownData {
  sprintName: string;
  dates: string[];
  idealBurndown: number[];
  actualBurndown: number[];
  remainingWork: number[];
}

interface PredictiveAnalytics {
  sprintCompletionDate: string;
  completionConfidence: number;
  velocityTrend: 'increasing' | 'decreasing' | 'stable';
  forecastedVelocity: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

interface BottleneckAnalysis {
  status: string;
  avgTimeInStatus: number;
  issuesStuck: number;
  isBottleneck: boolean;
  severity: 'low' | 'medium' | 'high';
}

interface TeamCapacity {
  assignee: string;
  capacity: number;
  currentWorkload: number;
  utilizationPercentage: number;
  status: 'underutilized' | 'optimal' | 'overloaded';
}

interface HistoricalComparison {
  period: string;
  totalIssues: number;
  completedIssues: number;
  completionRate: number;
  avgResolutionTime: number;
  velocity: number;
}

interface EnhancedJiraMetrics extends JiraMetrics {
  sprintVelocityTrends: SprintVelocity[];
  burndownData: BurndownData[];
  predictiveAnalytics: PredictiveAnalytics;
  bottleneckAnalysis: BottleneckAnalysis[];
  teamCapacity: TeamCapacity[];
  historicalComparison: HistoricalComparison[];
  monthlyTrends: {
    months: string[];
    issues: number[];
    velocity: number[];
    completionRate: number[];
  };
}

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  user: string;
  timestamp: string;
  project: string;
}


interface AISuggestion {
  component: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
}

interface AITooltip {
  id: string;
  component: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
}

export default function InsightsDashboard() {
  const { currentTheme, isThemeLoaded, isDarkMode } = useTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  // Default to first filtered project instead of 'all'
  const [selectedProject, setSelectedProject] = useState<string>('ALL');
  const defaultEndDate = new Date();
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultEndDate.getDate() - 13);
  const [dateFrom, setDateFrom] = useState<string>(defaultStartDate.toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState<string>(defaultEndDate.toISOString().split('T')[0]);
  const [jiraMetrics, setJiraMetrics] = useState<JiraMetrics | null>(null);
  const [enhancedMetrics, setEnhancedMetrics] = useState<EnhancedJiraMetrics>(() => createMockEnhancedMetrics());
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [aiInsightsEnabled, setAiInsightsEnabled] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  // New state for enhanced features
  const [selectedChartView, setSelectedChartView] = useState<'velocity' | 'burndown' | 'capacity' | 'historical'>('velocity');
  const [showDrillDown, setShowDrillDown] = useState(false);
  const [drillDownData, setDrillDownData] = useState<any>(null);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv' | 'json'>('pdf');
  const [widgetLayout, setWidgetLayout] = useState({
    velocity: true,
    burndown: true,
    capacity: true,
    historical: true,
    predictive: true,
    bottlenecks: true
  });

  const applyAlpha = (hexColor: string, alpha: number) => {
    if (!hexColor) return `rgba(0,0,0,${alpha})`;
    const sanitized = hexColor.replace('#', '');
    if (sanitized.length !== 6) {
      return hexColor;
    }
    const r = parseInt(sanitized.substring(0, 2), 16);
    const g = parseInt(sanitized.substring(2, 4), 16);
    const b = parseInt(sanitized.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Auto-refresh every 15 minutes (ONLY after initial fetch)
  useEffect(() => {
    if (!initialFetchRef.current) return; // Don't auto-refresh until user clicks Get Insights
    
    const interval = setInterval(() => {
      console.log('🔄 15-minute auto-refresh triggered');
      refreshData();
    }, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(interval);
  }, []);


  const hasLoadedCacheRef = React.useRef(false);
  const initialFetchRef = React.useRef(false);

  // Only load cached data on mount - DO NOT auto-fetch
  // User must click "Get Insights" button to fetch fresh data
  useEffect(() => {
    if (hasLoadedCacheRef.current) return;
    
    // Load cached data immediately if available
    loadCachedData(false);
    hasLoadedCacheRef.current = true;
    
    console.log('📊 Insights page loaded - NO AUTO FETCH - waiting for user to click Get Insights');
  }, []);

  // Re-fetch data ONLY when user deliberately changes filters AFTER initial fetch
  useEffect(() => {
    if (!hasLoadedCacheRef.current) return;
    if (!initialFetchRef.current) return; // Only fetch after user clicked "Get Insights" once
    if (!dateFrom || !dateTo) return;
    
    console.log('🔄 Filters changed after initial fetch - refreshing data...');
    fetchData();
  }, [selectedProject, dateFrom, dateTo]);

  const loadCachedData = (initialize: boolean = false) => {
    try {
      const cachedProjects = localStorage.getItem('jira-projects');
      const cachedActivities = localStorage.getItem('recent-activities');
      const cachedLastRefresh = localStorage.getItem('last-refresh');
      const cachedRange = localStorage.getItem('metrics-date-range');
      const cachedMetrics = localStorage.getItem('jira-metrics');
      const cachedEnhancedMetrics = localStorage.getItem('enhanced-metrics');

      if (cachedProjects) setProjects(JSON.parse(cachedProjects));
      if (cachedActivities) setRecentActivities(JSON.parse(cachedActivities));
      if (cachedLastRefresh) setLastRefresh(new Date(cachedLastRefresh));

      // Load cached metrics to show data immediately
      if (cachedMetrics) {
        try {
          const parsedMetrics = JSON.parse(cachedMetrics);
          setJiraMetrics(parsedMetrics);
          console.log('✅ Loaded cached metrics:', parsedMetrics);
        } catch (error) {
          console.error('Error parsing cached metrics:', error);
        }
      }

      // Load cached enhanced metrics
      if (cachedEnhancedMetrics) {
        try {
          const parsedEnhancedMetrics = JSON.parse(cachedEnhancedMetrics);
          setEnhancedMetrics(parsedEnhancedMetrics);
          console.log('✅ Loaded cached enhanced metrics:', parsedEnhancedMetrics);
        } catch (error) {
          console.error('Error parsing cached enhanced metrics:', error);
        }
      }

      if (cachedRange) {
        try {
          const parsedRange = JSON.parse(cachedRange);
          if (initialize) {
            if (parsedRange?.dateFrom) setDateFrom(parsedRange.dateFrom);
            if (parsedRange?.dateTo) setDateTo(parsedRange.dateTo);
            if (parsedRange?.projectKey) setSelectedProject(parsedRange.projectKey);
          }
        } catch (error) {
          console.error('Error parsing cached range:', error);
        }
      }
      
      // Log cache staleness for debugging
      if (cachedLastRefresh && initialize) {
        const lastRefreshDate = new Date(cachedLastRefresh);
        const minutesSinceRefresh = (new Date().getTime() - lastRefreshDate.getTime()) / (1000 * 60);
        if (minutesSinceRefresh > 15) {
          console.log('🔄 Cached data is stale (>15 minutes old), will auto-fetch fresh data');
        } else {
          console.log(`✅ Cached data is fresh (${minutesSinceRefresh.toFixed(1)} minutes old)`);
        }
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  };

  const cacheData = (projects: Project[], metrics: JiraMetrics, activities: RecentActivity[], enhanced: EnhancedJiraMetrics) => {
    try {
      localStorage.setItem('jira-projects', JSON.stringify(projects));
      localStorage.setItem('recent-activities', JSON.stringify(activities));
      localStorage.setItem('last-refresh', new Date().toISOString());
      // Cache metrics to show immediately on next load
      if (metrics) {
        localStorage.setItem('jira-metrics', JSON.stringify(metrics));
      }
      if (enhanced) {
        localStorage.setItem('enhanced-metrics', JSON.stringify(enhanced));
      }
      localStorage.setItem('metrics-date-range', JSON.stringify({
        dateFrom,
        dateTo,
        projectKey: selectedProject || null,
      }));
    } catch (error) {
      console.error('Error caching data:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      console.log('📋 Fetching projects from:', getApiUrl('/api/jira/projects'));
      // Request detailed project list for dropdown
      const response = await fetch(getApiUrl('/api/jira/projects?maxResults=500&minimal=false'));
      console.log('📋 Projects response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Projects API error:', errorText);
        throw new Error(`Failed to fetch projects: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      console.log('📋 Projects API response:', {
        success: data.success,
        hasProjects: !!data.projects,
        hasDetailed: !!data.projects?.detailed,
        detailedLength: data.projects?.detailed?.length,
        summaryTotal: data.projects?.summary?.total
      });
      
      if (!data.success) {
        console.error('❌ Projects API returned success=false:', data.error);
        throw new Error(data.error || 'Projects API returned error');
      }
      
      // Prefer detailed list; fall back to summary values if detailed missing
      let projectsList = data.projects?.detailed || [];
      if ((!projectsList || projectsList.length === 0) && data.projects?.summary?.values) {
        projectsList = data.projects.summary.values.map((p: any) => ({
          id: p.id,
          key: p.key || p.name || 'UNKNOWN',
          name: p.name || p.key || 'Unknown Project'
        }));
      }

      console.log(`📋 Setting ${projectsList.length} projects in state`);
      setProjects(projectsList);

      // Auto-select first project if none selected yet
      if (!selectedProject && projectsList.length > 0) {
        setSelectedProject(projectsList[0].key);
        console.log(`📋 Auto-selected first project: ${projectsList[0].key}`);
      }

      if (projectsList.length > 0) {
        console.log('📋 First project sample:', projectsList[0]);
      } else {
        console.warn('⚠️ Projects list is empty!');
      }

      return projectsList;
    } catch (error) {
      console.error('❌ Error fetching projects:', error);
      setError(`Failed to load projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  const fetchMetrics = async (projectKey: string | null, fromDate: string, toDate: string) => {
    try {
      console.log('📊 Fetching metrics for project:', projectKey);
      console.log('📊 Metrics URL:', getApiUrl('/api/jira/metrics'));
      const response = await fetch(getApiUrl('/api/jira/metrics'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectKey, dateFrom: fromDate, dateTo: toDate })
      });
      console.log('📊 Metrics response status:', response.status);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const data = await response.json();
      console.log('📊 Metrics data:', data);
      if (data.success) {
        setJiraMetrics(data.metrics);
        return data.metrics;
      }
      throw new Error(data.message || 'Failed to fetch metrics');
    } catch (error) {
      console.error('❌ Error fetching metrics:', error);
      throw error;
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await fetch(getApiUrl('/api/activities/recent'));
      if (!response.ok) throw new Error('Failed to fetch activities');
      const data = await response.json();
      setRecentActivities(data.activities || []);
      return data.activities || [];
    } catch (error) {
      console.error('Error fetching activities:', error);
      return [];
    }
  };

  const fetchEnhancedMetrics = async (projectKey: string | null, fromDate: string, toDate: string) => {
    try {
      console.log('🚀 Fetching enhanced metrics for project:', projectKey);
      const response = await fetch(getApiUrl('/api/jira/enhanced-metrics'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectKey, dateFrom: fromDate, dateTo: toDate })
      });

      if (!response.ok) {
        console.warn('Enhanced metrics not available, using mock data');
        return createMockEnhancedMetrics(jiraMetrics);
      }

      const data = await response.json();
      console.log('🚀 Enhanced metrics data:', data);
      if (data.success) {
        return data.metrics;
      }

      console.warn('Enhanced metrics API returned failure, using mock data');
      return createMockEnhancedMetrics(jiraMetrics);
    } catch (error) {
      console.error('❌ Error fetching enhanced metrics:', error);
      return createMockEnhancedMetrics(jiraMetrics);
    }
  };

  function createMockEnhancedMetrics(metricsOverride?: JiraMetrics | null): EnhancedJiraMetrics {
    const baseMetrics = metricsOverride ?? jiraMetrics ?? {
      totalIssues: 0,
      resolvedIssues: 0,
      openIssues: 0,
      bugs: 0,
      stories: 0,
      tasks: 0,
      epics: 0,
      subtasks: 0,
      storyPoints: 0,
      sprintVelocity: 0,
      avgResolutionTime: 0,
      issuesByStatus: {},
      issuesByPriority: {},
      issuesByAssignee: {}
    };

    return {
      ...baseMetrics,
      sprintVelocityTrends: [
        { sprintName: 'Sprint 1', startDate: '2024-01-01', endDate: '2024-01-14', committedPoints: 45, completedPoints: 42, velocity: 42 },
        { sprintName: 'Sprint 2', startDate: '2024-01-15', endDate: '2024-01-28', committedPoints: 48, completedPoints: 45, velocity: 45 },
        { sprintName: 'Sprint 3', startDate: '2024-01-29', endDate: '2024-02-11', committedPoints: 50, completedPoints: 47, velocity: 47 },
        { sprintName: 'Sprint 4', startDate: '2024-02-12', endDate: '2024-02-25', committedPoints: 52, completedPoints: 49, velocity: 49 },
        { sprintName: 'Sprint 5', startDate: '2024-02-26', endDate: '2024-03-10', committedPoints: 55, completedPoints: 52, velocity: 52 }
      ],
      burndownData: [{
        sprintName: 'Current Sprint',
        dates: ['2024-03-01', '2024-03-02', '2024-03-03', '2024-03-04', '2024-03-05', '2024-03-06', '2024-03-07'],
        idealBurndown: [50, 42.5, 35, 27.5, 20, 12.5, 5],
        actualBurndown: [50, 48, 42, 35, 28, 18, 8],
        remainingWork: [50, 48, 42, 35, 28, 18, 8]
      }],
      predictiveAnalytics: {
        sprintCompletionDate: '2024-03-12',
        completionConfidence: 85,
        velocityTrend: 'increasing',
        forecastedVelocity: 54,
        riskLevel: 'low',
        recommendations: [
          'Current velocity trend is positive',
          'Consider increasing sprint commitment by 2-3 points',
          'Team capacity utilization is optimal'
        ]
      },
      bottleneckAnalysis: [
        { status: 'In Review', avgTimeInStatus: 3.2, issuesStuck: 5, isBottleneck: true, severity: 'high' },
        { status: 'In Progress', avgTimeInStatus: 2.1, issuesStuck: 2, isBottleneck: false, severity: 'low' },
        { status: 'To Do', avgTimeInStatus: 1.5, issuesStuck: 1, isBottleneck: false, severity: 'low' }
      ],
      teamCapacity: [
        { assignee: 'John Doe', capacity: 10, currentWorkload: 8, utilizationPercentage: 80, status: 'optimal' },
        { assignee: 'Jane Smith', capacity: 10, currentWorkload: 12, utilizationPercentage: 120, status: 'overloaded' },
        { assignee: 'Bob Johnson', capacity: 10, currentWorkload: 6, utilizationPercentage: 60, status: 'underutilized' }
      ],
      historicalComparison: [
        { period: 'Last Month', totalIssues: 45, completedIssues: 42, completionRate: 93, avgResolutionTime: 3.2, velocity: 42 },
        { period: 'This Month', totalIssues: 52, completedIssues: 47, completionRate: 90, avgResolutionTime: 2.8, velocity: 47 }
      ],
      monthlyTrends: {
        months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        issues: [40, 45, 52, 48, 55, 50],
        velocity: [38, 42, 47, 45, 52, 49],
        completionRate: [95, 93, 90, 94, 92, 91]
      }
    };
  }

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    console.log('🔄 Starting data fetch...');
    console.log('📡 API URL:', getApiUrl('/api/jira/projects'));

    if (!dateFrom || !dateTo) {
      setLoading(false);
      setError('Please select a valid date range.');
      return;
    }

    if (new Date(dateFrom) > new Date(dateTo)) {
      setLoading(false);
      setError('Start date cannot be after end date.');
      return;
    }

    const projectFilter = selectedProject === 'ALL' || !selectedProject ? null : selectedProject;

    try {
      const [projectsData, metricsData, activitiesData, enhancedData] = await Promise.all([
        fetchProjects(),
        fetchMetrics(projectFilter, dateFrom, dateTo),
        fetchActivities(),
        fetchEnhancedMetrics(projectFilter, dateFrom, dateTo)
      ]);

      console.log('✅ Data fetched successfully:', {
        projects: projectsData?.length || 0,
        metrics: metricsData ? 'loaded' : 'failed',
        activities: activitiesData?.length || 0,
        enhanced: enhancedData ? 'loaded' : 'failed'
      });

      const normalizedEnhanced = enhancedData ?? createMockEnhancedMetrics(jiraMetrics);
      setEnhancedMetrics(normalizedEnhanced);
      cacheData(projectsData, metricsData, activitiesData, normalizedEnhanced);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('❌ Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  const handleGetInsights = async () => {
    // Mark that user has clicked Get Insights - enables auto-refresh on filter changes
    initialFetchRef.current = true;
    
    console.log('👆 User clicked Get Insights - loading data...');
    setLoading(true);
    await fetchData();
  };

  const getCompletionRate = () => {
    if (!jiraMetrics) return 0;
    return jiraMetrics.totalIssues > 0 ? Math.round((jiraMetrics.resolvedIssues / jiraMetrics.totalIssues) * 100) : 0;
  };

  const getTopAssignees = () => {
    if (!jiraMetrics?.issuesByAssignee) return [];
    return Object.entries(jiraMetrics.issuesByAssignee)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  };

  const getStatusDistribution = () => {
    if (!jiraMetrics?.issuesByStatus) return [];
    // Only return top 3 statuses for performance
    return Object.entries(jiraMetrics.issuesByStatus)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
  };

  const handleEnhancedExport = async () => {
    try {
      const exportData = {
        basicMetrics: jiraMetrics,
        enhancedMetrics,
        timestamp: new Date().toISOString(),
        filters: {
          project: selectedProject,
          dateFrom,
          dateTo
        }
      };

      let blob: Blob;
      let filename: string;

      switch (exportFormat) {
        case 'json':
          blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
          filename = `insights-enhanced-${new Date().toISOString().split('T')[0]}.json`;
          break;

        case 'csv':
          const csvContent = generateCSV(exportData);
          blob = new Blob([csvContent], { type: 'text/csv' });
          filename = `insights-enhanced-${new Date().toISOString().split('T')[0]}.csv`;
          break;

        case 'excel':
          const excelData = generateExcelData(exportData);
          blob = new Blob([excelData], { type: 'application/vnd.ms-excel' });
          filename = `insights-enhanced-${new Date().toISOString().split('T')[0]}.xls`;
          break;

        default: // pdf
          await exportInsightsAsPDF('insights-dashboard', `insights-enhanced-${new Date().toISOString().split('T')[0]}.pdf`);
          return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export data');
    }
  };

  const generateCSV = (data: any): string => {
    const rows = [];

    // Headers
    rows.push(['Metric', 'Value', 'Period']);

    // Basic metrics
    if (data.basicMetrics) {
      rows.push(['Total Issues', data.basicMetrics.totalIssues || 0, '']);
      rows.push(['Resolved Issues', data.basicMetrics.resolvedIssues || 0, '']);
      rows.push(['Completion Rate', `${getCompletionRate()}%`, '']);
      rows.push(['Sprint Velocity', data.basicMetrics.sprintVelocity || 0, '']);
    }

    // Enhanced metrics
    if (data.enhancedMetrics?.sprintVelocityTrends) {
      rows.push(['', '', '']); // Empty row
      rows.push(['Sprint', 'Velocity', 'Committed']);
      data.enhancedMetrics.sprintVelocityTrends.forEach((sprint: any) => {
        rows.push([sprint.sprintName, sprint.velocity, sprint.committedPoints]);
      });
    }

    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  };

  const generateExcelData = (data: any): string => {
    // Simple Excel format
    let content = '<html><body><table border="1">';

    // Basic metrics
    content += '<tr><th colspan="3">Basic Metrics</th></tr>';
    content += `<tr><td>Total Issues</td><td>${data.basicMetrics?.totalIssues || 0}</td><td></td></tr>`;
    content += `<tr><td>Resolved Issues</td><td>${data.basicMetrics?.resolvedIssues || 0}</td><td></td></tr>`;
    content += `<tr><td>Completion Rate</td><td>${getCompletionRate()}%</td><td></td></tr>`;

    // Enhanced metrics
    if (data.enhancedMetrics?.sprintVelocityTrends) {
      content += '<tr><th colspan="3">Sprint Velocity Trends</th></tr>';
      content += '<tr><th>Sprint</th><th>Velocity</th><th>Committed</th></tr>';
      data.enhancedMetrics.sprintVelocityTrends.forEach((sprint: any) => {
        content += `<tr><td>${sprint.sprintName}</td><td>${sprint.velocity}</td><td>${sprint.committedPoints}</td></tr>`;
      });
    }

    content += '</table></body></html>';
    return content;
  };

  const getPriorityDistribution = () => {
    if (!jiraMetrics?.issuesByPriority) return [];
    return Object.entries(jiraMetrics.issuesByPriority)
      .sort(([,a], [,b]) => b - a);
  };

  const topAssignees = React.useMemo(() => getTopAssignees(), [jiraMetrics]);
  const statusDistribution = React.useMemo(() => getStatusDistribution(), [jiraMetrics]);
  const priorityDistribution = React.useMemo(() => getPriorityDistribution(), [jiraMetrics]);

  const maxAssigneeCount = topAssignees.length > 0
    ? Math.max(...topAssignees.map(([, count]) => count))
    : 0;

  const maxStatusCount = statusDistribution.length > 0
    ? Math.max(...statusDistribution.map(([, count]) => count))
    : 0;

  const maxPriorityCount = priorityDistribution.length > 0
    ? Math.max(...priorityDistribution.map(([, count]) => count))
    : 0;

const totalAssigneeIssues = topAssignees.reduce((sum, [, count]) => sum + count, 0);
const avgIssuesPerMember = topAssignees.length > 0
  ? Math.round(totalAssigneeIssues / topAssignees.length)
  : 0;

  const formatDateLabel = (value: string | null | undefined) => {
    if (!value) return '—';
    const dateObj = new Date(value);
    if (Number.isNaN(dateObj.getTime())) return value;
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const appliedFilters = jiraMetrics?.filters || {};
  const appliedDateFrom = appliedFilters.dateFrom || dateFrom;
  const appliedDateTo = appliedFilters.dateTo || dateTo;
  const dateRangeLabel = `${formatDateLabel(appliedDateFrom)} → ${formatDateLabel(appliedDateTo)}`;
  const issuesInRange = typeof jiraMetrics?.totalIssues === 'number' ? jiraMetrics.totalIssues : null;

  const handleDateFromChange = (value: string) => {
    if (!value) return;
    const newFrom = new Date(value);
    const currentTo = new Date(dateTo);
    if (dateTo && newFrom > currentTo) {
      setDateTo(value);
    }
    setDateFrom(value);
  };

  const handleDateToChange = (value: string) => {
    if (!value) return;
    const newTo = new Date(value);
    const currentFrom = new Date(dateFrom);
    if (dateFrom && newTo < currentFrom) {
      setDateFrom(value);
    }
    setDateTo(value);
  };


  // Export dashboard as PDF
  const handleExportPDF = async () => {
    try {
      await exportInsightsAsPDF('insights-dashboard', `insights-dashboard-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Failed to export PDF:', error);
    }
  };

  // Generate AI-powered insights
  const generateAIInsights = async () => {
    if (!jiraMetrics) return;
    
    setIsGeneratingInsights(true);
    
    try {
      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const suggestions: AISuggestion[] = [];
      
      // Analyze workload distribution
      if (jiraMetrics.issuesByAssignee) {
        const assignees = Object.entries(jiraMetrics.issuesByAssignee);

        if (assignees.length > 0) {
          const counts = assignees.map(([_, count]) => count);
          const maxWorkload = Math.max(...counts);
          const minWorkload = Math.min(...counts);
          const workloadDifference = maxWorkload - minWorkload;
          
          if (workloadDifference > 5) {
            const overloadedPerson = assignees.find(([_, count]) => count === maxWorkload)?.[0];
            const underloadedPerson = assignees.find(([_, count]) => count === minWorkload)?.[0];
            
            if (overloadedPerson && underloadedPerson) {
              suggestions.push({
                component: 'workload',
                suggestion: `Workload imbalance detected! ${overloadedPerson} has ${maxWorkload} issues while ${underloadedPerson} has only ${minWorkload}. Consider redistributing 2-3 issues from ${overloadedPerson} to ${underloadedPerson} to balance the team workload.`,
                priority: 'high',
                actionable: true
              });
            }
          }
        }
      }
      
      // Analyze priority distribution
      if (jiraMetrics.issuesByPriority) {
        const priorities = Object.entries(jiraMetrics.issuesByPriority);
        const highPriority = priorities.find(([priority]) => priority.toLowerCase().includes('high'))?.[1] || 0;
        const totalIssues = jiraMetrics.totalIssues;
        const highPriorityPercentage = (highPriority / totalIssues) * 100;
        
        if (highPriorityPercentage > 20) {
          suggestions.push({
            component: 'priority',
            suggestion: `High priority overload! ${highPriorityPercentage.toFixed(1)}% of issues are high priority (${highPriority}/${totalIssues}). This may indicate scope creep or insufficient planning. Consider reviewing and potentially downgrading some high-priority issues to medium priority.`,
            priority: 'high',
            actionable: true
          });
        }
      }
      
      // Analyze completion rate
      const completionRate = (jiraMetrics.resolvedIssues / jiraMetrics.totalIssues) * 100;
      if (completionRate < 60) {
        suggestions.push({
          component: 'completion',
          suggestion: `Low completion rate detected (${completionRate.toFixed(1)}%). This suggests potential bottlenecks in the development process. Consider implementing daily standups, breaking down large tasks, or reviewing the current workflow to identify and remove blockers.`,
          priority: 'high',
          actionable: true
        });
      }
      
      // Analyze average resolution time
      if (jiraMetrics.avgResolutionTime > 5) {
        suggestions.push({
          component: 'resolution',
          suggestion: `Long resolution times detected (${jiraMetrics.avgResolutionTime} days average). This impacts team velocity and customer satisfaction. Consider implementing better task estimation, clearer requirements, or additional resources for complex issues.`,
          priority: 'medium',
          actionable: true
        });
      }
      
      // Analyze bug-to-story ratio
      const bugRatio = (jiraMetrics.bugs / jiraMetrics.stories) * 100;
      if (bugRatio > 30) {
        suggestions.push({
          component: 'quality',
          suggestion: `High bug ratio detected (${bugRatio.toFixed(1)}% bugs vs stories). This indicates potential quality issues. Consider implementing better testing practices, code reviews, or allocating more time for quality assurance in the development process.`,
          priority: 'medium',
          actionable: true
        });
      }
      
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  // Toggle AI insights
  const toggleAIInsights = async () => {
    if (!aiInsightsEnabled) {
      await generateAIInsights();
    }
    setAiInsightsEnabled(!aiInsightsEnabled);
  };

  // Get AI suggestion for a specific component
  const getAISuggestion = (component: string): AISuggestion | null => {
    return aiSuggestions.find(suggestion => suggestion.component === component) || null;
  };

  // AI Tooltip Component
  const AITooltip = ({ component, children }: { component: string; children: React.ReactNode }) => {
    const suggestion = getAISuggestion(component);
    
    if (!aiInsightsEnabled || !suggestion) {
      return <>{children}</>;
    }

    return (
      <div className="relative group">
        {children}
        <div className="absolute -top-2 -right-2 z-50">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative"
          >
            <Button
              size="sm"
              className={`h-6 w-6 p-0 rounded-full shadow-lg ${
                suggestion.priority === 'high' 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : suggestion.priority === 'medium'
                    ? 'bg-yellow-500 hover:bg-yellow-600'
                    : 'bg-green-500 hover:bg-green-600'
              }`}
              onClick={() => setActiveTooltip(activeTooltip === component ? null : component)}
            >
              <Lightbulb className="h-3 w-3 text-white" />
            </Button>
            
            {activeTooltip === component && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                className="absolute top-8 right-0 w-80 p-4 rounded-xl shadow-2xl border-2 z-50"
                style={{
                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                  borderColor: suggestion.priority === 'high' 
                    ? '#ef4444' 
                    : suggestion.priority === 'medium'
                      ? '#eab308'
                      : '#22c55e'
                }}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{
                      color: suggestion.priority === 'high'
                        ? currentTheme.colors.error
                        : suggestion.priority === 'medium'
                          ? currentTheme.colors.warning
                          : currentTheme.colors.success,
                      backgroundColor: suggestion.priority === 'high'
                        ? applyAlpha(currentTheme.colors.error, isDarkMode ? 0.25 : 0.15)
                        : suggestion.priority === 'medium'
                          ? applyAlpha(currentTheme.colors.warning, isDarkMode ? 0.25 : 0.15)
                          : applyAlpha(currentTheme.colors.success, isDarkMode ? 0.25 : 0.15)
                    }}
                  >
                    <Brain className="h-4 w-4" style={{ color: 'inherit' }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span
                        className="text-xs font-bold px-2 py-1 rounded-full"
                        style={{
                          color: suggestion.priority === 'high'
                            ? currentTheme.colors.error
                            : suggestion.priority === 'medium'
                              ? currentTheme.colors.warning
                              : currentTheme.colors.success,
                          backgroundColor: suggestion.priority === 'high'
                            ? applyAlpha(currentTheme.colors.error, isDarkMode ? 0.3 : 0.18)
                            : suggestion.priority === 'medium'
                              ? applyAlpha(currentTheme.colors.warning, isDarkMode ? 0.3 : 0.18)
                              : applyAlpha(currentTheme.colors.success, isDarkMode ? 0.3 : 0.18)
                        }}
                      >
                        {suggestion.priority.toUpperCase()} PRIORITY
                      </span>
                      {suggestion.actionable && (
                        <span
                          className="text-xs font-medium px-2 py-1 rounded-full"
                          style={{
                            color: currentTheme.colors.info,
                            backgroundColor: applyAlpha(currentTheme.colors.info, isDarkMode ? 0.25 : 0.15)
                          }}
                        >
                          ACTIONABLE
                        </span>
                      )}
                    </div>
                    <p className={`text-sm leading-relaxed ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-800'
                    }`}>
                      {suggestion.suggestion}
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">AI Insight</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={() => setActiveTooltip(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    );
  };

  // Show loading skeleton if loading initial data (no metrics available yet)
  if (loading && !jiraMetrics) {
    return <LoadingSkeleton />;
  }

  return (
    <div 
      id="insights-dashboard" 
      className={`h-full overflow-auto transition-all duration-300 ${
        isDarkMode ? 'bg-gray-900' : 'bg-white'
      }`}
    >
      <div className="p-6 space-y-8">
        {/* Header with Glassmorphism */}
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="space-y-2">
            <motion.h1 
           key={`dashboard-title-${currentTheme.name}-${isDarkMode}`}
           className="text-4xl font-bold tracking-tight transition-colors duration-300"
              style={{
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
             color: currentTheme.colors.primary,
             background: `linear-gradient(90deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
             WebkitBackgroundClip: 'text',
             WebkitTextFillColor: 'transparent',
             backgroundClip: 'text',
             textRendering: 'optimizeLegibility',
             WebkitFontSmoothing: 'antialiased',
             MozOsxFontSmoothing: 'grayscale',
                textShadow: '0 4px 8px rgba(0,0,0,0.1)'
              }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              Analytics Dashboard
            </motion.h1>
            <motion.p 
           className={`text-xl font-medium tracking-wide transition-colors duration-300 ${
             isDarkMode ? 'text-gray-300' : 'text-gray-700'
           }`}
              style={{ 
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              Real-time insights from your Jira workspace
            </motion.p>
            <motion.div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium transition-colors duration-300 ${
                isDarkMode ? 'bg-gray-800/70 text-gray-100' : 'bg-white/80 text-gray-700'
              }`}
              style={{
                border: `1px solid ${currentTheme.colors.primary}30`,
                boxShadow: `0 10px 20px ${currentTheme.colors.primary}10`
              }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <span className="uppercase tracking-wide text-xs" style={{ color: currentTheme.colors.primary }}>
                Date Range
              </span>
              <span>{dateRangeLabel}</span>
              {typeof issuesInRange === 'number' && (
                <span className="text-xs opacity-70">• {issuesInRange} issues</span>
              )}
            </motion.div>
          </div>
          <motion.div 
            className="flex items-center space-x-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="relative">
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger 
                  className={`w-56 backdrop-blur-xl border-2 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl font-semibold ${
                    isDarkMode
                      ? 'bg-gray-800/90 border-gray-600/50 text-white'
                      : 'bg-white/90 border-gray-300/50 text-black'
                  }`}
                >
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent 
                  className={`backdrop-blur-xl border-2 shadow-2xl rounded-2xl transition-colors duration-300 ${
                    isDarkMode
                      ? 'bg-gray-800/95 border-gray-600/50'
                      : 'bg-white/95 border-gray-300/50'
                  } max-h-80 overflow-y-auto`}
                >
                  <SelectItem 
                    value="ALL" 
                    className={`font-medium rounded-xl mx-2 my-1 transition-colors duration-300 ${
                      isDarkMode
                        ? 'text-gray-100 hover:bg-gray-700 hover:text-white'
                        : 'text-gray-900 hover:bg-gray-50 hover:text-black'
                    }`}
                  >
                    All Projects
                  </SelectItem>
                  {Array.isArray(projects) && projects
                    .map((project) => (
                    <SelectItem 
                      key={project.id} 
                      value={project.key} 
                      className={`font-medium rounded-xl mx-2 my-1 transition-colors duration-300 ${
                        isDarkMode
                          ? 'text-gray-100 hover:bg-gray-700 hover:text-white'
                          : 'text-gray-900 hover:bg-gray-50 hover:text-black'
                      }`}
                    >
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div
              className={`flex items-center gap-4 px-4 py-2 rounded-2xl border transition-colors duration-300 ${
                isDarkMode ? 'bg-gray-800/70 border-gray-700 text-gray-100' : 'bg-white/80 border-gray-200 text-gray-700'
              }`}
            >
              <div className="flex flex-col text-xs font-semibold uppercase tracking-wide">
                <span>From</span>
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  className={`mt-1 bg-transparent border-none focus:outline-none focus:ring-0 ${
                    isDarkMode ? 'text-gray-100' : 'text-gray-900'
                  }`}
                />
              </div>
              <div className="flex flex-col text-xs font-semibold uppercase tracking-wide">
                <span>To</span>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => handleDateToChange(e.target.value)}
                  className={`mt-1 bg-transparent border-none focus:outline-none focus:ring-0 ${
                    isDarkMode ? 'text-gray-100' : 'text-gray-900'
                  }`}
                />
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={handleGetInsights} 
                disabled={loading}
                className="text-white shadow-xl border-0 rounded-2xl font-semibold px-6 py-3 hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                style={{
                  backgroundColor: currentTheme.colors.primary,
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = currentTheme.colors.secondary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = currentTheme.colors.primary;
                }}
                size="sm"
              >
                <motion.div
                  animate={loading ? { rotate: 360 } : { rotate: 0 }}
                  transition={{ duration: 1, repeat: loading ? Infinity : 0 }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                </motion.div>
                Refresh Data
              </Button>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={handleExportPDF}
                className="text-white shadow-xl border-0 rounded-2xl font-semibold px-6 py-3 hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                style={{
                  backgroundColor: currentTheme.colors.accent,
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = currentTheme.colors.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = currentTheme.colors.accent;
                }}
                size="sm"
              >
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </motion.div>

          </motion.div>
        </motion.div>

        {/* Error Alert with Animation */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <Alert variant="destructive" className="bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border-red-200 dark:border-red-800">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  {error}. Using cached data if available.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Last Refresh with Animation */}
        <motion.div 
          className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Sparkles className="h-4 w-4" />
          <span>Last updated: {lastRefresh.toLocaleString()}</span>
        </motion.div>

        {/* Key Metrics Grid with Modern Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          {/* Total Issues - Professional Animation */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ 
              duration: 0.2,
              ease: "easeOut"
            }}
          >
            <Card 
              className={`shadow-xl hover:shadow-2xl transition-all duration-500 rounded-3xl border backdrop-blur-sm relative overflow-hidden ${
                isDarkMode 
                  ? 'bg-gray-800/95 border-gray-700/60' 
                  : 'bg-white/98 border-gray-200/60'
              }`}
              style={{
                boxShadow: `0 25px 50px ${currentTheme.colors.primary}20, 0 0 0 1px ${currentTheme.colors.primary}10`
              }}
            >
              {/* Theme-colored background effect */}
              <div 
                className="absolute inset-0 opacity-15 transition-opacity duration-300"
                style={{
                  background: `linear-gradient(135deg, ${currentTheme.colors.primary}25, ${currentTheme.colors.secondary}25)`
                }}
              ></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle 
                 className={`text-sm font-bold tracking-wide transition-colors duration-300 ${
                   isDarkMode ? 'text-gray-200' : 'text-gray-700'
                 }`}
                  style={{ 
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}
                >
                  Total Issues
                </CardTitle>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <BarChart3 
                    className="h-6 w-6" 
                    style={{ color: currentTheme.colors.primary }}
                  />
                </motion.div>
              </CardHeader>
              <CardContent className="relative z-10">
                <motion.div 
                 className={`text-4xl font-black tracking-tight transition-colors duration-300 ${
                   isDarkMode ? 'text-gray-100' : 'text-gray-900'
                 }`}
                  style={{ 
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 1.2, type: "spring", stiffness: 200, damping: 15 }}
                >
                  {jiraMetrics?.totalIssues || 0}
                </motion.div>
                <p 
                  className="text-xs mt-2 flex items-center font-medium"
                  style={{ 
                    color: currentTheme.colors.textSecondary,
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Across all projects
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Completion Rate - Professional Animation */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ 
              duration: 0.2,
              ease: "easeOut"
            }}
          >
            <Card className={`shadow-xl hover:shadow-2xl transition-all duration-500 rounded-3xl border backdrop-blur-sm relative overflow-hidden ${
              isDarkMode 
                ? 'bg-gray-800/95 border-gray-700/60' 
                : 'bg-white/98 border-gray-200/60'
            }`}
            style={{
              boxShadow: `0 25px 50px ${currentTheme.colors.success}20, 0 0 0 1px ${currentTheme.colors.success}10`
            }}>
              {/* Theme-colored background effect */}
              <div 
                className="absolute inset-0 opacity-15 transition-opacity duration-300"
                style={{
                  background: `linear-gradient(135deg, ${currentTheme.colors.success}25, ${currentTheme.colors.accent}25)`
                }}
              ></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle                  className={`text-sm font-bold tracking-wide transition-colors duration-300 ${
                   isDarkMode ? 'text-gray-200' : 'text-gray-700'
                 }`} style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Completion Rate</CardTitle>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <CheckCircle 
                    className="h-6 w-6" 
                    style={{ color: currentTheme.colors.success }}
                  />
                </motion.div>
              </CardHeader>
              <CardContent className="relative z-10">
                <motion.div 
                  className="text-4xl font-black tracking-tight transition-colors duration-300"
                  style={{ 
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    color: currentTheme.colors.success,
                    background: `linear-gradient(90deg, ${currentTheme.colors.success}, ${currentTheme.colors.accent})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 1.4, type: "spring", stiffness: 200, damping: 15 }}
                >
                  {getCompletionRate()}%
                </motion.div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 flex items-center font-medium" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  {jiraMetrics?.resolvedIssues || 0} of {jiraMetrics?.totalIssues || 0} resolved
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Story Points - Professional Animation */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ 
              duration: 0.2,
              ease: "easeOut"
            }}
          >
            <Card 
              className={`shadow-lg hover:shadow-xl transition-all duration-500 rounded-2xl border relative overflow-hidden ${
                isDarkMode 
                  ? 'bg-gray-800/95 border-gray-700/60' 
                  : 'bg-white/98 border-gray-200/60'
              }`}
              style={{
                boxShadow: `0 20px 40px ${currentTheme.colors.secondary}20, 0 0 0 1px ${currentTheme.colors.secondary}10`
              }}
            >
              {/* Theme-colored background effect */}
              <div 
                className="absolute inset-0 opacity-15 transition-opacity duration-300"
                style={{
                  background: `linear-gradient(135deg, ${currentTheme.colors.secondary}25, ${currentTheme.colors.accent}25)`
                }}
              ></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle 
                 className={`text-sm font-bold tracking-wide transition-colors duration-300 ${
                   isDarkMode ? 'text-gray-200' : 'text-gray-700'
                 }`}
                  style={{ 
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}
                >
                  Story Points
                </CardTitle>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <Target 
                    className="h-6 w-6" 
                    style={{ color: currentTheme.colors.secondary }}
                  />
                </motion.div>
              </CardHeader>
              <CardContent className="relative z-10">
                <motion.div 
                  className="text-4xl font-black tracking-tight transition-colors duration-300"
                  style={{ 
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    color: currentTheme.colors.secondary,
                    background: `linear-gradient(90deg, ${currentTheme.colors.secondary}, ${currentTheme.colors.accent})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                  initial={{ scale: 0, rotate: 180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 1.6, type: "spring", stiffness: 200, damping: 15 }}
                >
                  {jiraMetrics?.storyPoints || 0}
                </motion.div>
                <p 
                  className="text-xs mt-2 flex items-center font-medium"
                  style={{ 
                    color: currentTheme.colors.textSecondary,
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Sprint velocity: {jiraMetrics?.sprintVelocity || 0}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Avg Resolution Time - Professional Animation */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ 
              duration: 0.2,
              ease: "easeOut"
            }}
          >
            <Card 
              className={`shadow-lg hover:shadow-xl transition-all duration-500 rounded-2xl border relative overflow-hidden ${
                isDarkMode 
                  ? 'bg-gray-800/95 border-gray-700/60' 
                  : 'bg-white/98 border-gray-200/60'
              }`}
              style={{
                boxShadow: `0 20px 40px ${currentTheme.colors.warning}20, 0 0 0 1px ${currentTheme.colors.warning}10`
              }}
            >
              {/* Theme-colored background effect */}
              <div 
                className="absolute inset-0 opacity-15 transition-opacity duration-300"
                style={{
                  background: `linear-gradient(135deg, ${currentTheme.colors.warning}25, ${currentTheme.colors.accent}25)`
                }}
              ></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle 
                 className={`text-sm font-bold tracking-wide transition-colors duration-300 ${
                   isDarkMode ? 'text-gray-200' : 'text-gray-700'
                 }`}
                  style={{ 
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}
                >
                  Avg Resolution
                </CardTitle>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <Clock 
                    className="h-6 w-6" 
                    style={{ color: currentTheme.colors.warning }}
                  />
                </motion.div>
              </CardHeader>
              <CardContent className="relative z-10">
                <motion.div 
                  className="text-4xl font-black tracking-tight transition-colors duration-300"
                  style={{ 
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    color: currentTheme.colors.warning,
                    background: `linear-gradient(90deg, ${currentTheme.colors.warning}, ${currentTheme.colors.accent})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 1.8, type: "spring", stiffness: 200, damping: 15 }}
                >
                  {jiraMetrics?.avgResolutionTime || 0}d
                </motion.div>
                <p 
                  className="text-xs mt-2 flex items-center font-medium"
                  style={{ 
                    color: currentTheme.colors.textSecondary,
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}
                >
                  <Activity className="h-3 w-3 mr-1" />
                  Days to resolve
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Issue Type Breakdown with Modern Cards */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2, duration: 0.6 }}
        >
          <motion.div
            whileHover={{ scale: 1.01, rotate: 0.5 }}
            animate={{ 
              y: [0, -2, 0],
              rotate: [0, 0.5, -0.5, 0]
            }}
            transition={{ 
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Card 
              className={`shadow-lg hover:shadow-xl transition-all duration-500 rounded-2xl border ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}
            >
              <CardHeader>
                <CardTitle 
                 key={`issue-types-${currentTheme.name}-${isDarkMode}`}
                 className="flex items-center text-lg font-semibold tracking-wide transition-colors duration-300"
                  style={{ 
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    color: currentTheme.colors.primary,
                    background: `linear-gradient(90deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textRendering: 'optimizeLegibility',
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale'
                  }}
                >
                  <PieChart 
                    className="h-5 w-5 mr-3" 
                    style={{ color: currentTheme.colors.primary }}
                  />
                  Issue Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center space-y-6">
                  {/* Circular Progress Chart */}
                  <div className="relative w-48 h-48">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      {/* Background Circle */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-gray-200 dark:text-gray-700"
                      />
                      {/* Tasks Arc */}
                      <motion.circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={currentTheme.colors.primary}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${(jiraMetrics?.tasks || 0) * 2.51} 251`}
                        initial={{ strokeDasharray: "0 251" }}
                        animate={{ strokeDasharray: `${(jiraMetrics?.tasks || 0) * 2.51} 251` }}
                        transition={{ delay: 2.2, duration: 1.5, ease: "easeOut" }}
                      />
                      {/* Stories Arc */}
                      <motion.circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={currentTheme.colors.secondary}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${(jiraMetrics?.stories || 0) * 2.51} 251`}
                        strokeDashoffset={`-${(jiraMetrics?.tasks || 0) * 2.51}`}
                        initial={{ strokeDasharray: "0 251" }}
                        animate={{ strokeDasharray: `${(jiraMetrics?.stories || 0) * 2.51} 251` }}
                        transition={{ delay: 2.4, duration: 1.5, ease: "easeOut" }}
                      />
                      {/* Bugs Arc */}
                      <motion.circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={currentTheme.colors.error}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${(jiraMetrics?.bugs || 0) * 2.51} 251`}
                        strokeDashoffset={`-${((jiraMetrics?.tasks || 0) + (jiraMetrics?.stories || 0)) * 2.51}`}
                        initial={{ strokeDasharray: "0 251" }}
                        animate={{ strokeDasharray: `${(jiraMetrics?.bugs || 0) * 2.51} 251` }}
                        transition={{ delay: 2.6, duration: 1.5, ease: "easeOut" }}
                      />
                      {/* Epics Arc */}
                      <motion.circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={currentTheme.colors.warning}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${(jiraMetrics?.epics || 0) * 2.51} 251`}
                        strokeDashoffset={`-${((jiraMetrics?.tasks || 0) + (jiraMetrics?.stories || 0) + (jiraMetrics?.bugs || 0)) * 2.51}`}
                        initial={{ strokeDasharray: "0 251" }}
                        animate={{ strokeDasharray: `${(jiraMetrics?.epics || 0) * 2.51} 251` }}
                        transition={{ delay: 2.8, duration: 1.5, ease: "easeOut" }}
                      />
                    </svg>
                    {/* Center Total */}
                    <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div 
                        className="text-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 3, type: "spring", stiffness: 200 }}
                      >
                        <div className="text-2xl font-black text-gray-800 dark:text-gray-200" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                          {((jiraMetrics?.tasks || 0) + (jiraMetrics?.stories || 0) + (jiraMetrics?.bugs || 0) + (jiraMetrics?.epics || 0))}
                    </div>
                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                          Total
                        </div>
                      </motion.div>
                    </div>
                  </div>
                  
                  {/* Legend */}
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <motion.div 
                      className={`flex items-center space-x-2 p-2 rounded-xl transition-colors duration-300 ${
                        isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 3.2 }}
                    >
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: currentTheme.colors.primary }}
                      ></div>
                      <span className={`text-xs font-semibold transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`} style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Tasks</span>
                      <span 
                        className="text-xs font-bold ml-auto" 
                        style={{ 
                          color: currentTheme.colors.primary,
                          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' 
                        }}
                      >{jiraMetrics?.tasks || 0}</span>
                  </motion.div>
                  <motion.div 
                      className={`flex items-center space-x-2 p-2 rounded-xl transition-colors duration-300 ${
                        isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                      }`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 3.4 }}
                    >
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: currentTheme.colors.secondary }}
                      ></div>
                      <span className={`text-xs font-semibold transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`} style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Stories</span>
                      <span 
                        className="text-xs font-bold ml-auto" 
                        style={{ 
                          color: currentTheme.colors.secondary,
                          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' 
                        }}
                      >{jiraMetrics?.stories || 0}</span>
                  </motion.div>
                  <motion.div 
                      className={`flex items-center space-x-2 p-2 rounded-xl transition-colors duration-300 ${
                        isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 3.6 }}
                    >
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: currentTheme.colors.error }}
                      ></div>
                      <span className={`text-xs font-semibold transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`} style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Bugs</span>
                      <span 
                        className="text-xs font-bold ml-auto" 
                        style={{ 
                          color: currentTheme.colors.error,
                          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' 
                        }}
                      >{jiraMetrics?.bugs || 0}</span>
                  </motion.div>
                  <motion.div 
                      className={`flex items-center space-x-2 p-2 rounded-xl transition-colors duration-300 ${
                        isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                      }`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 3.8 }}
                    >
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: currentTheme.colors.warning }}
                      ></div>
                      <span className={`text-xs font-semibold transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`} style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Epics</span>
                      <span 
                        className="text-xs font-bold ml-auto" 
                        style={{ 
                          color: currentTheme.colors.warning,
                          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' 
                        }}
                      >{jiraMetrics?.epics || 0}</span>
                  </motion.div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Status Distribution - Slide Animation */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ 
              duration: 0.2,
              ease: "easeOut"
            }}
          >
            <Card className={`shadow-xl hover:shadow-2xl transition-all duration-500 rounded-3xl border backdrop-blur-sm ${
              isDarkMode 
                ? 'bg-gray-800/90 border-gray-700/50' 
                : 'bg-white/95 border-gray-200/50'
            }`}>
              <CardHeader>
                <CardTitle 
                  key={`status-distribution-${currentTheme.name}-${isDarkMode}`}
                  className="flex items-center text-lg font-semibold tracking-wide transition-colors duration-300"
                  style={{ 
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    color: currentTheme.colors.primary,
                    background: `linear-gradient(90deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textRendering: 'optimizeLegibility',
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale'
                  }}
                >
                  <Activity 
                    className="h-5 w-5 mr-3" 
                    style={{ color: currentTheme.colors.primary }}
                  />
                  Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Timeline Design */}
                  <div className="relative">
                    {/* Timeline Line */}
                    <div 
                      className="absolute left-6 top-0 bottom-0 w-0.5 transition-colors duration-300"
                      style={{
                        background: `linear-gradient(to bottom, ${currentTheme.colors.success}, ${currentTheme.colors.info}, ${currentTheme.colors.warning})`
                      }}
                    ></div>
                    
                  {statusDistribution.map(([status, count], index) => {
                      const statusConfig = {
                        'Done': { 
                          color: currentTheme.colors.success, 
                          bg: currentTheme.colors.success, 
                          text: currentTheme.colors.success, 
                          icon: '✓' 
                        },
                        'In Progress': { 
                          color: currentTheme.colors.info, 
                          bg: currentTheme.colors.info, 
                          text: currentTheme.colors.info, 
                          icon: '⚡' 
                        },
                        'To Do': { 
                          color: currentTheme.colors.warning, 
                          bg: currentTheme.colors.warning, 
                          text: currentTheme.colors.warning, 
                          icon: '📋' 
                        },
                        'default': { 
                          color: currentTheme.colors.textSecondary, 
                          bg: currentTheme.colors.textSecondary, 
                          text: currentTheme.colors.textSecondary, 
                          icon: '⏳' 
                        }
                      };
                      const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.default;
                      
                      return (
                     <motion.div 
                       key={status} 
                          className="relative flex items-center space-x-4 py-4"
                          initial={{ opacity: 0, x: -30 }}
                       animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 2.2 + index * 0.2, type: "spring", stiffness: 300 }}
                        >
                          {/* Timeline Dot */}
                          <div 
                            className="relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg transition-colors duration-300"
                            style={{ backgroundColor: config.bg }}
                          >
                            {config.icon}
                      </div>
                          
                          {/* Content */}
                          <div className="flex-1 flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                                {status}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                                {count} issues
                              </p>
                            </div>
                            
                            {/* Progress Bar with enhanced effects */}
                            <div 
                              className="w-32 h-3 rounded-full overflow-hidden relative transition-colors duration-300"
                              style={{ 
                                backgroundColor: isDarkMode ? currentTheme.colors.surface : `${currentTheme.colors.border}40`,
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                              }}
                            >
                              <motion.div
                                className="h-full rounded-full relative overflow-hidden"
                                style={{ 
                                  background: `linear-gradient(90deg, ${config.bg}, ${config.bg}dd, ${config.bg})`,
                                  backgroundSize: '200% 100%',
                                  boxShadow: `0 0 15px ${config.bg}50`
                                }}
                                initial={{ width: 0 }}
                                animate={{ width: `${maxStatusCount > 0 ? (count / maxStatusCount) * 100 : 0}%` }}
                                transition={{ delay: 2.4 + index * 0.2, duration: 1.5, ease: "easeOut" }}
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
                            
                            {/* Count Badge */}
                            <div className={`px-3 py-1 rounded-full ${config.bg} text-white text-sm font-bold`} style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                              {count}
                            </div>
                          </div>
                    </motion.div>
                      );
                    })}
                  </div>
                  
                  {/* Summary Stats */}
                  <div 
                    className="grid grid-cols-3 gap-4 pt-4 border-t transition-colors duration-300"
                    style={{ borderColor: currentTheme.colors.border }}
                  >
                    <div className="text-center">
                      <div 
                        className="text-2xl font-black transition-colors duration-300" 
                        style={{ 
                          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          color: currentTheme.colors.success
                        }}
                      >
                        {statusDistribution.find(([status]) => status === 'Done')?.[1] || 0}
                      </div>
                      <div 
                        className="text-xs font-semibold transition-colors duration-300" 
                        style={{ 
                          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          color: currentTheme.colors.textSecondary
                        }}
                      >
                        Completed
                      </div>
                    </div>
                    <div className="text-center">
                      <div 
                        className="text-2xl font-black transition-colors duration-300" 
                        style={{ 
                          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          color: currentTheme.colors.info
                        }}
                      >
                        {statusDistribution.find(([status]) => status === 'In Progress')?.[1] || 0}
                      </div>
                      <div 
                        className="text-xs font-semibold transition-colors duration-300" 
                        style={{ 
                          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          color: currentTheme.colors.textSecondary
                        }}
                      >
                        Active
                      </div>
                    </div>
                    <div className="text-center">
                      <div 
                        className="text-2xl font-black transition-colors duration-300" 
                        style={{ 
                          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          color: currentTheme.colors.warning
                        }}
                      >
                        {statusDistribution.find(([status]) => status === 'To Do')?.[1] || 0}
                      </div>
                      <div 
                        className="text-xs font-semibold transition-colors duration-300" 
                        style={{ 
                          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          color: currentTheme.colors.textSecondary
                        }}
                      >
                        Pending
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Enhanced Analytics Section */}
        <motion.div
          className="space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          {/* Enhanced Features Header */}
          <motion.div
            className="flex items-center justify-between"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <div className="space-y-2">
              <motion.h2
                className="text-3xl font-bold tracking-tight transition-colors duration-300"
                style={{
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  color: currentTheme.colors.primary,
                  background: `linear-gradient(90deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                Advanced Analytics
              </motion.h2>
              <motion.p
                className={`text-lg font-medium tracking-wide transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
                style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
              >
                AI-powered insights and predictive analytics
              </motion.p>
            </div>

            {/* Chart View Selector */}
            <div className="flex items-center space-x-2">
              <Select value={selectedChartView} onValueChange={(value: 'velocity' | 'burndown' | 'capacity' | 'historical') => setSelectedChartView(value)}>
                <SelectTrigger className={`w-48 backdrop-blur-xl border-2 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl font-semibold ${
                  isDarkMode
                    ? 'bg-gray-800/90 border-gray-600/50 text-white'
                    : 'bg-white/90 border-gray-300/50 text-black'
                }`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={`backdrop-blur-xl border-2 shadow-2xl rounded-2xl transition-colors duration-300 ${
                  isDarkMode
                    ? 'bg-gray-800/95 border-gray-600/50'
                    : 'bg-white/95 border-gray-300/50'
                }`}>
                  <SelectItem value="velocity" className="font-medium rounded-xl">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Sprint Velocity
                  </SelectItem>
                  <SelectItem value="burndown" className="font-medium rounded-xl">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Burndown Charts
                  </SelectItem>
                  <SelectItem value="capacity" className="font-medium rounded-xl">
                    <Users className="h-4 w-4 mr-2" />
                    Team Capacity
                  </SelectItem>
                  <SelectItem value="historical" className="font-medium rounded-xl">
                    <Calendar className="h-4 w-4 mr-2" />
                    Historical Trends
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          {/* Chart Container */}
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.6 }}
          >
            {/* Main Chart Area */}
            <motion.div
              className="lg:col-span-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2 }}
            >
              <Card className={`shadow-2xl hover:shadow-3xl transition-all duration-500 rounded-3xl border backdrop-blur-sm relative overflow-hidden ${
                isDarkMode
                  ? 'bg-gray-800/95 border-gray-700/60'
                  : 'bg-white/98 border-gray-200/60'
              }`}>
                <CardHeader>
                  <CardTitle className="flex items-center text-xl font-semibold tracking-wide">
                    {selectedChartView === 'velocity' && <><TrendingUp className="h-5 w-5 mr-3" />Sprint Velocity Trends</>}
                    {selectedChartView === 'burndown' && <><BarChart3 className="h-5 w-5 mr-3" />Burndown Chart</>}
                    {selectedChartView === 'capacity' && <><Users className="h-5 w-5 mr-3" />Team Capacity Analysis</>}
                    {selectedChartView === 'historical' && <><Calendar className="h-5 w-5 mr-3" />Historical Trends</>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    {selectedChartView === 'velocity' && (
                      <ComposedChart
                        data={enhancedMetrics?.sprintVelocityTrends?.map(item => ({
                          sprint: item.sprintName,
                          velocity: item.velocity,
                          committed: item.committedPoints,
                          completed: item.completedPoints
                        })) || []}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="sprint" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="velocity" stroke={currentTheme.colors.primary} strokeWidth={3} />
                        <Line type="monotone" dataKey="committed" stroke={currentTheme.colors.secondary} strokeWidth={2} strokeDasharray="5 5" />
                      </ComposedChart>
                    )}
                    {selectedChartView === 'burndown' && (
                      <ComposedChart
                        data={enhancedMetrics?.burndownData?.[0]?.dates?.map((date, index) => ({
                          date,
                          ideal: enhancedMetrics.burndownData[0].idealBurndown[index],
                          actual: enhancedMetrics.burndownData[0].actualBurndown[index],
                          remaining: enhancedMetrics.burndownData[0].remainingWork[index]
                        })) || []}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="ideal" stroke={currentTheme.colors.success} strokeWidth={2} strokeDasharray="5 5" />
                        <Line type="monotone" dataKey="actual" stroke={currentTheme.colors.primary} strokeWidth={3} />
                        <Area type="monotone" dataKey="remaining" fill={currentTheme.colors.warning} fillOpacity={0.3} />
                      </ComposedChart>
                    )}
                    {selectedChartView === 'capacity' && (
                      <ComposedChart
                        data={enhancedMetrics?.teamCapacity?.map(item => ({
                          assignee: item.assignee,
                          capacity: item.capacity,
                          workload: item.currentWorkload,
                          utilization: item.utilizationPercentage
                        })) || []}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="assignee" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="utilization" fill={currentTheme.colors.primary} />
                      </ComposedChart>
                    )}
                    {selectedChartView === 'historical' && (
                      <ComposedChart
                        data={enhancedMetrics?.monthlyTrends?.months?.map((month, index) => ({
                          month,
                          issues: enhancedMetrics.monthlyTrends.issues[index],
                          velocity: enhancedMetrics.monthlyTrends.velocity[index],
                          completion: enhancedMetrics.monthlyTrends.completionRate[index]
                        })) || []}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Bar yAxisId="left" dataKey="issues" fill={currentTheme.colors.primary} />
                        <Line yAxisId="right" type="monotone" dataKey="velocity" stroke={currentTheme.colors.secondary} strokeWidth={3} />
                      </ComposedChart>
                    )}
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Sidebar with Predictive Analytics */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.4 }}
            >
              {/* Predictive Analytics Card */}
              <Card className={`shadow-xl hover:shadow-2xl transition-all duration-500 rounded-3xl border backdrop-blur-sm ${
                isDarkMode
                  ? 'bg-gray-800/95 border-gray-700/60'
                  : 'bg-white/98 border-gray-200/60'
              }`}>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg font-semibold">
                    <Sparkles className="h-5 w-5 mr-3" />
                    Predictive Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      className="p-3 rounded-xl"
                      style={{
                        backgroundColor: isDarkMode ? applyAlpha(currentTheme.colors.surface, 0.4) : applyAlpha(currentTheme.colors.surface, 0.8),
                        border: `1px solid ${applyAlpha(currentTheme.colors.border, 0.4)}`
                      }}
                    >
                      <div
                        className="text-sm font-medium"
                        style={{ color: currentTheme.colors.textSecondary }}
                      >
                        Completion Date
                      </div>
                      <div
                        className="text-lg font-bold"
                        style={{ color: currentTheme.colors.text }}
                      >
                        {enhancedMetrics?.predictiveAnalytics?.sprintCompletionDate || 'TBD'}
                      </div>
                    </div>
                    <div
                      className="p-3 rounded-xl"
                      style={{
                        backgroundColor: isDarkMode ? applyAlpha(currentTheme.colors.surface, 0.4) : applyAlpha(currentTheme.colors.surface, 0.8),
                        border: `1px solid ${applyAlpha(currentTheme.colors.border, 0.4)}`
                      }}
                    >
                      <div
                        className="text-sm font-medium"
                        style={{ color: currentTheme.colors.textSecondary }}
                      >
                        Confidence
                      </div>
                      <div
                        className="text-lg font-bold"
                        style={{ color: currentTheme.colors.success }}
                      >
                        {enhancedMetrics?.predictiveAnalytics?.completionConfidence || 0}%
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Velocity Trend</div>
                    <Badge
                      variant="outline"
                      style={{
                        color: enhancedMetrics?.predictiveAnalytics?.velocityTrend === 'decreasing'
                          ? currentTheme.colors.warning
                          : currentTheme.colors.success,
                        borderColor: applyAlpha(
                          enhancedMetrics?.predictiveAnalytics?.velocityTrend === 'decreasing'
                            ? currentTheme.colors.warning
                            : currentTheme.colors.success,
                          0.4
                        ),
                        backgroundColor: applyAlpha(
                          enhancedMetrics?.predictiveAnalytics?.velocityTrend === 'decreasing'
                            ? currentTheme.colors.warning
                            : currentTheme.colors.success,
                          isDarkMode ? 0.2 : 0.1
                        )
                      }}
                    >
                      {enhancedMetrics?.predictiveAnalytics?.velocityTrend || 'stable'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Risk Level</div>
                    <Badge
                      variant="outline"
                      style={{
                        color: enhancedMetrics?.predictiveAnalytics?.riskLevel === 'high'
                          ? currentTheme.colors.error
                          : enhancedMetrics?.predictiveAnalytics?.riskLevel === 'medium'
                            ? currentTheme.colors.warning
                            : currentTheme.colors.success,
                        borderColor: applyAlpha(
                          enhancedMetrics?.predictiveAnalytics?.riskLevel === 'high'
                            ? currentTheme.colors.error
                            : enhancedMetrics?.predictiveAnalytics?.riskLevel === 'medium'
                              ? currentTheme.colors.warning
                              : currentTheme.colors.success,
                          0.4
                        ),
                        backgroundColor: applyAlpha(
                          enhancedMetrics?.predictiveAnalytics?.riskLevel === 'high'
                            ? currentTheme.colors.error
                            : enhancedMetrics?.predictiveAnalytics?.riskLevel === 'medium'
                              ? currentTheme.colors.warning
                              : currentTheme.colors.success,
                          isDarkMode ? 0.2 : 0.1
                        )
                      }}
                    >
                      {enhancedMetrics?.predictiveAnalytics?.riskLevel || 'medium'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Bottleneck Analysis Card */}
              <Card className={`shadow-xl hover:shadow-2xl transition-all duration-500 rounded-3xl border backdrop-blur-sm ${
                isDarkMode
                  ? 'bg-gray-800/95 border-gray-700/60'
                  : 'bg-white/98 border-gray-200/60'
              }`}>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg font-semibold">
                    <AlertTriangle className="h-5 w-5 mr-3" />
                    Process Bottlenecks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {enhancedMetrics?.bottleneckAnalysis?.filter(b => b.isBottleneck).map((bottleneck, index) => {
                      const severityColor = bottleneck.severity === 'high'
                        ? currentTheme.colors.error
                        : bottleneck.severity === 'medium'
                          ? currentTheme.colors.warning
                          : currentTheme.colors.info;
                      return (
                      <div
                        key={index}
                        className="p-3 rounded-xl border-l-4"
                        style={{
                          borderLeftColor: severityColor,
                          backgroundColor: applyAlpha(severityColor, isDarkMode ? 0.25 : 0.15)
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{bottleneck.status}</span>
                          <Badge
                            variant="outline"
                            style={{
                              color: severityColor,
                              borderColor: applyAlpha(severityColor, 0.4),
                              backgroundColor: applyAlpha(severityColor, isDarkMode ? 0.2 : 0.1)
                            }}
                          >
                            {bottleneck.severity}
                          </Badge>
                        </div>
                        <div
                          className="text-sm mt-1"
                          style={{ color: currentTheme.colors.textSecondary }}
                        >
                          {bottleneck.issuesStuck} issues stuck, avg {bottleneck.avgTimeInStatus} days
                        </div>
                      </div>
                    )}) || (
                      <div
                        className="text-center py-4"
                        style={{ color: currentTheme.colors.textSecondary }}
                      >
                        No bottlenecks detected
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* AI Recommendations Card */}
              <Card className={`shadow-xl hover:shadow-2xl transition-all duration-500 rounded-3xl border backdrop-blur-sm ${
                isDarkMode
                  ? 'bg-gray-800/95 border-gray-700/60'
                  : 'bg-white/98 border-gray-200/60'
              }`}>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg font-semibold">
                    <Brain className="h-5 w-5 mr-3" />
                    AI Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {enhancedMetrics?.predictiveAnalytics?.recommendations?.map((rec, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-xl"
                        style={{
                          backgroundColor: isDarkMode ? applyAlpha(currentTheme.colors.surface, 0.45) : applyAlpha(currentTheme.colors.surface, 0.85),
                          border: `1px solid ${applyAlpha(currentTheme.colors.border, 0.4)}`
                        }}
                      >
                        <div className="flex items-start space-x-2">
                          <Lightbulb
                            className="h-4 w-4 mt-0.5 flex-shrink-0"
                            style={{ color: currentTheme.colors.warning }}
                          />
                          <span className="text-sm">{rec}</span>
                        </div>
                      </div>
                    )) || (
                      <div
                        className="text-center py-4"
                        style={{ color: currentTheme.colors.textSecondary }}
                      >
                        No recommendations available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Historical Comparison Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.6 }}
          >
            <Card className={`shadow-2xl hover:shadow-3xl transition-all duration-500 rounded-3xl border backdrop-blur-sm ${
              isDarkMode
                ? 'bg-gray-800/95 border-gray-700/60'
                : 'bg-white/98 border-gray-200/60'
            }`}>
              <CardHeader>
                <CardTitle className="flex items-center text-xl font-semibold">
                  <Calendar className="h-5 w-5 mr-3" />
                  Month-over-Month Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {enhancedMetrics?.historicalComparison?.map((comparison, index) => (
                    <motion.div
                      key={index}
                      className={`p-6 rounded-2xl border transition-all duration-300 ${
                        isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-white border-gray-200'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.8 + index * 0.1 }}
                    >
                      <div className="text-center space-y-3">
                        <h3 className="text-lg font-semibold">{comparison.period}</h3>
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div>
                            <div
                              className="text-2xl font-bold"
                              style={{ color: currentTheme.colors.info }}
                            >
                              {comparison.totalIssues}
                            </div>
                            <div
                              className="text-sm"
                              style={{ color: currentTheme.colors.textSecondary }}
                            >
                              Total Issues
                            </div>
                          </div>
                          <div>
                            <div
                              className="text-2xl font-bold"
                              style={{ color: currentTheme.colors.success }}
                            >
                              {comparison.completionRate}%
                            </div>
                            <div
                              className="text-sm"
                              style={{ color: currentTheme.colors.textSecondary }}
                            >
                              Completion
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-center space-x-2">
                          {comparison.velocity > (enhancedMetrics.historicalComparison?.[0]?.velocity || 0) ? (
                            <TrendingUp className="h-4 w-4" style={{ color: currentTheme.colors.success }} />
                          ) : (
                            <TrendingDown className="h-4 w-4" style={{ color: currentTheme.colors.error }} />
                          )}
                          <span className="text-sm font-medium">Velocity: {comparison.velocity}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Export Options */}
        <motion.div
          className="flex items-center justify-between pt-8 border-t border-gray-200 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.0 }}
        >
          <div className="flex items-center space-x-4">
            <Select value={exportFormat} onValueChange={(value: 'pdf' | 'excel' | 'csv' | 'json') => setExportFormat(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => handleEnhancedExport()}
                className="text-white shadow-xl border-0 rounded-2xl font-semibold px-6 py-3 hover:shadow-2xl transition-all duration-300"
                style={{
                  backgroundColor: currentTheme.colors.accent,
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Enhanced Data
              </Button>
            </motion.div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWidgetLayout(prev => ({ ...prev, velocity: !prev.velocity }))}
              style={{ color: widgetLayout.velocity ? currentTheme.colors.info : currentTheme.colors.textSecondary }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWidgetLayout(prev => ({ ...prev, burndown: !prev.burndown }))}
              style={{ color: widgetLayout.burndown ? currentTheme.colors.info : currentTheme.colors.textSecondary }}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWidgetLayout(prev => ({ ...prev, capacity: !prev.capacity }))}
              style={{ color: widgetLayout.capacity ? currentTheme.colors.info : currentTheme.colors.textSecondary }}
            >
              <Users className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWidgetLayout(prev => ({ ...prev, predictive: !prev.predictive }))}
              style={{ color: widgetLayout.predictive ? currentTheme.colors.info : currentTheme.colors.textSecondary }}
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
