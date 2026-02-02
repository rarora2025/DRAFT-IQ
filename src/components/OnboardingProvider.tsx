'use client'

import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, TrendingDown, Check, ArrowRight, Sparkles, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { usePathname } from 'next/navigation'

interface OnboardingContextType {
  isActive: boolean
  showRules: () => void
  closeRules: () => void
  hasCompletedOnboarding: boolean
  showTooltip: (key: string) => void
  dismissTooltip: (key: string) => void
  activeTooltip: string | null
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

const DEMO_PLAYER = {
  name: 'Josh Allen',
  team: 'BUF',
  projection: 228.5,
  prop: 'Passing Yards',
  photo: 'https://a.espncdn.com/i/headshots/nfl/players/full/3918298.png'
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const [isActive, setIsActive] = useState(false)
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true)
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)

  useEffect(() => {
    if (loading || !user) return

    const publicPaths = ['/login', '/signup']
    if (publicPaths.includes(pathname)) return

    const hasCompleted = localStorage.getItem('onboarding-v2-completed')
    setHasCompletedOnboarding(!!hasCompleted)
    
    if (!hasCompleted) {
      const timer = setTimeout(() => setIsActive(true), 500)
      return () => clearTimeout(timer)
    }
  }, [user, loading, pathname])

  const showRules = () => setIsActive(true)
  
  const closeRules = useCallback(() => {
    setIsActive(false)
    localStorage.setItem('onboarding-v2-completed', 'true')
    setHasCompletedOnboarding(true)
  }, [])

  const showTooltip = useCallback((key: string) => {
    const seen = localStorage.getItem(`tooltip-${key}-seen`)
    if (!seen) {
      setActiveTooltip(key)
    }
  }, [])

  const dismissTooltip = useCallback((key: string) => {
    localStorage.setItem(`tooltip-${key}-seen`, 'true')
    setActiveTooltip(null)
  }, [])

  return (
    <OnboardingContext.Provider value={{ 
      isActive, 
      showRules, 
      closeRules, 
      hasCompletedOnboarding,
      showTooltip,
      dismissTooltip,
      activeTooltip
    }}>
      {children}
      <OnboardingModal />
    </OnboardingContext.Provider>
  )
}

export const useOnboarding = () => {
  const context = useContext(OnboardingContext)
  if (!context) throw new Error('useOnboarding must be used within OnboardingProvider')
  return context
}

