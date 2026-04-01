'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Coins, ArrowLeft, Loader2, ShieldCheck, DollarSign, Info, ArrowDownToLine, X, CheckCircle } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, ExpressCheckoutElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const PRESETS = [5, 10, 25, 50]

function CheckoutForm({ amount, onBack }: { amount: number; onBack: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [elementReady, setElementReady] = useState(false)
  const [expressAvailable, setExpressAvailable] = useState(false)

  const confirmPayment = async () => {
    if (!stripe || !elements) return false
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/rewards/success` },
    })
    if (error) {
      toast.error(error.message || 'Payment failed')
      return false
    }
    return true
  }

  const handleExpressConfirm = async () => {
    setLoading(true)
    await confirmPayment()
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await confirmPayment()
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Apple Pay / Google Pay express buttons */}
      <ExpressCheckoutElement
        onConfirm={handleExpressConfirm}
        onReady={(e) => setExpressAvailable((e.availablePaymentMethods?.applePay || e.availablePaymentMethods?.googlePay) ?? false)}
        options={{
          buttonType: { applePay: 'buy', googlePay: 'buy' },
          layout: { maxColumns: 2, maxRows: 1, overflow: 'never' },
        }}
      />

      {expressAvailable && (
        <div className="relative flex items-center gap-3">
          <div className="flex-1 border-t border-white/10" />
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">or pay with card</span>
          <div className="flex-1 border-t border-white/10" />
        </div>
      )}

      {/* Regular card payment */}
      <div className="relative min-h-[120px]">
        {!elementReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs text-zinc-500 uppercase tracking-widest">Loading payment...</p>
            </div>
          </div>
        )}
        <div className={elementReady ? 'opacity-100' : 'opacity-0'}>
          <PaymentElement
            onReady={() => setElementReady(true)}
            options={{
              layout: 'tabs',
              paymentMethodOrder: ['card'],
            }}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={!stripe || loading || !elementReady}
        className="w-full bg-primary text-black font-black uppercase tracking-wider py-4 rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-[0_0_20px_rgba(61,225,0,0.2)]"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'Processing...' : `Add $${amount.toFixed(2)}`}
      </button>
      <button
        type="button"
        onClick={onBack}
        className="w-full text-zinc-500 text-sm hover:text-white transition-colors py-1"
      >
        ← Change amount
      </button>
    </form>
  )
}

export default function AddFundsPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)
  const router = useRouter()

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [creatingIntent, setCreatingIntent] = useState(false)

  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [withdrawSuccess, setWithdrawSuccess] = useState(false)

  const currentCoins = profile?.balance || 0

  const handleAmountConfirm = async (amount: number) => {
    if (!user) {
      router.push('/login')
      return
    }
    setCreatingIntent(true)
    try {
      const res = await fetch('/api/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSelectedAmount(amount)
      setClientSecret(data.clientSecret)
    } catch (err: any) {
      toast.error(err.message || 'Failed to initialize payment')
    } finally {
      setCreatingIntent(false)
    }
  }

  const handleWithdraw = async () => {
    const amt = parseFloat(withdrawAmount)
    if (!amt || amt <= 0) return
    setWithdrawLoading(true)
    try {
      const res = await fetch('/api/withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setWithdrawSuccess(true)
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit request')
    } finally {
      setWithdrawLoading(false)
    }
  }

  const customAmountNum = parseFloat(customAmount)
  const isValidCustom =
    customAmount !== '' && !isNaN(customAmountNum) && customAmountNum >= 1 && customAmountNum <= 1000

  return (
    <div className="min-h-screen bg-background text-white overflow-x-hidden flex flex-col items-center relative pb-32">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.06, 0.13, 0.06] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-green-400/10 rounded-full blur-[120px]"
        />
      </div>

      <div className="max-w-md w-full mx-auto px-4 py-8 relative z-10 space-y-8">
        {/* Back button */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={() => router.push('/rewards')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Rewards
          </button>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-center space-y-3"
        >
          <div className="flex items-center justify-center mb-2">
            <div className="p-3 bg-green-400/10 rounded-2xl border border-green-400/20">
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Add Funds</h1>
          <p className="text-zinc-400 text-sm max-w-xs mx-auto leading-relaxed">
            Deposit with card, Apple Pay, or Google Pay. Funds are added instantly.
          </p>
          <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-md rounded-full px-5 py-2 border border-white/10">
            <Coins className="w-4 h-4 text-green-400" />
            <span className="font-bold text-sm">${(currentCoins / 100).toFixed(2)} balance</span>
          </div>
        </motion.div>

        {/* Main content */}
        <AnimatePresence mode="wait">
          {!clientSecret ? (
            <motion.div
              key="amount-select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Preset grid */}
              <div className="grid grid-cols-2 gap-3">
                {PRESETS.map((preset) => (
                  <motion.button
                    key={preset}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleAmountConfirm(preset)}
                    disabled={creatingIntent}
                    className="relative bg-white/5 border border-white/10 hover:border-green-400/40 hover:bg-green-400/5 rounded-2xl p-5 transition-all disabled:opacity-50 text-left"
                  >
                    <p className="text-2xl font-black">${preset}</p>
                    {creatingIntent && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-2xl">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>

              {/* Custom amount */}
              <div className="space-y-3">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-lg">
                    $
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    step="1"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Custom amount"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-8 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-400/40 transition-colors text-lg font-bold"
                  />
                </div>
                <AnimatePresence>
                  {isValidCustom && (
                    <motion.button
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onClick={() => handleAmountConfirm(customAmountNum)}
                      disabled={creatingIntent}
                      className="w-full bg-green-400/10 border border-green-400/30 text-green-300 font-black uppercase tracking-wider py-3 rounded-xl hover:bg-green-400/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                    >
                      {creatingIntent && <Loader2 className="w-4 h-4 animate-spin" />}
                      Continue with ${customAmountNum.toFixed(2)}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="payment-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400 font-medium">Depositing</p>
                <p className="text-xl font-black text-green-400">${selectedAmount?.toFixed(2)}</p>
              </div>
              <div className="border-t border-white/5" />
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'night',
                    variables: {
                      colorPrimary: '#4ade80',
                      colorBackground: '#0d0f1a',
                      colorText: '#ffffff',
                      colorTextSecondary: '#71717a',
                      colorTextPlaceholder: '#52525b',
                      borderRadius: '12px',
                      fontSizeBase: '14px',
                    },
                    rules: {
                      '.Input': {
                        border: '1px solid rgba(255,255,255,0.1)',
                        backgroundColor: 'rgba(255,255,255,0.04)',
                      },
                      '.Input:focus': {
                        border: '1px solid rgba(74,222,128,0.4)',
                        boxShadow: 'none',
                      },
                      '.Tab': {
                        border: '1px solid rgba(255,255,255,0.08)',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                      },
                      '.Tab--selected': {
                        border: '1px solid rgba(74,222,128,0.4)',
                        backgroundColor: 'rgba(74,222,128,0.06)',
                      },
                    },
                  },
                }}
              >
                <CheckoutForm
                  amount={selectedAmount!}
                  onBack={() => {
                    setClientSecret(null)
                    setSelectedAmount(null)
                  }}
                />
              </Elements>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Test mode banner */}
        {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-start gap-3 bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-4 text-xs"
          >
            <Info className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
            <div className="space-y-1 text-yellow-200/80">
              <p className="font-bold text-yellow-300">Test Mode — Use a test card</p>
              <p>Card: <span className="font-mono font-bold text-white">4242 4242 4242 4242</span></p>
              <p>Expiry: <span className="font-mono text-white">12/26</span> &nbsp; CVC: <span className="font-mono text-white">123</span> &nbsp; ZIP: <span className="font-mono text-white">10001</span></p>
            </div>
          </motion.div>
        )}

        {/* Security badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-2 text-zinc-500 text-xs"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Secure payment powered by Stripe. All transactions encrypted.</span>
        </motion.div>

        {/* Withdraw button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center"
        >
          <button
            onClick={() => { setShowWithdrawModal(true); setWithdrawSuccess(false); setWithdrawAmount('') }}
            className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition-colors border border-white/10 hover:border-white/20 rounded-xl px-5 py-2.5"
          >
            <ArrowDownToLine className="w-4 h-4" />
            Request Withdrawal
          </button>
        </motion.div>
      </div>

      {/* Withdrawal Modal */}
      <AnimatePresence>
        {showWithdrawModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowWithdrawModal(false) }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#0d0f1a] border border-white/10 rounded-3xl p-8 w-full max-w-sm space-y-6 shadow-2xl"
            >
              {withdrawSuccess ? (
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <CheckCircle className="w-14 h-14 text-green-400" />
                  </div>
                  <h2 className="text-2xl font-black uppercase tracking-tight">Request Sent!</h2>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    We will reach out with details to send your funds. Please allow 1–3 business days.
                  </p>
                  <button
                    onClick={() => setShowWithdrawModal(false)}
                    className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest text-sm transition-all"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black uppercase tracking-tight">Request Withdrawal</h2>
                    <button onClick={() => setShowWithdrawModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <p className="text-zinc-400 text-xs uppercase tracking-widest">Available balance</p>
                    <p className="text-2xl font-black text-green-400">${(currentCoins / 100).toFixed(2)}</p>
                  </div>
                  <div className="space-y-3">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-lg">$</span>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="Amount to withdraw"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-8 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-400/40 transition-colors text-lg font-bold"
                        autoFocus
                      />
                    </div>
                    <button
                      onClick={handleWithdraw}
                      disabled={withdrawLoading || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                      className="w-full py-4 rounded-xl bg-green-400/10 border border-green-400/30 text-green-300 font-black uppercase tracking-wider hover:bg-green-400/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                    >
                      {withdrawLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {withdrawLoading ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                  <p className="text-zinc-500 text-xs text-center leading-relaxed">
                    We will email you with details to process your withdrawal within 1–3 business days.
                  </p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Navbar isDark={isDark} />
    </div>
  )
}
