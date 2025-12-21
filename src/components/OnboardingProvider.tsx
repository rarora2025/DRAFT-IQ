'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, Wallet, Activity, Zap, Info, Target, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OnboardingContextType {
  isActive: boolean
  showRules: () => void
  closeRules: () => void
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    const hasCompleted = localStorage.getItem('onboarding-rules-seen')
    if (!hasCompleted) {
      const timer = setTimeout(() => setIsActive(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

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

  if (!isActive) return null

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
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          y: 0,
          transition: { type: 'spring', damping: 25, stiffness: 300 }
        }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-2xl bg-[#0a0a0f] border border-zinc-800/50 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden"
      >
          {/* Glow Effects */}
          <div className="absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-orange-500/10 rounded-full blur-[100px]" />

          <button 
            onClick={closeRules}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-zinc-800/50 transition-colors z-10"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>

          <div className="p-8 md:p-12">
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-6 shadow-lg shadow-primary/20 ring-4 ring-primary/10">
                <Zap className="w-8 h-8 text-[#020420] fill-current" />
              </div>
              <h2 className="text-4xl font-display font-black text-white mb-2 tracking-tight">
                HOW TO <span className="text-primary">PLAY</span>
              </h2>
              <p className="text-zinc-500 font-medium uppercase tracking-widest text-xs">Master the art of live projection trading</p>
            </div>

            {/* Rules Grid */}
            <div className="grid md:grid-cols-2 gap-6 mb-10">
              <RuleCard 
                icon={<Wallet className="w-5 h-5" />}
                color="primary"
                title="Starting Capital"
                description="Every new account starts with $1,000 virtual coins to begin trading player props."
              />
              <RuleCard 
                icon={<Activity className="w-5 h-5" />}
                color="blue"
                title="Live Projections"
                description="Predictions update in real-time as the game happens. Watch them move every second!"
              />
              <RuleCard 
                icon={<Target className="w-5 h-5" />}
                color="orange"
                title="Over or Under"
                description="Think a player will beat the projection? Go OVER. Think they'll fall short? Go UNDER."
              />
              <RuleCard 
                icon={<TrendingUp className="w-5 h-5" />}
                color="purple"
                title="Live Trading"
                description="Enter and exit positions anytime during the game to lock in profits or cut losses."
              />
            </div>

            {/* Bottom Action */}
            <div className="flex flex-col items-center gap-4">
              <Button 
                onClick={closeRules}
                className="w-full max-w-sm h-14 bg-primary hover:bg-primary/90 text-[#020420] font-black text-lg rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] group uppercase tracking-widest"
              >
                START TRADING NOW
                <ArrowRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <p className="text-zinc-600 text-xs font-semibold uppercase tracking-widest">
                No real money involved • Live Data Powered
              </p>
            </div>
        </div>
      </motion.div>
    </div>
  )
}

function RuleCard({ icon, title, description, color }: { icon: React.ReactNode, title: string, description: string, color: 'primary' | 'blue' | 'orange' | 'purple' }) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20'
  }

  return (
    <div className="p-5 rounded-3xl bg-zinc-900/40 border border-zinc-800/50 hover:border-zinc-700/50 transition-all group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 border ${colorMap[color]} group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h4 className="text-white font-bold mb-1.5">{title}</h4>
      <p className="text-zinc-500 text-sm leading-relaxed font-medium">
        {description}
      </p>
    </div>
  )
}
