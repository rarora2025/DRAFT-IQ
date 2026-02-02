'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Zap, DollarSign, Trophy, Gift, Activity } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export function Navbar({ isDark = true }: { isDark?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const [lastMarketPath, setLastMarketPath] = useState('/markets')

  useEffect(() => {
    const saved = localStorage.getItem('lastMarketPath')
    if (saved) {
      setLastMarketPath(saved)
    }
  }, [])

    if (!user) return null

    const navItems = [
      { href: '/markets', icon: Zap, label: 'Trade', exact: false },
      { href: '/portfolio', icon: DollarSign, label: 'Portfolio', exact: true },
      { href: '/community', icon: Trophy, label: 'RANKS', exact: true },
      { href: '/rewards', icon: Gift, label: 'Rewards', exact: true },
    ]

    const COIN_LOGO_URL = "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/200e45b4-6171-4b26-b381-aa6678867b18/ChatGPT-Image-Feb-1-2026-1769997817075.png?width=8000&height=8000&resize=contain";

    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-xl border-border md:hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-stretch flex-1 h-full">
              {navItems.map((item) => {
                const isActive = item.exact 
                  ? pathname === item.href 
                  : pathname.startsWith('/markets') || pathname === '/'
                const Icon = item.icon
                
                return (
                  <button
                    key={item.label}
                    onClick={() => router.push(item.href)}
                    className="relative flex-1 flex flex-col items-center justify-center gap-1 transition-all group"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-1 bg-primary/10 rounded-2xl border border-primary/20 shadow-sm"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                      <Icon
                        className={`w-5 h-5 relative z-10 transition-all ${
                          isActive ? 'text-primary scale-110' : 'text-muted-foreground group-hover:text-white'
                        }`}
                        strokeWidth={isActive ? 3 : 2}
                      />
                    <span
                      className={`text-[9px] uppercase tracking-widest relative z-10 transition-colors ${
                        isActive ? 'text-primary font-bold' : 'text-muted-foreground'
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </nav>
    )
}
