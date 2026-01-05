'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, Wallet, Activity, Zap, Info, Target, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

interface OnboardingContextType {
  isActive: boolean
  showRules: () => void
  closeRules: () => void
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    if (loading || !user) return

    const hasCompleted = localStorage.getItem('onboarding-rules-seen')
    if (!hasCompleted) {
      const timer = setTimeout(() => setIsActive(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [user, loading])

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
      title: "STARTING STAKE",
      icon: <Wallet className="w-8 h-8 text-[#020420] fill-current" />,
      description: "Every trader starts with $1,000 in virtual coins. Use them to build your portfolio and climb the leaderboard.",
      color: "emerald"
    },
    {
      title: "LIVE PROJECTIONS",
      icon: <Activity className="w-8 h-8 text-[#020420] fill-current" />,
      description: "Our projections update in real-time based on game events. Watch the numbers move as players perform.",
      color: "blue"
    },
    {
      title: "MAKING TRADES",
      icon: <Zap className="w-8 h-8 text-[#020420] fill-current" />,
      description: "Predict if a player will go OVER or UNDER their current projection. Trade as many times as you want.",
      color: "orange"
    },
    {
      title: "EXIT ANYTIME",
      icon: <TrendingUp className="w-8 h-8 text-[#020420] fill-current" />,
      description: "Lock in your profits or cut your losses at any moment. Your active stake fluctuates with the market.",
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
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="relative w-full max-w-sm bg-[#020420] border border-white/10 rounded-[2rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
              >
                {/* Glow Effects */}
                <div className="absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />

                <button 
                  onClick={closeRules}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 transition-colors z-[110]"
                >
                  <X className="w-4 h-4 text-zinc-500" />
                </button>

                <div className="p-8 flex flex-col items-center text-center">
                  {/* Step Progress */}
                  <div className="flex gap-1.5 mb-8">
                    {steps.map((_, i) => (
                      <div 
                        key={i}
                        className={`h-1 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-primary' : 'w-2 bg-white/10'}`}
                      />
                    ))}
                  </div>

                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${
                    currentStep.color === 'emerald' ? 'from-emerald-400 to-emerald-600 shadow-emerald-500/20' :
                    currentStep.color === 'blue' ? 'from-blue-500 to-blue-600 shadow-blue-500/20' :
                    currentStep.color === 'orange' ? 'from-orange-500 to-orange-600 shadow-orange-500/20' :
                    'from-purple-500 to-purple-600 shadow-purple-500/20'
                  } flex items-center justify-center mb-6 shadow-lg ring-4 ring-white/5`}>
                    {currentStep.icon}
                  </div>

                  <h2 className="text-2xl font-display font-black text-white mb-3 tracking-tight uppercase italic">
                    {currentStep.title}
                  </h2>
                  <p className="text-zinc-400 font-medium leading-relaxed mb-8">
                    {currentStep.description}
                  </p>

                  <Button 
                    onClick={handleNext}
                    className="w-full h-14 bg-primary hover:bg-primary/90 text-[#020420] font-black text-sm rounded-xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] group uppercase tracking-widest"
                  >
                    {step === steps.length - 1 ? 'START TRADING' : 'NEXT'}
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
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
