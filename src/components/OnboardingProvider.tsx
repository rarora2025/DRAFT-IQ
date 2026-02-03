'use client'

import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, TrendingDown, ArrowRight, ArrowLeft, Timer, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { usePathname, useRouter } from 'next/navigation'

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
  projection: 225.5,
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

    const hasCompleted = localStorage.getItem('onboarding-v3-completed')
    setHasCompletedOnboarding(!!hasCompleted)
    
    if (!hasCompleted) {
      const timer = setTimeout(() => setIsActive(true), 500)
      return () => clearTimeout(timer)
    }
  }, [user, loading, pathname])

  const showRules = () => setIsActive(true)
  
  const closeRules = useCallback(() => {
    setIsActive(false)
    localStorage.setItem('onboarding-v3-completed', 'true')
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

// Screen 1: What This App Is
function Screen1() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-black text-white leading-tight"
        >
          This is not betting.
          <br />
          <span className="text-primary">It's trading expectations.</span>
        </motion.h2>
      </div>

      {/* Player Card Visual */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="relative mx-auto"
      >
        <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-2xl" />
        <div className="relative bg-[#0a0d1f] border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-white/10 bg-gradient-to-br from-white/10 to-transparent">
              <img src={DEMO_PLAYER.photo} alt={DEMO_PLAYER.name} className="w-full h-full object-cover scale-110" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">{DEMO_PLAYER.name}</h3>
              <p className="text-[10px] font-black text-primary uppercase tracking-widest">{DEMO_PLAYER.prop}</p>
            </div>
            <div className="ml-auto px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full">
              <span className="text-[10px] font-black text-red-400 uppercase tracking-wider">LIVE</span>
            </div>
          </div>
          <div className="text-center py-2 border-t border-white/5">
            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Current Projection</p>
            <div className="text-4xl font-black font-mono text-white tracking-tighter">{DEMO_PLAYER.projection}</div>
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="space-y-3 text-center"
      >
        <p className="text-sm text-zinc-300 leading-relaxed">
          On DraftIQ, you trade what you think will happen, not just win or lose.
        </p>
        <p className="text-sm text-zinc-400 leading-relaxed">
          You can buy or sell a player's projected stat at any time during the game.
        </p>
      </motion.div>
    </div>
  )
}

// Screen 2: What You're Trading
function Screen2() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-black text-white"
        >
          You are trading this number
        </motion.h2>
        <motion.div 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="text-4xl"
        >
          👇
        </motion.div>
      </div>

      {/* Zoomed Number Visual */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative mx-auto"
      >
        <div className="absolute inset-0 bg-primary/30 rounded-3xl blur-3xl animate-pulse" />
        <div className="relative bg-[#0a0d1f] border-2 border-primary/40 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10">
                <img src={DEMO_PLAYER.photo} alt={DEMO_PLAYER.name} className="w-full h-full object-cover scale-110" />
              </div>
              <div>
                <p className="text-sm font-black text-white">{DEMO_PLAYER.name}</p>
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{DEMO_PLAYER.prop}</p>
              </div>
            </div>
            <div className="px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-full flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-red-400 uppercase">LIVE</span>
            </div>
          </div>
          
          <div className="text-center py-4 bg-primary/5 rounded-xl border border-primary/20">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="text-6xl font-black font-mono text-primary tracking-tighter"
            >
              {DEMO_PLAYER.projection}
            </motion.div>
            <p className="text-xs font-bold text-primary/60 mt-2 uppercase tracking-widest">Passing Yards</p>
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="space-y-3 text-center"
      >
        <p className="text-sm text-zinc-300 leading-relaxed">
          This number is the market's best guess of how many yards Josh Allen will finish with.
        </p>
        <p className="text-sm text-zinc-400 leading-relaxed">
          You are trading whether that number should go <span className="text-orange-400 font-bold">up</span> or <span className="text-blue-400 font-bold">down</span>.
        </p>
      </motion.div>
    </div>
  )
}

