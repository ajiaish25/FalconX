'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import { 
  Bot, 
  BarChart3, 
  Settings, 
  Circle,
  Zap,
  Sparkles,
  Wifi,
  WifiOff,
  Crown,
  Users,
  Target,
  RefreshCw,
  TrendingUp,
  Shield,
  Database,
  Cloud,
  Workflow,
  Layers,
  Command,
  Terminal,
  Monitor,
  Server,
  CheckCircle,
  X,
  Globe,
  Palette,
  Sun,
  MoonStar,
  Plug,
  ChevronDown,
  ChevronRight,
  FileText,
  Code,
  GitBranch
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ThemeSelector } from '../ui/ThemeSelector'
import { useTheme } from '../../contexts/ThemeContext'
import { useSettings } from '../../contexts/SettingsContext'
import type { ActiveView } from './NewFigmaApp'

interface Connection {
  name: string
  status: 'connected' | 'disconnected'
  type: 'atlassian' | 'github' | 'slack'
}

interface NewLeftSidebarProps {
  activeView: ActiveView
  setActiveView: (view: ActiveView) => void
  connections: Connection[]
  toggleConnection: (index: number) => void
  hasActiveConnections: boolean
  setShowSettings: (show: boolean) => void
  theme: 'light' | 'dark'
  onConnect: (connectionType: string) => Promise<void>
  onQuickAction: (prompt: string) => void
}

