'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Activity, Mail, Lock, User, Loader2, AlertCircle, CheckCircle, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { getURL } from '@/lib/utils'

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
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .maybeSingle()

      if (existingUser) {
        setError('Username is already taken. Please choose another one.')
        setLoading(false)
        return
      }

      // 2. Perform Auth Signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username
          }
        }
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      // 3. Handle successful signup
      setSuccess(true)
      setLoading(false)
      
      // If we have a session, redirect to home
      if (authData.session) {
        setTimeout(() => {
          router.push('/')
        }, 1500)
      } else {
        // If no session, it might be waiting for email confirmation
        // But since we have an auto-confirm trigger, we can suggest they try logging in
        setError('Signup successful! If you are not redirected, please check your email or try logging in.')
      }
    }


  return (
    <div className="min-h-screen bg-[#020420] flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md space-y-8"
      >
          <div className="text-center">
            <div className="flex flex-col items-center justify-center gap-4 mb-4">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 4 }}
                className="w-24 h-24 rounded-2xl overflow-hidden mb-2"
              >
                <img src="/logo.png" alt="DraftIQ" className="w-full h-full object-contain" />
              </motion.div>
              <h1 className="font-display font-black text-5xl text-white tracking-tighter">
                DraftIQ
              </h1>
            </div>
            <p className="text-zinc-400 font-medium tracking-wide">The next generation of player prop trading.</p>
          </div>


        <form onSubmit={handleSignup} className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6 backdrop-blur-sm">
          <h2 className="font-display font-semibold text-xl text-center text-white">Create Account</h2>

          {error && (
            <div className={`flex items-center gap-2 p-3 rounded-xl text-sm border ${success ? 'bg-primary/10 text-primary border-primary/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
              {success ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              {error}
            </div>
          )}

          {success && !error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 text-primary text-sm border border-primary/20">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Account created! Redirecting to dashboard...
            </div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-12 h-14 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-zinc-600 focus:border-primary focus:ring-primary"
                required
                disabled={success}
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-12 h-14 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-zinc-600 focus:border-primary focus:ring-primary"
                required
                disabled={success}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <Input
                type="password"
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-12 h-14 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-zinc-600 focus:border-primary focus:ring-primary"
                minLength={6}
                required
                disabled={success}
              />
            </div>
          </div>

          <div className="bg-[#020420]/50 border border-white/10 rounded-2xl p-6 text-center space-y-2 relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Starting Capital</p>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <p className="font-mono font-black text-4xl text-primary">$1,000</p>
            </div>
            <p className="text-xs text-zinc-600 font-medium">Claim your free virtual coins to start trading</p>
          </div>

            <Button
              type="submit"
              disabled={loading || success}
              className="w-full h-14 bg-primary hover:bg-primary/90 text-[#020420] font-display font-black text-lg rounded-xl uppercase tracking-widest shadow-lg shadow-primary/20"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : success ? (
                'Account Created!'
              ) : (
                'Start Trading'
              )}
            </Button>


          <p className="text-center text-sm text-zinc-500 font-medium">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  )
}
