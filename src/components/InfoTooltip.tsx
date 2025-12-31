'use client'

import { Info } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface InfoTooltipProps {
  content: string
  isDark?: boolean
}

export function InfoTooltip({ content, isDark = true }: InfoTooltipProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => {
            e.stopPropagation()
          }}
          className={`p-1 rounded-full transition-colors ${
            isDark 
              ? 'hover:bg-zinc-800 text-zinc-500 data-[state=open]:text-emerald-400 data-[state=open]:bg-emerald-500/10' 
              : 'hover:bg-gray-100 text-gray-400 data-[state=open]:text-emerald-500 data-[state=open]:bg-emerald-50/50'
          }`}
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        side="top" 
        align="center" 
        className={`w-64 p-3 rounded-xl shadow-2xl z-50 ${
          isDark 
            ? 'bg-[#1c1c24] border-[#27272a] text-zinc-300' 
            : 'bg-white border-gray-200 text-gray-600'
        }`}
      >
        <p className="text-[11px] leading-relaxed font-medium">
          {content}
        </p>
      </PopoverContent>
    </Popover>
  )
}
