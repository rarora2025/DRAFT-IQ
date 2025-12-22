'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, TrendingUp, TrendingDown, Loader2, Trophy, ChevronDown, Search, Sun, Moon, User, Activity, ArrowLeft, Info } from 'lucide-react'
import Link from 'next/link'
import { TradingChart } from '@/components/TradingChart'
import { TradePanel } from '@/components/TradePanel'
import { PositionCard } from '@/components/PositionCard'
import { Navbar } from '@/components/Navbar'
import { InfoTooltip } from '@/components/InfoTooltip'
import { useAuth } from '@/hooks/useAuth'
import { useNBAData } from '@/hooks/useNBAData'
import { useProfile } from '@/hooks/useProfile'
import { usePositions } from '@/hooks/usePositions'
import { useTheme } from '@/hooks/useTheme'
import { useOnboarding } from '@/components/OnboardingProvider'
import { getTeamLogoUrl } from '@/lib/team-utils'

const PROP_NAMES: Record<string, string> = {
  'player_points': 'Points',
  'player_pass_yds': 'Passing Yards',
  'player_rush_yds': 'Rushing Yards',
  'player_reception_yds': 'Receiving Yards',
}

export default function TradingPage() {
  const params = useParams()
  const gameId = params?.gameId as string
  const playerId = params?.playerId as string

  const { user, loading: authLoading } = useAuth()
  const {
      selectedGame,
      props,
      selectedProp,
      history,
      loading: nbaLoading,
      refresh
    } = useNBAData(gameId, playerId)
    
  const isExpired = selectedProp?.status === 'expired'
  const isCompleted = selectedGame?.status === 'completed'

    const { profile, loading: profileLoading, updateBalance } = useProfile(user?.id)
    const { positions, openPosition, closePosition } = usePositions(user?.id)
    const [closingPosition, setClosingPosition] = useState<string | null>(null)
    const liquidatingRef = useRef<Set<string>>(new Set())
    const { theme } = useTheme()
    const { showRules } = useOnboarding()

  useEffect(() => {
    // Save current path as last viewed market
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastMarketPath', window.location.pathname)
    }
  }, [gameId, playerId])

  const currentPrice = selectedProp?.current_value || selectedProp?.line || 0


              {activePositions.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h2 className="font-display font-black text-xs uppercase tracking-[0.2em] text-muted-foreground">Active Positions</h2>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">LIVE</span>
                    </div>
                  </div>
                  <AnimatePresence mode="popLayout">
                    {activePositions.map((position) => (
                      <PositionCard
                        key={position.id}
                        position={position}
                        currentTemp={currentPrice}
                        onClose={handleClosePosition}
                        loading={closingPosition === position.id}
                        isDark={true}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-24 bg-card border border-border border-dashed rounded-3xl">
              <Trophy className="w-20 h-20 text-muted mx-auto mb-6 opacity-20" />
              <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">No Market Selected</h2>
              <p className="text-muted-foreground px-6">Select a prop type from the game list to begin your professional trade.</p>
            </div>
          )}


        </div>

      <Navbar isDark={isDark} />
    </div>
  )
}
