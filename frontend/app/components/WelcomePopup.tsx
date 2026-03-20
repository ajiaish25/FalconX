'use client'

import React, { useEffect, useId, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { useSettings } from '../contexts/SettingsContext'

// ---------------------------------------------------------------------------
// Animation variants — module-level so they are never recreated on re-render
// ---------------------------------------------------------------------------

const antennaVariants = {
  idle: {
    rotate: [0, 12, -12, 8, -8, 0],
    transition: { duration: 2.4, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' as const, delay: 1.2 }
  }
}

const eyeBlinkVariants = {
  open:  { scaleY: 1 },
  blink: { scaleY: [1, 0.05, 1], transition: { duration: 0.18, ease: 'easeInOut' as const } }
}

const chestPulseVariants = {
  idle: {
    scale:   [1, 1.35, 1],
    opacity: [0.85, 0.4, 0.85],
    transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' as const }
  }
}

const chestRingVariants = {
  idle: {
    scale:   [1, 1.7, 1],
    opacity: [0.6, 0, 0.6],
    transition: { duration: 1.8, repeat: Infinity, ease: 'easeOut' as const }
  }
}

const armWaveVariants = {
  idle: {
    rotate: [0, -55, -70, -55, -30, -55, -70, -55, 0],
    transition: {
      duration:    2.0,
      times:       [0, 0.15, 0.3, 0.45, 0.55, 0.65, 0.75, 0.85, 1.0],
      ease:        'easeInOut' as const,
      delay:       0.6,
      repeat:      2,
      repeatDelay: 0.4
    }
  }
}

const bodySway = {
  idle: {
    rotate: [0, 1.5, 0, -1.5, 0],
    transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' as const, delay: 0.8 }
  }
}

const headTilt = {
  idle: {
    rotate: [0, -4, 0, 4, 0],
    transition: { duration: 4.0, repeat: Infinity, ease: 'easeInOut' as const, delay: 1.0 }
  }
}

const bubbleVariants = {
  hidden:  { scale: 0, opacity: 0, y: 10 },
  visible: {
    scale: 1, opacity: 1, y: 0,
    transition: { type: 'spring' as const, stiffness: 400, damping: 18, delay: 0.9 }
  },
  exit: { scale: 0, opacity: 0, transition: { duration: 0.15 } }
}

// ---------------------------------------------------------------------------
// PremiumRobot — fully custom inline SVG robot character
// ---------------------------------------------------------------------------

interface PremiumRobotProps {
  primaryColor: string
  accentColor:  string
  bodyFill:     string
  isDarkMode:   boolean
  isBlinking:   boolean
}

function PremiumRobot({ primaryColor, accentColor, bodyFill, isDarkMode, isBlinking }: PremiumRobotProps) {
  // Unique IDs per instance — prevents filter/gradient collisions in React StrictMode
  const uid         = useId().replace(/:/g, '')
  const eyeGradId   = `eyeGrad-${uid}`
  const antGradId   = `antGrad-${uid}`
  const eyeGlowId   = `eyeGlow-${uid}`
  const chestGlowId = `chestGlow-${uid}`
  const antGlowId   = `antGlow-${uid}`
  const pupilFill   = isDarkMode ? '#0D0F14' : '#1C1A17'

  return (
    <div style={{ position: 'relative', width: 110, height: 130 }}>

      {/* ── Speech bubble ─────────────────────────────────────────────────── */}
      <motion.div
        variants={bubbleVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        style={{
          position:        'absolute',
          top:             -44,
          left:            -96,
          backgroundColor: bodyFill,
          border:          `1.5px solid ${primaryColor}`,
          borderRadius:    12,
          padding:         '5px 14px',
          fontSize:        13,
          fontWeight:      700,
          color:           primaryColor,
          whiteSpace:      'nowrap',
          boxShadow:       isDarkMode
            ? '0 4px 18px rgba(0,0,0,0.55)'
            : '0 4px 14px rgba(30,25,15,0.13)',
          pointerEvents:   'none',
          zIndex:          10,
          letterSpacing:   '0.01em',
        }}
      >
        Hi! 👋
        {/* Tail — border layer */}
        <div style={{
          position:    'absolute',
          bottom:      -9,
          right:       20,
          width:       0,
          height:      0,
          borderLeft:  '7px solid transparent',
          borderRight: '7px solid transparent',
          borderTop:   `9px solid ${primaryColor}`,
        }} />
        {/* Tail — fill layer */}
        <div style={{
          position:    'absolute',
          bottom:      -7,
          right:       21,
          width:       0,
          height:      0,
          borderLeft:  '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop:   `8px solid ${bodyFill}`,
        }} />
      </motion.div>

      {/* ── Robot SVG ──────────────────────────────────────────────────────── */}
      <motion.svg
        viewBox="0 0 110 130"
        width="110"
        height="130"
        variants={bodySway}
        animate="idle"
        style={{ overflow: 'visible', transformOrigin: '55px 100px', display: 'block' }}
      >
        <defs>
          {/* Iris radial gradient */}
          <radialGradient id={eyeGradId} cx="35%" cy="35%" r="65%">
            <stop offset="0%"   stopColor="white"      stopOpacity="0.45" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="1"    />
          </radialGradient>

          {/* Antenna ball gradient */}
          <radialGradient id={antGradId} cx="35%" cy="35%" r="65%">
            <stop offset="0%"   stopColor="white"      stopOpacity="0.65" />
            <stop offset="100%" stopColor={accentColor}                   />
          </radialGradient>

          {/* Eye glow */}
          <filter id={eyeGlowId} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Chest glow */}
          <filter id={chestGlowId} x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" />
          </filter>

          {/* Antenna glow */}
          <filter id={antGlowId} x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.8" />
          </filter>
        </defs>

        {/* ── Ground shadow ── */}
        <ellipse cx={55} cy={128} rx={28} ry={3} fill={primaryColor} opacity={0.12} />

        {/* ── Legs ── */}
        <rect x={30} y={109} width={18} height={16} rx={7} fill={bodyFill} stroke={primaryColor} strokeWidth={1.5} />
        <rect x={62} y={109} width={18} height={16} rx={7} fill={bodyFill} stroke={primaryColor} strokeWidth={1.5} />

        {/* ── Feet ── */}
        <ellipse cx={39} cy={126} rx={11} ry={4} fill={primaryColor} opacity={0.6} />
        <ellipse cx={71} cy={126} rx={11} ry={4} fill={primaryColor} opacity={0.6} />

        {/* ── Left arm (still) ── */}
        <rect   x={10} y={71} width={14} height={28} rx={7} fill={bodyFill} stroke={primaryColor} strokeWidth={1.5} />
        <circle cx={17} cy={101} r={6}                       fill={bodyFill} stroke={primaryColor} strokeWidth={1.5} />

        {/* ── Torso ── */}
        <rect x={22} y={69} width={66} height={40} rx={12} fill={bodyFill} stroke={primaryColor} strokeWidth={1.5} />

        {/* Torso panel detail */}
        <line x1={30} y1={96} x2={80} y2={96} stroke={primaryColor} opacity={0.18} strokeWidth={1} strokeLinecap="round" />
        <rect x={30} y={99} width={12} height={4} rx={2} fill={primaryColor} opacity={0.14} />
        <rect x={68} y={99} width={12} height={4} rx={2} fill={primaryColor} opacity={0.14} />

        {/* ── Chest light ── */}
        {/* Bloom behind */}
        <motion.circle
          cx={55} cy={85} r={11}
          fill={accentColor}
          filter={`url(#${chestGlowId})`}
          variants={chestRingVariants}
          animate="idle"
          style={{ transformOrigin: '55px 85px' }}
        />
        {/* Static ring */}
        <circle cx={55} cy={85} r={8} fill="none" stroke={accentColor} strokeWidth={2} />
        {/* Pulsing core */}
        <motion.circle
          cx={55} cy={85} r={5}
          fill={accentColor}
          variants={chestPulseVariants}
          animate="idle"
          style={{ transformOrigin: '55px 85px' }}
        />

        {/* ── Right arm — WAVING ── */}
        <motion.g
          variants={armWaveVariants}
          animate="idle"
          style={{ transformOrigin: '93px 71px' }}
        >
          <rect   x={86} y={71} width={14} height={28} rx={7} fill={bodyFill} stroke={primaryColor} strokeWidth={1.5} />
          <circle cx={93} cy={101} r={6}                       fill={bodyFill} stroke={primaryColor} strokeWidth={1.5} />
        </motion.g>

        {/* ── Neck ── */}
        <rect x={50} y={64} width={10} height={7} rx={2} fill={bodyFill} stroke={primaryColor} strokeWidth={1} />

        {/* ── Head (tilts) ── */}
        <motion.g variants={headTilt} animate="idle" style={{ transformOrigin: '55px 43px' }}>

          {/* Head shell */}
          <rect x={28} y={22} width={54} height={42} rx={10} fill={bodyFill} stroke={primaryColor} strokeWidth={1.5} />

          {/* Cheek blush */}
          <ellipse cx={34} cy={50} rx={4} ry={2.5} fill={accentColor} opacity={0.28} />
          <ellipse cx={76} cy={50} rx={4} ry={2.5} fill={accentColor} opacity={0.28} />

          {/* ── Left eye ── */}
          <motion.g variants={eyeBlinkVariants} animate={isBlinking ? 'blink' : 'open'} style={{ transformOrigin: '42px 40px' }}>
            <circle cx={42} cy={40} r={9}   fill={accentColor} opacity={0.22} filter={`url(#${eyeGlowId})`} />
            <circle cx={42} cy={40} r={7}   fill={`url(#${eyeGradId})`} />
            <circle cx={42} cy={40} r={3.5} fill={pupilFill} />
            <circle cx={44.5} cy={37.5} r={1.5} fill="white" opacity={0.9} />
          </motion.g>

          {/* ── Right eye ── */}
          <motion.g variants={eyeBlinkVariants} animate={isBlinking ? 'blink' : 'open'} style={{ transformOrigin: '68px 40px' }}>
            <circle cx={68} cy={40} r={9}   fill={accentColor} opacity={0.22} filter={`url(#${eyeGlowId})`} />
            <circle cx={68} cy={40} r={7}   fill={`url(#${eyeGradId})`} />
            <circle cx={68} cy={40} r={3.5} fill={pupilFill} />
            <circle cx={70.5} cy={37.5} r={1.5} fill="white" opacity={0.9} />
          </motion.g>

          {/* ── Smile ── */}
          <path d="M 44 52 Q 55 61 66 52" stroke={primaryColor} strokeWidth={2.2} fill="none" strokeLinecap="round" />

        </motion.g>

        {/* ── Antenna stem ── */}
        <line x1={55} y1={12} x2={55} y2={22} stroke={primaryColor} strokeWidth={2.5} strokeLinecap="round" />

        {/* ── Antenna ball (wiggles) ── */}
        <motion.g variants={antennaVariants} animate="idle" style={{ transformOrigin: '55px 22px' }}>
          <circle cx={55} cy={9} r={7.5} fill={accentColor} opacity={0.28} filter={`url(#${antGlowId})`} />
          <circle cx={55} cy={9} r={4.5} fill={`url(#${antGradId})`} />
          <circle cx={56.5} cy={7.5} r={1.3} fill="white" opacity={0.82} />
        </motion.g>

      </motion.svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// WelcomePopup
// ---------------------------------------------------------------------------

interface WelcomePopupProps {
  onClose: () => void
  userHasTyped?: boolean
}

export function WelcomePopup({ onClose, userHasTyped = false }: WelcomePopupProps) {
  const { currentTheme, isDarkMode } = useTheme()
  const { settings, isLoaded }       = useSettings()
  const [isVisible,     setIsVisible]     = useState(false)
  const [robotPosition, setRobotPosition] = useState(200)
  const [isBlinking,    setIsBlinking]    = useState(false)
  const blinkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const getUserName = () =>
    isLoaded && settings.userProfile.name ? settings.userProfile.name : 'User'

  // Show / auto-hide
  useEffect(() => {
    if (userHasTyped) return

    const showTimer = setTimeout(() => {
      setIsVisible(true)
      setRobotPosition(0)
    }, 300)

    const hideTimer = setTimeout(() => {
      setIsVisible(false)
      setRobotPosition(200)
      setTimeout(() => onClose(), 500)
    }, 5000)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [onClose, userHasTyped])

  // Dismiss immediately when user starts typing
  useEffect(() => {
    if (userHasTyped && isVisible) {
      setIsVisible(false)
      setRobotPosition(200)
      setTimeout(() => onClose(), 500)
    }
  }, [userHasTyped, isVisible, onClose])

  // Random blink loop — only while visible
  useEffect(() => {
    if (!isVisible) {
      if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current)
      return
    }
    const scheduleBlink = (): ReturnType<typeof setTimeout> =>
      setTimeout(() => {
        setIsBlinking(true)
        setTimeout(() => {
          setIsBlinking(false)
          blinkTimeoutRef.current = scheduleBlink()
        }, 180)
      }, 2500 + Math.random() * 2500)

    blinkTimeoutRef.current = scheduleBlink()
    return () => {
      if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current)
    }
  }, [isVisible])

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

            {/* ── Welcome board ───────────────────────────────────────────── */}
            <motion.div
              initial={{ scale: 0.8, x: 50, opacity: 0 }}
              animate={{ scale: 1, x: 0, opacity: 1 }}
              exit={{ scale: 0.8, x: 50, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300, duration: 0.5 }}
              style={{
                minWidth:        '420px',
                maxWidth:        '480px',
                backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                borderRadius:    '16px',
                boxShadow:       '0 10px 40px rgba(0,0,0,0.2)',
                border:          `2px solid ${currentTheme.colors.primary}`,
                overflow:        'hidden',
                pointerEvents:   'auto'
              }}
            >
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
                      background:            `linear-gradient(135deg, ${currentTheme.colors.primary} 0%, ${currentTheme.colors.secondary || currentTheme.colors.primary} 100%)`,
                      WebkitBackgroundClip:  'text',
                      WebkitTextFillColor:   'transparent',
                      backgroundClip:        'text',
                      color:                 'transparent'
                    }}
                  >
                    Hello {userName}!
                  </h2>
                  <p className="text-base" style={{ color: isDarkMode ? '#E5E7EB' : '#374151' }}>
                    I&apos;m your AI Work Buddy, your intelligent assistant
                  </p>
                </motion.div>

                {/* Capabilities */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mb-4"
                >
                  <h3 className="text-sm font-semibold mb-2" style={{ color: currentTheme.colors.primary }}>
                    What I can help you with:
                  </h3>
                  <ul className="space-y-1.5 text-xs" style={{ color: isDarkMode ? '#CBD5E1' : '#475569' }}>
                    {[
                      ['Jira Queries',       'Search issues, track bugs, analyze sprints'],
                      ['Quality Metrics',    'Calculate automation percentage, defect leakage, test coverage'],
                      ['Confluence Docs',    'Search IS (Intelligence Suite) documentation'],
                      ['Strategic Insights', 'Analyze team performance and provide recommendations'],
                    ].map(([title, desc]) => (
                      <li key={title} className="flex items-start gap-2">
                        <span style={{ color: currentTheme.colors.primary }}>•</span>
                        <span><strong>{title}:</strong> {desc}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                {/* Example queries */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                  className="mb-4"
                >
                  <h3 className="text-sm font-semibold mb-2" style={{ color: currentTheme.colors.primary }}>
                    Try asking:
                  </h3>
                  <ul className="space-y-1.5 text-xs" style={{ color: isDarkMode ? '#CBD5E1' : '#475569' }}>
                    {[
                      'What is the automation percentage for NDP in the last sprint?',
                      'Show me open bugs in NDP project',
                      'Find documentation about NDP architecture in Confluence',
                      'Calculate defect leakage for last month',
                    ].map((q) => (
                      <li key={q} className="flex items-start gap-2">
                        <span style={{ color: currentTheme.colors.primary }}>•</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>

              </div>

              {/* Gradient footer bar */}
              <div
                className="h-1.5"
                style={{
                  background: `linear-gradient(90deg, ${currentTheme.colors.primary} 0%, ${currentTheme.colors.secondary || currentTheme.colors.primary} 100%)`
                }}
              />
            </motion.div>

            {/* ── Robot character ─────────────────────────────────────────── */}
            <motion.div
              initial={{ x: 200, opacity: 0, scale: 0.8 }}
              animate={{
                x:       robotPosition,
                opacity: robotPosition === 0 ? 1 : 0,
                scale:   robotPosition === 0 ? 1 : 0.8,
                y:       [0, -8, 0],
              }}
              exit={{ x: 200, opacity: 0, scale: 0.8 }}
              transition={{
                x:       { type: 'spring', damping: 15, stiffness: 200, duration: 0.8 },
                y:       { repeat: Infinity, duration: 0.5, ease: 'easeInOut', delay: 0.8 },
                opacity: { duration: 0.3 },
              }}
              style={{ width: '110px', height: '130px', pointerEvents: 'auto' }}
            >
              <PremiumRobot
                primaryColor={currentTheme.colors.primary}
                accentColor={currentTheme.colors.accent}
                bodyFill={currentTheme.colors.surfaceVariant}
                isDarkMode={isDarkMode}
                isBlinking={isBlinking}
              />
            </motion.div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
