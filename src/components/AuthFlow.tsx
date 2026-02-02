'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Mail, Loader2, AlertCircle, Lock, User, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { signUpUser, signInUser, resetPassword } from '@/app/auth/actions'

interface AuthFlowProps {
  mode: 'login' | 'signup'
  redirectTo?: string
}

export function AuthFlow({ mode, redirectTo = '/markets' }: AuthFlowProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
    const [resetSent, setResetSent] = useState(false)

    const handleAuth = async (e: React.FormEvent) => {

    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'signup') {
        if (!username.trim()) {
          setError('Please enter a username')
          setLoading(false)
          return
        }

        const result = await signUpUser({ email, password, username })

        if (result?.error) {
          setError(result.error)
          setLoading(false)
          return
        }
      } else {
        const result = await signInUser({ email, password })

        if (result?.error) {
          setError(result.error)
          setLoading(false)
          return
        }
      }
      
      window.location.href = redirectTo
    } catch (err: any) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }
    setLoading(true)
    setError('')

    try {
      const result = await resetPassword({ email })
      if (result?.error) {
        setError(result.error)
      } else {
        setResetSent(true)
      }
    } catch (err) {
      setError('Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  if (showForgotPassword) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6 backdrop-blur-sm relative overflow-hidden">
        <button
          onClick={() => {
            setShowForgotPassword(false)
            setResetSent(false)
            setError('')
          }}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </button>

        <div className="text-center space-y-2">
          <h2 className="font-display font-semibold text-xl text-white">
            Reset Password
          </h2>
          <p className="text-zinc-400 text-sm">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {resetSent ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 py-8"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-white font-medium">Check your email</p>
              <p className="text-zinc-400 text-sm">We sent a password reset link to {email}</p>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <Input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-12 h-14 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-zinc-600 focus:border-primary focus:ring-primary"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-400 text-sm border border-red-500/20">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-primary hover:bg-primary/90 text-[#020420] font-display font-black text-lg rounded-xl uppercase tracking-widest"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
            </Button>
          </form>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6 backdrop-blur-sm relative overflow-hidden">
      <div className="text-center space-y-2">
        <h2 className="font-display font-semibold text-xl text-white">
          {mode === 'login' ? 'Welcome Back' : 'Sign Up'}
        </h2>
        <p className="text-zinc-400 text-sm">
          {mode === 'login' 
            ? 'Sign in to access your trading dashboard.' 
            : 'Join the next generation of player-prop trading.'}
        </p>
      </div>

      <AnimatePresence mode="wait">
        <form onSubmit={handleAuth} className="space-y-4">
            {mode === 'signup' && (
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <Input
                    type="text"
                    placeholder="Username (max 12 chars)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.substring(0, 12))}
                    className="pl-12 h-14 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-zinc-600 focus:border-primary focus:ring-primary"
                    required
                    maxLength={12}
                  />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <Input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-12 h-14 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-zinc-600 focus:border-primary focus:ring-primary"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-12 pr-12 h-14 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-zinc-600 focus:border-primary focus:ring-primary"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {mode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-zinc-400 hover:text-primary transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-400 text-sm border border-red-500/20">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-primary hover:bg-primary/90 text-[#020420] font-display font-black text-lg rounded-xl uppercase tracking-widest"
              >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : mode === 'login' ? 'Sign In' : 'Sign Up'}
                </Button>
            </form>
          </AnimatePresence>
        </div>
    )
  }