export function NewLeftSidebar({ 
  activeView, 
  setActiveView, 
  connections, 
  toggleConnection, 
  hasActiveConnections,
  setShowSettings,
  theme,
  onConnect,
  onQuickAction
}: NewLeftSidebarProps) {
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [showConnectedPopup, setShowConnectedPopup] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showAboutUs, setShowAboutUs] = useState(false)

  const [integrationsExpanded, setIntegrationsExpanded] = useState(true)
  const [quickActionsExpanded, setQuickActionsExpanded] = useState(false)
  const [insightsExpanded, setInsightsExpanded] = useState(false)
  // Removed tcoeExpanded - now QA Metrics is a separate top-level navigation item
  const [showWelcome, setShowWelcome] = useState(true)
  const [showThemeSelector, setShowThemeSelector] = useState(false)
  const [metricsExpanded, setMetricsExpanded] = useState(false)
  
  // Theme context
  const { currentTheme, isDarkMode, toggleDarkMode } = useTheme()
  const { settings, isLoaded } = useSettings()

  // Initialize client-side state
  useEffect(() => {
    setIsClient(true)
  }, [])


  // Fade out welcome message after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false)
    }, 3000)
    
    return () => clearTimeout(timer)
  }, [])

  // Quick Actions Data
  const quickActions = [
    {
      label: "Analyze",
      subtext: "Performance",
      icon: BarChart3,
      prompt: "Analyze team performance metrics and productivity trends",
      color: "primary"
    },
    {
      label: "Insights",
      subtext: "Team",
      icon: Users,
      prompt: "Provide insights about team workload and collaboration patterns",
      color: "from-purple-500 to-pink-500"
    },
    {
      label: "Track",
      subtext: "Goals",
      icon: Target,
      prompt: "Track OKRs and KPIs progress across the organization",
      color: "secondary"
    },
    {
      label: "Plan",
      subtext: "Sprints",
      icon: Workflow,
      prompt: "Help organize and plan agile sprints and project timelines",
      color: "from-orange-500 to-red-500"
    }
  ]

  // Update client state
  React.useEffect(() => {
    setIsClient(true)
  }, [])

  const handleConnect = async (connectionType: string) => {
    setConnecting(connectionType)
    try {
      await onConnect(connectionType)
      // Show animated popup
      setShowConnectedPopup(connectionType)
      setTimeout(() => {
        setShowConnectedPopup(null)
      }, 2000) // Hide popup after 2 seconds
    } catch (error) {
      console.error('Connection failed:', error)
    } finally {
      setConnecting(null)
    }
  }

  const handleDisconnect = async (connectionType: string) => {
    setConnecting(connectionType)
    try {
      // Find the connection index and toggle it to disconnected
      const connectionIndex = connections.findIndex(conn => conn.type === connectionType)
      if (connectionIndex !== -1) {
        toggleConnection(connectionIndex)
      }
      
      // Clear saved configuration from localStorage
      const configKey = `${connectionType}-config`
      localStorage.removeItem(configKey)
      
      // Show success message
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('Disconnection failed:', error)
    } finally {
      setConnecting(null)
    }
  }

  return (
    <>
      <aside className={`w-64 border-r flex flex-col h-full overflow-hidden transition-all duration-500 ease-in-out ${
        isDarkMode
          ? 'bg-[#0D0D14] border-white/[0.06]'
          : 'bg-white border-gray-200'
      }`}>
        {/* Header */}
        <div className={`p-5 border-b transition-all duration-300 ${
          isDarkMode ? 'border-white/[0.06]' : 'border-gray-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: currentTheme.colors.primary }}
            >
              <img 
                src="/company-logo.png" 
                alt="FalconX Logo" 
                className="w-8 h-8 object-contain"
              />
            </div>
            <div>
              <h2 
                key={`sidebar-title-${currentTheme.name}-${isDarkMode}`}
                className="text-base font-medium transition-colors duration-300"
                style={{
                  color: currentTheme.colors.primary,
                  background: `linear-gradient(90deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textRendering: 'optimizeLegibility',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale'
                }}
              >FalconX</h2>
              <p className={`text-xs transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>FalconX</p>
            </div>
          </div>
          
          <AnimatePresence>
            {showWelcome && (
              <motion.div 
                className="mt-4"
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ 
                  opacity: 0,
                  transition: { duration: 1, ease: "easeOut" }
                }}
              >
                <p className="text-sm text-gray-600">Welcome back,</p>
                <p className="text-sm font-medium text-black">{isLoaded ? settings.userProfile.name : "User"}! 👋</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ScrollArea className="flex-1 min-h-0 overflow-hidden">
          <div className="p-4 space-y-6">
            {/* Navigation */}
            <div className="space-y-2">
              <h4 className={`text-[10px] font-semibold uppercase tracking-widest mb-2 px-1 ${
                isDarkMode ? 'text-slate-600' : 'text-gray-400'
              }`}>
                Navigation
              </h4>
              
              {/* Work Buddy */}
              <button
                onClick={() => setActiveView('copilot')}
                className={`w-full flex items-center gap-3 h-11 px-3 rounded-xl transition-all duration-200 group relative ${
                  activeView === 'copilot'
                    ? isDarkMode
                      ? 'bg-indigo-500/10 text-white'
                      : 'bg-indigo-50 text-indigo-700'
                    : isDarkMode
                      ? 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {activeView === 'copilot' && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-500 rounded-r-full" />
                )}
                <Bot className={`w-4.5 h-4.5 flex-shrink-0 transition-colors ${activeView === 'copilot' ? 'text-indigo-400' : ''}`} />
                <div className="text-left min-w-0">
                  <div className="text-sm font-medium leading-none">Work Buddy</div>
                  <div className="text-[11px] opacity-60 mt-0.5">AI Assistant</div>
                </div>
              </button>

              {/* Insights - Converted to Dropdown */}
              <div className="space-y-0.5">
                <button
                  onClick={() => setInsightsExpanded(!insightsExpanded)}
                  className={`w-full flex items-center gap-3 h-11 px-3 rounded-xl transition-all duration-200 group relative ${
                    activeView === 'insights' || activeView === 'github-insights'
                      ? isDarkMode
                        ? 'bg-indigo-500/10 text-white'
                        : 'bg-indigo-50 text-indigo-700'
                      : isDarkMode
                        ? 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {(activeView === 'insights' || activeView === 'github-insights') && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-500 rounded-r-full" />
                  )}
                  <BarChart3 className={`w-4 h-4 flex-shrink-0 ${activeView === 'insights' || activeView === 'github-insights' ? 'text-indigo-400' : ''}`} />
                  <div className="text-left flex-1 min-w-0">
                    <div className="text-sm font-medium leading-none">Insights</div>
                    <div className="text-[11px] opacity-60 mt-0.5">Analytics</div>
                  </div>
                  {insightsExpanded
                    ? <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                    : <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  }
                </button>

                {insightsExpanded && (
                  <div className="ml-7 pl-3 border-l border-white/[0.06] space-y-0.5">
                    {/* Jira Insights */}
                    <button
                      onClick={() => setActiveView('insights')}
                      className={`w-full flex items-center gap-2 h-9 px-2 rounded-lg text-sm transition-all duration-200 ${
                        activeView === 'insights'
                          ? isDarkMode ? 'bg-indigo-500/10 text-indigo-300' : 'bg-indigo-50 text-indigo-700'
                          : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/[0.04]' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Database className="w-3.5 h-3.5 flex-shrink-0" />
                      Jira Insights
                    </button>

                    {/* GitHub Insights */}
                    <button
                      onClick={() => setActiveView('github-insights')}
                      className={`w-full flex items-center gap-2 h-9 px-2 rounded-lg text-sm transition-all duration-200 ${
                        activeView === 'github-insights'
                          ? isDarkMode ? 'bg-indigo-500/10 text-indigo-300' : 'bg-indigo-50 text-indigo-700'
                          : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/[0.04]' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Code className="w-3.5 h-3.5 flex-shrink-0" />
                      GitHub Insights
                    </button>
                  </div>
                )}
              </div>

              {/* Metrics - Collapsible Section */}
              <div className="space-y-0.5">
                <button
                  onClick={() => setMetricsExpanded(!metricsExpanded)}
                  className={`w-full flex items-center gap-3 h-11 px-3 rounded-xl transition-all duration-200 relative ${
                    ['tcoe-report', 'qa-metrics', 'kpi-metrics'].includes(activeView)
                      ? isDarkMode ? 'bg-indigo-500/10 text-white' : 'bg-indigo-50 text-indigo-700'
                      : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/[0.04]' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {['tcoe-report', 'qa-metrics', 'kpi-metrics'].includes(activeView) && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-500 rounded-r-full" />
                  )}
                  <TrendingUp className={`w-4 h-4 flex-shrink-0 ${['tcoe-report', 'qa-metrics', 'kpi-metrics'].includes(activeView) ? 'text-indigo-400' : ''}`} />
                  <div className="text-left flex-1 min-w-0">
                    <div className="text-sm font-medium leading-none">Metrics</div>
                    <div className="text-[11px] opacity-60 mt-0.5">Performance</div>
                  </div>
                  {metricsExpanded ? <ChevronDown className="w-3.5 h-3.5 opacity-50" /> : <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
                </button>

                {metricsExpanded && (
                  <div className="ml-7 pl-3 border-l border-white/[0.06] space-y-0.5">
                    {/* TCOE Metrics */}
                    <button
                      onClick={() => setActiveView('tcoe-report')}
                      className={`w-full flex items-center gap-2 h-9 px-2 rounded-lg text-sm transition-all duration-200 ${
                        activeView === 'tcoe-report'
                          ? isDarkMode ? 'bg-indigo-500/10 text-indigo-300' : 'bg-indigo-50 text-indigo-700'
                          : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/[0.04]' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                      TCOE Metrics
                    </button>

                    {/* QE Metrics */}
                    <button
                      onClick={() => setActiveView('qa-metrics')}
                      className={`w-full flex items-center gap-2 h-9 px-2 rounded-lg text-sm transition-all duration-200 ${
                        activeView === 'qa-metrics'
                          ? isDarkMode ? 'bg-indigo-500/10 text-indigo-300' : 'bg-indigo-50 text-indigo-700'
                          : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/[0.04]' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>QE Metrics</span>
                    </button>

                    {/* KPI Metrics */}
                    <button
                      onClick={() => setActiveView('kpi-metrics')}
                      className={`w-full flex items-center gap-2 h-9 px-2 rounded-lg text-sm transition-all duration-200 ${
                        activeView === 'kpi-metrics'
                          ? isDarkMode ? 'bg-indigo-500/10 text-indigo-300' : 'bg-indigo-50 text-indigo-700'
                          : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/[0.04]' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Target className="w-3.5 h-3.5 flex-shrink-0" />
                      KPI Metrics
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Integrations */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h4 className={`text-[10px] font-semibold uppercase tracking-widest ${
                  isDarkMode ? 'text-slate-600' : 'text-gray-400'
                }`}>
                  Integrations
                </h4>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowThemeSelector(true)}
                    className={`h-5 w-5 flex items-center justify-center rounded transition-colors ${isDarkMode ? 'text-slate-600 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <Palette className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setIntegrationsExpanded(!integrationsExpanded)}
                    className={`h-5 w-5 flex items-center justify-center rounded transition-colors ${isDarkMode ? 'text-slate-600 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {integrationsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              
              {integrationsExpanded && (
                <div className="space-y-0.5">
                  {[
                    { name: 'Jira',       label: 'Project Management', icon: Database,  coming: false },
                    { name: 'Confluence', label: 'Documentation',       icon: FileText,  coming: false },
                    { name: 'QARP',       label: 'Quality Assurance',   icon: Shield,    coming: true  },
                    { name: 'GitHub',     label: 'Code Repository',     icon: GitBranch, coming: false },
                  ].map(({ name, label, icon: Icon, coming }) => {
                    const conn = connections.find(c => c.name === name)
                    const isConnected = conn?.status === 'connected'
                    return (
                      <div
                        key={name}
                        className={`flex items-center justify-between px-3 h-11 rounded-xl transition-all duration-200 ${
                          coming ? 'opacity-40 cursor-default' : ''
                        } ${isDarkMode ? 'hover:bg-white/[0.04]' : 'hover:bg-gray-50'}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className={`w-4 h-4 flex-shrink-0 ${
                            isConnected ? 'text-indigo-400' : isDarkMode ? 'text-slate-500' : 'text-gray-400'
                          }`} />
                          <div className="min-w-0">
                            <div className={`text-sm font-medium truncate ${
                              isDarkMode ? isConnected ? 'text-white' : 'text-slate-300' : isConnected ? 'text-indigo-700' : 'text-gray-700'
                            }`}>{name}</div>
                            <div className={`text-[11px] truncate ${isDarkMode ? 'text-slate-600' : 'text-gray-400'}`}>{label}</div>
                          </div>
                        </div>
                        {coming ? (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isDarkMode ? 'border-white/10 text-slate-500' : 'border-gray-200 text-gray-400'}`}>
                            Soon
                          </span>
                        ) : (
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            isConnected ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-slate-600'
                          }`} />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {!hasActiveConnections && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="w-full h-9 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-200 active:scale-[0.98]"
                >
                  <Plug className="w-3.5 h-3.5" />
                  Connect Integrations
                </button>
              )}
              {hasActiveConnections && (
                <div className="space-y-1.5">
                  <button
                    onClick={() => setShowSettings(true)}
                    className={`w-full h-9 flex items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
                      isDarkMode
                        ? 'border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.04] hover:border-white/20'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Manage
                  </button>
                  {connections.some(c => c.status === 'connected') && (
                    <button
                      onClick={async () => {
                        try { await fetch('http://localhost:8000/api/jira/disconnect', { method: 'POST' }) } catch {}
                        try { await fetch('http://localhost:8000/api/confluence/disconnect', { method: 'POST' }) } catch {}
                        try { toggleConnection(-1) } catch {}
                      }}
                      className={`w-full h-9 flex items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
                        isDarkMode
                          ? 'border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40'
                          : 'border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300'
                      }`}
                    >
                      <WifiOff className="w-3.5 h-3.5" />
                      Disconnect All
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <h4 className={`text-[10px] font-semibold uppercase tracking-widest px-1 ${
                isDarkMode ? 'text-slate-600' : 'text-gray-400'
              }`}>
                Quick Actions
              </h4>
              <div className="space-y-0.5">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => onQuickAction(action.prompt)}
                    className={`w-full flex items-center gap-3 h-10 px-3 rounded-xl text-left transition-all duration-200 group ${
                      isDarkMode
                        ? 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                      isDarkMode ? 'bg-white/[0.06] group-hover:bg-indigo-500/20' : 'bg-gray-100 group-hover:bg-indigo-50'
                    }`}>
                      <action.icon className={`w-3.5 h-3.5 transition-colors duration-200 ${
                        isDarkMode ? 'text-slate-500 group-hover:text-indigo-400' : 'text-gray-500 group-hover:text-indigo-600'
                      }`} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium leading-none truncate">{action.label}</div>
                      <div className={`text-[11px] mt-0.5 truncate ${isDarkMode ? 'text-slate-600' : 'text-gray-400'}`}>{action.subtext}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
        
        {/* Footer */}
        <div className={`px-4 py-3 border-t ${isDarkMode ? 'border-white/[0.06]' : 'border-gray-200'}`}>
          <button
            onClick={() => setShowAboutUs(true)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
              isDarkMode ? 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Globe className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium">About Us</span>
          </button>
        </div>
      </aside>

      {/* Animated Connected Popup */}
      <AnimatePresence>
        {showConnectedPopup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
          >
            <div className="bg-[#16161F] border border-white/10 rounded-2xl p-4 shadow-2xl shadow-black/40 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-white">
                  {showConnectedPopup === 'atlassian' ? 'Atlassian' :
                   showConnectedPopup === 'github' ? 'GitHub' : 'Integration'} Connected
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Integration is now active</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* About Us Modal */}
      <AnimatePresence>
        {showAboutUs && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAboutUs(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative w-full max-w-4xl max-h-[90vh] rounded-lg shadow-2xl border overflow-hidden transition-colors duration-300"
              style={{
                backgroundColor: isDarkMode ? currentTheme.colors.surface : currentTheme.colors.background,
                borderColor: currentTheme.colors.border
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div 
                className="flex items-center justify-between p-6 border-b transition-colors duration-300"
                style={{
                  backgroundColor: `${currentTheme.colors.primary}10`,
                  borderColor: currentTheme.colors.border
                }}
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-300"
                    style={{ backgroundColor: currentTheme.colors.primary }}
                  >
                    <span 
                      className="font-bold text-lg transition-colors duration-300"
                      style={{ color: 'white' }}
                    >T</span>
                  </div>
                  <div>
                    <h2 
                      className="text-xl font-bold transition-colors duration-300"
                      style={{ color: currentTheme.colors.text }}
                    >
                      About FalconX Solutions
                    </h2>
                    <p 
                      className="text-sm transition-colors duration-300"
                      style={{ color: currentTheme.colors.textSecondary }}
                    >
                      Leadership Engine Excellence
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowAboutUs(false)}
                  className="transition-colors duration-300"
                  style={{
                    color: currentTheme.colors.textSecondary
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = currentTheme.colors.text;
                    e.currentTarget.style.backgroundColor = `${currentTheme.colors.primary}10`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = currentTheme.colors.textSecondary;
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              {/* Content */}
              <div 
                className="flex-1 overflow-y-auto p-6 transition-colors duration-300"
                style={{
                  backgroundColor: isDarkMode ? currentTheme.colors.surface : currentTheme.colors.background
                }}
              >
                <div className="space-y-6">
                  {/* Company Overview */}
                  <div>
                    <h3 
                      className="text-lg font-semibold mb-3 transition-colors duration-300"
                      style={{ color: currentTheme.colors.text }}
                    >
                      Our Mission
                    </h3>
                    <p 
                      className="text-sm leading-relaxed transition-colors duration-300"
                      style={{ color: currentTheme.colors.textSecondary }}
                    >
                      FalconX Solutions specializes in assisting enterprises to develop new platforms, 
                      scale existing business models, and expand into new markets with rapid time-to-market strategies. 
                      Our name, cdk, stands for <strong>Transformation, Automation, and Optimization</strong>, 
                      reflecting our core philosophy and value proposition.
                    </p>
                  </div>

                  {/* Services */}
                  <div>
                    <h3 
                      className="text-lg font-semibold mb-3 transition-colors duration-300"
                      style={{ color: currentTheme.colors.text }}
                    >
                      Our Services
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { title: "Product Engineering", desc: "Agile services to fuel innovation and accelerate time to market" },
                        { title: "Managed Services", desc: "Outcome-based technology operations management" },
                        { title: "Cybersecurity", desc: "Strengthen IT systems and prevent disruptions" },
                        { title: "Payment Services", desc: "End-to-end digital payment solutions" },
                        { title: "Digitization", desc: "Scale data models and unlock AI value" },
                        { title: "Cloud Services", desc: "Accelerate IT modernization through cloud technologies" }
                      ].map((service, index) => (
                        <div 
                          key={index} 
                          className="p-4 rounded-lg border transition-colors duration-300"
                          style={{
                            backgroundColor: `${currentTheme.colors.primary}05`,
                            borderColor: currentTheme.colors.border
                          }}
                        >
                          <h4 
                            className="font-medium text-sm mb-2 transition-colors duration-300"
                            style={{ color: currentTheme.colors.text }}
                          >
                            {service.title}
                          </h4>
                          <p 
                            className="text-xs transition-colors duration-300"
                            style={{ color: currentTheme.colors.textSecondary }}
                          >
                            {service.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Global Presence */}
                  <div>
                    <h3 
                      className="text-lg font-semibold mb-3 transition-colors duration-300"
                      style={{ color: currentTheme.colors.text }}
                    >
                      Global Presence
                    </h3>
                    <p 
                      className="text-sm leading-relaxed mb-3 transition-colors duration-300"
                      style={{ color: currentTheme.colors.textSecondary }}
                    >
                      We operate across five international hubs:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {['USA', 'Canada', 'Nigeria', 'India', 'Australia'].map((country, index) => (
                        <span 
                          key={index}
                          className="px-3 py-1 rounded-full text-xs font-medium transition-colors duration-300"
                          style={{
                            backgroundColor: `${currentTheme.colors.primary}20`,
                            color: currentTheme.colors.primary,
                            borderColor: `${currentTheme.colors.primary}40`
                          }}
                        >
                          {country}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Values */}
                  <div>
                    <h3 
                      className="text-lg font-semibold mb-3 transition-colors duration-300"
                      style={{ color: currentTheme.colors.text }}
                    >
                      Our Values
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {['Innovation', 'Respect', 'Customer Focus', 'Community'].map((value, index) => (
                        <div 
                          key={index} 
                          className="flex items-center space-x-2 p-2 rounded-lg transition-colors duration-300"
                          style={{
                            backgroundColor: `${currentTheme.colors.primary}05`,
                            borderColor: currentTheme.colors.border
                          }}
                        >
                          <div 
                            className="w-2 h-2 rounded-full transition-colors duration-300"
                            style={{ backgroundColor: currentTheme.colors.primary }}
                          />
                          <span 
                            className="text-sm font-medium transition-colors duration-300"
                            style={{ color: currentTheme.colors.text }}
                          >
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contact */}
                  <div 
                    className="p-4 rounded-lg border transition-colors duration-300"
                    style={{
                      backgroundColor: `${currentTheme.colors.primary}05`,
                      borderColor: currentTheme.colors.border
                    }}
                  >
                    <h3 
                      className="text-lg font-semibold mb-2 transition-colors duration-300"
                      style={{ color: currentTheme.colors.text }}
                    >
                      Learn More
                    </h3>
                    <p 
                      className="text-sm mb-3 transition-colors duration-300"
                      style={{ color: currentTheme.colors.textSecondary }}
                    >
                      Visit our website to explore our full range of services and solutions.
                    </p>
                    <a 
                      href="https://www.cdkdigitalsolutions.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 text-white"
                      style={{
                        backgroundColor: currentTheme.colors.primary
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = currentTheme.colors.secondary;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = currentTheme.colors.primary;
                      }}
                    >
                      <Globe className="w-4 h-4" />
                      <span>Visit Website</span>
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Theme Selector */}
      <ThemeSelector 
        isOpen={showThemeSelector} 
        onClose={() => setShowThemeSelector(false)} 
      />
    </>
  )
}
