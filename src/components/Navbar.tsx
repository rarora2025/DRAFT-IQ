'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Home, Wallet, Trophy, Users, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/', icon: Home, label: 'Trade' },
  { href: '/portfolio', icon: Wallet, label: 'Portfolio' },
  { href: '/leaderboard', icon: Trophy, label: 'Ranks' },
  { href: '/community', icon: Users, label: 'Society' },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/5">
      <div className="max-w-lg mx-auto px-4">
        <div className="flex items-center justify-between py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center py-2 px-4 transition-colors"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-blue-500/20 rounded-xl"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon
                  className={`w-5 h-5 relative z-10 ${
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                />
                <span
                  className={`text-xs mt-1 relative z-10 ${
                    isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
          
          <button
            onClick={handleLogout}
            className="flex flex-col items-center py-2 px-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-xs mt-1">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
