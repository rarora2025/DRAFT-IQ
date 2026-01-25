'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, User, Wallet, Activity, Clock, Trophy, X, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSearch } from '@/components/SearchProvider';
import { motion, AnimatePresence } from 'framer-motion';

export default function NavbarTop() {
  const [scrolled, setScrolled] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { user, loading, supabase } = useAuth(false);
  const { query, setQuery, results, isSearching } = useSearch();
  const [inputValue, setInputValue] = useState(query);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when search is opened
  useEffect(() => {
    if (isSearchFocused) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isSearchFocused]);

  // Sync local input with global query (e.g. if URL changes or cleared)
  useEffect(() => {
    setInputValue(query);
  }, [query]);

  // Debounce global query update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue !== query) {
        setQuery(inputValue);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue, query, setQuery]);

  const LOGO_URL = "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/200e45b4-6171-4b26-b381-aa6678867b18/DraftIQ-Logo-1769320775263.png?width=8000&height=8000&resize=contain";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (user) {
      const fetchBalance = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', user.id)
          .single();
        
        if (data && !error) {
          setBalance(data.balance);
        }
      };
      fetchBalance();

      const channel = supabase
        .channel(`profile-${user.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        }, (payload) => {
          if (payload.new && typeof payload.new.balance === 'number') {
            setBalance(payload.new.balance);
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setBalance(null);
    }
  }, [user, supabase]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <nav
      className={`fixed top-10 left-0 w-full z-[100] bg-background/80 backdrop-blur-md border-b border-white/5 transition-all duration-200 ${
        scrolled ? 'shadow-lg shadow-black/20' : ''
      }`}
    >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
          {/* Left Section: Logo & Desktop Links */}
            <div className="flex items-center gap-2 sm:gap-6 shrink-0">
              <Link href="/" className="flex items-center gap-2 cursor-pointer flex-shrink-0 group" aria-label="DraftIQ Home">
                <img src={LOGO_URL} alt="DraftIQ" className="h-7 sm:h-10 object-contain group-hover:scale-110 transition-transform" />
              </Link>
  
                  <div className="hidden sm:flex items-center gap-0.5 sm:gap-1">
                  {[
                    { label: 'Markets', href: '/markets' },
                    { label: 'Portfolio', href: '/portfolio' },
                    { label: 'Feed', href: '/feed' },
                    { label: 'Ranks', href: '/leaderboard' }
                  ].map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-[10px] sm:text-[13px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-all px-2 py-2 sm:px-3 rounded-xl hover:bg-primary/5 whitespace-nowrap"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
            </div>

                {/* Center Section: Search */}
                <div className="flex-1 max-w-7xl flex justify-center">
                  {/* Desktop Inline Search (Hidden when focused if we want it to "popup") */}
                  <div 
                    className={`hidden sm:block w-full max-w-md relative transition-all duration-300 ${isSearchFocused ? 'opacity-0 invisible' : 'opacity-100 visible'}`}
                    onClick={() => setIsSearchFocused(true)}
                  >
                    <div className="relative group">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-hover:text-primary transition-colors">
                        <Search size={14} strokeWidth={3} />
                      </div>
                      <div className="w-full h-10 bg-card/50 rounded-xl pl-10 pr-4 flex items-center text-[13px] text-muted-foreground/50 border border-white/5 group-hover:border-primary/30 transition-all cursor-text">
                        Search players or teams...
                      </div>
                    </div>
                  </div>

                  {/* Search Overlay (The "Popup") */}
                  <AnimatePresence>
                    {isSearchFocused && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[300] bg-background/40 backdrop-blur-sm"
                        onClick={() => setIsSearchFocused(false)}
                      >
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -20 }}
                          className="container max-w-3xl mx-auto pt-24 px-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="bg-card/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden" ref={searchRef}>
                            <div className="relative p-4 border-b border-white/5">
                              <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-primary" size={20} strokeWidth={3} />
                              <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Search players, teams, or games..."
                                className="w-full h-14 bg-white/5 rounded-2xl pl-14 pr-12 text-lg text-white placeholder-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                              />
                              <button 
                                onClick={() => setIsSearchFocused(false)}
                                className="absolute right-8 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-xl text-muted-foreground transition-colors"
                              >
                                <X size={20} strokeWidth={3} />
                              </button>
                            </div>

                            <div className="max-h-[60vh] overflow-y-auto p-2">
                              {isSearching ? (
                                <div className="py-20 text-center">
                                  <Activity className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                                  <p className="text-sm text-muted-foreground uppercase font-black tracking-widest">Searching the league...</p>
                                </div>
                              ) : results.length > 0 ? (
                                <div className="grid grid-cols-1 gap-1">
                                  {results.map((result) => (
                                    <Link
                                      key={`${result.type}-${result.id}`}
                                      href={result.href}
                                      onClick={() => setIsSearchFocused(false)}
                                      className="flex items-center gap-4 p-4 rounded-2xl hover:bg-primary/10 transition-all group"
                                    >
                                      <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center text-muted-foreground group-hover:bg-primary/20 transition-colors overflow-hidden shrink-0">
                                        {result.image ? (
                                          <img src={result.image} alt="" className="w-full h-full object-cover scale-110 group-hover:scale-125 transition-transform" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                                        ) : result.type === 'game' ? (
                                          <Trophy size={24} />
                                        ) : (
                                          <User size={24} />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${result.type === 'player' ? 'bg-primary/20 text-primary' : 'bg-blue-500/20 text-blue-400'}`}>
                                            {result.type}
                                          </span>
                                          {result.status === 'live' && (
                                            <span className="flex items-center gap-1 text-[10px] font-black text-destructive uppercase tracking-widest">
                                              <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                                              LIVE
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[16px] font-bold text-white group-hover:text-primary transition-colors">{result.title}</p>
                                        <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest">{result.subtitle}</p>
                                      </div>
                                      <ChevronRight size={20} className="text-muted-foreground/20 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                                    </Link>
                                  ))}
                                </div>
                              ) : inputValue.length >= 2 ? (
                                <div className="py-20 text-center text-muted-foreground">
                                  <p className="text-sm uppercase font-black tracking-widest opacity-50">No matches found for "{inputValue}"</p>
                                </div>
                              ) : (
                                <div className="py-20 text-center text-muted-foreground">
                                  <p className="text-sm uppercase font-black tracking-widest opacity-50">Enter at least 2 characters to search</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              {/* Right Section: Auth & Mobile Search */}
              <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                {/* Mobile Search Icon - Always visible on mobile */}
                <button 
                  onClick={() => setIsSearchFocused(true)}
                  className="sm:hidden p-2.5 text-muted-foreground hover:bg-white/5 rounded-2xl shrink-0 transition-colors"
                >
                  <Search size={22} strokeWidth={2.5} />
                </button>
  
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  {user ? (
                    <Link
                      href="/portfolio"
                      className="inline-flex items-center justify-center h-10 px-4 sm:px-6 rounded-xl bg-card border border-white/10 hover:border-primary/30 hover:bg-primary/5 transition-all active:scale-95 group overflow-hidden relative"
                    >
                      <div className="flex items-center gap-2.5 relative z-10">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                          <Wallet size={12} className="text-primary" strokeWidth={3} />
                        </div>
                        <span className="text-[13px] font-black text-white tracking-tight tabular-nums">
                          {balance !== null ? formatCurrency(balance) : '...'}
                        </span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
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
    </nav>
  );
}
