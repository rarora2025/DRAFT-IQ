'use client'

import { motion } from 'framer-motion'
import { Users, Flame, Snowflake, MapPin, ExternalLink, Coins, Clock, Shield, Sun, Moon } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'
import Image from 'next/image'

export default function CommunityPage() {
  useAuth()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="min-h-screen bg-background pb-24 text-white">
      <div className="relative max-w-lg mx-auto px-4 py-8 space-y-8">
        <div className="flex justify-end">
          <button
            onClick={toggleTheme}
            className="p-3 rounded-xl transition-all bg-card border border-border hover:border-primary/50"
          >
            {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-primary" />}
          </button>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-4 mb-6">
            <Trophy className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-display font-black text-4xl mb-2 text-white uppercase tracking-tight">
            Draft<span className="text-primary italic">IQ</span> Society
          </h1>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">
            The premier elite player-prop trading community
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl p-8 bg-card border border-border shadow-xl"
        >
          <h2 className="font-display font-black text-xl mb-4 flex items-center gap-3 text-white uppercase tracking-tight">
            <Users className="w-6 h-6 text-primary" />
            About DraftIQ
          </h2>
          <p className="text-sm leading-relaxed mb-8 text-muted-foreground font-medium">
            DraftIQ is the ultimate prop trading simulator. Trade live contracts 
            on your favorite NBA and NFL players based on real-time performance projections. 
            Master the markets, beat the lines, and climb the professional leaderboard risk-free.
          </p>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center rounded-2xl p-4 bg-background border border-border">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Coins className="w-4 h-4 text-primary" />
              </div>
              <p className="font-mono font-black text-xl text-primary">$1K</p>
              <p className="text-[10px] font-bold mt-1 text-muted-foreground uppercase tracking-tighter">Starting Portfolio</p>
            </div>
            <div className="text-center rounded-2xl p-4 bg-background border border-border">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
              <p className="font-mono font-black text-xl text-blue-400">30s</p>
              <p className="text-[10px] font-bold mt-1 text-muted-foreground uppercase tracking-tighter">Real-Time Sync</p>
            </div>
            <div className="text-center rounded-2xl p-4 bg-background border border-border">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Shield className="w-4 h-4 text-yellow-400" />
              </div>
              <p className="font-mono font-black text-xl text-yellow-400">$0</p>
              <p className="text-[10px] font-bold mt-1 text-muted-foreground uppercase tracking-tighter">Real Money Risk</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl p-8 bg-card border border-border shadow-md"
        >
          <h2 className="font-display font-black text-xl mb-6 text-white uppercase tracking-tight">
            Season 1 Rules
          </h2>
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-4">
              <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center flex-shrink-0 font-black text-sm">1</span>
              <p className="text-muted-foreground font-medium pt-1">Everyone starts with $1,000 in virtual trading capital</p>
            </div>
            <div className="flex items-start gap-4">
              <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center flex-shrink-0 font-black text-sm">2</span>
              <p className="text-muted-foreground font-medium pt-1">Trade on live player prop lines for NBA and NFL games</p>
            </div>
            <div className="flex items-start gap-4">
              <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center flex-shrink-0 font-black text-sm">3</span>
              <p className="text-muted-foreground font-medium pt-1">Top traders at the end of each week get exclusive rewards!</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-3xl p-8 text-center bg-card border border-border shadow-lg relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl rounded-full" />
          <MapPin className="w-10 h-10 text-primary mx-auto mb-4" />
          <h3 className="font-display font-black text-2xl mb-2 text-white uppercase tracking-tight">Join the Society</h3>
          <p className="text-sm mb-6 text-muted-foreground font-medium">
            Connect with the most elite prop traders today
          </p>
          <div className="flex justify-center">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest px-8 h-12 rounded-xl">
              <ExternalLink className="w-4 h-4 mr-2" />
              Instagram
            </Button>
          </div>
        </motion.div>

        <div className="flex flex-col items-center justify-center gap-2 pt-8 opacity-40">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Institutional Data Grade</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-white">The Odds API Enterprise</span>
        </div>
      </div>

      <Navbar isDark={isDark} />
    </div>
  )
}