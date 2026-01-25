'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Menu, X, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function NavbarTop() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, loading } = useAuth(false);

  const LOGO_URL = "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/200e45b4-6171-4b26-b381-aa6678867b18/DraftIQ-Logo-1769320775263.png?width=8000&height=8000&resize=contain";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-10 left-0 w-full z-[100] bg-background/80 backdrop-blur-md border-b border-white/5 transition-all duration-200 ${
        scrolled ? 'shadow-lg shadow-black/20' : ''
      }`}
    >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
          {/* Left Section: Mobile Menu & Logo & Desktop Links */}
          <div className="flex items-center gap-4 sm:gap-6 shrink-0">
            {/* Mobile Hamburger */}
            <button
              className="lg:hidden p-2 -ml-2 text-muted-foreground hover:bg-white/5 rounded-xl transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 cursor-pointer flex-shrink-0 group" aria-label="DraftIQ Home">
              <img src={LOGO_URL} alt="DraftIQ" className="h-8 sm:h-10 object-contain group-hover:scale-110 transition-transform" />
            </Link>

              {/* Desktop Navigation */}
              <div className="hidden lg:flex items-center gap-1">
                <Link
                  href="/markets"
                  className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-all px-3 py-2 rounded-xl hover:bg-primary/5"
                >
                  Markets
                </Link>
                <Link
                  href="/portfolio"
                  className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-all px-3 py-2 rounded-xl hover:bg-primary/5"
                >
                  Portfolio
                </Link>
                <Link
                  href="/feed"
                  className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-all px-3 py-2 rounded-xl hover:bg-primary/5"
                >
                  Feed
                </Link>
                <Link
                  href="/leaderboard"
                  className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-all px-3 py-2 rounded-xl hover:bg-primary/5"
                >
                  Ranks
                </Link>
              </div>

          </div>

            {/* Center/Right Section: Search & Auth */}
            <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end">
              {/* Search Bar - Hidden on small mobile, visible on desktop */}
              <div className="hidden xl:block relative w-full max-w-[200px] transition-all">
                <div className="relative group">
                  <input
                    id="search-navbar"
                    type="text"
                    placeholder="Search..."
                    className="w-full h-10 bg-card/50 rounded-xl pl-10 pr-4 text-[13px] text-white placeholder-muted-foreground/50 border border-white/5 focus:border-primary/30 focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-primary transition-colors">
                    <Search size={14} strokeWidth={3} />
                  </div>
                </div>
              </div>
              
              {/* Mobile Search Icon (when bar is hidden) */}
              <button className="xl:hidden p-2 text-muted-foreground hover:bg-white/5 rounded-full shrink-0">
                <Search size={20} />
              </button>
  
                {/* Auth Buttons */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  {user ? (
                    <Link
                      href="/portfolio"
                      className="inline-flex items-center justify-center h-10 px-4 sm:px-6 rounded-xl text-[11px] sm:text-[12px] font-black uppercase tracking-widest text-primary-foreground bg-primary hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/20 gap-2"
                    >
                      <User size={14} strokeWidth={3} />
                      Signed In
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        className="hidden sm:inline-flex items-center justify-center h-10 px-4 sm:px-5 rounded-xl text-[11px] sm:text-[12px] font-black uppercase tracking-widest text-white hover:bg-white/5 border border-white/10 transition-all active:scale-95"
                      >
                        Log in
                      </Link>
                      <Link
                        href="/signup"
                        className="inline-flex items-center justify-center h-10 px-4 sm:px-5 rounded-xl text-[11px] sm:text-[12px] font-black uppercase tracking-widest text-primary-foreground bg-primary hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/20"
                      >
                        Sign up
                      </Link>
                    </>
                  )}
                </div>
              </div>

        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[200] lg:hidden">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-background/60 backdrop-blur-md"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Drawer */}
            <div className="absolute left-0 top-0 bottom-0 w-[300px] bg-background border-r border-border shadow-2xl flex flex-col animate-in fade-in slide-in-from-left">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-2">
                  <img src={LOGO_URL} alt="DraftIQ" className="h-8 object-contain" />
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
                  Portfolio
                </Link>
                <Link
                  href="/feed"
                  className="flex items-center h-12 px-4 rounded-xl text-[14px] font-black uppercase tracking-widest text-muted-foreground hover:text-white hover:bg-primary/10 transition-all"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Feed
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
                {user ? (
                  <Link
                    href="/portfolio"
                    className="flex items-center justify-center w-full h-12 rounded-xl bg-primary text-primary-foreground text-[13px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all gap-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User size={16} strokeWidth={3} />
                    Signed In
                  </Link>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>
          </div>
        )}
    </nav>
  );
}