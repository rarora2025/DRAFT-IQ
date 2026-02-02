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
      "flex flex-col items-center justify-center gap-8",
      fullScreen ? "min-h-screen bg-[#020420] pt-[20vh]" : "py-12",
      className
    )}>
      <div className="relative">
        {/* Animated Rings */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.1, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 -m-4 rounded-full bg-primary/20 blur-xl"
        />
        
        <motion.div
          animate={{
            rotate: 360
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute inset-0 -m-2 border-2 border-dashed border-primary/30 rounded-full"
        />

        {/* Main Icon Container */}
        <motion.div
          animate={{
            y: [0, -4, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl backdrop-blur-sm"
        >
          <Activity className="w-8 h-8 text-primary" />
          
          {/* Pulse Effect */}
          <motion.div
            animate={{
              scale: [1, 1.5],
              opacity: [0.5, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeOut"
            }}
            className="absolute inset-0 rounded-2xl bg-primary/20"
          />
        </motion.div>
      </div>

      <div className="space-y-2 text-center">
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-white font-black uppercase tracking-[0.3em] text-[10px] ml-[0.3em]"
        >
          {message}
        </motion.p>
        
        {/* Staggered Dots */}
        <div className="flex justify-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              className="w-1 h-1 rounded-full bg-primary"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
