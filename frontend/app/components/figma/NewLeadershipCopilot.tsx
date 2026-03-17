'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { ScrollArea } from '../ui/scroll-area'
import { Badge } from '../ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { exportChatAsPDF, exportPageAsPDF, exportChatAsExcel, useVoiceToText } from '../../utils/exportUtils'
import { useTheme } from '../../contexts/ThemeContext'
import { useSettings } from '../../contexts/SettingsContext'
import { WelcomePopup } from '../WelcomePopup'
import { 
  Bot, 
  User, 
  Sparkles, 
  Zap, 
  Brain, 
  MessageCircle, 
  TrendingUp,
  Target,
  Users,
  Calendar,
  BarChart3,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Settings,
  Crown,
  Star,
  Activity,
  Command,
  Shield,
  Lightbulb,
  Database,
  Monitor,
  Workflow,
  Trash2,
  FileText,
  FileSpreadsheet,
  Mic,
  MicOff,
  Volume2,
  Square,
  Trash,
  Send,
  UploadCloud,
  Info
} from 'lucide-react'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string | object  // Allow both string and object content
  timestamp: Date
  projectContext?: string
  metadata?: {
    type: 'analysis' | 'recommendation' | 'insight' | 'summary'
    confidence?: number
    sources?: string[]
  }
}

interface ProjectContext {
  projectKey: string
  projectName: string
  lastMentioned: Date
  isActive: boolean
}

interface NewLeadershipCopilotProps {
  hasActiveConnections: boolean
  theme: 'light' | 'dark'
  quickActionPrompt?: string | null
  onPromptSent?: () => void
}

