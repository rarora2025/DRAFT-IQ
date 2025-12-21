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

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-[100] bg-background/80 backdrop-blur-md border-b transition-all duration-200 ${
        scrolled ? 'border-border shadow-sm' : 'border-transparent'
      }`}
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Left Section: Mobile Menu & Logo & Desktop Links */}
        <div className="flex items-center gap-6">
          {/* Mobile Hamburger */}
          <button
            className="md:hidden p-1 -ml-1 text-zinc-400 hover:bg-white/5 rounded-md transition-colors"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 cursor-pointer flex-shrink-0" aria-label="DraftIQ Home">
            <img src="/logo.png" alt="DraftIQ" className="w-8 h-8 object-contain" />
            <span className="font-display font-black text-xl tracking-tighter text-white">DraftIQ</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/markets"
              className="text-[14px] font-medium text-[var(--color-text-x10)] hover:opacity-70 transition-opacity px-2 py-1.5"
            >
              Markets
            </Link>
            <Link
              href="/live"
              className="text-[14px] font-medium text-[var(--color-text-x10)] hover:opacity-70 transition-opacity px-2 py-1.5"
            >
              Live
            </Link>
            <Link
              href="/ideas"
              className="text-[14px] font-medium text-[var(--color-text-x10)] hover:opacity-70 transition-opacity px-2 py-1.5"
            >
              Ideas
            </Link>
            <Link
              href="/api"
              className="text-[14px] font-medium text-[var(--color-text-x10)] hover:opacity-70 transition-opacity px-2 py-1.5"
            >
              API
            </Link>
          </div>
        </div>

        {/* Center/Right Section: Search & Auth */}
        <div className="flex items-center gap-3 flex-1 justify-end max-w-full">
          {/* Search Bar - Hidden on small mobile, visible on desktop */}
          <div className="hidden md:block relative w-full max-w-[380px] transition-all">
            <div className="relative group">
              <input
                id="search-navbar"
                type="text"
                placeholder="Search markets or profiles"
                className="w-full h-9 bg-[var(--color-input)] rounded-full pl-11 pr-4 text-[15px] text-[var(--color-foreground)] placeholder-[#999999] border border-transparent focus:bg-white focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition-all duration-300 ease-in-out hover:bg-white hover:border-[var(--color-border-light)] hover:shadow-sm"
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#999999] group-focus-within:text-[var(--color-primary)] transition-colors">
                <Search size={18} strokeWidth={2.5} />
              </div>
            </div>
          </div>
          
          {/* Mobile Search Icon (when bar is hidden) */}
          <button className="md:hidden p-2 text-[var(--color-text-x10)] hover:bg-[var(--color-fill-x50)] rounded-full">
            <Search size={20} />
          </button>

          {/* Auth Buttons */}
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center justify-center h-9 px-4 rounded-full text-[14px] font-medium text-[var(--color-green-x10)] hover:bg-[var(--color-fill-x50)] active:bg-[var(--color-fill-x30)] border border-[var(--color-fill-x40)] transition-all duration-100 ease-in-out whitespace-nowrap"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center h-9 px-4 rounded-full text-[14px] font-medium text-white bg-[var(--color-primary)] hover:opacity-90 active:scale-95 transition-all duration-100 ease-in-out whitespace-nowrap shadow-sm"
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
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Drawer */}
          <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-white border-r border-[var(--color-border)] shadow-xl flex flex-col animate-slide-in">
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
              <span className="font-bold text-xl tracking-tight text-[var(--color-primary)]">Kalshi</span>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded-md hover:bg-[var(--color-muted)] text-[var(--color-text-secondary)]"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex flex-col p-4 gap-2">
              <Link
                href="/markets"
                className="flex items-center h-10 px-3 rounded-lg text-[16px] font-medium text-[var(--color-text-x10)] hover:bg-[var(--color-fill-x50)]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Markets
              </Link>
              <Link
                href="/live"
                className="flex items-center h-10 px-3 rounded-lg text-[16px] font-medium text-[var(--color-text-x10)] hover:bg-[var(--color-fill-x50)]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Live
              </Link>
              <Link
                href="/ideas"
                className="flex items-center h-10 px-3 rounded-lg text-[16px] font-medium text-[var(--color-text-x10)] hover:bg-[var(--color-fill-x50)]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Ideas
              </Link>
              <Link
                href="/api"
                className="flex items-center h-10 px-3 rounded-lg text-[16px] font-medium text-[var(--color-text-x10)] hover:bg-[var(--color-fill-x50)]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                API
              </Link>
            </div>

            <div className="mt-auto p-4 border-t border-[var(--color-border)] space-y-3">
              <Link
                href="/login"
                className="flex items-center justify-center w-full h-10 rounded-full border border-[var(--color-border)] text-[14px] font-medium text-[var(--color-text-x10)]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="flex items-center justify-center w-full h-10 rounded-full bg-[var(--color-primary)] text-white text-[14px] font-medium"
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