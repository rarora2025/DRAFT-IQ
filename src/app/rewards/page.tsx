'use client'

import { motion } from 'framer-motion'
import { Zap, Sparkles, Star, Trophy } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useTheme } from '@/hooks/useTheme'

export default function RewardsPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const LOGO_URL = "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/200e45b4-6171-4b26-b381-aa6678867b18/ChatGPT-Image-Feb-1-2026-1769997817075.png?width=8000&height=8000&resize=contain";

  return (
    <div className="min-h-screen bg-background pb-32 text-white overflow-hidden flex flex-col items-center justify-center relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/4 right-1/4 w-32 h-32 bg-blue-500/10 rounded-full blur-[60px]"
        />
        
        {/* Floating Particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0, 0.5, 0],
              y: [-20, -120],
              x: Math.sin(i) * 50
            }}
            transition={{
              duration: 3 + i,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "linear"
            }}
            className="absolute bottom-1/4 left-1/2"
            style={{ marginLeft: `${(i - 2.5) * 80}px` }}
          >
            <Sparkles className="w-4 h-4 text-primary/40" />
          </motion.div>
        ))}
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-12 text-center relative z-10">
        {/* Header */}
        <div className="space-y-6">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 12, stiffness: 200 }}
            className="relative inline-block"
          >
            <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-2xl animate-pulse" />
            <img src={LOGO_URL} alt="IQ" className="w-24 h-24 mx-auto rounded-3xl shadow-2xl shadow-primary/20 relative z-10" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-4 -right-4"
            >
              <Star className="w-8 h-8 text-primary fill-primary/20" />
            </motion.div>
          </motion.div>
          
          <div className="space-y-2">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display font-black text-5xl sm:text-7xl uppercase tracking-tighter italic"
            >
              Rewards
            </motion.h1>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100px" }}
              className="h-1 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto"
            />
          </div>
        </div>

        {/* Coming Soon Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="relative group"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-blue-500/20 to-primary/20 rounded-[3rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
          <div className="relative bg-[#020420]/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-16 overflow-hidden">
            <motion.div
              animate={{ 
                y: [0, -10, 0],
                rotate: [0, 5, 0]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-primary/20 shadow-inner"
            >
              <Trophy className="w-12 h-12 text-primary" />
            </motion.div>
            
            <div className="space-y-4">
              <h2 className="text-2xl font-black uppercase tracking-tight text-white/90">
                Unlockable Value
              </h2>
              <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-xs max-w-xs mx-auto leading-loose">
                Earn real-world rewards for your trading skills. Launching soon.
              </p>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          </div>
        </motion.div>

        {/* Footer info */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.4em]"
        >
          DraftIQ • Season 1
        </motion.p>
      </div>

      <Navbar isDark={isDark} />
    </div>
  )
}
