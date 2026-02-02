'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { SettingsModal } from '@/components/SettingsModal';

export default function NavbarTop() {
  const [scrolled, setScrolled] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const { user, loading, supabase } = useAuth(false);

    const BRAND_LOGO_URL = "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/200e45b4-6171-4b26-b381-aa6678867b18/DraftIQ-Logo-1770001050250.png?width=8000&height=8000&resize=contain";
    const COIN_LOGO_URL = "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/200e45b4-6171-4b26-b381-aa6678867b18/ChatGPT-Image-Feb-1-2026-1769997817075.png?width=8000&height=8000&resize=contain";

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
      return `${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} IQ`;
    };

    useEffect(() => {
      const handleScroll = () => {
        setScrolled(window.scrollY > 20);
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }, []);

  return (
    <>
      <nav
        className={`fixed top-10 left-0 w-full z-[400] bg-background/80 backdrop-blur-md border-b border-white/5 transition-all duration-200 ${
          scrolled ? 'shadow-lg shadow-black/20' : ''
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
          {/* Left Section: Logo & Desktop Links */}
          <div className="flex items-center gap-2 sm:gap-6 shrink-0">
            <Link href="/markets" className="flex items-center gap-2 cursor-pointer flex-shrink-0 group" aria-label="DraftIQ Home">
              <motion.img 
                src={BRAND_LOGO_URL} 
                alt="DraftIQ" 
                className="h-10 sm:h-12 w-auto object-contain transition-transform group-hover:scale-105" 
                whileTap={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              />
            </Link>

            <div className="hidden sm:flex items-center gap-0.5 sm:gap-1">
              {[
                { label: 'Markets', href: '/markets' },
                { label: 'Portfolio', href: '/portfolio' },
                { label: 'Community', href: '/community' },
                { label: 'Rewards', href: '/rewards' }
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

          {/* Right Section: Auth */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {user ? (
                <>
                  <Link
                    href="/portfolio"
                    className="inline-flex items-center justify-center h-10 px-4 sm:px-6 rounded-xl bg-card border border-white/10 hover:border-primary/30 hover:bg-primary/5 transition-all active:scale-95 group overflow-hidden relative"
                  >
                    <div className="flex items-center gap-2.5 relative z-10">
                      <span className="text-[13px] font-black text-white tracking-tight tabular-nums">
                        {balance !== null ? formatCurrency(balance) : '...'}
                      </span>
                        <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center transition-transform group-hover:scale-110">
                          <img src={COIN_LOGO_URL} alt="IQ" className="w-full h-full object-contain" />
                        </div>

                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  </Link>

                  <button
                    onClick={() => setShowSettings(true)}
                    className="p-2.5 text-muted-foreground hover:text-white hover:bg-white/5 rounded-xl transition-all active:scale-95 shrink-0 border border-white/5 sm:border-transparent"
                  >
                    <Settings size={20} />
                  </button>
                </>
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

      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </>
  );
}
