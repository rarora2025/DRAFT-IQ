'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Activity, Calendar, Users } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { supabase } from '@/lib/supabase'
import FeedPage from '../feed/page'
import LeaderboardPage from '../leaderboard/page'

interface Contest {
  id: string
  start_time: string
  end_time: string
  participant_count: number
}

export default function CommunityPage() {
  const { user, loading: authLoading } = useAuth()
  const { theme } = useTheme()
  const [isFeedOpen, setIsFeedOpen] = useState(false)
  const [contest, setContest] = useState<Contest | null>(null)
  const isDark = theme === 'dark'

  useEffect(() => {
    async function fetchContest() {
      const { data } = await fetch('/api/contest').then(res => res.json())
      if (data?.contest) {
        setContest(data.contest)
      }
    }
    fetchContest()
  }, [])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center pt-[20vh] gap-4">
        <Activity className="w-8 h-8 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Syncing Challenge...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24 text-white">
      <div className="max-w-4xl mx-auto px-0 py-4 space-y-4">
        {/* Contest Info Bar */}
        {contest && (
          <div className="mx-4 flex items-center justify-center gap-6 py-3 px-6 bg-white/[0.03] border border-white/5 rounded-2xl text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-primary/50" />
              <span>{formatDate(contest.start_time)} - {formatDate(contest.end_time)}</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-white/10" />
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-primary/50" />
              <span>{contest.participant_count} Traders</span>
            </div>
          </div>
        )}

        {/* Leaderboard is the main content */}
        <LeaderboardPage hideHeader={true} />
      </div>

      {/* Floating Chat Button */}
      <button
        onClick={() => setIsFeedOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-black rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 border-4 border-background"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Feed Overlay */}
      <AnimatePresence>
        {isFeedOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFeedOpen(false)}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 top-12 z-[101] bg-background rounded-t-[2.5rem] border-t border-white/10 flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Handle */}
              <div 
                className="w-full h-8 flex items-center justify-center cursor-pointer"
                onClick={() => setIsFeedOpen(false)}
              >
                <div className="w-12 h-1.5 bg-white/10 rounded-full" />
              </div>

              <div className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-card/50 backdrop-blur-xl">
                <div className="flex flex-col">
                  <h2 className="font-display font-black uppercase tracking-[0.2em] text-[10px] text-muted-foreground">Community</h2>
                  <h3 className="text-lg font-black uppercase tracking-tight">Challenge Feed</h3>
                </div>
                <button 
                  onClick={() => setIsFeedOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white"
                >
                  <span>Close</span>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <FeedPage />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Navbar isDark={isDark} />
    </div>
  )
}
