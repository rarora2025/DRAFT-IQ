'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Zap, Wallet, Trophy, MessageCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function Navbar({ isDark = true }: { isDark?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const [lastMarketPath, setLastMarketPath] = useState('/markets')

  useEffect(() => {
    const saved = localStorage.getItem('lastMarketPath')
    if (saved) {
      setLastMarketPath(saved)
    }
  }, [])

    const navItems = [
      { href: '/markets', icon: Zap, label: 'Trade', exact: false },
      { href: '/portfolio', icon: Wallet, label: 'Portfolio', exact: true },
      { href: '/feed', icon: MessageCircle, label: 'Feed', exact: true },
      { href: '/leaderboard', icon: Trophy, label: 'Ranks', exact: true },
    ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background border-border">
      <div className="max-w-lg mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href 
              : pathname.startsWith('/markets') || pathname === '/'
            const Icon = item.icon
            
            return (
              <button
                key={item.label}
                onClick={() => router.push(item.href)}
                className="relative flex flex-col items-center py-2 px-3 sm:px-4 transition-all"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-x-0 inset-y-0 bg-primary/10 rounded-xl border border-primary/20 shadow-sm"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon
                  className={`w-5 h-5 relative z-10 transition-all ${
                    isActive ? 'text-primary scale-110' : 'text-muted-foreground hover:text-white'
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span
                  className={`text-[9px] sm:text-[10px] uppercase tracking-wider sm:tracking-widest mt-1 relative z-10 transition-colors ${
                    isActive ? 'text-primary font-black' : 'text-muted-foreground'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
