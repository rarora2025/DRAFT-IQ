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
    <div className={`min-h-screen ${isDark ? 'bg-[#0a0a0f]' : 'bg-gray-50'} pb-24`}>
      <div className="relative max-w-lg mx-auto px-4 py-6 space-y-8">
        <div className="flex justify-end">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-[#111116] border border-[#27272a] hover:bg-[#1c1c24]' : 'bg-white border border-gray-200 hover:bg-gray-100'}`}
          >
            {isDark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
          </button>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Flame className="w-8 h-8 text-orange-500" />
            <Snowflake className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className={`font-display font-bold text-2xl mb-2 ${isDark ? 'text-zinc-100' : 'text-gray-900'}`}>
            Prediction Market Society
          </h1>
          <p className={isDark ? 'text-zinc-500' : 'text-gray-500'}>
            The premier student-run prediction market club
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`rounded-2xl p-6 ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-white border border-gray-200 shadow-sm'}`}
        >
          <h2 className={`font-display font-semibold text-lg mb-4 flex items-center gap-2 ${isDark ? 'text-zinc-200' : 'text-gray-900'}`}>
            <Users className="w-5 h-5 text-emerald-400" />
            About Hot or Cold
          </h2>
          <p className={`text-sm leading-relaxed mb-6 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
            Hot or Cold is our flagship trading simulation game. Trade virtual weather contracts 
            based on real temperature projections from the Open-Meteo API. It&apos;s a fun, risk-free 
            way to learn about prediction market &amp; trading mechanics.
          </p>
          
          <div className="grid grid-cols-3 gap-4">
            <div className={`text-center rounded-xl p-4 ${isDark ? 'bg-[#0a0a0f]' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-center gap-1 mb-2">
                <Coins className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="font-mono font-bold text-xl text-emerald-400">$1K</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Virtual Starting Balance</p>
            </div>
            <div className={`text-center rounded-xl p-4 ${isDark ? 'bg-[#0a0a0f]' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-center gap-1 mb-2">
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
              <p className="font-mono font-bold text-xl text-blue-400">5s</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Live Price Updates</p>
            </div>
            <div className={`text-center rounded-xl p-4 ${isDark ? 'bg-[#0a0a0f]' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-center gap-1 mb-2">
                <Shield className="w-4 h-4 text-yellow-400" />
              </div>
              <p className="font-mono font-bold text-xl text-yellow-400">$0</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Real Money Risk</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`rounded-2xl p-6 ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-white border border-gray-200 shadow-sm'}`}
        >
          <h2 className={`font-display font-semibold text-lg mb-4 ${isDark ? 'text-zinc-200' : 'text-gray-900'}`}>
            2025 Competition Rules
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 font-mono text-xs">1</span>
              <p className={isDark ? 'text-zinc-400' : 'text-gray-600'}>Everyone starts with 1,000 virtual coins</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 font-mono text-xs">2</span>
              <p className={isDark ? 'text-zinc-400' : 'text-gray-600'}>Trade on daily high temperature projections across any city worldwide</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 font-mono text-xs">3</span>
              <p className={isDark ? 'text-zinc-400' : 'text-gray-600'}>Leaderboard resets weekly - top traders win prizes!</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`rounded-2xl p-6 text-center ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-white border border-gray-200 shadow-sm'}`}
        >
          <MapPin className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
          <h3 className={`font-display font-semibold mb-2 ${isDark ? 'text-zinc-200' : 'text-gray-900'}`}>Join the Society</h3>
          <p className={`text-sm mb-4 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
            Connect with fellow traders
          </p>
          <div className="flex gap-3 justify-center">
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <ExternalLink className="w-4 h-4 mr-2" />
              Follow the Instagram
            </Button>
          </div>
        </motion.div>

        <div className={`flex items-center justify-center gap-2 pt-4 ${isDark ? 'text-zinc-700' : 'text-gray-300'}`}>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Powered by</span>
          <span className="text-[10px] font-black uppercase tracking-tighter text-zinc-500">The Odds API Enterprise</span>
        </div>
      </div>

      <Navbar isDark={isDark} />
    </div>
  )
}