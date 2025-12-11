'use client'

import { motion } from 'framer-motion'
import { Users, Flame, Snowflake, MapPin, ExternalLink, Coins, Clock, Shield } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

export default function CommunityPage() {
  useAuth()

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-24">
      <div className="relative max-w-lg mx-auto px-4 py-6 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Flame className="w-8 h-8 text-orange-500" />
            <Snowflake className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="font-display font-bold text-2xl mb-2 text-zinc-100">
            Columbia Prediction Market Society
          </h1>
          <p className="text-zinc-500">
            The premier student-run prediction market club
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#111116] border border-[#27272a] rounded-2xl p-6"
        >
          <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2 text-zinc-200">
            <Users className="w-5 h-5 text-emerald-400" />
            About Hot or Cold
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-6">
            Hot or Cold is our flagship trading simulation game. Trade virtual weather contracts 
            based on real temperature projections from the Open-Meteo API. It&apos;s a fun, risk-free 
            way to learn about prediction market &amp; trading mechanics.
          </p>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center bg-[#0a0a0f] rounded-xl p-4">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Coins className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="font-mono font-bold text-xl text-emerald-400">$1K</p>
              <p className="text-xs text-zinc-500 mt-1">Virtual Starting Balance</p>
            </div>
            <div className="text-center bg-[#0a0a0f] rounded-xl p-4">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
              <p className="font-mono font-bold text-xl text-blue-400">5s</p>
              <p className="text-xs text-zinc-500 mt-1">Live Price Updates</p>
            </div>
            <div className="text-center bg-[#0a0a0f] rounded-xl p-4">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Shield className="w-4 h-4 text-yellow-400" />
              </div>
              <p className="font-mono font-bold text-xl text-yellow-400">$0</p>
              <p className="text-xs text-zinc-500 mt-1">Real Money Risk</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#111116] border border-[#27272a] rounded-2xl p-6"
        >
          <h2 className="font-display font-semibold text-lg mb-4 text-zinc-200">
            2025 Competition Rules
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 font-mono text-xs">1</span>
              <p className="text-zinc-400">Everyone starts with 1,000 virtual coins</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 font-mono text-xs">2</span>
              <p className="text-zinc-400">Trade on daily high temperature projections across 5 major US cities</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 font-mono text-xs">3</span>
              <p className="text-zinc-400">Leaderboard resets weekly - top traders win prizes!</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#111116] border border-[#27272a] rounded-2xl p-6 text-center"
        >
          <MapPin className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
          <h3 className="font-display font-semibold mb-2 text-zinc-200">Join the Society</h3>
          <p className="text-sm text-zinc-500 mb-4">
            Connect with fellow Columbia traders
          </p>
          <div className="flex gap-3 justify-center">
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <ExternalLink className="w-4 h-4 mr-2" />
              Follow the Instagram
            </Button>
          </div>
        </motion.div>

        <div className="text-center text-xs text-zinc-600">
          <p>Columbia Prediction Market Society 2025</p>
          <p className="mt-1">All trading uses virtual currency only. No real money involved.</p>
        </div>
      </div>

      <Navbar />
    </div>
  )
}