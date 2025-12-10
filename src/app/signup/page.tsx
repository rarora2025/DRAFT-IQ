'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Flame, Snowflake, Mail, Lock, User, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (authData.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email,
        username,
        balance: 1000,
      })

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }
    }

    setSuccess(true)
    setLoading(false)
    
    setTimeout(() => {
      router.push('/login')
    }, 2000)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gradient-radial from-orange-500/20 via-transparent to-transparent blur-3xl" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gradient-radial from-blue-500/20 via-transparent to-transparent blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md space-y-8"
      >
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Flame className="w-10 h-10 text-orange-500" />
            </motion.div>
            <h1 className="font-display font-bold text-4xl bg-gradient-to-r from-orange-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              Hot or Cold
            </h1>
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
            >
              <Snowflake className="w-10 h-10 text-blue-500" />
            </motion.div>
          </div>
          <p className="text-muted-foreground">Join the weather trading revolution</p>
        </div>

        <form onSubmit={handleSignup} className="glass rounded-2xl p-6 space-y-6">
          <h2 className="font-display font-semibold text-xl text-center">Create Account</h2>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Account created! Redirecting to login...
            </div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 h-12 bg-white/5 border-white/10"
                required
                disabled={success}
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 bg-white/5 border-white/10"
                required
                disabled={success}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-12 bg-white/5 border-white/10"
                minLength={6}
                required
                disabled={success}
              />
            </div>
          </div>

          <div className="glass rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Starting Balance</p>
            <p className="font-display font-bold text-2xl text-emerald-400">$1,000 HotCoins</p>
          </div>

          <Button
            type="submit"
            disabled={loading || success}
            className="w-full h-12 bg-gradient-to-r from-orange-500 to-blue-500 hover:from-orange-600 hover:to-blue-600 text-white font-display font-bold text-lg rounded-xl"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : success ? (
              'Account Created!'
            ) : (
              'Start Trading'
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-400 hover:underline">
              Sign in
            </Link>
          </p>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Columbia Prediction Market Society
        </p>
      </motion.div>
    </div>
  )
}