// Screen 3: The Only Choice
function Screen3() {
  const [demoSelected, setDemoSelected] = useState<'higher' | 'lower' | null>(null)

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-black text-white"
        >
          One simple decision
        </motion.h2>
      </div>

      {/* Higher/Lower Buttons Visual */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <div className="text-center">
          <div className="inline-block px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
            <span className="text-3xl font-black font-mono text-white">{DEMO_PLAYER.projection}</span>
            <span className="text-xs text-zinc-500 ml-2 uppercase">yards</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <motion.button
            onClick={() => setDemoSelected('higher')}
            whileTap={{ scale: 0.95 }}
            className={`relative p-5 rounded-2xl transition-all overflow-hidden ${
              demoSelected === 'higher'
                ? 'bg-gradient-to-br from-orange-400 via-orange-500 to-amber-600 border-2 border-orange-300/50 shadow-[0_0_30px_rgba(249,115,22,0.5)]'
                : 'bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20'
            }`}
          >
            {demoSelected === 'higher' && (
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/30 via-transparent to-transparent" />
            )}
            <TrendingUp className={`w-8 h-8 mx-auto mb-2 ${demoSelected === 'higher' ? 'text-white' : 'text-orange-500'}`} />
            <span className={`text-sm font-black uppercase tracking-widest ${demoSelected === 'higher' ? 'text-white' : 'text-orange-500'}`}>
              Higher
            </span>
          </motion.button>

          <motion.button
            onClick={() => setDemoSelected('lower')}
            whileTap={{ scale: 0.95 }}
            className={`relative p-5 rounded-2xl transition-all overflow-hidden ${
              demoSelected === 'lower'
                ? 'bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 border-2 border-blue-300/50 shadow-[0_0_30px_rgba(37,99,235,0.5)]'
                : 'bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20'
            }`}
          >
            {demoSelected === 'lower' && (
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/30 via-transparent to-transparent" />
            )}
            <TrendingDown className={`w-8 h-8 mx-auto mb-2 ${demoSelected === 'lower' ? 'text-white' : 'text-blue-500'}`} />
            <span className={`text-sm font-black uppercase tracking-widest ${demoSelected === 'lower' ? 'text-white' : 'text-blue-500'}`}>
              Lower
            </span>
          </motion.button>
        </div>

        <AnimatePresence>
          {demoSelected && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`text-center py-3 rounded-xl ${
                demoSelected === 'higher' ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-blue-500/10 border border-blue-500/20'
              }`}
            >
              <p className={`text-xs font-bold ${demoSelected === 'higher' ? 'text-orange-400' : 'text-blue-400'}`}>
                {demoSelected === 'higher' ? 'You think he\'ll finish above 225.5 yards' : 'You think he\'ll finish below 225.5 yards'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="space-y-3 text-center"
      >
        <p className="text-sm text-zinc-300 leading-relaxed">
          Think he'll finish above this number? Tap <span className="text-orange-400 font-bold">Higher</span>.
        </p>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Think he'll finish below this number? Tap <span className="text-blue-400 font-bold">Lower</span>.
        </p>
      </motion.div>
    </div>
  )
}

// Screen 4: Key Concept
function Screen4() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-black text-white"
        >
          You don't need to be perfect.
        </motion.h2>
      </div>

      {/* Proportional Results Visual */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative"
      >
        <div className="bg-[#0a0d1f] border border-white/10 rounded-2xl p-6 space-y-6">
          {/* Visual representation of proportional results */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-20 text-right">
                <span className="text-xs font-mono text-zinc-500">close</span>
              </div>
              <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '15%' }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-emerald-500/50 to-emerald-500 rounded-full"
                />
              </div>
              <span className="text-xs font-bold text-emerald-400 w-16">small win</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-20 text-right">
                <span className="text-xs font-mono text-zinc-500">more right</span>
              </div>
              <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '50%' }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-emerald-500/50 to-emerald-500 rounded-full"
                />
              </div>
              <span className="text-xs font-bold text-emerald-400 w-16">more win</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-20 text-right">
                <span className="text-xs font-mono text-zinc-500">very right</span>
              </div>
              <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '90%' }}
                  transition={{ delay: 0.8, duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-emerald-500/50 to-emerald-500 rounded-full"
                />
              </div>
              <span className="text-xs font-bold text-emerald-400 w-16">big win</span>
            </div>

            <div className="border-t border-white/10 my-4" />

            <div className="flex items-center gap-3">
              <div className="w-20 text-right">
                <span className="text-xs font-mono text-zinc-500">a bit wrong</span>
              </div>
              <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '20%' }}
                  transition={{ delay: 1.0, duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-red-500/50 to-red-500 rounded-full"
                />
              </div>
              <span className="text-xs font-bold text-red-400 w-16">small loss</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-20 text-right">
                <span className="text-xs font-mono text-zinc-500">more wrong</span>
              </div>
              <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '60%' }}
                  transition={{ delay: 1.2, duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-red-500/50 to-red-500 rounded-full"
                />
              </div>
              <span className="text-xs font-bold text-red-400 w-16">more loss</span>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="space-y-3 text-center"
      >
        <p className="text-sm text-zinc-300 leading-relaxed">
          If Josh Allen finishes close to this number, you win or lose a little.
        </p>
        <p className="text-sm text-zinc-300 leading-relaxed">
          <span className="text-emerald-400 font-bold">The more right you are, the more you make.</span>
        </p>
        <p className="text-sm text-zinc-300 leading-relaxed">
          <span className="text-red-400 font-bold">The more wrong you are, the more you lose.</span>
        </p>
      </motion.div>
    </div>
  )
}

