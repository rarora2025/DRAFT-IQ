'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Activity } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import FeedPage from '../feed/page'
import LeaderboardPage from '../leaderboard/page'

export default function CommunityPage() {
  const { user, loading: authLoading } = useAuth()
  const { theme } = useTheme()
  const [isFeedOpen, setIsFeedOpen] = useState(false)
  const isDark = theme === 'dark'

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
      <div className="max-w-4xl mx-auto px-0 py-4">
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
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-background flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-xl">
              <h2 className="font-display font-black uppercase tracking-widest text-sm">Community Feed</h2>
              <button 
                onClick={() => setIsFeedOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <FeedPage />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Navbar isDark={isDark} />
    </div>
  )
}