export function NewLeadershipCopilot({ 
  hasActiveConnections, 
  theme, 
  quickActionPrompt, 
  onPromptSent 
}: NewLeadershipCopilotProps) {
  const { currentTheme, isThemeLoaded, isDarkMode } = useTheme();
  const { settings, isLoaded } = useSettings();
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [showAvatarAnimation, setShowAvatarAnimation] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [projectContext, setProjectContext] = useState<ProjectContext[]>([])
  const [lastMentionedProject, setLastMentionedProject] = useState<string | null>(null)
  const [cachedProjects, setCachedProjects] = useState<Record<string, any>>({})
  const [integrations, setIntegrations] = useState<string[]>([])
  const [uploadedDocReady, setUploadedDocReady] = useState<boolean>(false)
  const [showWelcomePopup, setShowWelcomePopup] = useState(false)
  const [userHasTyped, setUserHasTyped] = useState(false)
  const [showManualRoutingPopup, setShowManualRoutingPopup] = useState(false)
  const [hasShownManualRoutingPopup, setHasShownManualRoutingPopup] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const pageContainerRef = useRef<HTMLDivElement>(null)
  
  // Voice-to-text functionality
  const { isListening, transcript, isSupported, startListening, stopListening, resetTranscript } = useVoiceToText()

  // Show welcome popup on mount (only once per session)
  useEffect(() => {
    if (isLoaded) {
      // For testing: comment out sessionStorage check to always show
      // const hasShownWelcome = sessionStorage.getItem('workBuddyWelcomeShown')
      // if (!hasShownWelcome) {
        // Small delay to ensure UI is ready
        const timer = setTimeout(() => {
          console.log('🎉 Showing welcome popup')
          setShowWelcomePopup(true)
          // sessionStorage.setItem('workBuddyWelcomeShown', 'true')
        }, 1000)
        return () => clearTimeout(timer)
      // }
    }
  }, [isLoaded])

  // Initialize welcome message with simplified content
  useEffect(() => {
    if (isLoaded) {
      const userName = settings.userProfile.name || 'User'
      
      setMessages([{
        id: '1',
        type: 'assistant',
        content: `Hello ${userName}! I'm your AI Work Buddy, your intelligent assistant

What would you like to know?`,
        timestamp: new Date(),
        metadata: {
          type: 'insight',
          confidence: 0.95
        }
      }])
    }
  }, [isLoaded, settings.userProfile.name])


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // (Removed) projects/assignees reference dropdowns per request

  // Update input when voice transcript changes
  useEffect(() => {
    if (transcript) {
      setInputValue(transcript)
      setUserHasTyped(true) // User has typed via voice
    }
  }, [transcript])

  // Track when user types in input field
  useEffect(() => {
    if (inputValue.trim().length > 0) {
      setUserHasTyped(true)
    }
  }, [inputValue])

  // Auto-send message when voice transcript is complete and user stops speaking
  useEffect(() => {
    if (transcript && !isListening && inputValue.trim()) {
      // Small delay to allow user to see the transcript before auto-sending
      const timer = setTimeout(() => {
        if (inputValue.trim() === transcript.trim()) {
          handleSendMessage()
        }
      }, 2000) // Wait 2 seconds after stopping to speak
      
      return () => clearTimeout(timer)
    }
  }, [transcript, isListening, inputValue])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 100) + 'px'
    }
  }, [inputValue])

  // Function to detect project context from user input
  const detectProjectContext = (userInput: string, previousMessages: Message[]): string | null => {
    const input = userInput.toLowerCase()
    
    // Check for explicit project mentions
    const projectPatterns = [
      /ces-?\d+/i,
      /ccm-?\d+/i,
      /hcat-?\d+/i,
      /project\s+ces/i,
      /project\s+ccm/i,
      /project\s+hcat/i,
      /ces\s+project/i,
      /ccm\s+project/i,
      /hcat\s+project/i
    ]
    
    for (const pattern of projectPatterns) {
      const match = input.match(pattern)
      if (match) {
        const projectKey = match[0].toUpperCase().replace(/\s+/g, '')
        return projectKey
      }
    }
    
    // Check for "all" projects
    if (input.includes('all') || input.includes('every') || input.includes('combined')) {
      return 'ALL'
    }
    
    // Check for "this" or "that" - use last mentioned project
    if (input.includes('this') || input.includes('that') || input.includes('it')) {
      return lastMentionedProject
    }
    
    // Check previous messages for project context
    for (let i = previousMessages.length - 1; i >= 0; i--) {
      const msg = previousMessages[i]
      if (msg.type === 'user' && msg.projectContext) {
        return msg.projectContext
      }
    }
    
    return null
  }

  // Function to cache project details
  const cacheProjectDetails = async (projectKey: string) => {
    if (cachedProjects[projectKey]) {
      return cachedProjects[projectKey]
    }
    
    try {
      const response = await fetch('http://localhost:8000/api/jira/project-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectKey }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setCachedProjects(prev => ({
          ...prev,
          [projectKey]: data
        }))
        return data
      }
    } catch (error) {
      console.error('Error caching project details:', error)
    }
    
    return null
  }

  // Function to get project context for search
  const getProjectContextForSearch = (detectedProject: string | null): string => {
    if (detectedProject === 'ALL') {
      return 'all'
    } else if (detectedProject && detectedProject !== 'ALL') {
      return detectedProject
    } else if (lastMentionedProject) {
      return lastMentionedProject
    }
    return 'all'
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    // Detect project context
    const detectedProject = detectProjectContext(inputValue, messages)

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
      projectContext: detectedProject || undefined
    }

    // Update last mentioned project
    if (detectedProject && detectedProject !== 'ALL') {
      setLastMentionedProject(detectedProject)
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    
    // Reset voice state after sending message
    resetVoiceState()
    
    // Small delay to ensure user message appears first
    setTimeout(async () => {
    setIsTyping(true)
      setShowAvatarAnimation(true)
      
      // Set conversational loading messages
      const loadingMessages = [
        "I am thinking...",
        "Answering in few seconds",
        "Thanks for the Patience"
      ]
      
      // Cycle through loading messages
      let messageIndex = 0
      const messageInterval = setInterval(() => {
        setLoadingMessage(loadingMessages[messageIndex])
        messageIndex = (messageIndex + 1) % loadingMessages.length
      }, 1500)
      
      // Set initial message
      setLoadingMessage(loadingMessages[0])

      try {
        // Cache project details if needed
        if (detectedProject && detectedProject !== 'ALL') {
          await cacheProjectDetails(detectedProject)
        }

        const projectContextForSearch = getProjectContextForSearch(detectedProject)
        
      let response: Response
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'
      
      // AUTO MODE: No integrations selected - intelligent routing
      if (integrations.length === 0) {
        if (uploadedDocReady) {
          // If domain doc is uploaded, prioritize it
          response = await fetch(`${apiBase}/api/domain/qa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: inputValue, k: 5 })
          })
        } else {
          // Auto mode - intelligent classification with unified RAG
          response = await fetch(`${apiBase}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: inputValue,
              source: 'auto',  // Auto mode for intelligent routing
              context: 'leadership_copilot',
              projectContext: projectContextForSearch,
              cachedProjects: cachedProjects,
              integrations: [],  // Empty array for auto mode
              messages: messages.slice(-5).map(msg => ({
                role: msg.type === 'user' ? 'user' : 'assistant',
                content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
              }))
            })
          })
        }
      } 
      // MANUAL MODE: One or more integrations selected
      else {
        // Make parallel API calls for all selected integrations
        const commonPayload = {
          message: inputValue,
          context: 'leadership_copilot',
          projectContext: projectContextForSearch,
          cachedProjects: cachedProjects,
          integrations: integrations,
          messages: messages.slice(-5).map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
          }))
        }

        // Create parallel fetch promises for each selected integration
        const fetchPromises = integrations.map(integration => {
          return fetch(`${apiBase}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...commonPayload,
              source: integration
            })
          }).then(async (res) => {
            if (!res.ok) {
              throw new Error(`Failed to fetch from ${integration}`)
            }
            const data = await res.json()
            return { integration, data, success: true }
          }).catch((error) => {
            console.error(`Error fetching from ${integration}:`, error)
            return { integration, data: null, success: false, error: error.message }
          })
        })

        // Wait for all API calls to complete in parallel
        const results = await Promise.all(fetchPromises)
        
        // Filter successful responses
        const successfulResults = results.filter(r => r.success && r.data)
        
        if (successfulResults.length === 0) {
          // All calls failed
          throw new Error('All integration API calls failed. Please check your connections and try again.')
        }

        // Combine responses from multiple integrations
        if (successfulResults.length === 1) {
          // Single integration - use its response directly
          const result = successfulResults[0].data
          response = new Response(JSON.stringify(result), { status: 200 })
        } else {
          // Multiple integrations - combine responses intelligently
          const combinedResponse = {
            response: '',
            sources: [] as string[],
            combined: true
          }

          // Combine all responses with clear separation
          const responseParts: string[] = []
          
          successfulResults.forEach(({ integration, data }) => {
            const integrationName = integration.charAt(0).toUpperCase() + integration.slice(1)
            const responseText = data.response || data.answer || data.message || 'No response'
            
            responseParts.push(`\n\n--- ${integrationName} Results ---\n${responseText}`)
            combinedResponse.sources.push(integration)
          })

          // Add header explaining combined results
          const header = `I've searched across ${successfulResults.length} integration${successfulResults.length > 1 ? 's' : ''}: ${successfulResults.map(r => r.integration.charAt(0).toUpperCase() + r.integration.slice(1)).join(', ')}.\n\nHere are the combined results:`
          
          combinedResponse.response = header + responseParts.join('\n')
          
          response = new Response(JSON.stringify(combinedResponse), { status: 200 })
        }
      }

      if (response.ok) {
        const data = await response.json()
        console.log('Backend response data:', data)

        // Check for error in response
        if (data.error || (data.response && data.error === true)) {
          console.error('Backend returned error:', data.error || data.response)
          throw new Error(data.error || data.response || 'Unknown error from backend')
        }

        // Handle combined responses from multiple integrations
        let contentText: string
        let sources: string[] = []
        
        if (data.combined && data.sources) {
          // Combined response from multiple integrations
          contentText = data.response || 'Combined results from multiple integrations'
          sources = data.sources.map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
        } else {
          // Single integration response
          contentText =
            typeof data.answer === 'string' ? data.answer :
            typeof data.response === 'string' ? data.response :
            typeof data.message === 'string' ? data.message :
            (data && typeof data === 'object' ? JSON.stringify(data) : 'I received your message but couldn\'t generate a response.')
          
          // Determine sources based on integrations or data
          if (integrations.length > 0) {
            sources = integrations.map(i => i.charAt(0).toUpperCase() + i.slice(1))
          } else if (data.source) {
            sources = [data.source.charAt(0).toUpperCase() + data.source.slice(1)]
          } else {
            sources = integrations.includes('domain')
              ? ['Domain Doc']
              : integrations.includes('confluence')
                ? ['Confluence']
                : ['AI Engine', 'Jira Data']
          }
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: contentText,
          timestamp: new Date(),
          projectContext: detectedProject || undefined,
          metadata: {
            type: data.type || 'analysis',
            confidence: data.confidence || 0.9,
            sources: sources
          }
        }

        setMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error('Failed to get response from backend')
      }
    } catch (error) {
      console.error('Error calling backend API:', error)
      
      // Show actual error message to user
      const errorMessage = error instanceof Error ? error.message : String(error)
      const isConnectionError = errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('fetch')
      
      const errorContent = isConnectionError
        ? "I'm having trouble connecting to the backend API. Please make sure the backend server is running on port 8000 and that Jira/Confluence integrations are properly configured."
        : `I encountered an error: ${errorMessage}. Please try again or check your configuration.`
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: errorContent,
        timestamp: new Date(),
        metadata: {
          type: 'error' as const,
          confidence: 0.5,
          sources: ['Error Handler']
        }
      }

      setMessages(prev => [...prev, assistantMessage])
    } finally {
        clearInterval(messageInterval)
      setIsTyping(false)
        setLoadingMessage('')
        
        // Show "done" animation briefly
        setTimeout(() => {
          setShowAvatarAnimation(false)
        }, 1000)
      }
    }, 100)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleClearChat = () => {
    const userName = isLoaded ? settings.userProfile.name : "User"
    setMessages([{
      id: '1',
      type: 'assistant',
      content: `Hello ${userName} 👋! I'm your AI Work Buddy. I can help you analyze team performance, provide strategic insights, and answer questions about your projects. What would you like to know?`,
      timestamp: new Date(),
      metadata: {
        type: 'insight',
        confidence: 0.95
      }
    }])
  }

  // Export functions
  const handleExportPDF = async () => {
    try {
      // Export entire page instead of just messages
      if (pageContainerRef.current) {
        await exportPageAsPDF(
          pageContainerRef.current,
          `work-buddy-page-${new Date().toISOString().split('T')[0]}.pdf`,
          {
            scale: 2,
            backgroundColor: isDarkMode ? '#1f2937' : '#f9fafb',
            includeScrollableContent: true
          }
        )
      } else {
        // Fallback to message-only export if container ref not available
      const messagesForExport = messages.map(msg => ({
        sender: msg.type === 'user' ? 'user' : 'assistant',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        timestamp: msg.timestamp,
        confidence: msg.metadata?.confidence,
        projectContext: msg.projectContext
      }))
      
      await exportChatAsPDF(messagesForExport, `work-buddy-chat-${new Date().toISOString().split('T')[0]}.pdf`)
      }
    } catch (error) {
      console.error('Failed to export PDF:', error)
      alert('Failed to export PDF. Please try again.')
    }
  }

  const handleExportExcel = async () => {
    try {
      const messagesForExport = messages.map(msg => ({
        sender: msg.type === 'user' ? 'user' : 'assistant',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        timestamp: msg.timestamp,
        confidence: msg.metadata?.confidence,
        projectContext: msg.projectContext
      }))
      
      await exportChatAsExcel(messagesForExport, `work-buddy-chat-${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (error) {
      console.error('Failed to export Excel:', error)
    }
  }

  // Voice control functions
  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening()
    } else {
      resetTranscript()
      startListening()
    }
  }

  // Reset voice state after sending message
  const resetVoiceState = () => {
    if (isListening) {
      stopListening()
    }
    resetTranscript()
  }

  const handleCopyMessage = async (messageId: string, content: string | object) => {
    try {
      const textContent = typeof content === 'string' ? content : JSON.stringify(content)
      await navigator.clipboard.writeText(textContent)
      setCopiedMessageId(messageId)
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedMessageId(null)
      }, 2000)
    } catch (err) {
      console.error('Failed to copy message:', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = typeof content === 'string' ? content : JSON.stringify(content)
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      
      setCopiedMessageId(messageId)
      setTimeout(() => {
        setCopiedMessageId(null)
      }, 2000)
    }
  }

  // Auto-send quick action prompt
  React.useEffect(() => {
    if (quickActionPrompt && onPromptSent) {
      setInputValue(quickActionPrompt)
      // Small delay to ensure the input is set before sending
      setTimeout(() => {
        handleSendMessage()
        onPromptSent() // Clear the prompt after sending
      }, 100)
    }
  }, [quickActionPrompt, onPromptSent])

  // Track previous integrations count to detect transitions
  const prevIntegrationsRef = React.useRef<string[]>([])
  
  // Detect when user selects first checkbox (switching from auto to manual mode)
  useEffect(() => {
    const prevCount = prevIntegrationsRef.current.length
    const currentCount = integrations.length
    
    // Transition from 0 to 1+ selections (entering manual mode)
    if (prevCount === 0 && currentCount > 0 && !hasShownManualRoutingPopup) {
      setShowManualRoutingPopup(true)
      setHasShownManualRoutingPopup(true)
    }
    
    // Update ref for next comparison
    prevIntegrationsRef.current = integrations
  }, [integrations, hasShownManualRoutingPopup])

  // Reset popup flag when all checkboxes are unchecked (returning to auto mode)
  useEffect(() => {
    if (integrations.length === 0) {
      setHasShownManualRoutingPopup(false)
    }
  }, [integrations.length])

  const quickActions = [
    { icon: TrendingUp, label: "Performance", prompt: "Analyze our team's performance metrics for this sprint", subtext: "Track productivity trends" },
    { icon: Users, label: "Team Insights", prompt: "Provide insights about team collaboration and communication", subtext: "Understand team workload" },
    { icon: Target, label: "Goal Tracking", prompt: "How are we progressing towards our quarterly goals?", subtext: "Monitor OKRs & KPIs" },
    { icon: Calendar, label: "Sprint Planning", prompt: "Help me plan the next sprint based on current capacity", subtext: "Organize agile sprints" }
  ]

  return (
    <div 
      ref={pageContainerRef}
      className={`h-full flex flex-col transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}
    >
      {/* Integrations Toolbar */}
      <div className={`flex items-center justify-between px-6 py-3 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex items-center gap-4">
          <div className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Choose Integrations</div>
        <div className="flex items-center gap-3">
          {['jira','confluence','qarp','github'].map(id => {
            const selected = integrations.includes(id)
            const isComingSoon = id === 'qarp' // Only QARP is coming soon now
            const label = id.charAt(0).toUpperCase()+id.slice(1)
            return (
              <label key={id} className={`flex items-center gap-1 text-xs select-none ${isComingSoon ? 'opacity-50' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={isComingSoon}
                  onChange={() => {
                    setIntegrations(prev => {
                      if (prev.includes(id)) {
                        // Uncheck: remove from array
                        return prev.filter(i => i !== id)
                      } else {
                        // Check: add to array (multi-select)
                        return [...prev, id]
                      }
                    })
                  }}
                />
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                  {label}
                  {isComingSoon && <span className="ml-1 text-xs text-gray-500">(Coming Soon)</span>}
                </span>
              </label>
            )
          })}
          {/* Upload doc inline */}
          <label className="ml-2 text-xs cursor-pointer inline-flex items-center gap-2">
            <input type="file" className="hidden" accept=".pdf,.docx,.md,.txt" onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                const form = new FormData()
                form.append('file', file)
                form.append('name', 'workbuddy-domain')
                const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/domain/upload`, { method: 'POST', body: form })
                const data = await resp.json()
                if (!resp.ok || data?.success === false) throw new Error(data?.detail || data?.error || 'Upload failed')
                setUploadedDocReady(true)
              } catch (err) {
                console.error('Upload failed', err)
              } finally {
                if (e.target) e.target.value = ''
              }
            }} />
            <span className={`px-2 py-1 rounded inline-flex items-center gap-1 ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Doc</span>
            </span>
            {uploadedDocReady && <span className="text-[10px] text-green-500">Indexed</span>}
          </label>
        </div>
        </div>
        {/* Mode Indicator */}
        <div className="flex items-center gap-2">
          {integrations.length === 0 ? (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              isDarkMode ? 'bg-green-900/30 border border-green-700/50' : 'bg-green-100 border border-green-300'
            }`}>
              <Sparkles className={`w-3.5 h-3.5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
              <span className={`text-xs font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
                Auto Mode (Intelligent Classification)
              </span>
            </div>
          ) : (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              isDarkMode ? 'bg-blue-900/30 border border-blue-700/50' : 'bg-blue-100 border border-blue-300'
            }`}>
              <Settings className={`w-3.5 h-3.5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <span className={`text-xs font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                Manual Mode Active
              </span>
            </div>
          )}
        </div>
        {/* Removed project and assignee dropdowns */}
      </div>
      {/* Messages */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        
        <ScrollArea className="h-full w-full">
          <div className="p-6 space-y-4 min-h-full">
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center min-h-[60vh] px-8"
              >
                {/* New Avatar Design */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.8, type: "spring", stiffness: 200 }}
                  className="relative mb-8"
                >
                  {/* Main Avatar Circle */}
                  <div 
                    className="w-32 h-32 rounded-full flex items-center justify-center shadow-2xl relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.accent}, ${currentTheme.colors.secondary})`
                    }}
                  >
                    {/* Inner Glow */}
                    <div className="absolute inset-2 bg-gradient-to-br from-white/20 to-transparent rounded-full"></div>
                    
                    {/* Avatar Icon */}
                    <div className="relative z-10">
                      <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <Bot className="w-8 h-8 text-white drop-shadow-lg" />
                      </div>
                    </div>
                    
                    {/* Floating Elements */}
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                    
                    {/* Orbiting Dots */}
                    <div className="absolute -inset-4">
                      <div 
                        className="w-2 h-2 rounded-full absolute top-0 left-1/2 transform -translate-x-1/2 animate-ping"
                        style={{ backgroundColor: currentTheme.colors.primary }}
                      ></div>
                      <div 
                        className="w-2 h-2 rounded-full absolute bottom-0 right-0 animate-ping" 
                        style={{ backgroundColor: currentTheme.colors.primary, animationDelay: '0.5s' }}
                      ></div>
                      <div 
                        className="w-2 h-2 rounded-full absolute top-1/2 left-0 animate-ping" 
                        style={{ backgroundColor: currentTheme.colors.primary, animationDelay: '1s' }}
                      ></div>
                    </div>
                  </div>
                </motion.div>

                {/* Welcome Content */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center max-w-2xl"
                >
                  <h1 className={`text-4xl font-bold mb-4 transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                    Welcome to{' '}
                    <span 
                      className="bg-clip-text text-transparent"
                      style={{
                        background: `linear-gradient(90deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`
                      }}
                    >
                      Work Buddy
                    </span>
                  </h1>
                  
                  <p className={`text-xl mb-6 transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Your intelligent AI assistant for work insights
                  </p>
                  
                  <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full transition-colors duration-300 ${
                    isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                  }`}>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">Online & Ready to Help</span>
                  </div>
                </motion.div>

                {/* Quick Start Suggestions */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl"
                >
                  {[
                    { icon: BarChart3, text: "Analyze Team Performance", color: "primary" },
                    { icon: Users, text: "Get Project Insights", color: "secondary" },
                    { icon: Target, text: "Track Goals & KPIs", color: "accent" }
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8 + index * 0.1 }}
                      className={`p-4 rounded-2xl transition-all duration-300 cursor-pointer hover:scale-105 relative overflow-hidden group ${
                        isDarkMode 
                          ? 'bg-gray-800/50 hover:bg-gray-700/50' 
                          : 'bg-white/50 hover:bg-white/80'
                      } backdrop-blur-sm border border-gray-200/20`}
                    >
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 relative z-10"
                        style={{
                          background: `linear-gradient(135deg, ${currentTheme.colors[item.color as keyof typeof currentTheme.colors]}, ${currentTheme.colors.secondary})`
                        }}
                      >
                        <item.icon className="w-6 h-6 text-white" />
                      </div>
                      <p className={`text-sm font-medium transition-colors duration-300 relative z-10 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>{item.text}</p>
                      {/* Hover Glow Effect */}
                      <div 
                        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          background: `linear-gradient(90deg, ${currentTheme.colors[item.color as keyof typeof currentTheme.colors]}10, ${currentTheme.colors.secondary}10)`
                        }}
                      ></div>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            )}
            <AnimatePresence>
              {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ 
                      duration: 0.5, 
                      delay: index * 0.1,
                      type: "spring",
                      stiffness: 100
                    }}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-8`}
                  >
                    <div className={`flex items-start space-x-4 max-w-[85%] ${
                      message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}>
                      {/* New Avatar Design */}
                      <div className={`flex-shrink-0 relative ${
                        message.type === 'user' ? 'w-14 h-14' : 'w-16 h-16'
                      }`}>
                        {message.type === 'user' ? (
                          <div 
                            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl relative overflow-hidden"
                            style={{
                              background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`
                            }}
                          >
                            <div className="absolute inset-1 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
                            <User className="w-7 h-7 text-white drop-shadow-lg relative z-10" />
                          </div>
                        ) : (
                          <div 
                            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl relative overflow-hidden"
                            style={{
                              background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.accent}, ${currentTheme.colors.secondary})`
                            }}
                          >
                            <div className="absolute inset-2 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm relative z-10">
                              <Bot className="w-6 h-6 text-white drop-shadow-lg" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div 
                        className={`rounded-3xl p-6 shadow-xl border backdrop-blur-sm transition-all duration-300 hover:shadow-2xl relative overflow-hidden group ${
                          message.type === 'user'
                            ? 'text-white'
                            : isDarkMode
                              ? 'bg-gray-800/90 text-white border-gray-700/50'
                              : 'bg-white/95 text-black border-gray-200/50'
                        }`}
                        style={message.type === 'user' ? {
                          background: `linear-gradient(90deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
                          borderColor: currentTheme.colors.primary
                        } : {}}
                      >
                        {/* Message Bubble Hover Glow */}
                        <div 
                          className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          style={message.type === 'user' ? {
                            background: `linear-gradient(90deg, ${currentTheme.colors.primary}20, ${currentTheme.colors.secondary}20)`
                          } : {
                            background: 'linear-gradient(90deg, rgba(107, 114, 128, 0.05), rgba(75, 85, 99, 0.05))'
                          }}
                        ></div>
                      <div className="text-sm leading-relaxed whitespace-pre-line">
                        {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
                      </div>
                      {message.metadata && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between">
                            {message.metadata.confidence && (
                              <div className="flex items-center space-x-2">
                                <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  message.metadata.confidence >= 0.9 
                                    ? 'bg-green-100 text-green-700 border border-green-200'
                                    : message.metadata.confidence >= 0.8
                                    ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                    : 'bg-red-100 text-red-700 border border-red-200'
                                }`}>
                                  {Math.round(message.metadata.confidence * 100)}% Confidence
                                </div>
                              </div>
                            )}
                          </div>
                          {message.metadata.sources && (
                            <div className="text-xs text-gray-500 flex items-center space-x-1">
                              <Database className="w-3 h-3" />
                              <span className="font-medium">Sources:</span> 
                              <span>{message.metadata.sources.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        {message.type === 'assistant' && (
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 rounded-lg relative overflow-hidden group"
                              style={{
                                color: currentTheme.colors.success
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = `${currentTheme.colors.success}10`;
                                e.currentTarget.style.color = currentTheme.colors.success;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '';
                                e.currentTarget.style.color = currentTheme.colors.success;
                              }}
                            >
                              <ThumbsUp className="w-4 h-4 relative z-10" />
                              <div 
                                className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                style={{
                                  background: `linear-gradient(90deg, ${currentTheme.colors.success}20, ${currentTheme.colors.success}30)`
                                }}
                              ></div>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 rounded-lg relative overflow-hidden group"
                              style={{
                                color: currentTheme.colors.error
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = `${currentTheme.colors.error}10`;
                                e.currentTarget.style.color = currentTheme.colors.error;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '';
                                e.currentTarget.style.color = currentTheme.colors.error;
                              }}
                            >
                              <ThumbsDown className="w-4 h-4 relative z-10" />
                              <div 
                                className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                style={{
                                  background: `linear-gradient(90deg, ${currentTheme.colors.error}20, ${currentTheme.colors.error}30)`
                                }}
                              ></div>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className={`h-8 w-8 p-0 rounded-lg relative overflow-hidden group ${
                                copiedMessageId === message.id 
                                  ? '' 
                                  : ''
                              }`}
                              style={{
                                color: copiedMessageId === message.id ? currentTheme.colors.success : currentTheme.colors.info,
                                backgroundColor: copiedMessageId === message.id ? `${currentTheme.colors.success}10` : ''
                              }}
                              onMouseEnter={(e) => {
                                if (copiedMessageId !== message.id) {
                                  e.currentTarget.style.backgroundColor = `${currentTheme.colors.info}10`;
                                  e.currentTarget.style.color = currentTheme.colors.info;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (copiedMessageId !== message.id) {
                                  e.currentTarget.style.backgroundColor = '';
                                  e.currentTarget.style.color = currentTheme.colors.info;
                                }
                              }}
                              onClick={() => handleCopyMessage(message.id, message.content)}
                            >
                              {copiedMessageId === message.id ? (
                                <CheckCircle className="w-4 h-4 relative z-10" />
                              ) : (
                                <Copy className="w-4 h-4 relative z-10" />
                              )}
                              <div 
                                className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                style={{
                                  background: `linear-gradient(90deg, ${currentTheme.colors.info}20, ${currentTheme.colors.info}30)`
                                }}
                              ></div>
                            </Button>
                          </div>
                        )}
                        
                        {/* Export buttons for AI responses */}
                        {message.type === 'assistant' && (
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const messagesForExport = [{
                                  sender: 'assistant',
                                  content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
                                  timestamp: message.timestamp,
                                  confidence: message.metadata?.confidence,
                                  projectContext: message.projectContext
                                }];
                                exportChatAsPDF(messagesForExport, `work-buddy-message-${message.id}.pdf`);
                              }}
                              className={`h-8 px-3 rounded-xl transition-all duration-300 relative overflow-hidden group ${
                                isDarkMode
                                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                              }`}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = currentTheme.colors.error;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = isDarkMode ? '#9CA3AF' : '#6B7280';
                              }}
                            >
                              <FileText className="w-4 h-4 mr-1 relative z-10" />
                              <span className="relative z-10">PDF</span>
                              <div 
                                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                style={{
                                  background: `linear-gradient(90deg, ${currentTheme.colors.error}20, ${currentTheme.colors.error}30)`
                                }}
                              ></div>
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const messagesForExport = [{
                                  sender: 'assistant',
                                  content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
                                  timestamp: message.timestamp,
                                  confidence: message.metadata?.confidence,
                                  projectContext: message.projectContext
                                }];
                                exportChatAsExcel(messagesForExport, `work-buddy-message-${message.id}.xlsx`);
                              }}
                              className={`h-8 px-3 rounded-xl transition-all duration-300 relative overflow-hidden group ${
                                isDarkMode
                                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                              }`}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = currentTheme.colors.success;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = isDarkMode ? '#9CA3AF' : '#6B7280';
                              }}
                            >
                              <FileSpreadsheet className="w-4 h-4 mr-1 relative z-10" />
                              <span className="relative z-10">Excel</span>
                              <div 
                                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                style={{
                                  background: `linear-gradient(90deg, ${currentTheme.colors.success}20, ${currentTheme.colors.success}30)`
                                }}
                              ></div>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing Indicator */}
            <AnimatePresence>
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex justify-start"
                >
                  <div className="flex items-start space-x-3 max-w-[85%]">
                    <div 
                      className="w-10 h-10 flex items-center justify-center flex-shrink-0 rounded-2xl transition-colors duration-300 relative overflow-hidden"
                      style={{
                        backgroundColor: `${currentTheme.colors.primary}20`,
                        borderColor: `${currentTheme.colors.primary}40`
                      }}
                    >
                      <Lightbulb 
                        className="w-5 h-5 relative z-10" 
                        style={{ color: currentTheme.colors.primary }}
                      />
                      {/* Icon Glow Effect */}
                      <div 
                        className="absolute inset-0 rounded-2xl opacity-30"
                        style={{
                          background: `linear-gradient(135deg, ${currentTheme.colors.primary}30, ${currentTheme.colors.secondary}30)`
                        }}
                      ></div>
                    </div>
                    <div 
                      className="rounded-2xl p-5 shadow-lg border transition-colors duration-300 relative overflow-hidden"
                      style={{
                        backgroundColor: `${currentTheme.colors.primary}05`,
                        borderColor: `${currentTheme.colors.primary}20`,
                        borderRadius: '20px 20px 20px 8px' // Different shape with rounded corners
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex space-x-1">
                          <motion.div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: currentTheme.colors.primary }}
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                          />
                          <motion.div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: currentTheme.colors.primary }}
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                          />
                          <motion.div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: currentTheme.colors.primary }}
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                          />
                        </div>
                        <span 
                          className="text-sm font-medium transition-colors duration-300"
                          style={{ color: currentTheme.colors.primary }}
                        >{loadingMessage}</span>
                      </div>
                      {/* Enhanced Glow Effect */}
                      <div 
                        className="absolute inset-0 rounded-2xl opacity-20"
                        style={{
                          background: `linear-gradient(135deg, ${currentTheme.colors.primary}20, ${currentTheme.colors.secondary}20)`,
                          borderRadius: '20px 20px 20px 8px'
                        }}
                      ></div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Enhanced Input Area */}
      <div className={`flex-shrink-0 p-8 border-t backdrop-blur-sm transition-colors duration-300 ${
        isDarkMode
          ? 'bg-gray-800/90 border-gray-700/50'
          : 'bg-white/95 border-gray-200/50'
      }`}>
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                if (e.target.value.trim().length > 0) {
                  setUserHasTyped(true)
                }
              }}
              onKeyPress={handleKeyPress}
              placeholder="Ask Work Buddy anything about your team, projects, or work insights..."
              className={`w-full py-5 px-6 rounded-3xl resize-none min-h-[70px] max-h-[180px] text-base font-medium transition-all duration-300 border-2 focus:outline-none shadow-xl ${
                isDarkMode
                  ? 'bg-gray-700/80 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-black placeholder-gray-500'
              }`}
              style={{
                '--tw-ring-color': `${currentTheme.colors.primary}20`,
                '--tw-border-color': currentTheme.colors.primary
              } as React.CSSProperties}
              onFocus={(e) => {
                e.target.style.borderColor = currentTheme.colors.primary;
                e.target.style.boxShadow = `0 0 0 4px ${currentTheme.colors.primary}20`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = isDarkMode ? '#4B5563' : '#D1D5DB';
                e.target.style.boxShadow = '';
              }}
              disabled={isTyping}
              rows={1}
            />
            {/* Input Glow Effect */}
            <div 
              className="absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300 pointer-events-none"
              style={{
                background: `linear-gradient(90deg, ${currentTheme.colors.primary}10, ${currentTheme.colors.secondary}10)`
              }}
            ></div>
          </div>
          
          {/* Clear Button - Only show when there are messages */}
          {messages.length > 1 && (
            <Button
              variant="outline"
              onClick={handleClearChat}
              className="h-[70px] w-[70px] rounded-3xl transition-all duration-300 shadow-xl hover:shadow-2xl relative overflow-hidden group"
              style={{
                borderColor: currentTheme.colors.error,
                color: currentTheme.colors.error,
                backgroundColor: `${currentTheme.colors.error}10`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${currentTheme.colors.error}20`;
                e.currentTarget.style.borderColor = currentTheme.colors.error;
                e.currentTarget.style.color = currentTheme.colors.error;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = `${currentTheme.colors.error}10`;
                e.currentTarget.style.borderColor = currentTheme.colors.error;
                e.currentTarget.style.color = currentTheme.colors.error;
              }}
            >
              <Trash className="w-5 h-5 relative z-10" />
              {/* Enhanced Glow Effect */}
              <div 
                className="absolute inset-0 rounded-3xl opacity-30 group-hover:opacity-60 transition-opacity duration-300"
                style={{
                  background: `linear-gradient(90deg, ${currentTheme.colors.error}30, ${currentTheme.colors.error}50)`
                }}
              ></div>
            </Button>
          )}
          
          {/* Voice-to-text Button */}
          {isSupported && (
            <Button
              onClick={handleVoiceToggle}
              className="h-[70px] w-[70px] rounded-3xl transition-all duration-300 shadow-xl hover:shadow-2xl relative overflow-hidden group"
              style={{
                backgroundColor: isListening ? currentTheme.colors.error : `${currentTheme.colors.info}20`,
                color: isListening ? 'white' : currentTheme.colors.info,
                borderColor: isListening ? currentTheme.colors.error : currentTheme.colors.info
              }}
              onMouseEnter={(e) => {
                if (isListening) {
                  e.currentTarget.style.backgroundColor = currentTheme.colors.error;
                } else {
                  e.currentTarget.style.backgroundColor = `${currentTheme.colors.info}30`;
                  e.currentTarget.style.color = currentTheme.colors.info;
                }
              }}
              onMouseLeave={(e) => {
                if (isListening) {
                  e.currentTarget.style.backgroundColor = currentTheme.colors.error;
                } else {
                  e.currentTarget.style.backgroundColor = `${currentTheme.colors.info}20`;
                  e.currentTarget.style.color = currentTheme.colors.info;
                }
              }}
            >
              {isListening ? <Square className="w-5 h-5 relative z-10" /> : <Mic className="w-5 h-5 relative z-10" />}
              {/* Enhanced Glow Effect */}
              <div 
                className="absolute inset-0 rounded-3xl opacity-40 group-hover:opacity-70 transition-opacity duration-300"
                style={{
                  background: isListening 
                    ? `linear-gradient(90deg, ${currentTheme.colors.error}40, ${currentTheme.colors.error}60)`
                    : `linear-gradient(90deg, ${currentTheme.colors.info}30, ${currentTheme.colors.info}50)`
                }}
              ></div>
            </Button>
          )}
          
          {/* Enhanced Send Button */}
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            className={`h-[70px] px-8 rounded-3xl font-semibold text-base transition-all duration-300 shadow-xl hover:shadow-2xl relative overflow-hidden group ${
              !inputValue.trim() || isTyping
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'text-white hover:scale-105 hover:shadow-2xl'
            }`}
            style={!inputValue.trim() || isTyping ? {} : {
              background: `linear-gradient(90deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`
            }}
          >
            {isTyping ? (
              <Loader2 className="w-5 h-5 animate-spin relative z-10" />
            ) : (
              <>
                <Send className="w-5 h-5 mr-2 relative z-10" />
                <span className="relative z-10">Send</span>
              </>
            )}
            {/* Button Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            {/* Enhanced Hover Glow */}
            <div 
              className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: `linear-gradient(90deg, ${currentTheme.colors.primary}30, ${currentTheme.colors.secondary}30)`
              }}
            ></div>
          </Button>
        </div>
      </div>

      {/* Welcome Popup - Right Corner */}
      {showWelcomePopup && (
        <WelcomePopup 
          onClose={() => setShowWelcomePopup(false)} 
          userHasTyped={userHasTyped}
        />
      )}

      {/* Manual Routing Popup */}
      <Dialog open={showManualRoutingPopup} onOpenChange={setShowManualRoutingPopup}>
        <DialogContent className={isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
          <DialogHeader>
            <DialogTitle className={isDarkMode ? 'text-white' : 'text-gray-900'}>
              Manual Routing Enabled
            </DialogTitle>
            <DialogDescription className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
              You have enabled Manual Routing.
              <br />
              <br />
              WorkBuddy will now use only the selected integrations for your queries.
              <br />
              <br />
              Intelligent classification is disabled when manual routing is active.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setShowManualRoutingPopup(false)}
              className={isDarkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
