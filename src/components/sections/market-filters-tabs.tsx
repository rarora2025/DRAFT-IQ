'use client';

import React, { useState } from 'react';

const CATEGORIES = [
  "For you",
  "Pro Football",
  "Golden Globes",
  "CFP",
  "2026 Midterms",
  "Mayor Mamdani",
  "Trump Tariffs",
  "NHL",
  "Grammy Awards"
];

export default function MarketFiltersTabs() {
  const [activeTab, setActiveTab] = useState("For you");

  return (
    <section className="w-full bg-white select-none">
      {/* Container constraints matching the main layout */}
      <div className="w-full max-w-[1280px] mx-auto">
        <div className="w-full relative">
          {/* 
            Scrollable container 
            - Horizontal scroll on mobile
            - Padding to align with page content
            - Scrollbar hidden 
          */}
          <div className="w-full flex items-center overflow-x-auto py-2 px-3 md:px-6 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex items-center gap-2 min-w-max">
              {CATEGORIES.map((category) => {
                const isActive = activeTab === category;
                return (
                  <button
                    key={category}
                    onClick={() => setActiveTab(category)}
                    className={`
                      relative inline-flex items-center justify-center 
                      h-[32px] px-[10px] py-0.5 rounded-full
                      text-[13px] font-medium whitespace-nowrap
                      border border-solid transition-all duration-[83ms]
                      outline-none focus-visible:outline-2 focus-visible:outline-[#00D991]
                      active:scale-90
                      ${isActive 
                        ? 'bg-[#D4F8EA] text-[#00D991] border-[#5FE8B8] hover:opacity-80' 
                        : 'bg-transparent text-[#1A1A1A] border-[#D1D1D1] hover:bg-[#F5F5F5]'
                      }
                    `}
                    type="button"
                    aria-pressed={isActive}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}