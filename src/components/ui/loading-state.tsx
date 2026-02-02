'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingStateProps {
  message?: string
  className?: string
  fullScreen?: boolean
}

export function LoadingState({ 
  message = "Syncing market data...", 
  className,
  fullScreen = true
}: LoadingStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center gap-12",
      fullScreen ? "min-h-screen bg-[#020420] pt-[15vh]" : "py-16",
      className
    )}>
      <div className="relative">
        {/* Advanced Ambient Glow */}
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.2, 0.4, 0.2],
            rotate: [0, 90, 180, 270, 360],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute inset-0 -m-12 rounded-full bg-gradient-to-tr from-primary/20 via-blue-500/10 to-emerald-500/20 blur-[60px]"
        />
        
        {/* Rotating Geometric Frames */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 -m-6 border-[0.5px] border-primary/20 rounded-[2rem] opacity-50"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 -m-4 border-[0.5px] border-white/10 rounded-full opacity-30"
        />

        {/* Main Terminal Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative w-20 h-20 rounded-3xl bg-black/40 border border-white/10 flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl overflow-hidden group"
        >
          {/* Scanning Line Effect */}
          <motion.div 
            animate={{ y: [-80, 80] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent z-20"
          />

          <Activity className="w-10 h-10 text-primary relative z-10" />
          
          {/* Internal Pulse */}
          <motion.div
            animate={{
              scale: [1, 1.2],
              opacity: [0.3, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut"
            }}
            className="absolute inset-0 rounded-3xl bg-primary/30"
          />
        </motion.div>
      </div>

      <div className="space-y-6 text-center max-w-[280px]">
        <div className="space-y-3">
          <motion.h3
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-white font-black uppercase tracking-[0.4em] text-[11px] leading-none"
          >
            {message}
          </motion.h3>
          <p className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-[8px]">
            Initializing secure terminal connection
          </p>
        </div>
        
        {/* Progress Bar Style Loader */}
        <div className="w-full h-[1px] bg-white/5 relative overflow-hidden rounded-full">
          <motion.div
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-primary/50 to-transparent"
          />
        </div>

        {/* Binary/Data stream effect snippet */}
        <div className="flex justify-center gap-1.5 opacity-40">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              animate={{
                height: [2, 8, 2],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.1,
              }}
              className="w-[1.5px] rounded-full bg-primary/60"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
