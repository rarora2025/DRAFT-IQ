'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Activity, Mail, Lock, User, Loader2, AlertCircle, CheckCircle, Wallet } from 'lucide-react'
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

      // 1. Check if username is already taken
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single()

      if (existingUser) {
        setError('Username is already taken. Please choose another one.')
        setLoading(false)
        return
      }

      // 2. Perform Auth Signup
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
        // 3. Create Profile
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          email,
          username,
          balance: 1000,
        })

        if (profileError) {
          console.error('Profile creation error:', profileError)
          // Handle common database errors
          if (profileError.code === '23505') {
            if (profileError.message.includes('profiles_username_key')) {
              setError('Username is already taken. Please choose another one.')
            } else if (profileError.message.includes('profiles_email_key')) {
              setError('An account with this email already exists.')
            } else {
              setError('This account already exists.')
            }
          } else {
            setError('Error creating profile: ' + profileError.message)
          }
          setLoading(false)
          return
        }
      } else if (!authData.session && !authData.user) {
        // This can happen if email confirmation is required and the user already exists
        setError('An account with this email already exists or confirmation is required.')
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)
      
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    }


  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md space-y-8"
      >
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20"
            >
              <Activity className="w-7 h-7 text-emerald-500" />
            </motion.div>
            <h1 className="font-display font-bold text-4xl text-zinc-100">
              Projection Trading
            </h1>
          </div>
          <p className="text-zinc-500">The next generation of player prop trading.</p>
        </div>

        <form onSubmit={handleSignup} className="bg-[#111116] border border-[#27272a] rounded-2xl p-6 space-y-6">
          <h2 className="font-display font-semibold text-xl text-center text-zinc-100">Create Account</h2>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-400 text-sm border border-red-500/20">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm border border-emerald-500/20">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Account created! Redirecting to login...
            </div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 h-12 bg-[#0a0a0f] border-[#27272a] text-zinc-100 placeholder:text-zinc-600"
                required
                disabled={success}
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 bg-[#0a0a0f] border-[#27272a] text-zinc-100 placeholder:text-zinc-600"
                required
                disabled={success}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <Input
                type="password"
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-12 bg-[#0a0a0f] border-[#27272a] text-zinc-100 placeholder:text-zinc-600"
                minLength={6}
                required
                disabled={success}
              />
            </div>
          </div>

          <div className="bg-[#0a0a0f] border border-[#27272a] rounded-xl p-6 text-center space-y-2 relative overflow-hidden group">
            <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Starting Capital</p>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                <Wallet className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="font-mono font-black text-4xl text-emerald-400">$1,000</p>
            </div>
            <p className="text-xs text-zinc-600 font-medium">Claim your free virtual coins to start trading</p>
          </div>

          <Button
            type="submit"
            disabled={loading || success}
            className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-display font-bold text-lg rounded-xl"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : success ? (
              'Account Created!'
            ) : (
              'Start Trading'
            )}
          </Button>

          <p className="text-center text-sm text-zinc-500">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-400 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  )
}
