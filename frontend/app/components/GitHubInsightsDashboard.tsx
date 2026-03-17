'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  GitBranch, 
  Code, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  TrendingUp,
  Activity,
  Clock
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string;
  created_at: string;
  html_url: string;
}

interface RepoStats {
  repo: string;
  total_runs: number;
  successful: number;
  failed: number;
  success_rate: number;
  runs: WorkflowRun[];
}

export function GitHubInsightsDashboard() {
  const { currentTheme, isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [repoStats, setRepoStats] = useState<RepoStats | null>(null);
  const [selectedRepo, setSelectedRepo] = useState(''); // User can change this
  const [repos, setRepos] = useState<{ full_name: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();
    fetchRepos();
  }, []);

  const checkConnection = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/github/status');
      const data = await response.json();
      setConnected(data.connected || false);
    } catch (error) {
      console.error('GitHub connection check failed:', error);
      setConnected(false);
    }
  };

  const fetchRepos = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/github/repos');
      const data = await response.json();
      if (!response.ok || data.error || data.success === false) {
        throw new Error(data.error || 'Failed to fetch repositories');
      }
      const repoList = data.repos || [];
      setRepos(repoList.map((r: any) => ({ full_name: r.full_name, name: r.name })));
      if (!selectedRepo && repoList.length > 0) {
        setSelectedRepo(repoList[0].full_name || repoList[0].name);
      }
    } catch (err: any) {
      console.error('Failed to fetch repositories:', err);
      setError(err?.message || 'Failed to fetch repositories');
    }
  };

  const fetchActionsData = async () => {
    if (!selectedRepo.trim()) {
      setError('Please enter a repository name (e.g., org/repo).');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/github/actions/runs?repo=${encodeURIComponent(selectedRepo.trim())}&days=30`);
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to fetch GitHub Actions data');
      }
      setRepoStats(data);
    } catch (err: any) {
      console.error('Failed to fetch GitHub Actions data:', err);
      setError(err?.message || 'Failed to fetch GitHub Actions data');
      setRepoStats(null);
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="p-6 space-y-6">
        <Alert>
          <AlertDescription>
            GitHub is not connected. Please configure your GitHub token in Settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div
      className="h-full overflow-auto transition-all duration-300"
      style={{ 
        background: isDarkMode 
          ? `linear-gradient(135deg, ${currentTheme.colors.background} 0%, ${currentTheme.colors.surface} 50%, ${currentTheme.colors.background} 100%)`
          : `linear-gradient(135deg, ${currentTheme.colors.background} 0%, ${currentTheme.colors.surface || '#F1F5F9'} 50%, ${currentTheme.colors.background} 100%)`
      }}
    >
      <div className="p-6 space-y-8 w-full">
        {/* Header */}
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
              }}
            >
              GitHub Insights
            </h1>
            <p className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Automation runs and repository analytics
            </p>
          </div>
          <Button
            onClick={fetchActionsData}
            disabled={loading}
            style={{
              background: currentTheme.colors.primary,
              color: '#FFFFFF'
            }}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </>
            )}
          </Button>
        </div>

        {/* Repository Input */}
        <Card style={{ background: isDarkMode ? currentTheme.colors.surface : '#FFFFFF' }}>
          <CardHeader>
            <CardTitle style={{ color: isDarkMode ? '#FFFFFF' : '#1F2937' }}>
              Select Repository
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {repos.length > 0 ? (
                <select
                  value={selectedRepo}
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  className={`flex-1 px-4 py-2 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-700 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  {repos.map((r) => (
                    <option key={r.full_name || r.name} value={r.full_name || r.name}>
                      {r.full_name || r.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={selectedRepo}
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  placeholder="Enter repository (e.g., org/repo)"
                  className={`flex-1 px-4 py-2 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-700 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              )}
              <Button
                onClick={fetchActionsData}
                style={{
                  background: currentTheme.colors.primary,
                  color: '#FFFFFF'
                }}
              >
                Load
              </Button>
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-500">{error}</p>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        {repoStats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Total Runs */}
              <Card style={{ background: isDarkMode ? currentTheme.colors.surface : '#FFFFFF' }}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Total Runs
                      </p>
                      <p className="text-3xl font-bold mt-2" style={{ color: currentTheme.colors.primary }}>
                        {repoStats.total_runs}
                      </p>
                    </div>
                    <Activity className="w-8 h-8" style={{ color: currentTheme.colors.primary }} />
                  </div>
                </CardContent>
              </Card>

              {/* Successful Runs */}
              <Card style={{ background: isDarkMode ? currentTheme.colors.surface : '#FFFFFF' }}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Successful
                      </p>
                      <p className="text-3xl font-bold mt-2 text-green-600">
                        {repoStats.successful}
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              {/* Failed Runs */}
              <Card style={{ background: isDarkMode ? currentTheme.colors.surface : '#FFFFFF' }}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Failed
                      </p>
                      <p className="text-3xl font-bold mt-2 text-red-600">
                        {repoStats.failed}
                      </p>
                    </div>
                    <XCircle className="w-8 h-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              {/* Success Rate */}
              <Card style={{ background: isDarkMode ? currentTheme.colors.surface : '#FFFFFF' }}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Success Rate
                      </p>
                      <p className="text-3xl font-bold mt-2" style={{ color: currentTheme.colors.primary }}>
                        {repoStats.success_rate.toFixed(1)}%
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8" style={{ color: currentTheme.colors.primary }} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Runs Table */}
            <Card style={{ background: isDarkMode ? currentTheme.colors.surface : '#FFFFFF' }}>
              <CardHeader>
                <CardTitle style={{ color: isDarkMode ? '#FFFFFF' : '#1F2937' }}>
                  Recent Workflow Runs (Last 10)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <th className={`text-left p-3 font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Workflow
                        </th>
                        <th className={`text-left p-3 font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Status
                        </th>
                        <th className={`text-left p-3 font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Created
                        </th>
                        <th className={`text-left p-3 font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Link
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {repoStats.runs.map((run) => (
                        <tr 
                          key={run.id}
                          className={`border-b ${isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-100 hover:bg-gray-50'}`}
                        >
                          <td className={`p-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                            {run.name}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={run.conclusion === 'success' ? 'default' : 'destructive'}
                              style={{
                                background: run.conclusion === 'success' ? '#10B981' : '#EF4444',
                                color: '#FFFFFF'
                              }}
                            >
                              {run.conclusion || run.status}
                            </Badge>
                          </td>
                          <td className={`p-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {new Date(run.created_at).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <a
                              href={run.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              View
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