function OnboardingModal() {
  const { isActive, closeRules } = useOnboarding()
  const [step, setStep] = useState<'intro' | 'trade' | 'success'>('intro')
  const [selectedSide, setSelectedSide] = useState<'over' | 'under' | null>(null)
  const [isTrading, setIsTrading] = useState(false)

  useEffect(() => {
    if (isActive) {
      setStep('intro')
      setSelectedSide(null)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isActive])

  const handleTrade = async (side: 'over' | 'under') => {
    setSelectedSide(side)
    setIsTrading(true)
    await new Promise(resolve => setTimeout(resolve, 1200))
    setIsTrading(false)
    setStep('success')
  }

  const handleComplete = () => {
    closeRules()
  }

  if (!isActive) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/90 backdrop-blur-md" 
      />
      
      <AnimatePresence mode="wait">
        {step === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-sm bg-[#020420] border border-white/10 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            <div className="absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px]" />

                <div className="relative p-8 sm:p-10 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-10 border border-primary/20 overflow-hidden">
                    <img 
                      src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/200e45b4-6171-4b26-b381-aa6678867b18/logo-1770016126854.png?width=8000&height=8000&resize=contain" 
                      alt="Logo" 
                      className="w-10 h-10 object-contain"
                    />
                  </div>
                  
                  <div className="space-y-8 mb-10 text-left w-full">
                    <div className="flex gap-4">
                      <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-zinc-500">1</div>
                      <div>
                        <p className="text-sm font-black text-primary uppercase tracking-widest leading-tight">find a prop.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-zinc-500">2</div>
                      <div>
                        <p className="text-sm font-black text-primary uppercase tracking-widest leading-tight">pick higher / lower and set a stake amount.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-zinc-500">3</div>
                      <div>
                        <p className="text-sm font-black text-primary uppercase tracking-widest leading-tight">watch the projections change, similar to how a stock price would move.</p>
                      </div>
                    </div>
                  </div>

              <Button 
                onClick={() => setStep('trade')}
                className="w-full h-16 bg-primary hover:bg-primary/90 text-[#020420] font-black text-base rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] group uppercase tracking-widest"
              >
                Let's Trade
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'trade' && (
          <motion.div
            key="trade"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-sm bg-[#020420] border border-white/10 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            <div className="absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            
            <div className="relative p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                  Try a Trade
                </h2>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">
                  Predict Josh Allen's passing yards
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 relative group">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/10 bg-gradient-to-br from-white/5 to-white/0 flex-shrink-0">
                    <img 
                      src={DEMO_PLAYER.photo} 
                      alt={DEMO_PLAYER.name}
                      className="w-full h-full object-cover scale-110"
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">{DEMO_PLAYER.name}</h3>
                    <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest">Passing Yards</p>
                  </div>
                </div>

                <div className="text-center py-4 border-t border-white/5">
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Current Projection</p>
                  <div className="text-5xl font-black font-mono text-white tracking-tighter">
                    {DEMO_PLAYER.projection}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  onClick={() => handleTrade('over')}
                  disabled={isTrading}
                  className="flex flex-col items-center justify-center p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl hover:bg-orange-500/20 transition-colors group"
                >
                  <TrendingUp className="w-6 h-6 text-orange-500 mb-2 group-hover:-translate-y-1 transition-transform" />
                  <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">HIGHER</span>
                </motion.button>
                <motion.button
                  onClick={() => handleTrade('under')}
                  disabled={isTrading}
                  className="flex flex-col items-center justify-center p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl hover:bg-blue-500/20 transition-colors group"
                >
                  <TrendingDown className="w-6 h-6 text-blue-500 mb-2 group-hover:translate-y-1 transition-transform" />
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">LOWER</span>
                </motion.button>
              </div>

              <p className="text-[10px] text-zinc-600 text-center mt-6 font-bold uppercase tracking-widest">
                Pick one to see how it works
              </p>
            </div>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-sm bg-[#020420] border border-white/10 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            <div className="absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />

            <div className="relative p-10 flex flex-col items-center text-center">
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-8">
                    You bought {selectedSide === 'over' ? 'higher' : 'lower'}
                  </h2>
                  
                  <div className="space-y-6 mb-10">
                    <p className="text-sm text-zinc-300 font-bold leading-relaxed">
                      If he had 226 yards or 224 yards you would lose or make all your money on a gambling platform.
                    </p>
                    <p className="text-sm text-zinc-300 font-bold leading-relaxed">
                      On this platform however, you will only lose a little bit if he gets {selectedSide === 'over' ? '224' : '226'} yards and you said {selectedSide === 'over' ? 'higher' : 'lower'} on 225 yards. Similarly, you only make a little if he gets {selectedSide === 'over' ? '226' : '224'}.
                    </p>
                    <p className="text-sm text-zinc-300 font-bold leading-relaxed">
                      However if he doubles his projection you will double your money proportionally.
                    </p>
                    <p className="text-lg font-black text-primary uppercase tracking-[0.2em]">
                      No more bad beats!
                    </p>
                  </div>

                <Button 
                  onClick={handleComplete}
                  className="w-full h-16 bg-primary hover:bg-primary/90 text-[#020420] font-black text-base rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] group uppercase tracking-widest"
                >
                  Start Trading
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function InlineTooltip({ 
  tooltipKey, 
  message, 
  position = 'bottom',
  children 
}: { 
  tooltipKey: string
  message: string
  position?: 'top' | 'bottom'
  children: React.ReactNode 
}) {
  const { activeTooltip, showTooltip, dismissTooltip } = useOnboarding()
  const [hasShown, setHasShown] = useState(false)

  useEffect(() => {
    if (!hasShown) {
      const seen = localStorage.getItem(`tooltip-${tooltipKey}-seen`)
      if (!seen) {
        const timer = setTimeout(() => {
          showTooltip(tooltipKey)
          setHasShown(true)
        }, 500)
        return () => clearTimeout(timer)
      }
    }
  }, [tooltipKey, hasShown, showTooltip])

  const isActive = activeTooltip === tooltipKey

  return (
    <div className="relative">
      {children}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: position === 'bottom' ? -10 : 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: position === 'bottom' ? -10 : 10, scale: 0.95 }}
            className={`absolute left-1/2 -translate-x-1/2 z-50 ${position === 'bottom' ? 'top-full mt-3' : 'bottom-full mb-3'}`}
          >
            <div className="relative bg-primary text-black px-4 py-3 rounded-xl shadow-xl shadow-primary/30 max-w-[280px] w-max">
              <div className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rotate-45 ${position === 'bottom' ? '-top-1.5' : '-bottom-1.5'}`} />
              <p className="text-xs font-bold relative z-10">{message}</p>
              <button 
                onClick={() => dismissTooltip(tooltipKey)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-black rounded-full flex items-center justify-center text-primary hover:bg-zinc-900 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
