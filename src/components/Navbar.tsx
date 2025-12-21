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
                    className="relative flex flex-col items-center py-3 px-4 transition-all"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-x-2 inset-y-1 bg-primary/10 rounded-xl border border-primary/20 shadow-sm"
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
                      className={`text-[10px] uppercase tracking-widest mt-1 relative z-10 transition-colors ${
                        isActive ? 'text-primary font-black' : 'text-muted-foreground'
                      }`}
                    >
                      {item.label}
                    </span>
                  </Link>
                )
              })}
              
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="flex flex-col items-center py-3 px-4 transition-all text-muted-foreground hover:text-red-400"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-[10px] uppercase tracking-widest mt-1">Logout</span>
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
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
              onClick={() => setShowLogoutConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="rounded-3xl p-8 max-w-sm w-full bg-card border border-border shadow-2xl relative overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl rounded-full" />
                
                <div className="flex items-center justify-between mb-2 relative z-10">
                  <h3 className="font-display font-black text-2xl text-white uppercase tracking-tight">Logout</h3>
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="p-2 rounded-xl transition-colors hover:bg-white/5"
                  >
                    <X className="w-6 h-6 text-muted-foreground" />
                  </button>
                </div>
                
                <p className="text-sm mb-8 text-muted-foreground font-medium relative z-10">
                  Are you sure you want to end this session? All active trades will remain live.
                </p>
                
                <div className="flex gap-4 relative z-10">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 py-4 px-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all bg-secondary hover:bg-secondary/80 text-muted-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex-1 py-4 px-4 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-black uppercase tracking-widest text-[10px] shadow-lg shadow-destructive/20 transition-all active:scale-95"
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