// Screen 5: Example with Real Numbers
function Screen5() {
  const examples = [
    { result: 228, label: 'small win', color: 'emerald', icon: '+' },
    { result: 240, label: 'bigger win', color: 'emerald', icon: '++' },
    { result: 226, label: 'almost no change', color: 'zinc', icon: '~' },
    { result: 200, label: 'bigger loss', color: 'red', icon: '--' },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-black text-white"
        >
          Example (real numbers)
        </motion.h2>
      </div>

      {/* Entry Point */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 text-center"
      >
        <p className="text-xs text-orange-400 uppercase tracking-widest font-bold mb-1">You buy Higher at</p>
        <div className="flex items-center justify-center gap-2">
          <TrendingUp className="w-5 h-5 text-orange-500" />
          <span className="text-3xl font-black font-mono text-white">225</span>
          <span className="text-sm text-zinc-500 font-bold">yards</span>
        </div>
      </motion.div>

      {/* Results */}
      <div className="space-y-2">
        {examples.map((ex, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.15 }}
            className={`flex items-center gap-3 p-3 rounded-xl border ${
              ex.color === 'emerald' 
                ? 'bg-emerald-500/5 border-emerald-500/20' 
                : ex.color === 'red' 
                  ? 'bg-red-500/5 border-red-500/20'
                  : 'bg-white/5 border-white/10'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${
              ex.color === 'emerald' 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : ex.color === 'red'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-white/10 text-zinc-400'
            }`}>
              {ex.icon}
            </div>
            <div className="flex-1">
              <span className="text-sm text-zinc-400">He finishes at </span>
              <span className="text-sm font-black font-mono text-white">{ex.result}</span>
            </div>
            <span className={`text-xs font-black uppercase tracking-wider ${
              ex.color === 'emerald' ? 'text-emerald-400' : ex.color === 'red' ? 'text-red-400' : 'text-zinc-500'
            }`}>
              {ex.label}
            </span>
          </motion.div>
        ))}
      </div>

      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        className="text-center text-sm text-zinc-400"
      >
        Results change smoothly, not all at once.
      </motion.p>
    </div>
  )
}

// Screen 6: Compare to Betting
function Screen6() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-black text-white"
        >
          Why this feels different
        </motion.h2>
      </div>

      <div className="grid gap-4">
        {/* Other Apps */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 space-y-3"
        >
          <div className="flex items-center gap-2">
            <X className="w-5 h-5 text-red-500" />
            <span className="text-sm font-black text-red-400 uppercase tracking-widest">Most Apps</span>
          </div>
          <div className="space-y-2 pl-7">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
              <span className="text-sm text-zinc-400">Right = win</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
              <span className="text-sm text-zinc-400">Wrong = <span className="text-red-400 font-bold">lose everything</span></span>
            </div>
          </div>
        </motion.div>

        {/* DraftIQ */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-3"
        >
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-[10px] font-black text-black">IQ</span>
            </div>
            <span className="text-sm font-black text-primary uppercase tracking-widest">DraftIQ</span>
          </div>
          <div className="space-y-2 pl-7">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
              <span className="text-sm text-zinc-300">A little right = <span className="text-emerald-400 font-bold">a little win</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
              <span className="text-sm text-zinc-300">Very right = <span className="text-emerald-400 font-bold">bigger win</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
              <span className="text-sm text-zinc-300">A little wrong = <span className="text-amber-400 font-bold">small loss</span></span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// Screen 7: Exit Anytime
function Screen7() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-black text-white"
        >
          You can exit anytime
        </motion.h2>
      </div>

      {/* Exit Button Visual */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="relative mx-auto"
      >
        <div className="bg-[#0a0d1f] border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10">
                <img src={DEMO_PLAYER.photo} alt={DEMO_PLAYER.name} className="w-full h-full object-cover scale-110" />
              </div>
              <div>
                <p className="text-sm font-black text-white">{DEMO_PLAYER.name}</p>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3 text-orange-500" />
                  <span className="text-[10px] font-bold text-orange-400">+12.5 IQ</span>
                </div>
              </div>
            </div>
            <motion.button
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ delay: 0.6, duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              className="px-4 py-2 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-primary/30"
            >
              Sell
            </motion.button>
          </div>
          
          <div className="flex items-center justify-center gap-2 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <Timer className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-400 font-bold">Lock in your profit now</span>
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="space-y-3 text-center"
      >
        <p className="text-sm text-zinc-300 leading-relaxed">
          You don't have to wait for the game to end.
        </p>
        <p className="text-sm text-zinc-400 leading-relaxed">
          If new info comes in, you can sell and lock in your result instantly.
        </p>
      </motion.div>
    </div>
  )
}

// Screen 8: What This Rewards
function Screen8() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-black text-white"
        >
          DraftIQ rewards good instincts
        </motion.h2>
      </div>

      {/* Game Moment Visual */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative overflow-hidden rounded-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-transparent to-black/80" />
        <div className="relative bg-[#0a0d1f] border border-white/10 rounded-2xl p-6">
          {/* Simplified game visual */}
          <div className="flex items-center justify-center gap-8 mb-4">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-1">
                <span className="text-white font-black text-lg">BUF</span>
              </div>
              <span className="text-xs text-zinc-500 font-bold">17</span>
            </motion.div>
            
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: "spring" }}
              className="flex flex-col items-center"
            >
              <Zap className="w-6 h-6 text-primary animate-pulse" />
              <span className="text-[10px] text-primary font-black uppercase tracking-widest mt-1">Q3</span>
            </motion.div>

            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center mb-1">
                <span className="text-white font-black text-lg">KC</span>
              </div>
              <span className="text-xs text-zinc-500 font-bold">14</span>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="text-center py-3 bg-primary/10 rounded-xl border border-primary/20"
          >
            <p className="text-[10px] text-primary font-black uppercase tracking-widest">
              Josh Allen 3rd & Goal
            </p>
          </motion.div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        className="space-y-3 text-center"
      >
        <p className="text-sm text-zinc-300 leading-relaxed">
          If you react faster or think better than the crowd, you get paid for it.
        </p>
        <p className="text-sm text-primary font-bold leading-relaxed">
          This is about reading the game — not luck.
        </p>
      </motion.div>
    </div>
  )
}

