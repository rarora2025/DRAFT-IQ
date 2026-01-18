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
              <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight leading-tight mb-6">
                Trade player<br/>
                <span className="text-primary italic">projections</span>
              </h1>

              <div className="space-y-4 mb-8">
                <p className="text-zinc-300 text-sm sm:text-base leading-relaxed">
                  Think of each player's line as a <span className="text-white font-bold">stock</span>. Buy <span className="text-orange-500 font-bold uppercase">Higher</span> if you think his projection will rise, or <span className="text-blue-500 font-bold uppercase">Lower</span> if you think it'll fall.
                </p>
                
                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed italic">
                  Example: Mahomes line is 200 yards. Buy High if you think his final line ends higher.
                </p>

                <p className="text-zinc-300 text-sm sm:text-base leading-relaxed">
                  As the game happens, the line moves live—and so does your price. <span className="text-primary font-bold">Sell at any time</span> to lock in profit.
                </p>

                <p className="text-zinc-400 text-[11px] sm:text-xs leading-relaxed">
                  Stick it out until the end, and the line will converge to the final actual stats.
                </p>
                
                <p className="text-zinc-500 text-[10px] sm:text-xs uppercase tracking-widest font-bold">
                  Trade the projection. Control your fate.
                </p>
              </div>

              <Button 
                onClick={() => setStep('trade')}
                className="w-full h-14 sm:h-16 bg-primary hover:bg-primary/90 text-[#020420] font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] group uppercase tracking-widest"
              >
                Start with $1,000
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
            
            <div className="relative p-6 sm:p-8">
              <div className="text-center mb-6">
                <p className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] mb-2">
                  Your First Trade
                </p>
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                  Make a prediction
                </h2>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 mb-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-white/10 bg-gradient-to-br from-white/5 to-white/0 flex-shrink-0">
                    <img 
                      src={DEMO_PLAYER.photo} 
                      alt={DEMO_PLAYER.name}
                      className="w-full h-full object-cover scale-110"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-black text-white truncate">{DEMO_PLAYER.name}</h3>
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{DEMO_PLAYER.team} • {DEMO_PLAYER.prop}</p>
                  </div>
                </div>

                <div className="text-center py-4 border-t border-white/10">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1">
                    Current Projection
                  </p>
                  <div className="text-4xl sm:text-5xl font-black font-mono text-primary">
                    {DEMO_PLAYER.projection}
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <motion.button
                  onClick={() => handleTrade('over')}
                  disabled={isTrading}
                  whileHover={{ scale: isTrading ? 1 : 1.02 }}
                  whileTap={{ scale: isTrading ? 1 : 0.98 }}
                  className={`w-full h-14 sm:h-16 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl transition-all border-b-4 sm:border-b-8 border-orange-700 active:border-b-0 active:translate-y-1 flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isTrading && selectedSide === 'over' ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:-translate-y-1" />
                      <span className="font-black text-sm sm:text-base uppercase tracking-[0.15em]">
                        Buy HIGHER
                      </span>
                    </>
                  )}
                </motion.button>

                <motion.button
                  onClick={() => handleTrade('under')}
                  disabled={isTrading}
                  whileHover={{ scale: isTrading ? 1 : 1.02 }}
                  whileTap={{ scale: isTrading ? 1 : 0.98 }}
                  className={`w-full h-14 sm:h-16 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl transition-all border-b-4 sm:border-b-8 border-blue-700 active:border-b-0 active:translate-y-1 flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isTrading && selectedSide === 'under' ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:translate-y-1" />
                      <span className="font-black text-sm sm:text-base uppercase tracking-[0.15em]">
                        Buy LOWER
                      </span>
                    </>
                  )}
                </motion.button>
              </div>

              <div className="text-center space-y-2">
                <p className="text-xs text-zinc-500">
                  <span className="font-bold text-white">$100</span> demo trade
                </p>
                <p className="text-[11px] text-zinc-600 italic">
                  You can sell anytime.
                </p>
              </div>
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

            <div className="relative p-8 sm:p-10 flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
                className="relative w-24 h-24 mb-8"
              >
                <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl animate-pulse" />
                <div className="relative w-full h-full bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 border-4 border-white/20">
                  <Check className="w-12 h-12 text-black stroke-[4]" />
                </div>
              </motion.div>

              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mb-3">
                You're in!
              </h2>
              
              <p className="text-zinc-400 text-base leading-relaxed mb-2 max-w-[260px]">
                You just went <span className={`font-bold ${selectedSide === 'over' ? 'text-orange-500' : 'text-blue-500'}`}>
                  {selectedSide === 'over' ? 'HIGHER' : 'LOWER'}
                </span> on {DEMO_PLAYER.name}.
              </p>
              
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-8">
                <p className="text-sm text-zinc-300">
                  {selectedSide === 'over' 
                    ? 'If his projection rises, sell for profit.' 
                    : 'If his projection drops, sell for profit.'}
                </p>
              </div>

              <div className="w-full space-y-4">
                <Button 
                  onClick={handleComplete}
                  className="w-full h-14 sm:h-16 bg-primary hover:bg-primary/90 text-[#020420] font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] group uppercase tracking-widest"
                >
                  Browse Markets
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
                  Projections move live as plays happen
                </p>
              </div>
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
