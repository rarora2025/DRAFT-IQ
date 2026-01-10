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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-xl border-border">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-around py-3 sm:py-4">
            {navItems.map((item) => {
              const isActive = item.exact 
                ? pathname === item.href 
                : pathname.startsWith('/markets') || pathname === '/'
              const Icon = item.icon
              
              return (
                <button
                  key={item.label}
                  onClick={() => router.push(item.href)}
                  className="relative flex flex-col items-center py-2 px-4 sm:px-6 transition-all"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-x-1 inset-y-1 bg-primary/15 rounded-2xl border border-primary/25 shadow-md"
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    />
                  )}
                  <Icon
                    className={`w-6 h-6 relative z-10 transition-all ${
                      isActive ? 'text-primary scale-110' : 'text-muted-foreground hover:text-white'
                    }`}
                    strokeWidth={isActive ? 3 : 2}
                  />
                  <span
                    className={`text-[10px] sm:text-[11px] uppercase tracking-wider sm:tracking-widest mt-1.5 relative z-10 transition-colors ${
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
