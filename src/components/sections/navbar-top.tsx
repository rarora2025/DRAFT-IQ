'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, User, Wallet, Activity, Clock, Trophy, X } from 'lucide-react';
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
          <div className="flex items-center gap-4 sm:gap-6 shrink-0">
            <Link href="/" className="flex items-center gap-2 cursor-pointer flex-shrink-0 group" aria-label="DraftIQ Home">
              <img src={LOGO_URL} alt="DraftIQ" className="h-8 sm:h-10 object-contain group-hover:scale-110 transition-transform" />
            </Link>

              <div className="hidden lg:flex items-center gap-1">
                {[
                  { label: 'Markets', href: '/markets' },
                  { label: 'Portfolio', href: '/portfolio' },
                  { label: 'Feed', href: '/feed' },
                  { label: 'Ranks', href: '/leaderboard' }
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-all px-3 py-2 rounded-xl hover:bg-primary/5"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
          </div>

            {/* Center Section: Search */}
            <div className={`flex-1 max-w-xl relative ${isSearchFocused ? 'fixed inset-0 z-[200] bg-background p-4 sm:relative sm:inset-auto sm:bg-transparent sm:p-0 sm:block' : 'hidden sm:block'}`} ref={searchRef}>
              <div className="relative group h-full sm:h-auto">
                    {/* Mobile Close Button */}
                    {isSearchFocused && (
                      <button 
                        onClick={() => setIsSearchFocused(false)}
                        className="sm:hidden absolute right-4 top-4 p-2 text-muted-foreground hover:text-white"
                      >
                        <X size={24} />
                      </button>
                    )}

                    <motion.div
                    animate={{ 
                      width: isSearchFocused ? '100%' : '200px',
                      scale: isSearchFocused ? 1 : 1
                    }}
                    className={`relative ml-auto ${isSearchFocused ? 'mt-12 sm:mt-0' : ''}`}
                  >
                      <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        placeholder="Search games, players, or teams..."
                        className="w-full h-12 sm:h-10 bg-card/50 rounded-2xl sm:rounded-xl pl-12 sm:pl-10 pr-12 sm:pr-10 text-[15px] sm:text-[13px] text-white placeholder-muted-foreground/30 border border-white/5 focus:border-primary/30 focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all shadow-xl"
                      />
                    <div className="absolute left-4 sm:left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-primary transition-colors">
                      <Search size={18} className="sm:w-3.5 sm:h-3.5" strokeWidth={3} />
                    </div>
                    {inputValue && (
                      <button 
                        onClick={() => {
                          setInputValue('');
                          setQuery('');
                        }}
                        className="absolute right-4 sm:right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-white transition-colors"
                      >
                        <X size={18} className="sm:w-3.5 sm:h-3.5" strokeWidth={3} />
                      </button>
                    )}
                  </motion.div>


                <AnimatePresence>
                  {isSearchFocused && (query.length > 0 || results.length > 0) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full right-0 w-full mt-2 bg-card/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[110]"
                    >
                      <div className="max-h-[400px] overflow-y-auto p-2 space-y-1">
                        {isSearching ? (
                          <div className="p-8 text-center">
                            <Activity className="w-5 h-5 animate-spin text-primary mx-auto mb-2" />
                            <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-widest">Searching...</p>
                          </div>
                        ) : results.length > 0 ? (
                          results.map((result) => (
                              <Link
                                key={`${result.type}-${result.id}`}
                                href={result.href}
                                onClick={() => setIsSearchFocused(false)}
                                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-all group"
                              >
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 transition-colors overflow-hidden">
                                  {result.image ? (
                                    <img src={result.image} alt="" className="w-full h-full object-cover" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                                  ) : result.type === 'game' ? (
                                    <Trophy size={18} />
                                  ) : (
                                    <User size={18} />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] font-bold text-white truncate">{result.title}</p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">{result.subtitle}</p>
                                    {result.status === 'live' && (
                                      <span className="flex items-center gap-1 text-[9px] font-black text-destructive uppercase tracking-widest shrink-0">
                                        <div className="w-1 h-1 rounded-full bg-destructive animate-pulse" />
                                        LIVE
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Clock size={14} className="text-muted-foreground/30 shrink-0" />
                              </Link>
                          ))
                        ) : query.length >= 2 ? (
                          <div className="p-8 text-center text-muted-foreground">
                            <p className="text-[11px] uppercase font-bold tracking-widest">No results found</p>
                          </div>
                        ) : (
                          <div className="p-4 text-center text-muted-foreground">
                            <p className="text-[11px] uppercase font-bold tracking-widest">Keep typing...</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right Section: Auth & Mobile Search */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              {/* Mobile Search Icon */}
              <button 
                onClick={() => setIsSearchFocused(!isSearchFocused)}
                className="sm:hidden p-2 text-muted-foreground hover:bg-white/5 rounded-full shrink-0"
              >
                <Search size={20} />
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
