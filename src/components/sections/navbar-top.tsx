'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Menu, X } from 'lucide-react';

export default function NavbarTop() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const router = useRouter()
  const [search, setSearch] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) {
      router.push(`/markets?q=${encodeURIComponent(search.trim())}`)
    }
  }

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-[100] bg-background/80 backdrop-blur-md border-b transition-all duration-200 ${
        scrolled ? 'border-border shadow-lg shadow-black/20' : 'border-transparent'
      }`}
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left Section: Mobile Menu & Logo & Desktop Links */}
        <div className="flex items-center gap-8">
          {/* Mobile Hamburger */}
          <button
            className="md:hidden p-2 -ml-2 text-muted-foreground hover:bg-white/5 rounded-xl transition-colors"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 cursor-pointer flex-shrink-0 group" aria-label="DraftIQ Home">
            <img src="/logo.png" alt="DraftIQ" className="w-9 h-9 object-contain group-hover:scale-110 transition-transform" />
            <span className="font-display font-black text-2xl tracking-tighter text-white">Draft<span className="text-primary italic">IQ</span></span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/markets"
              className="text-[14px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-all px-4 py-2 rounded-xl hover:bg-primary/5"
            >
              Markets
            </Link>
            <Link
              href="/portfolio"
              className="text-[14px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-all px-4 py-2 rounded-xl hover:bg-primary/5"
            >
              Vault
            </Link>
            <Link
              href="/leaderboard"
              className="text-[14px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-all px-4 py-2 rounded-xl hover:bg-primary/5"
            >
              Ranks
            </Link>
          </div>
        </div>

          {/* Center/Right Section: Search & Auth */}
          <div className="flex items-center gap-4 flex-1 justify-end max-w-full">
            {/* Search Bar - Hidden on small mobile, visible on desktop */}
            <form onSubmit={handleSearch} className="hidden md:block relative w-full max-w-[320px] transition-all">
              <div className="relative group">
                <input
                  id="search-navbar"
                  type="text"
                  placeholder="Search markets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-10 bg-card rounded-xl pl-11 pr-4 text-[14px] text-white placeholder-muted-foreground border border-border focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all duration-300"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                  <Search size={16} strokeWidth={3} />
                </div>
              </div>
            </form>
            
            {/* Mobile Search Icon (when bar is hidden) */}
            <button 
              onClick={() => router.push('/markets')}
              className="md:hidden p-2 text-muted-foreground hover:bg-white/5 rounded-full"
            >
              <Search size={22} />
            </button>


          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center justify-center h-10 px-5 rounded-xl text-[13px] font-black uppercase tracking-widest text-white hover:bg-white/5 border border-border transition-all active:scale-95"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center h-10 px-5 rounded-xl text-[13px] font-black uppercase tracking-widest text-primary-foreground bg-primary hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/20"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[200] md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-background/60 backdrop-blur-md"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Drawer */}
          <div className="absolute left-0 top-0 bottom-0 w-[300px] bg-background border-r border-border shadow-2xl flex flex-col animate-in fade-in slide-in-from-left">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="DraftIQ" className="w-8 h-8" />
                <span className="font-display font-black text-2xl tracking-tighter text-white">Draft<span className="text-primary italic">IQ</span></span>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-xl hover:bg-white/5 text-muted-foreground"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex flex-col p-6 gap-3">
              <Link
                href="/markets"
                className="flex items-center h-12 px-4 rounded-xl text-[14px] font-black uppercase tracking-widest text-muted-foreground hover:text-white hover:bg-primary/10 transition-all"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Markets
              </Link>
              <Link
                href="/portfolio"
                className="flex items-center h-12 px-4 rounded-xl text-[14px] font-black uppercase tracking-widest text-muted-foreground hover:text-white hover:bg-primary/10 transition-all"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Vault
              </Link>
              <Link
                href="/leaderboard"
                className="flex items-center h-12 px-4 rounded-xl text-[14px] font-black uppercase tracking-widest text-muted-foreground hover:text-white hover:bg-primary/10 transition-all"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Ranks
              </Link>
            </div>

            <div className="mt-auto p-6 border-t border-border space-y-4">
              <Link
                href="/login"
                className="flex items-center justify-center w-full h-12 rounded-xl border border-border text-[13px] font-black uppercase tracking-widest text-white hover:bg-white/5 transition-all"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="flex items-center justify-center w-full h-12 rounded-xl bg-primary text-primary-foreground text-[13px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}