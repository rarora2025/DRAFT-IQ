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
<nav className="fixed bottom-0 sm:top-0 sm:bottom-auto left-0 right-0 z-50 border-t sm:border-t-0 sm:border-b bg-background/80 backdrop-blur-xl border-border">
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
<div className="flex items-center justify-between h-16 sm:h-20">
{/* Logo - only visible on desktop header */}
  <div 
    onClick={() => router.push('/')}
    className="hidden sm:flex items-center gap-2 cursor-pointer group"
  >
    <img 
      src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/200e45b4-6171-4b26-b381-aa6678867b18/DraftIQ-Logo-3-resized-1769289669044.jpeg?width=8000&height=8000&resize=contain" 
      alt="DraftIQ" 
      className="h-10 w-auto object-contain"
    />
  </div>

<div className="flex items-stretch flex-1 sm:flex-none h-full sm:gap-2">
{navItems.map((item) => {
const isActive = item.exact 
? pathname === item.href 
: pathname.startsWith('/markets') || pathname === '/'
const Icon = item.icon

return (
<button
key={item.label}
onClick={() => router.push(item.href)}
className="relative flex-1 sm:flex-none sm:px-6 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3 transition-all group"
>
  {isActive && (
    <>
      <motion.div
        layoutId="activeTab"
        className="absolute inset-1 bg-primary/10 rounded-2xl border border-primary/20 shadow-sm sm:hidden"
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      />
      <motion.div
        layoutId="activeTabDesktop"
        className="hidden sm:block absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_-4px_12px_rgba(61,225,0,0.4)]"
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      />
    </>
  )}
<Icon
className={`w-5 h-5 sm:w-5 sm:h-5 relative z-10 transition-all ${
isActive ? 'text-primary scale-110' : 'text-muted-foreground group-hover:text-white'
}`}
strokeWidth={isActive ? 3 : 2}
/>
<span
className={`text-[9px] sm:text-xs uppercase tracking-widest sm:tracking-normal sm:capitalize sm:font-bold relative z-10 transition-colors ${
isActive ? 'text-primary font-bold' : 'text-muted-foreground'
}`}
>
{item.label}
</span>
</button>
)
})}
</div>

{/* Right side spacer for desktop */}
<div className="hidden sm:block w-32" />
</div>
</div>
</nav>
)

}
