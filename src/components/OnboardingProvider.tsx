'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, X, MousePointer2, TrendingUp, Wallet, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Step {
  id: string
  title: string
  content: string
  targetId?: string
  action?: 'click' | 'none'
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

const ONBOARDING_STEPS: Step[] = [
  {
    id: 'welcome',
    title: 'Welcome to Projection Trading!',
    content: 'This is where you trade live player projections. Let us show you how to place your first trade.',
    position: 'center'
  },
  {
    id: 'balance',
    title: 'Your Starting Capital',
    content: 'We have started you off with $1,000 in virtual coins. Use this to trade player props.',
    targetId: 'tutorial-balance',
    position: 'bottom'
  },
  {
    id: 'projection',
    title: 'Live Projections',
    content: 'This number is the live prediction of a player\'s performance (e.g., Points). It moves in real-time!',
    targetId: 'tutorial-projection',
    position: 'bottom'
  },
  {
    id: 'trade-size',
    title: 'Choose Your Size',
    content: 'Select how much you want to trade. Larger trades mean more potential profit (or loss).',
    targetId: 'tutorial-trade-size',
    position: 'top'
  },
  {
    id: 'trade-action',
    title: 'Place Your Trade',
    content: 'Click OVER if you think the player will beat the projection, or UNDER if you think they will stay below it.',
    targetId: 'tutorial-trade-buttons',
    position: 'top'
  }
]

interface OnboardingContextType {
  isActive: boolean
  currentStep: number
  startTutorial: () => void
  nextStep: () => void
  completeTutorial: () => void
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const hasCompleted = localStorage.getItem('tutorial-completed')
    if (!hasCompleted) {
      // Small delay to ensure page is rendered
      const timer = setTimeout(() => setIsActive(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const startTutorial = () => {
    setCurrentStep(0)
    setIsActive(true)
  }

  const nextStep = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      completeTutorial()
    }
  }

  const completeTutorial = () => {
    setIsActive(false)
    localStorage.setItem('tutorial-completed', 'true')
  }

  return (
    <OnboardingContext.Provider value={{ isActive, currentStep, startTutorial, nextStep, completeTutorial }}>
      {children}
      <TutorialOverlay />
    </OnboardingContext.Provider>
  )
}

export const useOnboarding = () => {
  const context = useContext(OnboardingContext)
  if (!context) throw new Error('useOnboarding must be used within OnboardingProvider')
  return context
}

function TutorialOverlay() {
  const { isActive, currentStep, nextStep, completeTutorial } = useOnboarding()
  const [rect, setRect] = useState<DOMRect | null>(null)

  const step = ONBOARDING_STEPS[currentStep]

  useEffect(() => {
    if (!isActive || !step.targetId) {
      setRect(null)
      return
    }

    const updateRect = () => {
      const el = document.getElementById(step.targetId!)
      if (el) {
        setRect(el.getBoundingClientRect())
      }
    }

    updateRect()
    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect)
    return () => {
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect)
    }
  }, [isActive, step])

  if (!isActive) return null

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Dark Overlay with Hole */}
      <div className="absolute inset-0 bg-black/70 transition-opacity duration-500 pointer-events-auto" />
      
      {rect && (
        <motion.div
            initial={false}
            animate={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            }}
            className="absolute bg-white/10 rounded-xl border-2 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)] pointer-events-none z-[101]"
            style={{ mixBlendMode: 'overlay' as any }}
        />
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
            transition: { type: 'spring', damping: 20, stiffness: 300 }
          }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          className={`absolute pointer-events-auto z-[102] w-full max-w-[320px] p-6 rounded-2xl bg-[#1a1a24] border border-[#27272a] shadow-2xl ${
            !rect ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''
          }`}
          style={rect ? {
            top: step.position === 'top' ? rect.top - 20 : step.position === 'bottom' ? rect.bottom + 20 : rect.top + rect.height/2,
            left: '50%',
            transform: 'translateX(-50%)' + (step.position === 'top' ? ' translateY(-100%)' : step.position === 'bottom' ? '' : ' translateY(-50%)')
          } : undefined}
        >
          <button 
            onClick={completeTutorial}
            className="absolute top-3 right-3 p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4 text-zinc-500" />
          </button>

          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <MousePointer2 className="w-4 h-4 text-emerald-500" />
            </div>
            <h3 className="font-display font-bold text-lg text-white leading-tight">{step.title}</h3>
          </div>

          <p className="text-zinc-400 text-sm leading-relaxed mb-6">
            {step.content}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {ONBOARDING_STEPS.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1 rounded-full transition-all ${i === currentStep ? 'w-4 bg-emerald-500' : 'w-1 bg-zinc-700'}`}
                />
              ))}
            </div>
            <Button 
              onClick={nextStep}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-10 px-6 rounded-xl group"
            >
              {currentStep === ONBOARDING_STEPS.length - 1 ? 'Start Trading' : 'Next'}
              <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
