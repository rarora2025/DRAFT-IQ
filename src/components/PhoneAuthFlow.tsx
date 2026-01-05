'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Smartphone, Hash, Loader2, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { signInWithPhone, verifyPhoneOtp } from '@/app/auth/actions'

interface PhoneAuthFlowProps {
  mode: 'login' | 'signup'
  redirectTo?: string
  initialUsername?: string
}

export function PhoneAuthFlow({ mode, redirectTo = '/', initialUsername = '' }: PhoneAuthFlowProps) {
  const router = useRouter()
  const [step, setStep] = useState<'phone' | 'otp' | 'username'> (mode === 'signup' && !initialUsername ? 'username' : 'phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [username, setUsername] = useState(initialUsername)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Format phone number to E.164 if needed
    let formattedPhone = phone.trim()
    if (!formattedPhone.startsWith('+')) {
      // Default to US if no country code
      formattedPhone = `+1${formattedPhone.replace(/\D/g, '')}`
    }

    const result = await signInWithPhone({ phone: formattedPhone, username, mode })

    if (result?.error) {
      setError(result.error)
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

    try {
      const result = await verifyPhoneOtp({ phone: formattedPhone, token: otp, redirectTo })
      
      if (result?.error) {
        setError(result.error)
        setLoading(false)
      }
    } catch (err: any) {
      if (err.message === 'NEXT_REDIRECT') {
        throw err
      }
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) {
      setError('Please enter a username')
      return
    }

    setLoading(true)
    setError('')

    // Check if username is taken
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

    setStep('phone')
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
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-14 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-zinc-600 focus:border-primary focus:ring-primary text-center font-display text-lg"
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
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
              </Button>
            </form>
          </motion.div>
        )}

        {step === 'phone' && (
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

                <div className="w-full space-y-3">
                <Button
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.length < 6 || success}
                  className="w-full h-14 bg-primary hover:bg-primary/90 text-[#020420] font-display font-black text-lg rounded-xl uppercase tracking-widest"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Code'}
                </Button>
                
                <button 
                  onClick={() => setStep('phone')}
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
