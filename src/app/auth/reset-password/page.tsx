'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, Loader2, AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code)
    }
  }, [searchParams])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password
      })

      if (updateError) {
        setError(updateError.message)
      } else {
        setSuccess(true)
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      }
    } catch (err) {
      setError('Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6 backdrop-blur-sm"
      >
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-white font-medium">Password Updated</p>
            <p className="text-zinc-400 text-sm">Redirecting to login...</p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6 backdrop-blur-sm">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h2 className="font-display font-semibold text-xl text-white">
          Set New Password
        </h2>
        <p className="text-zinc-400 text-sm">
          Enter your new password below.
        </p>
      </div>

      <form onSubmit={handleReset} className="space-y-4">
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="New Password"
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

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <Input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="pl-12 pr-12 h-14 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-zinc-600 focus:border-primary focus:ring-primary"
            required
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
          >
            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Password'}
        </Button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#020420] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
