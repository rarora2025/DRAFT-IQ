'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Settings, 
  User, 
  MessageCircle, 
  AlertTriangle, 
  LogOut,
  Loader2,
  ShieldCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useProfile(user?.id)
  const [newUsername, setNewUsername] = useState('')
  const [tolerance, setTolerance] = useState(5)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (profile) {
      setNewUsername(profile.username || '')
      setTolerance(profile.default_tolerance ?? 5)
    }
  }, [profile])

  const handleUpdateProfile = async () => {
    if (!user?.id || !newUsername) return
    
    const sanitizedUsername = newUsername.trim().substring(0, 12)
    if (!sanitizedUsername) return

    setUpdating(true)
    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', sanitizedUsername)
        .neq('id', user.id)
        .maybeSingle()

      if (existing) {
        throw new Error('Username is already taken')
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          username: sanitizedUsername,
          default_tolerance: tolerance,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error
      onClose()
      window.location.reload()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch (error) {
      console.error('Error signing out:', error)
      window.location.href = '/login'
    }
  }

    return (
      <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-background/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0"
                onClick={onClose}
              />
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="relative w-full max-w-lg bg-[#020420] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden my-10 sm:my-24 mx-4"
                    onClick={(e) => e.stopPropagation()}
                  >

              <div className="p-8">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                      <Settings className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white tracking-tight">Account Settings</h2>
                    </div>
                  </div>
                <button 
                  onClick={onClose} 
                  className="p-2 hover:bg-white/5 rounded-xl transition-colors text-muted-foreground hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-8">
                {/* Username Section */}
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">
                    Username
                  </label>
                  <div className="relative group">
                    <Input 
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value.substring(0, 12))}
                      placeholder="Enter username"
                      maxLength={12}
                      className="h-14 bg-white/5 border-white/10 text-white text-base font-medium rounded-2xl px-5 focus:ring-0 focus:border-white/20 transition-all"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2">
                      <User className="w-4 h-4 text-muted-foreground/50" />
                    </div>
                  </div>
                </div>

                {/* Tolerance Section */}
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-zinc-400" />
                      <label className="text-[11px] font-bold text-white uppercase tracking-wider">
                        Execution Range
                      </label>
                    </div>
                    <span className="text-xs font-bold text-white bg-white/10 px-2 py-1 rounded-md">
                      {tolerance}%
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Set your execution range. Trades will automatically execute if the market line is within this percentage of your entry.
                  </p>
                  <div className="flex items-center gap-4 pt-2">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Tight</span>
                    <input
                      type="range"
                      min="1"
                      max="15"
                      step="1"
                      value={tolerance}
                      onChange={(e) => setTolerance(Number(e.target.value))}
                      className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
                    />
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Wide</span>
                  </div>
                </div>

                {/* Feedback/Report Section */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    asChild
                    className="h-12 rounded-2xl border-white/10 hover:bg-white/5 text-[11px] font-bold uppercase tracking-wider transition-all"
                  >
                    <a href="mailto:getdraftiq@gmail.com?subject=Bug Report" target="_blank" rel="noopener noreferrer">
                      <AlertTriangle className="w-3.5 h-3.5 mr-2 text-zinc-500" />
                      Report Bug
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    asChild
                    className="h-12 rounded-2xl border-white/10 hover:bg-white/5 text-[11px] font-bold uppercase tracking-wider transition-all"
                  >
                    <a href="mailto:getdraftiq@gmail.com?subject=Feature Request" target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="w-3.5 h-3.5 mr-2 text-zinc-500" />
                      Request Feature
                    </a>
                  </Button>
                </div>

                {/* Actions Section */}
                <div className="pt-4 space-y-3">
                  <Button
                    onClick={handleUpdateProfile}
                    disabled={updating || profileLoading}
                    className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-base rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-emerald-500/20 uppercase tracking-widest"
                  >
                    {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'SAVE'}
                  </Button>

                    <Button
                      onClick={handleLogout}
                      variant="ghost"
                      className="w-full h-12 rounded-2xl text-red-400/60 hover:text-red-400 hover:bg-red-400/5 text-[11px] font-bold uppercase tracking-wider transition-all"
                    >
                      <LogOut className="w-3.5 h-3.5 mr-2" />
                      Sign Out
                    </Button>
                  </div>

                  </div>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
  )
}
