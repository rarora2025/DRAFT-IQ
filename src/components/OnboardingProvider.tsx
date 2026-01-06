'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, Wallet, Activity, Zap, Info, Target, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { usePathname } from 'next/navigation'

interface OnboardingContextType {
  isActive: boolean
  showRules: () => void
  closeRules: () => void
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    if (loading || !user) return

    // Don't show onboarding on public pages even if logged in (mostly for landing/auth)
    const publicPaths = ['/login', '/signup']
    if (publicPaths.includes(pathname)) return

    const hasCompleted = localStorage.getItem('onboarding-rules-seen')
    if (!hasCompleted) {
      const timer = setTimeout(() => setIsActive(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [user, loading, pathname])

  const showRules = () => setIsActive(true)
  const closeRules = () => {
    setIsActive(false)
    localStorage.setItem('onboarding-rules-seen', 'true')
  }

  return (
    <OnboardingContext.Provider value={{ isActive, showRules, closeRules }}>
      {children}
      <RulesModal />
    </OnboardingContext.Provider>
  )
}

export const useOnboarding = () => {
  const context = useContext(OnboardingContext)
  if (!context) throw new Error('useOnboarding must be used within OnboardingProvider')
  return context
}

function RulesModal() {
  const { isActive, closeRules } = useOnboarding()
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (isActive) {
      setStep(0)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isActive])

  if (!isActive) return null

    const steps = [
      {
        title: "GET YOUR STAKE",
        icon: <Wallet className="w-8 h-8 text-[#020420] fill-current" />,
        description: "You've been credited with $1,000 in virtual coins. Use these to place trades on your favorite players and build your bankroll.",
        color: "emerald"
      },
      {
        title: "LIVE MARKETS",
        icon: <Activity className="w-8 h-8 text-[#020420] fill-current" />,
        description: "Projections update every second based on live game play. When a player makes a big play, the market reacts instantly.",
        color: "blue"
      },
      {
        title: "PLACE YOUR TRADES",
        icon: <Zap className="w-8 h-8 text-[#020420] fill-current" />,
        description: "Choose OVER if you think a player will beat their projection, or UNDER if you think they'll miss. Trade as often as you want.",
        color: "orange"
      },
      {
        title: "WIN THE CHALLENGE",
        icon: <TrendingUp className="w-8 h-8 text-[#020420] fill-current" />,
        description: "Sell your positions at any time to lock in profit. Build the biggest bankroll to climb the leaderboard and win!",
        color: "purple"
      }
    ]

    const currentStep = steps[step]

    const handleNext = () => {
      if (step < steps.length - 1) {
        setStep(step + 1)
      } else {
        closeRules()
      }
    }

    const handleBack = () => {
      if (step > 0) {
        setStep(step - 1)
      }
    }

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Dark Overlay */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeRules}
          className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer" 
        />
        
          {/* Content */}
                <motion.div
                  key={step}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="relative w-full max-w-sm bg-[#020420] border border-white/10 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
                >
                  {/* Glow Effects */}
                  <div className="absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                  <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />

                  <button 
                    onClick={closeRules}
                    className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 transition-colors z-[110]"
                  >
                    <X className="w-5 h-5 text-zinc-500" />
                  </button>

                  <div className="p-10 flex flex-col items-center text-center">
                    {/* Step Indicator Text */}
                    <span className="text-[10px] font-black tracking-[0.2em] text-primary/60 mb-6 uppercase">
                      Step {step + 1} of {steps.length}
                    </span>

                    {/* Step Progress Dots */}
                    <div className="flex gap-2 mb-10">
                      {steps.map((_, i) => (
                        <div 
                          key={i}
                          className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? 'w-10 bg-primary' : 'w-2.5 bg-white/10'}`}
                        />
                      ))}
                    </div>

                    {/* Icon */}
                    <div className={`w-20 h-20 rounded-[2rem] bg-gradient-to-br ${
                      currentStep.color === 'emerald' ? 'from-emerald-400 to-emerald-600 shadow-emerald-500/30' :
                      currentStep.color === 'blue' ? 'from-blue-500 to-blue-600 shadow-blue-500/30' :
                      currentStep.color === 'orange' ? 'from-orange-500 to-orange-600 shadow-orange-500/30' :
                      'from-purple-500 to-purple-600 shadow-purple-500/30'
                    } flex items-center justify-center mb-8 shadow-2xl ring-8 ring-white/[0.03]`}>
                      {currentStep.icon}
                    </div>

                    <h2 className="text-3xl font-display font-black text-white mb-4 tracking-tight uppercase italic leading-tight">
                      {currentStep.title}
                    </h2>
                    <p className="text-zinc-400 font-medium leading-relaxed mb-10 text-lg">
                      {currentStep.description}
                    </p>

                    <div className="w-full flex gap-3">
                      {step > 0 && (
                        <Button 
                          onClick={handleBack}
                          variant="outline"
                          className="flex-1 h-14 bg-white/5 border-white/10 hover:bg-white/10 text-white font-black text-sm rounded-2xl transition-all uppercase tracking-widest"
                        >
                          Back
                        </Button>
                      )}
                      <Button 
                        onClick={handleNext}
                        className={`${step === 0 ? 'w-full' : 'flex-[2]'} h-14 bg-primary hover:bg-primary/90 text-[#020420] font-black text-sm rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] group uppercase tracking-widest`}
                      >
                        {step === steps.length - 1 ? 'START TRADING' : 'CONTINUE'}
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
      </div>
    )
}

function RuleCard({ icon, title, description, color }: { icon: React.ReactNode, title: string, description: string, color: 'emerald' | 'blue' | 'orange' | 'purple' }) {
  const colorMap = {
    emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20'
  }

  return (
    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 border ${colorMap[color]} group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h4 className="text-white font-bold text-xs mb-0.5">{title}</h4>
      <p className="text-zinc-500 text-[10px] leading-tight font-medium">
        {description}
      </p>
    </div>
  )
}
