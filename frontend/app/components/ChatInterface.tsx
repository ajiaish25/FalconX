'use client'

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { ScrollArea } from './ui/scroll-area'
import {
  Send, Loader2, Download, FileText, Presentation, Crown, Shield,
  Clock, BookOpen, ExternalLink, Bot, Sparkles, Trash2, ChevronDown
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import { useChat, Message } from '../contexts/ChatContext'
import { Badge } from './ui/badge'

interface ChatResponse {
  response: string
  error?: string
  jql?: string
  data?: any[]
  intent?: string
  success?: boolean
  decision: string
  metadata?: { type: string; decision: string }
  mode?: string
  export_data?: { filename: string; data: string }
  data_source?: string
  last_updated?: string
}

// ---------------------------------------------------------------------------
// Animated typing indicator
// ---------------------------------------------------------------------------
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-end gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="bg-[#16161F] border border-white/[0.06] rounded-2xl rounded-bl-sm px-4 py-3 shadow-xl">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-indigo-400"
                style={{
                  animation: 'typingBounce 1.2s ease-in-out infinite',
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export const ChatInterface = forwardRef<{ sendQuickMessage: (message: string) => void }, {}>((props, ref) => {
  const {
    messages, addMessage, clearMessages, isLoading, setIsLoading,
    chatInterfaceRef, lastIssueDetails, setLastIssueDetails,
    lastProjectKey, setLastProjectKey
  } = useChat()

  const [input, setInput]         = useState('')
  const [exportFiles, setExportFiles] = useState<{ pdf?: string; powerpoint?: string }>({})
  const [showExport, setShowExport]   = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const ISSUE_KEY_RE = /\b([A-Z][A-Z0-9]+-\d+)\b/

  const augmentMessageWithLastIssue = (original: string): string => {
    const trimmed = original.trim().toLowerCase()
    const isPropertyFollowUp =
      /^(assignee|reporter|status|priority|type|summary|description|who|owner|open\s+link|url)\b/.test(trimmed) ||
      /(assignee|reporter)\s+(for|of)\s+(this\s+)?(ticket|issue|story)\b/.test(trimmed) ||
      /reporter name|assignee name/.test(trimmed)
    if (!isPropertyFollowUp) return original
    if (ISSUE_KEY_RE.test(original)) return original
    if (lastIssueDetails?.key) return `${original} for ${lastIssueDetails.key}`
    return original
  }

  const augmentMessageWithLastProject = (original: string): string => {
    const trimmed = original.trim().toLowerCase()
    const isAnalyticsQuery = /(open|closed|in\s+progress|bugs|stories|tasks|issues|show|list|count)/.test(trimmed)
    if (!isAnalyticsQuery) return original
    const projectKeyMatch = original.match(/\b([A-Z]{2,5})\b/)
    if (projectKeyMatch) return original
    if (lastProjectKey) return `${original} in project ${lastProjectKey}`
    return original
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessageDirectly = async (message: string) => {
    if (isLoading) return
    setIsLoading(true)
    addMessage({ role: 'user', content: message })
    try {
      let finalMessage = augmentMessageWithLastIssue(message)
      finalMessage     = augmentMessageWithLastProject(finalMessage)
      const response   = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: finalMessage }),
      })
      const data: ChatResponse = await response.json()
      if (response.ok) {
        const isAutoLeadershipMode = (data as any).auto_leadership_mode || false
        const isRAGResponse        = (data as any).source === 'rag' || (data as any).rag_citations
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response || data.error || 'No response received',
          isLeadershipMode: isAutoLeadershipMode,
          dataSource: (data as any).data_source,
          lastUpdated: (data as any).last_updated,
          ragCitations: (data as any).rag_citations || [],
          ragContextUsed: (data as any).rag_context_used || 0,
        }
        if (isAutoLeadershipMode && (data as any).message) {
          assistantMessage.content = `${(data as any).message}\n\n${data.response || data.error || 'No response received'}`
        }
        addMessage(assistantMessage)
        const responseText = typeof data.response === 'string' ? data.response : JSON.stringify(data.response)
        const match = !isAutoLeadershipMode && !isRAGResponse && responseText?.match(ISSUE_KEY_RE)
        if (match?.[1]) {
          const key = match[1]
          try {
            const dresp  = await fetch(`http://localhost:8000/api/jira/issue/${key}`)
            const djson  = await dresp.json()
            if (dresp.ok && djson.issue) {
              setLastIssueDetails({ key, data: djson.issue, fetchedAt: new Date().toISOString() })
              if (djson.issue?.project) setLastProjectKey(djson.issue.project)
            }
          } catch {}
        }
      } else {
        addMessage({ role: 'assistant', content: `Error: ${data.error || data.response || 'Failed to get response'}` })
      }
      if (data.mode === 'export' && data.export_data) {
        const { filename, data: excelData } = data.export_data
        const blob = new Blob([Uint8Array.from(atob(excelData), c => c.charCodeAt(0))], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        const url  = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href  = url; link.download = filename
        document.body.appendChild(link); link.click()
        document.body.removeChild(link); URL.revokeObjectURL(url)
      }
    } catch (error) {
      addMessage({ role: 'assistant', content: `Network error: ${error}` })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { scrollToBottom() }, [messages])

  useImperativeHandle(ref, () => ({ sendQuickMessage: (message: string) => { sendMessageDirectly(message) } }))

  useEffect(() => {
    const refObj = { sendQuickMessage: sendMessageDirectly } as { sendQuickMessage: (message: string) => void }
    // @ts-expect-error allow setting from provider
    chatInterfaceRef.current = refObj
  }, [sendMessageDirectly])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return
    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)
    addMessage({ role: 'user', content: userMessage })
    try {
      const low              = userMessage.toLowerCase()
      const isPropertyFollowUp = /^(assignee|reporter|status|priority|type|summary|description|url|link|open)$/i.test(userMessage.trim()) || /reporter name|assignee name/i.test(userMessage)
      const asksIssueDetails   = /(details|info|summary).*\b(ccm|hcat|[A-Z]{2,5})-\d+/i.test(userMessage)
      const asksProjectDetails = /project (details|summary|info)/i.test(userMessage)

      if ((isPropertyFollowUp || asksIssueDetails) && lastIssueDetails) {
        const issue = lastIssueDetails.data
        let reply   = `${lastIssueDetails.key}: ${issue?.summary || ''}\nStatus: ${issue?.status || 'Unknown'}  Type: ${issue?.type || 'Unknown'}  Priority: ${issue?.priority || 'Unknown'}\nAssignee: ${issue?.assignee?.name || 'Unassigned'}  Reporter: ${issue?.reporter?.name || 'Unknown'}  Project: ${issue?.project || 'Unknown'}`
        if (/^assignee/i.test(userMessage))  reply = `Assignee: ${issue?.assignee?.name || 'Unassigned'}`
        if (/^reporter/i.test(userMessage) || /reporter name/i.test(userMessage)) {
          const rn = issue?.reporter?.name || 'Unknown'
          const re = issue?.reporter?.email || ''
          reply = `${rn} is the reporter for ${lastIssueDetails.key}. ${re ? `You can reach them at ${re} for context.` : `They initiated ${issue?.summary || 'this issue'}.`}`
        }
        if (/^status/i.test(userMessage))   reply = `Status: ${issue?.status || 'Unknown'}`
        if (/^priority/i.test(userMessage)) reply = `Priority: ${issue?.priority || 'Unknown'}`
        if (/^type/i.test(userMessage))     reply = `Type: ${issue?.type || 'Unknown'}`
        if (/^(url|link|open)/i.test(userMessage)) reply = issue?.url ? `Open: ${issue.url}` : 'No URL available'
        addMessage({ role: 'assistant', content: reply })
        setIsLoading(false)
        return
      }
      if (asksProjectDetails && lastProjectKey) {
        addMessage({ role: 'assistant', content: `Project: ${lastProjectKey}. Ask me to list open issues, stories, bugs, or sprint analytics for this project.` })
        setIsLoading(false)
        return
      }
    } catch {}

    try {
      let finalMessage = augmentMessageWithLastIssue(userMessage)
      finalMessage     = augmentMessageWithLastProject(finalMessage)
      const response   = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: finalMessage }),
      })
      const data: ChatResponse = await response.json()
      if (response.ok) {
        const isAutoLeadershipMode = (data as any).auto_leadership_mode || false
        const isRAGResponse        = (data as any).source === 'rag' || (data as any).rag_citations
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response || data.error || 'No response received',
          isLeadershipMode: isAutoLeadershipMode,
          dataSource: (data as any).data_source,
          lastUpdated: (data as any).last_updated,
          ragCitations: (data as any).rag_citations || [],
          ragContextUsed: (data as any).rag_context_used || 0,
        }
        if (isAutoLeadershipMode && (data as any).message) {
          assistantMessage.content = `${(data as any).message}\n\n${data.response || data.error || 'No response received'}`
        }
        addMessage(assistantMessage)
        const responseText = typeof data.response === 'string' ? data.response : JSON.stringify(data.response)
        const match = !isAutoLeadershipMode && !isRAGResponse && responseText?.match(ISSUE_KEY_RE)
        if (match?.[1]) {
          const key = match[1]
          try {
            const dresp = await fetch(`http://localhost:8000/api/jira/issue/${key}`)
            const djson = await dresp.json()
            if (dresp.ok && djson.issue) {
              setLastIssueDetails({ key, data: djson.issue, fetchedAt: new Date().toISOString() })
              if (djson.issue?.project) setLastProjectKey(djson.issue.project)
            }
          } catch {}
        }
      } else {
        addMessage({ role: 'assistant', content: `Error: ${data.error || data.response || 'Failed to get response'}` })
      }
    } catch (error) {
      addMessage({ role: 'assistant', content: `Network error: ${error}` })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const exportToPDF = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/export/pdf', { method: 'POST' })
      if (response.ok) window.open('http://localhost:8000/api/export/download/pdf', '_blank')
    } catch {}
  }

  const exportToPowerPoint = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/export/powerpoint', { method: 'POST' })
      if (response.ok) window.open('http://localhost:8000/api/export/download/powerpoint', '_blank')
    } catch {}
  }

  const exportToExcel = async () => {
    try {
      const resp = await fetch('http://localhost:8000/api/jira/export/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await resp.json()
      if (resp.ok && data?.data && data?.filename) {
        const blob = new Blob([Uint8Array.from(atob(data.data), c => c.charCodeAt(0))], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        const url  = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url; link.download = data.filename
        document.body.appendChild(link); link.click()
        document.body.removeChild(link); URL.revokeObjectURL(url)
      }
    } catch {}
  }

  const clearChat = async () => {
    try {
      await fetch('http://localhost:8000/api/chat/clear', { method: 'POST' })
      clearMessages()
    } catch {}
  }

  // Shared markdown component map
  const markdownComponents = (isUser: boolean) => ({
    p: ({ children }: any) => (
      <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
    ),
    strong: ({ children }: any) => (
      <strong className={`font-bold ${isUser ? 'text-white' : 'text-white'}`}>{children}</strong>
    ),
    em: ({ children }: any) => <em className="italic opacity-80">{children}</em>,
    h1: ({ children }: any) => (
      <h1 className="text-base font-bold mt-4 mb-2 pb-1.5 border-b border-white/10 text-white">{children}</h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-sm font-bold mt-3 mb-1.5 uppercase tracking-wider text-indigo-300">{children}</h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-sm font-semibold mt-2 mb-1 text-slate-200">{children}</h3>
    ),
    code: ({ children }: any) => (
      <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono text-emerald-300">{children}</code>
    ),
    pre: ({ children }: any) => (
      <pre className="bg-black/30 border border-white/10 p-3 rounded-xl overflow-x-auto text-xs my-2 font-mono text-emerald-300">{children}</pre>
    ),
    ul: ({ children }: any) => (
      <ul className="space-y-1 mb-2 ml-1">{children}</ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal list-outside ml-4 mb-2 space-y-1">{children}</ol>
    ),
    li: ({ children }: any) => (
      <li className="flex items-start gap-2 leading-relaxed">
        {!isUser && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />}
        <span>{children}</span>
      </li>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-2 border-amber-400 bg-amber-400/10 pl-3 pr-2 py-1.5 rounded-r my-2 text-xs text-amber-200">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="border-white/10 my-3" />,
    a: ({ href, children }: any) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-300 hover:text-indigo-200 underline underline-offset-2 decoration-indigo-400/50 inline-flex items-center gap-0.5 font-medium transition-colors"
      >
        {children}
        <ExternalLink className="w-3 h-3 flex-shrink-0" />
      </a>
    ),
    table: ({ children }: any) => (
      <div className="overflow-x-auto my-3 rounded-xl border border-white/10">
        <table className="text-xs border-collapse w-full">{children}</table>
      </div>
    ),
    thead: ({ children }: any) => (
      <thead className="bg-indigo-500/20 text-indigo-200">{children}</thead>
    ),
    th: ({ children }: any) => (
      <th className="border-b border-white/10 px-3 py-2 font-semibold text-left">{children}</th>
    ),
    td: ({ children }: any) => (
      <td className="border-b border-white/[0.06] px-3 py-2 text-slate-300">{children}</td>
    ),
  })

  return (
    <>
      {/* Keyframe for typing dots */}
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30%            { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes msgFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .msg-enter { animation: msgFadeUp 0.25s ease forwards; }
      `}</style>

      <div className="h-full min-h-0 flex flex-col overflow-hidden bg-[#0A0A0F] rounded-2xl border border-white/[0.06] shadow-2xl">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-[#111118]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Work Buddy</p>
              <p className="text-[11px] text-slate-500">AI Assistant · Leadership Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={() => setShowExport(v => !v)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all duration-150"
              >
                <Download className="w-3.5 h-3.5" />
                Export
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showExport ? 'rotate-180' : ''}`} />
              </button>
            )}
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 px-2.5 py-1.5 rounded-lg hover:bg-red-400/5 transition-all duration-150"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Export dropdown ─────────────────────────────────────────── */}
        {showExport && messages.length > 0 && (
          <div className="px-5 py-3 border-b border-white/[0.06] bg-[#111118] flex items-center gap-2">
            {[
              { label: 'PDF', icon: FileText, action: exportToPDF },
              { label: 'Excel', icon: Download, action: exportToExcel },
              { label: 'PowerPoint', icon: Presentation, action: exportToPowerPoint },
            ].map(({ label, icon: Icon, action }) => (
              <button
                key={label}
                onClick={action}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-all duration-150"
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* ── Messages ────────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-5 premium-scrollbar">
          {messages.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full text-center py-16 select-none">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/20 flex items-center justify-center mb-5 shadow-xl shadow-indigo-500/10">
                <Sparkles className="w-7 h-7 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Ask me anything</h3>
              <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                Query Jira issues, Confluence pages, GitHub PRs, or get AI-powered project insights.
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex msg-enter ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                style={{ animationDelay: `${Math.min(index * 30, 120)}ms` }}
              >
                {/* AI avatar */}
                {message.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 mr-2.5 mt-0.5 shadow-lg shadow-indigo-500/20">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                )}

                <div className={`max-w-[78%] ${message.role === 'user' ? 'max-w-[68%]' : ''}`}>
                  {/* Badges row */}
                  {message.role === 'assistant' && (message.isLeadershipMode || (message.ragCitations && message.ragCitations.length > 0)) && (
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      {message.isLeadershipMode && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20">
                          <Crown className="w-2.5 h-2.5" />
                          Leadership
                        </span>
                      )}
                      {message.dataSource === 'live_jira_data' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                          <Shield className="w-2.5 h-2.5" />
                          Live Data
                        </span>
                      )}
                      {message.dataSource && message.dataSource !== 'live_jira_data' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20">
                          <Clock className="w-2.5 h-2.5" />
                          Cached
                        </span>
                      )}
                      {message.ragCitations && message.ragCitations.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                          <BookOpen className="w-2.5 h-2.5" />
                          {message.ragContextUsed} source{message.ragContextUsed !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xl ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-br-sm shadow-indigo-500/20'
                        : 'bg-[#16161F] border border-white/[0.06] text-slate-200 rounded-bl-sm'
                    }`}
                  >
                    <div className="max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        components={markdownComponents(message.role === 'user') as any}
                      >
                        {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
                      </ReactMarkdown>
                    </div>

                    {/* RAG citations */}
                    {message.role === 'assistant' && message.ragCitations && message.ragCitations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/[0.06]">
                        <p className="text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Sources</p>
                        <div className="space-y-1">
                          {message.ragCitations.map((cite: any, idx: number) => (
                            <a
                              key={idx}
                              href={cite.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 p-1.5 rounded-lg hover:bg-indigo-500/10 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              <span className="flex-1 truncate">{cite.title}</span>
                              <span className="text-slate-500 font-mono">{(cite.confidence * 100).toFixed(0)}%</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* User avatar */}
                {message.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center flex-shrink-0 ml-2.5 mt-0.5 border border-white/10">
                    <span className="text-[10px] font-bold text-white">U</span>
                  </div>
                )}
              </div>
            ))
          )}

          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Input area ──────────────────────────────────────────────── */}
        <div className="px-4 pb-4 pt-3 border-t border-white/[0.06] bg-[#0A0A0F]">
          <div className="flex items-end gap-2 bg-[#16161F] border border-white/[0.08] rounded-2xl px-4 py-3 focus-within:border-indigo-500/40 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.08)] transition-all duration-200">
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                // Auto-resize up to 5 lines
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
              }}
              placeholder="Ask anything about Jira, Confluence, GitHub…"
              disabled={isLoading}
              rows={1}
              className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 resize-none outline-none leading-relaxed min-h-[24px] max-h-[120px] premium-scrollbar"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 transition-all duration-150 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-95"
            >
              {isLoading
                ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                : <Send className="w-3.5 h-3.5 text-white" />
              }
            </button>
          </div>
          <p className="text-[10px] text-slate-600 text-center mt-2">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  )
})

ChatInterface.displayName = 'ChatInterface'
