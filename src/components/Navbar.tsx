'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Wallet, Trophy, Users, LogOut, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export function Navbar({ isDark = true }: { isDark?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [lastMarketPath, setLastMarketPath] = useState('/markets')

  useEffect(() => {
    const saved = localStorage.getItem('lastMarketPath')
    if (saved) {
      setLastMarketPath(saved)
    }
  }, [])

    const navItems = [
      { href: lastMarketPath, icon: Home, label: 'Trade', exact: false },
      { href: '/portfolio', icon: Wallet, label: 'Portfolio', exact: true },
      { href: '/leaderboard', icon: Trophy, label: 'Ranks', exact: true },
    ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background border-border">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex items-center justify-between py-2">
            {navItems.map((item) => {
              const isActive = item.exact 
                ? pathname === item.href 
                : pathname.startsWith('/markets') || pathname === '/'
              const Icon = item.icon
              
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="relative flex flex-col items-center py-2 px-4 transition-colors"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-emerald-500/10 rounded-xl border border-emerald-500/20"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={`w-5 h-5 relative z-10 transition-colors ${
                      isActive ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  />
                  <span
                    className={`text-xs mt-1 relative z-10 transition-colors ${
                      isActive ? 'text-emerald-400 font-medium' : 'text-zinc-500'
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              )
            })}
            
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="flex flex-col items-center py-2 px-4 transition-colors text-zinc-500 hover:text-red-400"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-xs mt-1">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="rounded-2xl p-6 max-w-sm w-full bg-[#111116] border border-[#27272a]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-lg text-zinc-100">Confirm Logout</h3>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="p-1 rounded-lg transition-colors hover:bg-zinc-800"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>
              
              <p className="text-sm mb-6 text-zinc-400">
                Are you sure you want to log out? Your positions will remain open.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 px-4 rounded-xl font-medium transition-colors bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium border border-red-500/30 transition-colors"
                >
                  Logout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
