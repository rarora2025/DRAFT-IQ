'use client'

import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useTheme } from '@/hooks/useTheme'

export default function RewardsPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const LOGO_URL = "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/200e45b4-6171-4b26-b381-aa6678867b18/ChatGPT-Image-Feb-1-2026-1769997817075.png?width=8000&height=8000&resize=contain";

  return (
    <div className="min-h-screen bg-background pb-32 text-white overflow-x-hidden flex flex-col items-center justify-center">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-12 text-center">
        {/* Header */}
        <div className="space-y-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-block"
          >
            <img src={LOGO_URL} alt="IQ" className="w-20 h-20 mx-auto rounded-3xl shadow-2xl shadow-primary/20 mb-4" />
          </motion.div>
          <h1 className="font-display font-black text-4xl sm:text-6xl uppercase tracking-tighter italic">
            Rewards
          </h1>
        </div>

        {/* Coming Soon Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card/30 border border-white/5 border-dashed rounded-[2.5rem] p-12 text-center"
        >
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
              <Zap className="w-8 h-8 text-zinc-700" />
          </div>
          <p className="text-[12px] font-black uppercase tracking-[0.3em] text-zinc-600">
            More rewards coming soon
          </p>
        </motion.div>
      </div>

      <Navbar isDark={isDark} />
    </div>
  )
}
