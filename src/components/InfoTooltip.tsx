'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Info, X } from 'lucide-react'

interface InfoTooltipProps {
  content: string
  isDark?: boolean
}

export function InfoTooltip({ content, isDark = true }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative inline-block">
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className={`p-1 rounded-full transition-colors ${
            isOpen 
              ? 'bg-primary/20 text-primary' 
              : isDark ? 'hover:bg-zinc-800 text-zinc-600' : 'hover:bg-gray-100 text-gray-400'
          }`}

      >
        <Info className="w-3.5 h-3.5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 rounded-xl shadow-2xl z-50 pointer-events-auto ${
                isDark ? 'bg-[#1c1c24] border border-[#27272a] text-zinc-300' : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              <div className="relative">
                <p className="text-[11px] leading-relaxed font-medium">
                  {content}
                </p>
                <div 
                  className={`absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r border-b ${
                    isDark ? 'bg-[#1c1c24] border-[#27272a]' : 'bg-white border-gray-200'
                  }`} 
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
