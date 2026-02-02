'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export const COIN_LOGO_URL = "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/200e45b4-6171-4b26-b381-aa6678867b18/ChatGPT-Image-Feb-1-2026-1769997817075.png?width=8000&height=8000&resize=contain";

interface IQDisplayProps {
  value: number | string
  decimals?: number
  className?: string
  iconClassName?: string
  valueClassName?: string
  showCoin?: boolean
}

export function IQDisplay({ 
  value, 
  decimals = 0, 
  className, 
  iconClassName, 
  valueClassName,
  showCoin = true 
}: IQDisplayProps) {
  const formattedValue = typeof value === 'number' 
    ? value.toLocaleString(undefined, { 
        minimumFractionDigits: decimals, 
        maximumFractionDigits: decimals 
      }) 
    : value

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      {showCoin && (
        <div className={cn("w-4 h-4 shrink-0 overflow-hidden flex items-center justify-center", iconClassName)}>
          <img 
            src={COIN_LOGO_URL} 
            alt="IQ" 
            className="w-full h-full object-contain" 
          />
        </div>
      )}
      <span className={cn("font-mono font-black", valueClassName)}>
        {formattedValue}
      </span>
    </div>
  )
}
