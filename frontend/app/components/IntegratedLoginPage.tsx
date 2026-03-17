'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Alert, AlertDescription } from './ui/alert'
import { 
  Eye, 
  EyeOff, 
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { getApiUrl } from '../../lib/api-config'

export function IntegratedLoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Step 1: Authenticate user via LDAP
      const success = await login(username, password)

      if (!success) {
        setError('Invalid CDK username or password')
        setLoading(false)
        return
      }

      // Step 2: Auto-connect Jira and Confluence using common service account credentials
      try {
        const token = localStorage.getItem('auth_token')
        const connectResponse = await fetch(getApiUrl('/api/auth/auto-connect-integrations'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          }
        })

        const connectData = await connectResponse.json()
        
        if (connectData.success) {
          const { jira, confluence } = connectData.results
          
          // Log connection status
          if (jira.success) {
            console.log('✅ Jira auto-connected:', jira.message)
          } else {
            console.warn('❌ Jira auto-connect failed:', jira.message)
          }
          
          if (confluence.success) {
            console.log('✅ Confluence auto-connected:', confluence.message)
          } else {
            console.warn('❌ Confluence auto-connect failed:', confluence.message)
          }
          
          // Dispatch event to trigger status refresh in main app
          if (jira.success || confluence.success) {
            window.dispatchEvent(new CustomEvent('integration-update', { 
              detail: { 
                service: 'auto-connect',
                jira: jira.success,
                confluence: confluence.success
              } 
            }))
          }
        } else {
          console.error('Auto-connect error:', connectData.error)
        }
      } catch (connectErr) {
        console.error('Auto-connect error:', connectErr)
        // Don't block login if auto-connect fails
      }

      // Step 3: Redirect to main app
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div 
      className="min-h-screen flex"
      style={{ 
        backgroundColor: '#1a1a1a',
        backgroundImage: `repeating-linear-gradient(
          45deg,
          transparent,
          transparent 10px,
          rgba(0,0,0,0.1) 10px,
          rgba(0,0,0,0.1) 20px
        )`
      }}
    >
      {/* Left Section - Branding */}
      <div className="hidden lg:flex lg:w-2/3 items-center justify-center relative">
        <div className="absolute inset-0" style={{
          background: `linear-gradient(
            135deg,
            rgba(26,26,26,0.8) 0%,
            rgba(20,20,20,0.9) 50%,
            rgba(26,26,26,0.8) 100%
          )`
        }}></div>
        <div className="relative z-10 text-center">
          {/* CDKGlobal Logo */}
          <div className="flex justify-center items-center mb-8">
            <div className="flex items-center gap-3">
              {/* Three Circles */}
              <div className="flex items-center gap-2">
                <div 
                  className="w-10 h-10 rounded-full"
                  style={{ backgroundColor: '#ffffff' }}
                ></div>
                <div 
                  className="w-10 h-10 rounded-full"
                  style={{ backgroundColor: '#ffffff' }}
                ></div>
                <div 
                  className="w-10 h-10 rounded-full"
                  style={{ backgroundColor: '#8CC63F' }}
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
          <h1 className="text-7xl font-bold tracking-tight" style={{ color: '#ffffff' }}>
            FALCONX
          </h1>
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className="w-full lg:w-1/3 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          {/* Language Selector - Top Right */}
          <div className="flex justify-end mb-8">
            <button
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: '#2a2a2a',
                color: '#ffffff',
                border: '1px solid #3a3a3a'
              }}
            >
              <span>🇺🇸</span>
              <span>EN</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          <Card 
            className="shadow-2xl border-0"
            style={{ 
              backgroundColor: '#ffffff',
              borderRadius: '8px'
            }}
          >
            <CardHeader className="space-y-1 pb-6">
              <CardTitle 
                className="text-3xl font-bold mb-6"
                style={{ color: '#2a2a2a' }}
              >
                Sign In
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" style={{ color: '#2a2a2a', fontWeight: 500 }}>
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  style={{
                    backgroundColor: '#ffffff',
                    borderColor: '#d1d5db',
                    color: '#2a2a2a',
                    padding: '12px 16px',
                    borderRadius: '4px'
                  }}
                />
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="remember"
                  className="w-4 h-4"
                  style={{ accentColor: '#000000' }}
                />
                <Label htmlFor="remember" style={{ color: '#2a2a2a', fontWeight: 400 }}>
                  Remember me
                </Label>
              </div>

              {/* Password */}
              <div className="space-y-2 pt-2">
                <Label htmlFor="password" style={{ color: '#2a2a2a', fontWeight: 500 }}>
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="pr-10"
                    style={{
                      backgroundColor: '#ffffff',
                      borderColor: '#d1d5db',
                      color: '#2a2a2a',
                      padding: '12px 16px',
                      borderRadius: '4px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    style={{ color: '#6b7280' }}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>


              {/* Error Message */}
              {error && (
                <Alert 
                  className="border-red-200 bg-red-50 mt-4"
                >
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Sign In Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full mt-6 py-3 text-base font-semibold rounded-lg"
                style={{ 
                  backgroundColor: loading ? '#4b5563' : '#000000',
                  color: '#ffffff'
                }}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              {/* Help Links */}
              <div className="mt-6 space-y-2 text-sm" style={{ color: '#2a2a2a' }}>
                <div>
                  <button
                    type="button"
                    className="hover:underline"
                    style={{ color: '#2a2a2a' }}
                  >
                    Forgot your password?
                  </button>
                </div>
                <div className="text-xs" style={{ color: '#6b7280', lineHeight: '1.5' }}>
                  Forgot your email or need to request an account? Please contact your enterprise administrator.
                </div>
                <div className="text-xs" style={{ color: '#6b7280', lineHeight: '1.5' }}>
                  For additional assistance, please contact FalconX Support.
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
        </motion.div>
      </div>

    </div>
  )
}

