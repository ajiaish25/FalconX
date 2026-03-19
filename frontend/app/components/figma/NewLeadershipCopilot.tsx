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
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
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
  Info,
  Paperclip,
} from 'lucide-react'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string | object  // Allow both string and object content
  timestamp: Date
  projectContext?: string
  metadata?: {
    type: 'analysis' | 'recommendation' | 'insight' | 'summary' | 'error'
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
  integrations?: string[]
  setIntegrations?: (v: string[] | ((p: string[]) => string[])) => void
  uploadedDocReady?: boolean
  setUploadedDocReady?: (v: boolean) => void
}

export function NewLeadershipCopilot({
  hasActiveConnections,
  theme,
  quickActionPrompt,
  onPromptSent,
  integrations: integrationsProp = [],
  setIntegrations: setIntegrationsProp,
  uploadedDocReady: uploadedDocReadyProp = false,
  setUploadedDocReady: setUploadedDocReadyProp,
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
  const [integrationsLocal, setIntegrationsLocal] = useState<string[]>([])
  const integrations = integrationsProp ?? integrationsLocal
  const setIntegrations = setIntegrationsProp ?? setIntegrationsLocal
  const uploadedDocReady = uploadedDocReadyProp ?? false
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
      const timer = setTimeout(() => {
        console.log('Showing welcome popup')
        setShowWelcomePopup(true)
      }, 1000)
      return () => clearTimeout(timer)
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

  // Update input when voice transcript changes
  useEffect(() => {
    if (transcript) {
      setInputValue(transcript)
      setUserHasTyped(true)
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
      const timer = setTimeout(() => {
        if (inputValue.trim() === transcript.trim()) {
          handleSendMessage()
        }
      }, 2000)

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

    if (input.includes('all') || input.includes('every') || input.includes('combined')) {
      return 'ALL'
    }

    if (input.includes('this') || input.includes('that') || input.includes('it')) {
      return lastMentionedProject
    }

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

    const detectedProject = detectProjectContext(inputValue, messages)

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
      projectContext: detectedProject || undefined
    }

    if (detectedProject && detectedProject !== 'ALL') {
      setLastMentionedProject(detectedProject)
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')

    resetVoiceState()

    setTimeout(async () => {
    setIsTyping(true)
      setShowAvatarAnimation(true)

      const loadingMessages = [
        "I am thinking...",
        "Answering in few seconds",
        "Thanks for the Patience"
      ]

      let messageIndex = 0
      const messageInterval = setInterval(() => {
        setLoadingMessage(loadingMessages[messageIndex])
        messageIndex = (messageIndex + 1) % loadingMessages.length
      }, 1500)

      setLoadingMessage(loadingMessages[0])

      try {
        if (detectedProject && detectedProject !== 'ALL') {
          await cacheProjectDetails(detectedProject)
        }

        const projectContextForSearch = getProjectContextForSearch(detectedProject)

      let response: Response
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

      // AUTO MODE: No integrations selected - intelligent routing
      if (integrations.length === 0) {
        if (uploadedDocReady) {
          response = await fetch(`${apiBase}/api/domain/qa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: inputValue, k: 5 })
          })
        } else {
          response = await fetch(`${apiBase}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: inputValue,
              source: 'auto',
              context: 'leadership_copilot',
              projectContext: projectContextForSearch,
              cachedProjects: cachedProjects,
              integrations: [],
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

        const results = await Promise.all(fetchPromises)

        const successfulResults = results.filter(r => r.success && r.data)

        if (successfulResults.length === 0) {
          throw new Error('All integration API calls failed. Please check your connections and try again.')
        }

        if (successfulResults.length === 1) {
          const result = successfulResults[0].data
          response = new Response(JSON.stringify(result), { status: 200 })
        } else {
          const combinedResponse = {
            response: '',
            sources: [] as string[],
            combined: true
          }

          const responseParts: string[] = []

          successfulResults.forEach(({ integration, data }) => {
            const integrationName = integration.charAt(0).toUpperCase() + integration.slice(1)
            const responseText = data.response || data.answer || data.message || 'No response'

            responseParts.push(`\n\n--- ${integrationName} Results ---\n${responseText}`)
            combinedResponse.sources.push(integration)
          })

          const header = `I've searched across ${successfulResults.length} integration${successfulResults.length > 1 ? 's' : ''}: ${successfulResults.map(r => r.integration.charAt(0).toUpperCase() + r.integration.slice(1)).join(', ')}.\n\nHere are the combined results:`

          combinedResponse.response = header + responseParts.join('\n')

          response = new Response(JSON.stringify(combinedResponse), { status: 200 })
        }
      }

      if (response.ok) {
        const data = await response.json()
        console.log('Backend response data:', data)

        if (data.error || (data.response && data.error === true)) {
          console.error('Backend returned error:', data.error || data.response)
          throw new Error(data.error || data.response || 'Unknown error from backend')
        }

        let contentText: string
        let sources: string[] = []

        if (data.combined && data.sources) {
          contentText = data.response || 'Combined results from multiple integrations'
          sources = data.sources.map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
        } else {
          contentText =
            typeof data.answer === 'string' ? data.answer :
            typeof data.response === 'string' ? data.response :
            typeof data.message === 'string' ? data.message :
            (data && typeof data === 'object' ? JSON.stringify(data) : 'I received your message but couldn\'t generate a response.')

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
          type: 'error',
          confidence: 0.5,
          sources: ['Error Handler']
        }
      }

      setMessages(prev => [...prev, assistantMessage])
    } finally {
        clearInterval(messageInterval)
      setIsTyping(false)
        setLoadingMessage('')

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
      content: `Hello ${userName}! I'm your AI Work Buddy. I can help you analyze team performance, provide strategic insights, and answer questions about your projects. What would you like to know?`,
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
      if (pageContainerRef.current) {
        await exportPageAsPDF(
          pageContainerRef.current,
          `work-buddy-page-${new Date().toISOString().split('T')[0]}.pdf`,
          {
            scale: 2,
            backgroundColor: isDarkMode ? '#13151C' : '#FFFFFF',
            includeScrollableContent: true
          }
        )
      } else {
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

      setTimeout(() => {
        setCopiedMessageId(null)
      }, 2000)
    } catch (err) {
      console.error('Failed to copy message:', err)
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
      setTimeout(() => {
        handleSendMessage()
        onPromptSent()
      }, 100)
    }
  }, [quickActionPrompt, onPromptSent])

  const prevIntegrationsRef = React.useRef<string[]>([])

  useEffect(() => {
    const prevCount = prevIntegrationsRef.current.length
    const currentCount = integrations.length

    if (prevCount === 0 && currentCount > 0 && !hasShownManualRoutingPopup) {
      setShowManualRoutingPopup(true)
      setHasShownManualRoutingPopup(true)
    }

    prevIntegrationsRef.current = integrations
  }, [integrations, hasShownManualRoutingPopup])

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
      className="h-full flex flex-col"
      style={{ backgroundColor: 'var(--bg-page)', fontFamily: 'var(--font)' }}
    >
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
                {/* Avatar */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.8, type: "spring", stiffness: 200 }}
                  className="relative mb-8"
                >
                  <div
                    className="w-32 h-32 rounded-full flex items-center justify-center relative overflow-hidden"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '2px solid var(--border-strong)'
                    }}
                  >
                    <div className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'var(--bg-hover)' }}
                    >
                      <Bot className="w-8 h-8" style={{ color: 'var(--green)' }} />
                    </div>
                    <div
                      className="absolute -top-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'var(--green-bg)', border: '2px solid var(--green)' }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--green)' }}></div>
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
                  <p style={{ color: 'var(--accent-cool)', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
                    AI Work Assistant
                  </p>
                  <h1 className="font-bold mb-3" style={{ color: 'var(--text-primary)', fontSize: 26, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
                    Welcome to{' '}
                    <span style={{ color: 'var(--accent-cool)' }}>Work Buddy</span>
                  </h1>

                  <p className="mb-6" style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    Your intelligent AI assistant for work insights
                  </p>

                  <div
                    className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg"
                    style={{
                      backgroundColor: 'var(--accent-cool-bg)',
                      border: '1px solid rgba(212,168,71,0.25)'
                    }}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: 'var(--accent-cool)' }}
                    ></div>
                    <span className="text-sm font-medium" style={{ color: 'var(--accent-cool)' }}>
                      Online &amp; Ready to Help
                    </span>
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
                    { icon: BarChart3, text: "Analyze Team Performance" },
                    { icon: Users, text: "Get Project Insights" },
                    { icon: Target, text: "Track Goals & KPIs" }
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8 + index * 0.1 }}
                      className="p-4 rounded-lg transition-colors duration-200 cursor-pointer"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
                        e.currentTarget.style.borderColor = 'var(--border-strong)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-card)'
                        e.currentTarget.style.borderColor = 'var(--border)'
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-3"
                        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                      >
                        <item.icon className="w-5 h-5" style={{ color: 'var(--green)' }} />
                      </div>
                      <p
                        className="text-sm font-medium text-center"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {item.text}
                      </p>
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
                    duration: 0.35,
                    delay: index * 0.05,
                    type: "spring",
                    stiffness: 120
                  }}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-6`}
                >
                  <div className={`flex items-start space-x-3 max-w-[85%] ${
                    message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}>
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {message.type === 'user' ? (
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center"
                          style={{
                            backgroundColor: 'var(--bg-active)',
                            border: '1px solid var(--border-strong)'
                          }}
                        >
                          <User className="w-4 h-4" style={{ color: 'var(--text-primary)' }} />
                        </div>
                      ) : (
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center relative"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            border: '1px solid var(--border)'
                          }}
                        >
                          <Bot className="w-4 h-4" style={{ color: 'var(--green)' }} />
                          <div
                            className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: 'var(--green)', border: '2px solid var(--bg-page)' }}
                          ></div>
                        </div>
                      )}
                    </div>

                    {/* Bubble */}
                    <div
                      className="p-4 text-sm leading-relaxed"
                      style={message.type === 'user' ? {
                        background: 'var(--bg-active)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: '12px 4px 12px 12px',
                        color: 'var(--text-primary)'
                      } : {
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px 12px 12px 12px',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <div className="prose prose-invert max-w-none">
                        {message.type === 'assistant' && typeof message.content === 'string' ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed" style={{ color: 'var(--text-primary)' }}>{children}</p>,
                              strong: ({ children }) => <strong className="font-semibold" style={{ color: 'var(--text-primary)' }}>{children}</strong>,
                              a: ({ href, children }) => (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline hover:opacity-80 transition-opacity"
                                  style={{ color: 'var(--accent-cool)' }}
                                >
                                  {children}
                                </a>
                              ),
                              h1: ({ children }) => <h1 className="text-base font-semibold mt-4 mb-2 first:mt-0" style={{ color: 'var(--text-primary)' }}>{children}</h1>,
                              h2: ({ children }) => <h2 className="text-sm font-semibold mt-3 mb-1.5" style={{ color: 'var(--text-primary)' }}>{children}</h2>,
                              h3: ({ children }) => <h3 className="text-sm font-medium mt-2 mb-1" style={{ color: 'var(--text-primary)' }}>{children}</h3>,
                              ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5" style={{ color: 'var(--text-primary)' }}>{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5" style={{ color: 'var(--text-primary)' }}>{children}</ol>,
                              li: ({ children }) => <li className="leading-relaxed" style={{ color: 'var(--text-primary)' }}>{children}</li>,
                              code: ({ children }) => <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}>{children}</code>,
                              pre: ({ children }) => <pre className="overflow-x-auto p-3 rounded-lg mb-2" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)', fontSize: '13px' }}>{children}</pre>,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        ) : (
                          <span className="whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>
                            {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
                          </span>
                        )}
                      </div>

                      {message.metadata && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between">
                            {message.metadata.confidence && (
                              <div className="flex items-center space-x-2">
                                <div
                                  className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                  style={{
                                    backgroundColor: message.metadata.confidence >= 0.9
                                      ? 'var(--green-bg)'
                                      : message.metadata.confidence >= 0.8
                                      ? 'rgba(252, 211, 77, 0.1)'
                                      : 'rgba(248, 113, 113, 0.1)',
                                    color: message.metadata.confidence >= 0.9
                                      ? 'var(--green)'
                                      : message.metadata.confidence >= 0.8
                                      ? 'var(--amber)'
                                      : 'var(--red)',
                                    border: `1px solid ${message.metadata.confidence >= 0.9 ? 'rgba(212,168,71,0.25)' : message.metadata.confidence >= 0.8 ? 'rgba(252,211,77,0.25)' : 'rgba(248,113,113,0.25)'}`
                                  }}
                                >
                                  {Math.round(message.metadata.confidence * 100)}% Confidence
                                </div>
                              </div>
                            )}
                          </div>
                          {message.metadata.sources && (
                            <div
                              className="text-xs flex items-center space-x-1"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              <Database className="w-3 h-3" />
                              <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Sources:</span>
                              <span>{message.metadata.sources.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-3">
                        {message.type === 'assistant' && (
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 rounded-md"
                              style={{ color: 'var(--text-muted)' }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
                                e.currentTarget.style.color = 'var(--green)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = ''
                                e.currentTarget.style.color = 'var(--text-muted)'
                              }}
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 rounded-md"
                              style={{ color: 'var(--text-muted)' }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
                                e.currentTarget.style.color = 'var(--red)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = ''
                                e.currentTarget.style.color = 'var(--text-muted)'
                              }}
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 rounded-md"
                              style={{
                                color: copiedMessageId === message.id ? 'var(--green)' : 'var(--text-muted)',
                                backgroundColor: copiedMessageId === message.id ? 'var(--green-bg)' : ''
                              }}
                              onMouseEnter={(e) => {
                                if (copiedMessageId !== message.id) {
                                  e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
                                  e.currentTarget.style.color = 'var(--blue)'
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (copiedMessageId !== message.id) {
                                  e.currentTarget.style.backgroundColor = ''
                                  e.currentTarget.style.color = 'var(--text-muted)'
                                }
                              }}
                              onClick={() => handleCopyMessage(message.id, message.content)}
                            >
                              {copiedMessageId === message.id ? (
                                <CheckCircle className="w-3.5 h-3.5" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </div>
                        )}

                        {/* Export buttons for AI responses */}
                        {message.type === 'assistant' && (
                          <div className="flex items-center space-x-1">
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
                                }]
                                exportChatAsPDF(messagesForExport, `work-buddy-message-${message.id}.pdf`)
                              }}
                              className="h-7 px-2 rounded-md text-xs"
                              style={{ color: 'var(--text-muted)' }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
                                e.currentTarget.style.color = 'var(--red)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = ''
                                e.currentTarget.style.color = 'var(--text-muted)'
                              }}
                            >
                              <FileText className="w-3.5 h-3.5 mr-1" />
                              PDF
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
                                }]
                                exportChatAsExcel(messagesForExport, `work-buddy-message-${message.id}.xlsx`)
                              }}
                              className="h-7 px-2 rounded-md text-xs"
                              style={{ color: 'var(--text-muted)' }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
                                e.currentTarget.style.color = 'var(--green)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = ''
                                e.currentTarget.style.color = 'var(--text-muted)'
                              }}
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
                              Excel
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
                      className="w-9 h-9 flex items-center justify-center flex-shrink-0 rounded-lg"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border)'
                      }}
                    >
                      <Lightbulb className="w-4 h-4" style={{ color: 'var(--green)' }} />
                    </div>
                    <div
                      className="p-4"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px 12px 12px 12px'
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex space-x-1">
                          <motion.div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: 'var(--green)' }}
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                          />
                          <motion.div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: 'var(--green)' }}
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                          />
                          <motion.div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: 'var(--green)' }}
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                          />
                        </div>
                        <span
                          className="text-sm"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {loadingMessage}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div
        className="flex-shrink-0 p-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderTop: '1px solid var(--border)'
        }}
      >
        <div className="flex items-end space-x-2">
          <div className="flex-1 relative flex items-center">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                if (e.target.value.trim().length > 0) setUserHasTyped(true)
              }}
              onKeyPress={handleKeyPress}
              placeholder="Ask Work Buddy anything about your team, projects, or work insights..."
              className="w-full py-3 pl-4 pr-12 rounded-xl resize-none min-h-[48px] max-h-[160px] text-sm focus:outline-none transition-colors"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--accent-cool)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border)'
              }}
              disabled={isTyping}
              rows={1}
            />
            <div
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-muted)' }}
            >
              <Paperclip className="w-4 h-4" />
            </div>
          </div>

          {/* Clear chat */}
          {messages.length > 1 && (
            <button
              onClick={handleClearChat}
              className="h-12 w-12 rounded-lg flex items-center justify-center transition-colors duration-150"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
                e.currentTarget.style.borderColor = 'var(--border-strong)'
                e.currentTarget.style.color = 'var(--red)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-card)'
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--text-muted)'
              }}
            >
              <Trash className="w-4 h-4" />
            </button>
          )}

          {/* Voice button */}
          {isSupported && (
            <button
              onClick={handleVoiceToggle}
              className="h-12 w-12 rounded-lg flex items-center justify-center transition-colors duration-150"
              style={{
                backgroundColor: isListening ? 'var(--red)' : 'var(--bg-card)',
                border: `1px solid ${isListening ? 'var(--red)' : 'var(--border)'}`,
                color: isListening ? '#fff' : 'var(--text-secondary)'
              }}
            >
              {isListening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}

          {/* Send button */}
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            className="h-12 px-5 rounded-lg font-bold text-sm flex items-center gap-2 transition-opacity duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--accent-cool)',
              color: 'var(--bg-page)',
              fontFamily: 'var(--font)'
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) e.currentTarget.style.opacity = '0.85'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
          >
            {isTyping ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Welcome Popup */}
      {showWelcomePopup && (
        <WelcomePopup
          onClose={() => setShowWelcomePopup(false)}
          userHasTyped={userHasTyped}
        />
      )}

      {/* Manual Routing Popup */}
      <Dialog open={showManualRoutingPopup} onOpenChange={setShowManualRoutingPopup}>
        <DialogContent
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            fontFamily: 'var(--font)'
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--text-primary)' }}>
              Manual Routing Enabled
            </DialogTitle>
            <DialogDescription style={{ color: 'var(--text-secondary)' }}>
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
              style={{
                backgroundColor: 'var(--text-primary)',
                color: 'var(--bg-page)',
                border: 'none'
              }}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
