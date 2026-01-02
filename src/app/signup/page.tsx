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

    const handleGoogleSignup = async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${getURL()}auth/callback`.replace(/([^:])\/\//g, '$1/'),
        },
      })

      if (error) {
        setError(error.message)
      }
    }

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

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#0b0d28] px-2 text-zinc-500 font-medium">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleGoogleSignup}
              variant="outline"
              disabled={success}
              className="w-full h-14 bg-white/5 border-white/10 hover:bg-white/10 text-white font-display font-bold text-lg rounded-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                />
              </svg>
              Google
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
