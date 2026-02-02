'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { CircleDollarSign } from 'lucide-react'

interface IQDisplayProps {
  value: number | string
  decimals?: number
  className?: string
  iconClassName?: string
  valueClassName?: string
  showCoin?: boolean
  iconPosition?: 'left' | 'right'
}

export function IQDisplay({ 
  value, 
  decimals = 0, 
  className, 
  iconClassName, 
  valueClassName,
  showCoin = true,
    iconPosition = 'right'
}: IQDisplayProps) {
  const formattedValue = typeof value === 'number' 
    ? value.toLocaleString(undefined, { 
        minimumFractionDigits: decimals, 
        maximumFractionDigits: decimals 
      }) 
    : value

  const icon = showCoin && (
    <CircleDollarSign className={cn("w-4 h-4 shrink-0 text-primary", iconClassName)} />
  )

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      {iconPosition === 'left' && icon}
      <span className={cn("font-mono font-black", valueClassName)}>
        {formattedValue}
      </span>
      {iconPosition === 'right' && icon}
    </div>
  )
}
