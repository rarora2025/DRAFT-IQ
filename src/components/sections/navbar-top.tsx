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
      className={`fixed top-0 left-0 w-full z-[100] bg-[var(--color-background)]/80 backdrop-blur-md border-b transition-all duration-200 ${
        scrolled ? 'border-[var(--color-border)] shadow-sm' : 'border-transparent'
      }`}
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
      }}
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Left Section: Mobile Menu & Logo & Desktop Links */}
        <div className="flex items-center gap-6">
          {/* Mobile Hamburger */}
          <button
            className="md:hidden p-1 -ml-1 text-[var(--color-text-x10)] hover:bg-[var(--color-fill-x50)] rounded-md transition-colors"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>

          {/* Logo */}
          <Link href="/" className="flex flex-col justify-center cursor-pointer flex-shrink-0" aria-label="Kalshi Home">
            {/* Using SVG construct to match the 'Kalshi' text logo style accurately */}
            <svg
              width="78"
              height="20"
              viewBox="0 0 78 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-[#00d991]"
            >
              <path
                d="M10.8 2.4V11.2L16.2 2.4H20.4L13.2 13.2L20.8 19.6H16.2L10.8 14.8V19.6H7.2V2.4H10.8ZM28.8 19.6H25.4V8.4H28.8V19.6ZM28.8 6.4H25.4V3.2H28.8V6.4ZM34 19.6V2.4H37.4V19.6H34ZM45.6 19.8C43.3333 19.8 41.5333 19.2667 40.2 18.2C38.8667 17.1333 38.2 15.6667 38.2 13.8H41.6C41.6 14.6 41.8333 15.2333 42.3 15.7C42.7667 16.1667 43.4667 16.4 44.4 16.4C45.2 16.4 45.8 16.2667 46.2 16C46.6 15.7333 46.8 15.3667 46.8 14.9C46.8 14.5 46.6667 14.2 46.4 14C46.1333 13.8 45.6 13.6 44.8 13.4L43.4 13.1C41.6667 12.7 40.3667 12.1 39.5 11.3C38.6333 10.5 38.2 9.4 38.2 8C38.2 6.5333 38.7333 5.36667 39.8 4.5C40.8667 3.63333 42.3333 3.2 44.2 3.2C45.9333 3.2 47.3333 3.56667 48.4 4.3C49.4667 5.03333 50.1333 6.13333 50.4 7.6L47.2 8C47 7.2 46.6667 6.66667 46.2 6.33333C45.7333 6 45.0667 5.83333 44.2 5.83333C43.4667 5.83333 42.9333 5.96667 42.6 6.23333C42.2667 6.5 42.1 6.83333 42.1 7.23333C42.1 7.56667 42.2333 7.83333 42.5 8.03333C42.7667 8.23333 43.2667 8.43333 44 8.63333L46 9.03333C47.8 9.43333 49.0667 10 49.8 10.7333C50.5333 11.4667 50.9 12.4667 50.9 13.7333C50.9 15.4667 50.2667 16.8333 49 17.9C47.7333 18.9667 45.9333 19.5 43.6 19.5L45.6 19.8ZM57.6 19.6H54.2V2.4H57.6V9.4H61.8V19.6H58.4V12.2H54.2V19.6H57.6ZM67.4 19.6H64V8.4H67.4V19.6ZM67.4 6.4H64V3.2H67.4V6.4Z"
                fill="currentColor"
              />
            </svg>
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