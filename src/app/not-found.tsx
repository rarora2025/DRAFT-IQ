'use client'

import Link from 'next/link'
import { Zap, ArrowLeft, Search } from 'lucide-react'
import { Navbar } from '@/components/Navbar'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#020420] text-white flex flex-col items-center justify-center p-6 text-center">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] -mr-64 -mt-64" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] -ml-64 -mb-64" />
      </div>

      <div className="relative z-10 space-y-8 max-w-sm">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
          <div className="w-24 h-24 bg-card border border-white/10 rounded-[2rem] flex items-center justify-center relative z-10 mx-auto">
            <Search className="w-10 h-10 text-primary opacity-50" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-5xl font-black tracking-tighter italic">
            404<span className="text-primary NOT-italic">!</span>
          </h1>
          <h2 className="text-xl font-bold uppercase tracking-widest text-zinc-400">
            Market Not Found
          </h2>
          <p className="text-zinc-500 text-sm leading-relaxed font-medium">
            The route you're looking for doesn't exist or has been moved to a different arena.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link 
            href="/markets" 
            className="w-full h-14 bg-primary hover:bg-primary/90 text-[#020420] font-black text-sm rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-primary/20 uppercase tracking-widest"
          >
            <Zap className="w-5 h-5 fill-current" />
            Back to Trading
          </Link>
          <Link 
            href="/" 
            className="w-full h-14 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition-all border border-white/10 uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" />
            Home Base
          </Link>
        </div>
      </div>

      <Navbar isDark={true} />
    </div>
  )
}
