'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Wallet, Trophy, Users, LogOut, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/markets', icon: Home, label: 'Markets' },
  { href: '/portfolio', icon: Wallet, label: 'Portfolio' },
  { href: '/leaderboard', icon: Trophy, label: 'Ranks' },
  { href: '/community', icon: Users, label: 'Society' },
]

interface NavbarProps {
  isDark?: boolean
}

export function Navbar({ isDark = true }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <nav className={`fixed bottom-0 left-0 right-0 z-50 border-t ${isDark ? 'bg-[#0a0a0f] border-[#27272a]' : 'bg-white border-gray-200'}`}>
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
                      className="absolute inset-0 bg-emerald-500/10 rounded-xl border border-emerald-500/20"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={`w-5 h-5 relative z-10 transition-colors ${
                      isActive ? 'text-emerald-400' : isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  />
                  <span
                    className={`text-xs mt-1 relative z-10 transition-colors ${
                      isActive ? 'text-emerald-400 font-medium' : isDark ? 'text-zinc-500' : 'text-gray-500'
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              )
            })}
            
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className={`flex flex-col items-center py-2 px-4 transition-colors ${isDark ? 'text-zinc-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
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
              className={`rounded-2xl p-6 max-w-sm w-full ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-white border border-gray-200'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-display font-bold text-lg ${isDark ? 'text-zinc-100' : 'text-gray-900'}`}>Confirm Logout</h3>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}`}
                >
                  <X className={`w-5 h-5 ${isDark ? 'text-zinc-400' : 'text-gray-400'}`} />
                </button>
              </div>
              
              <p className={`text-sm mb-6 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                Are you sure you want to log out? Your positions will remain open.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
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