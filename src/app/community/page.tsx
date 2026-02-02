'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Trophy, Users, Coins, Clock, Shield, Sun, Moon, Zap, Activity } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTheme } from '@/hooks/useTheme'
import FeedPage from '../feed/page'
import LeaderboardPage from '../leaderboard/page'

export default function CommunityPage() {
  const { user, loading: authLoading } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('ranks')
  const isDark = theme === 'dark'

  const LOGO_URL = "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/200e45b4-6171-4b26-b381-aa6678867b18/ChatGPT-Image-Feb-1-2026-1769997817075.png?width=8000&height=8000&resize=contain";

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center pt-[20vh] gap-4">
        <Activity className="w-8 h-8 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Syncing Social Hub...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <img src={LOGO_URL} alt="IQ" className="w-12 h-12 rounded-xl object-contain shadow-lg shadow-primary/20" />
                <div>
                    <h1 className="font-display font-black text-3xl text-white uppercase tracking-tight leading-none">
                        Social <span className="text-primary italic">Hub</span>
                    </h1>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1">
                        Connect, Trade, and Dominate
                    </p>
                </div>
            </div>
          <button
            onClick={toggleTheme}
            className="p-3 rounded-xl transition-all bg-card border border-border hover:border-primary/50"
          >
            {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-primary" />}
          </button>
        </div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-6 bg-card border border-border shadow-xl relative overflow-hidden group"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full group-hover:bg-primary/10 transition-colors" />
            <div className="relative z-10 grid grid-cols-3 gap-4">
              <div className="text-center rounded-2xl p-4 bg-background/50 border border-border hover:border-primary/30 transition-all">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <Coins className="w-4 h-4 text-primary" />
                </div>
                <p className="font-mono font-black text-xl text-primary">1,000</p>
                <p className="text-[9px] font-black mt-1 text-muted-foreground uppercase tracking-widest">Starting IQ</p>
              </div>
              <div className="text-center rounded-2xl p-4 bg-background/50 border border-border hover:border-blue-400/30 transition-all">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                </div>
                <p className="font-mono font-black text-xl text-blue-400">LIVE</p>
                <p className="text-[9px] font-black mt-1 text-muted-foreground uppercase tracking-widest">Global Sync</p>
              </div>
              <div className="text-center rounded-2xl p-4 bg-background/50 border border-border hover:border-yellow-400/30 transition-all">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <Shield className="w-4 h-4 text-yellow-400" />
                </div>
                <p className="font-mono font-black text-xl text-yellow-400">0%</p>
                <p className="text-[9px] font-black mt-1 text-muted-foreground uppercase tracking-widest">House Edge</p>
              </div>
            </div>
        </motion.div>

        {/* Main Tabs */}
        <Tabs defaultValue="ranks" onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-black/40 border border-white/10 p-1 rounded-2xl h-14 mb-8">
            <TabsTrigger 
              value="ranks" 
              className="font-display font-black uppercase tracking-[0.2em] text-[10px] data-[state=active]:bg-primary data-[state=active]:text-black rounded-xl transition-all h-full"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger 
              value="feed" 
              className="font-display font-black uppercase tracking-[0.2em] text-[10px] data-[state=active]:bg-primary data-[state=active]:text-black rounded-xl transition-all h-full"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Feed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ranks" className="mt-0 outline-none">
            <LeaderboardPage />
          </TabsContent>

          <TabsContent value="feed" className="mt-0 outline-none">
            <FeedPage />
          </TabsContent>
        </Tabs>
      </div>

      <Navbar isDark={isDark} />
    </div>
  )
}
