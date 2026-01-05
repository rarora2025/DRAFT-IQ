'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Smartphone, Mail, Hash, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { supabase } from '@/lib/supabase'

interface AuthFlowProps {
  mode: 'login' | 'signup'
  redirectTo?: string
  initialUsername?: string
}

type AuthMethod = 'email' | 'phone'
type Step = 'method' | 'username' | 'credentials' | 'otp'

export function AuthFlow({ mode, redirectTo = '/', initialUsername = '' }: AuthFlowProps) {
  const router = useRouter()
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email')
  const [step, setStep] = useState<Step>(mode === 'signup' && !initialUsername ? 'username' : 'method')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [username, setUsername] = useState(initialUsername)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleMethodSelect = (method: AuthMethod) => {
    setAuthMethod(method)
    setError('')
    setStep('credentials')
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (mode === 'signup') {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`
        }
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      setEmailSent(true)
      setLoading(false)
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)
      setTimeout(() => {
        router.push(redirectTo)
        router.refresh()
      }, 500)
    }
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    let formattedPhone = phone.trim()
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+1${formattedPhone.replace(/\D/g, '')}`
    }

    const { error: authError } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
      options: {
        shouldCreateUser: mode === 'signup' || true,
        data: mode === 'signup' ? { username } : undefined
      }
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    setStep('otp')
    setLoading(false)
  }

  const handleVerifyOtp = async () => {
    setLoading(true)
    setError('')

    let formattedPhone = phone.trim()
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+1${formattedPhone.replace(/\D/g, '')}`
    }

    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: otp,
      type: 'sms',
    })

    if (verifyError) {
      setError(verifyError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    
    setTimeout(() => {
      router.push(redirectTo)
      router.refresh()
    }, 1000)
  }

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) {
      setError('Please enter a username')
      return
    }

    setLoading(true)
    setError('')

    const { data: existingUser } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username.trim())
      .maybeSingle()

    if (existingUser) {
      setError('Username is already taken')
      setLoading(false)
      return
    }

    setStep('method')
    setLoading(false)
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6 backdrop-blur-sm relative overflow-hidden">
      <AnimatePresence mode="wait">
        {step === 'username' && (
          <motion.div
            key="username"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="font-display font-semibold text-xl text-white">Choose Username</h2>
              <p className="text-zinc-400 text-sm">Pick a unique name for your trading profile.</p>
            </div>

            <form onSubmit={handleUsernameSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-14 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-zinc-600 focus:border-primary focus:ring-primary text-center font-display text-lg"
                required
              />

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
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
              </Button>
            </form>
          </motion.div>
        )}

        {step === 'method' && (
          <motion.div
            key="method"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="font-display font-semibold text-xl text-white">
                {mode === 'login' ? 'Welcome Back' : 'Get Started'}
              </h2>
              <p className="text-zinc-400 text-sm">Choose how you want to sign in.</p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => handleMethodSelect('email')}
                variant="outline"
                className="w-full h-14 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white rounded-xl font-display font-semibold text-base"
              >
                <Mail className="w-5 h-5 mr-3" />
                Continue with Email
              </Button>
              
              <Button
                onClick={() => handleMethodSelect('phone')}
                variant="outline"
                className="w-full h-14 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white rounded-xl font-display font-semibold text-base"
              >
                <Smartphone className="w-5 h-5 mr-3" />
                Continue with Phone
              </Button>
            </div>

            {mode === 'signup' && (
              <button 
                onClick={() => setStep('username')}
                className="w-full text-center text-zinc-500 text-sm hover:text-white transition-colors"
              >
                Change Username
              </button>
            )}
          </motion.div>
        )}

        {step === 'credentials' && authMethod === 'email' && (
          <motion.div
            key="email"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="font-display font-semibold text-xl text-white">
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </h2>
              <p className="text-zinc-400 text-sm">Enter your email and password.</p>
            </div>

            {emailSent ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg text-white">Check your email</h3>
                  <p className="text-zinc-400 text-sm mt-1">We sent a confirmation link to {email}</p>
                </div>
                <Button
                  onClick={() => setEmailSent(false)}
                  variant="outline"
                  className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                >
                  Try again
                </Button>
              </div>
            ) : (
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-14 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-zinc-600 focus:border-primary focus:ring-primary"
                    required
                  />
                </div>

                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-zinc-600 focus:border-primary focus:ring-primary"
                  required
                  minLength={6}
                />

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-400 text-sm border border-red-500/20">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {success && (
                  <div className="flex items-center justify-center gap-2 text-primary font-bold">
                    <CheckCircle className="w-5 h-5" />
                    Success! Redirecting...
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || success}
                  className="w-full h-14 bg-primary hover:bg-primary/90 text-[#020420] font-display font-black text-lg rounded-xl uppercase tracking-widest"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : mode === 'login' ? 'Sign In' : 'Create Account'}
                </Button>
              </form>
            )}

            <button 
              onClick={() => setStep('method')}
              className="w-full text-center text-zinc-500 text-sm hover:text-white transition-colors"
            >
              Use a different method
            </button>
          </motion.div>
        )}

        {step === 'credentials' && authMethod === 'phone' && (
          <motion.div
            key="phone"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="font-display font-semibold text-xl text-white">
                {mode === 'login' ? 'Welcome Back' : 'Get Started'}
              </h2>
              <p className="text-zinc-400 text-sm">Enter your phone number to receive a code.</p>
            </div>

            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="relative">
                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <Input
                  type="tel"
                  placeholder="Phone Number (e.g. +1...)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Code'}
              </Button>
            </form>

            <button 
              onClick={() => setStep('method')}
              className="w-full text-center text-zinc-500 text-sm hover:text-white transition-colors"
            >
              Use a different method
            </button>
          </motion.div>
        )}

        {step === 'otp' && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="font-display font-semibold text-xl text-white">Verification</h2>
              <p className="text-zinc-400 text-sm">Enter the 6-digit code sent to {phone}</p>
            </div>

            <div className="flex flex-col items-center space-y-6">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(value) => setOtp(value)}
                onComplete={handleVerifyOtp}
              >
                <InputOTPGroup className="gap-2">
                  <InputOTPSlot index={0} className="w-12 h-14 bg-white/5 border-white/10 text-white rounded-xl text-xl" />
                  <InputOTPSlot index={1} className="w-12 h-14 bg-white/5 border-white/10 text-white rounded-xl text-xl" />
                  <InputOTPSlot index={2} className="w-12 h-14 bg-white/5 border-white/10 text-white rounded-xl text-xl" />
                  <InputOTPSlot index={3} className="w-12 h-14 bg-white/5 border-white/10 text-white rounded-xl text-xl" />
                  <InputOTPSlot index={4} className="w-12 h-14 bg-white/5 border-white/10 text-white rounded-xl text-xl" />
                  <InputOTPSlot index={5} className="w-12 h-14 bg-white/5 border-white/10 text-white rounded-xl text-xl" />
                </InputOTPGroup>
              </InputOTP>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-400 text-sm border border-red-500/20 w-full">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {success && (
                <div className="flex items-center justify-center gap-2 text-primary font-bold animate-bounce">
                  <CheckCircle className="w-5 h-5" />
                  Verified! Redirecting...
                </div>
              )}

              <div className="w-full space-y-3">
                <Button
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.length < 6 || success}
                  className="w-full h-14 bg-primary hover:bg-primary/90 text-[#020420] font-display font-black text-lg rounded-xl uppercase tracking-widest"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Code'}
                </Button>
                
                <button 
                  onClick={() => setStep('credentials')}
                  disabled={loading || success}
                  className="w-full text-center text-zinc-500 text-sm hover:text-white transition-colors"
                >
                  Back to Phone Number
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
