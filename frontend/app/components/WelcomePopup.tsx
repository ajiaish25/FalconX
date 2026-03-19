'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { useSettings } from '../contexts/SettingsContext'
import { Bot } from 'lucide-react'

interface WelcomePopupProps {
  onClose: () => void
  userHasTyped?: boolean
}

export function WelcomePopup({ onClose, userHasTyped = false }: WelcomePopupProps) {
  const { currentTheme, isDarkMode } = useTheme()
  const { settings, isLoaded } = useSettings()
  const [isVisible, setIsVisible] = useState(false)
  const [robotPosition, setRobotPosition] = useState(200) // Start off-screen right

  // Get user name - use actual user name from settings
  const getUserName = () => {
    if (isLoaded && settings.userProfile.name) {
      return settings.userProfile.name
    }
    return 'User'
  }

  useEffect(() => {
    // If user has typed, don't show
    if (userHasTyped) {
      return
    }

    // Show popup after a brief delay
    const showTimer = setTimeout(() => {
      setIsVisible(true)
      setRobotPosition(0) // Robot walks in from right
    }, 300)

    // Hide after 5 seconds total
    const hideTimer = setTimeout(() => {
      setIsVisible(false)
      setRobotPosition(200) // Robot walks out to right
      // Close completely after animation
      setTimeout(() => {
        onClose()
      }, 500)
    }, 5000)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [onClose, userHasTyped])

  // Hide immediately if user starts typing
  useEffect(() => {
    if (userHasTyped && isVisible) {
      setIsVisible(false)
      setRobotPosition(200)
      setTimeout(() => {
        onClose()
      }, 500)
    }
  }, [userHasTyped, isVisible, onClose])

  const userName = getUserName()

  return (
    <AnimatePresence>
      {isVisible && !userHasTyped && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-6 right-6 z-[9999]"
          style={{ pointerEvents: 'none' }}
        >
          <div className="relative flex items-start gap-4">
            {/* Welcome Board */}
            <motion.div
              initial={{ scale: 0.8, x: 50, opacity: 0 }}
              animate={{ 
                scale: 1,
                x: 0,
                opacity: 1
              }}
              exit={{ 
                scale: 0.8,
                x: 50,
                opacity: 0
              }}
              transition={{ 
                type: 'spring',
                damping: 20,
                stiffness: 300,
                duration: 0.5
              }}
              className="relative"
              style={{
                minWidth: '420px',
                maxWidth: '480px',
                backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                borderRadius: '16px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                border: `2px solid ${currentTheme.colors.primary}`,
                overflow: 'hidden',
                pointerEvents: 'auto'
              }}
            >
              {/* Board Content */}
              <div className="p-6">
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mb-4"
                >
                  <h2
                    className="text-xl font-bold mb-2"
                    style={{
                      background: `linear-gradient(135deg, ${currentTheme.colors.primary} 0%, ${currentTheme.colors.secondary || currentTheme.colors.primary} 100%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      color: 'transparent'
                    }}
                  >
                    Hello {userName}!
                  </h2>
                  <p
                    className="text-base"
                    style={{ color: isDarkMode ? '#E5E7EB' : '#374151' }}
                  >
                    I'm your AI Work Buddy, your intelligent assistant
                  </p>
                </motion.div>

                {/* What I can help you with */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mb-4"
                >
                  <h3
                    className="text-sm font-semibold mb-2"
                    style={{ color: currentTheme.colors.primary }}
                  >
                    What I can help you with:
                  </h3>
                  <ul className="space-y-1.5 text-xs" style={{ color: isDarkMode ? '#CBD5E1' : '#475569' }}>
                    <li className="flex items-start gap-2">
                      <span style={{ color: currentTheme.colors.primary }}>•</span>
                      <span><strong>Jira Queries:</strong> Search issues, track bugs, analyze sprints</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span style={{ color: currentTheme.colors.primary }}>•</span>
                      <span><strong>Quality Metrics:</strong> Calculate automation percentage, defect leakage, test coverage</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span style={{ color: currentTheme.colors.primary }}>•</span>
                      <span><strong>Confluence Docs:</strong> Search IS (Intelligence Suite) documentation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span style={{ color: currentTheme.colors.primary }}>•</span>
                      <span><strong>Strategic Insights:</strong> Analyze team performance and provide recommendations</span>
                    </li>
                  </ul>
                </motion.div>

                {/* Try asking */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                  className="mb-4"
                >
                  <h3
                    className="text-sm font-semibold mb-2"
                    style={{ color: currentTheme.colors.primary }}
                  >
                    Try asking:
                  </h3>
                  <ul className="space-y-1.5 text-xs" style={{ color: isDarkMode ? '#CBD5E1' : '#475569' }}>
                    <li className="flex items-start gap-2">
                      <span style={{ color: currentTheme.colors.primary }}>•</span>
                      <span>What is the automation percentage for NDP in the last sprint?</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span style={{ color: currentTheme.colors.primary }}>•</span>
                      <span>Show me open bugs in NDP project</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span style={{ color: currentTheme.colors.primary }}>•</span>
                      <span>Find documentation about NDP architecture in Confluence</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span style={{ color: currentTheme.colors.primary }}>•</span>
                      <span>Calculate defect leakage for last month</span>
                    </li>
                  </ul>
                </motion.div>
              </div>

              {/* Decorative bottom border */}
              <div
                className="h-1.5"
                style={{
                  background: `linear-gradient(90deg, ${currentTheme.colors.primary} 0%, ${currentTheme.colors.secondary || currentTheme.colors.primary} 100%)`
                }}
              />
            </motion.div>

            {/* AI Robot Character - Walking Animation */}
            <motion.div
              initial={{ x: 200, opacity: 0, scale: 0.8 }}
              animate={{ 
                x: robotPosition,
                opacity: robotPosition === 0 ? 1 : 0,
                scale: robotPosition === 0 ? 1 : 0.8,
                y: [0, -8, 0] // Walking bounce animation
              }}
              exit={{ 
                x: 200,
                opacity: 0,
                scale: 0.8
              }}
              transition={{
                x: { type: 'spring', damping: 15, stiffness: 200, duration: 0.8 },
                y: { repeat: Infinity, duration: 0.5, ease: 'easeInOut', delay: 0.8 },
                opacity: { duration: 0.3 }
              }}
              className="relative"
              style={{ 
                width: '80px', 
                height: '80px',
                pointerEvents: 'auto'
              }}
            >
              {/* Robot Icon with walking animation */}
              <motion.div
                animate={{ 
                  rotate: [0, -5, 5, -5, 0] // Slight rotation for walking effect
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 0.6, 
                  ease: 'easeInOut',
                  delay: 0.8
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Bot
                  size={80}
                  style={{
                    color: currentTheme.colors.primary,
                    filter: isDarkMode 
                      ? 'drop-shadow(0 4px 12px rgba(255,255,255,0.2))' 
                      : 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
                    strokeWidth: 2
                  }}
                />
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
