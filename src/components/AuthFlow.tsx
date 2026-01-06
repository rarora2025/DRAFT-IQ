'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Mail, Loader2, AlertCircle, Lock, User, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { signUpUser, signInUser } from '@/app/auth/actions'

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
    } catch (err: any) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6 backdrop-blur-sm relative overflow-hidden">
      <div className="text-center space-y-2">
        <h2 className="font-display font-semibold text-xl text-white">
          {mode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-zinc-400 text-sm">
          {mode === 'login' 
            ? 'Sign in to access your trading dashboard.' 
            : 'Join DraftIQ and start trading projections.'}
        </p>
      </div>

      <AnimatePresence mode="wait">
        <form onSubmit={handleAuth} className="space-y-4">
            {mode === 'signup' && (
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <Input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-12 h-14 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-zinc-600 focus:border-primary focus:ring-primary font-display text-lg"
                  required
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
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
      </AnimatePresence>
    </div>
  )
}
