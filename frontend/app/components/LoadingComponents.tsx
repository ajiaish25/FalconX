'use client'

import React, { useEffect } from 'react'

export function LoadingScreen() {
  useEffect(() => {
    // Inject CSS animations
    const style = document.createElement('style')
    style.textContent = `
      @keyframes bounceCircle {
        0%, 100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-10px);
        }
      }
      
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes pulseDot {
        0%, 100% {
          opacity: 0.3;
          transform: scale(1);
        }
        50% {
          opacity: 1;
          transform: scale(1.2);
        }
      }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center z-50">
      <div className="text-center">
        {/* CDK Logo with Animated Three Circles */}
        <div className="flex justify-center items-center mb-8">
          <div className="flex items-center gap-3">
            {/* Three Circles with Animation */}
            <div className="flex items-center gap-2">
              {/* First Circle - Moves up and down */}
              <div
                className="w-10 h-10 rounded-full bg-white"
                style={{
                  animation: 'bounceCircle 1.5s ease-in-out infinite',
                  animationDelay: '0s'
                }}
              ></div>
              {/* Second Circle - Moves up and down with delay */}
              <div
                className="w-10 h-10 rounded-full bg-white"
                style={{
                  animation: 'bounceCircle 1.5s ease-in-out infinite',
                  animationDelay: '0.2s'
                }}
              ></div>
              {/* Third Circle - Moves up and down with more delay */}
              <div
                className="w-10 h-10 rounded-full"
                style={{
                  backgroundColor: '#8CC63F',
                  animation: 'bounceCircle 1.5s ease-in-out infinite',
                  animationDelay: '0.4s'
                }}
              ></div>
            </div>
            {/* CDKGlobal Text */}
            <div className="flex items-baseline">
              <span
                className="text-4xl tracking-tight"
                style={{
                  color: '#ffffff',
                  fontWeight: 400,
                  fontFamily: 'sans-serif'
                }}
              >
                CDKGlobal
              </span>
              <span
                className="text-lg ml-0.5"
                style={{ color: '#ffffff' }}
              >
                ®
              </span>
            </div>
          </div>
        </div>
        
        {/* FalconX Name */}
        <h1 
          className="text-7xl font-bold tracking-tight mb-4"
          style={{ 
            color: '#ffffff',
            animation: 'fadeInUp 1s ease-out'
          }}
        >
          FALCONX
        </h1>

        {/* Loading Indicator */}
        <div className="flex items-center justify-center mt-8">
          <div className="flex gap-2">
            <div
              className="w-2 h-2 rounded-full bg-white opacity-60"
              style={{
                animation: 'pulseDot 1.4s ease-in-out infinite',
                animationDelay: '0s'
              }}
            ></div>
            <div
              className="w-2 h-2 rounded-full bg-white opacity-60"
              style={{
                animation: 'pulseDot 1.4s ease-in-out infinite',
                animationDelay: '0.2s'
              }}
            ></div>
            <div
              className="w-2 h-2 rounded-full bg-white opacity-60"
              style={{
                animation: 'pulseDot 1.4s ease-in-out infinite',
                animationDelay: '0.4s'
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LoadingSpinner({ size = 'default', className = '' }: { size?: 'sm' | 'default' | 'lg', className?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    default: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <Loader2 className={`${sizeClasses[size]} animate-spin ${className}`} />
  )
}

export function LoadingCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
      <div className="flex items-center space-x-4 mb-4">
        <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-4/6"></div>
      </div>
    </div>
  )
}