// Screen 9: CTA
function Screen9({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-8 flex flex-col items-center justify-center min-h-[400px]">
      <div className="text-center space-y-2">
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-black text-white"
        >
          Try your first trade
        </motion.h2>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="relative"
      >
        <div className="absolute inset-0 bg-primary/30 rounded-full blur-3xl animate-pulse" />
        <div className="relative w-32 h-32 bg-primary/20 rounded-full flex items-center justify-center border-4 border-primary/40">
          <TrendingUp className="w-16 h-16 text-primary" />
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="space-y-2 text-center"
      >
        <p className="text-sm text-zinc-300 leading-relaxed">
          Pick Higher or Lower on your first player.
        </p>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Start small. Learn fast.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="w-full"
      >
        <Button 
          onClick={onComplete}
          className="w-full h-16 bg-primary hover:bg-primary/90 text-black font-black text-base rounded-2xl shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98] group uppercase tracking-widest"
        >
          Make My First Trade
          <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </motion.div>
    </div>
  )
}

function OnboardingModal() {
  const { isActive, closeRules } = useOnboarding()
  const router = useRouter()
  const [currentScreen, setCurrentScreen] = useState(0)
  const totalScreens = 9

  useEffect(() => {
    if (isActive) {
      setCurrentScreen(0)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isActive])

  const handleNext = () => {
    if (currentScreen < totalScreens - 1) {
      setCurrentScreen(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentScreen > 0) {
      setCurrentScreen(prev => prev - 1)
    }
  }

  const handleComplete = () => {
    closeRules()
    router.push('/markets')
  }

  const handleSkip = () => {
    closeRules()
  }

  if (!isActive) return null

  const screens = [
    <Screen1 key={0} />,
    <Screen2 key={1} />,
    <Screen3 key={2} />,
    <Screen4 key={3} />,
    <Screen5 key={4} />,
    <Screen6 key={5} />,
    <Screen7 key={6} />,
    <Screen8 key={7} />,
    <Screen9 key={8} onComplete={handleComplete} />,
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/95 backdrop-blur-xl" 
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className="relative w-full max-w-md bg-[#020420] border border-white/10 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px]" />

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-6 right-6 z-10 text-[10px] font-black text-zinc-600 uppercase tracking-widest hover:text-zinc-400 transition-colors"
        >
          Skip
        </button>

        {/* Progress dots */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
          {Array.from({ length: totalScreens }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentScreen(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentScreen 
                  ? 'bg-primary w-6' 
                  : i < currentScreen 
                    ? 'bg-primary/40' 
                    : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative p-8 pt-16 min-h-[500px] flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScreen}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex-1"
            >
              {screens[currentScreen]}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          {currentScreen < totalScreens - 1 && (
            <div className="mt-8 flex items-center justify-between gap-4">
              <Button
                onClick={handlePrev}
                disabled={currentScreen === 0}
                className={`h-14 px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${
                  currentScreen === 0 
                    ? 'bg-transparent text-transparent cursor-default' 
                    : 'bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-white'
                }`}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1 h-14 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </motion.div>
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
