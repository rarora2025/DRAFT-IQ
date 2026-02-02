import React from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, PlusCircle, Trophy } from 'lucide-react';
import { IQDisplay } from '@/components/IQDisplay';

export default function FeaturedMarketCard() {
  return (
    <section className="w-full flex justify-center p-4 md:p-6 bg-gray-50/50">
      <div className="relative w-full max-w-[1200px] bg-white rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow duration-300 overflow-hidden border border-[#E0E0E0] md:border-none flex flex-col md:flex-row min-h-[420px] md:min-h-[340px]">
        
        {/* Left Column: Info & Actions */}
        <div className="flex flex-col justify-between p-6 md:p-8 md:pr-0 w-full md:w-[45%] relative z-20">
          
          {/* Header */}
          <div className="flex items-start gap-4 mb-6 md:mb-0">
            {/* Market Icon */}
            <div className="flex-shrink-0 w-12 h-12 md:w-14 md:h-14 bg-blue-500 rounded-xl flex items-center justify-center shadow-sm overflow-hidden text-white relative">
               {/* Use the provided asset if suitable, otherwise fallback to icon/placeholder */}
               <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <div className="w-8 h-8 relative">
                     {/* Placeholder for Basketball Icon since specific asset url might be broken or not generic */}
                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full text-white/90">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M5.6 5.6l12.8 12.8" />
                        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" transform="rotate(90 12 12)" />
                     </svg>
                  </div>
               </div>
            </div>

            {/* Title Info */}
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-normal text-[#666666] leading-tight">
                College Basketball (M)
              </span>
              <h2 className="text-[22px] md:text-[24px] font-semibold text-[#1A1A1A] leading-tight tracking-tight">
                Florida at UConn
              </h2>
            </div>
          </div>

          {/* Betting Buttons */}
          <div className="flex gap-3 w-full mt-auto md:mt-0 mb-6 md:mb-0">
            {/* Yes Button (FLA) */}
            <button className="group flex-1 flex flex-col items-center justify-center bg-[#1A1A1A] text-white py-2.5 rounded-xl hover:opacity-90 transition-all active:scale-[0.98]">
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-bold tracking-wide">FLA</span>
                <span className="text-[15px] font-medium opacity-90">42¢</span>
              </div>
                  <div className="flex items-center gap-1 text-[11px] font-medium text-white/60 mt-0.5 group-hover:text-white/80 transition-colors">
                    <IQDisplay value={100} valueClassName="text-[11px] text-inherit" />
                    <span className="mx-0.5">→</span>
                    <IQDisplay value={249} valueClassName="text-[11px] text-[#4ade80]" />
                  </div>
            </button>

            {/* No Button (CONN) */}
            <button className="group flex-1 flex flex-col items-center justify-center bg-[#00D991] text-white py-2.5 rounded-xl hover:bg-[#00c483] transition-all active:scale-[0.98]">
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-bold tracking-wide">CONN</span>
                <span className="text-[15px] font-medium opacity-90">60¢</span>
              </div>
                  <div className="flex items-center gap-1 text-[11px] font-medium text-white/80 mt-0.5 group-hover:text-white transition-colors">
                    <IQDisplay value={100} valueClassName="text-[11px] text-inherit" />
                    <span className="mx-0.5">→</span>
                    <IQDisplay value={166} valueClassName="text-[11px] text-inherit" />
                  </div>
            </button>
          </div>

          {/* News & Footer */}
          <div className="flex flex-col gap-4 mt-auto">
            <div className="flex items-start gap-2 text-[13px] text-[#666666] leading-snug">
              <span className="font-semibold text-[#1A1A1A]">News</span>
              <span className="w-1 h-1 rounded-full bg-[#999999] mt-2 shrink-0"></span>
              <p className="line-clamp-2">
                Florida heads to New York to take on Connecticut in the Jimmy V Classic, with both sides...
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-transparent md:border-transparent">
                <div className="flex items-center gap-2">
                     <div className="flex items-center gap-1.5">
                       <IQDisplay value={5030634} valueClassName="text-[12px] font-medium text-[#999999]" />
                       <span className="text-[12px] font-medium text-[#999999]">Vol.</span>
                     </div>
                   <PlusCircle className="w-4 h-4 text-[#999999] cursor-pointer hover:text-[#1A1A1A] transition-colors" />
                </div>
              
              <div className="flex items-center gap-2">
                <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-[#666666]">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E0E0E0]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E0E0E0]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E0E0E0]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E0E0E0]"></span>
                </div>
                <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-[#666666]">
                    <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Chart & Visuals */}
        <div className="w-full md:w-[55%] relative h-[250px] md:h-auto overflow-hidden">
            {/* Live Indicator */}
            <div className="absolute top-6 right-6 z-30 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#FF4444] animate-pulse"></div>
                    <span className="text-[11px] font-bold text-[#FF4444] tracking-wide">LIVE • 2ND - 9:20</span>
                    <div className="w-3.5 h-3.5 rounded-full border border-[#E0E0E0] flex items-center justify-center text-[8px] text-[#999999] cursor-pointer">i</div>
                </div>
            </div>

            {/* Scoreboard */}
            <div className="absolute top-14 right-6 z-20 flex flex-col items-center">
                <div className="flex items-center gap-3 text-[28px] font-bold text-[#1A1A1A] font-mono tracking-tighter">
                    <div className="flex flex-col items-center gap-1">
                         {/* Team 1 Logo Placeholder */}
                         <div className="w-8 h-6 relative mb-1">
                             <div className="absolute inset-0 bg-orange-500 rounded-sm transform skew-x-[-10deg]"></div>
                             <div className="absolute inset-0 bg-blue-600 rounded-sm transform skew-x-[-10deg] ml-1 opacity-80"></div>
                         </div>
                         <span className="text-[10px] font-bold text-[#666666] font-sans tracking-wide">FLA</span>
                    </div>
                    
                    <span className="mb-4">51 - 52</span>

                    <div className="flex flex-col items-center gap-1">
                         {/* Team 2 Logo Placeholder */}
                         <div className="w-8 h-6 relative mb-1">
                            <div className="absolute inset-0 bg-blue-800 rounded-sm transform skew-x-[10deg]"></div>
                            <div className="absolute top-0 right-0 w-1/2 h-full bg-red-600 rounded-r-sm transform skew-x-[10deg]"></div>
                         </div>
                         <span className="text-[10px] font-bold text-[#666666] font-sans tracking-wide">CONN</span>
                    </div>
                </div>
            </div>

            {/* Kalshi Logo */}
            <div className="absolute top-[130px] right-6 z-20">
                <span className="text-[#00D991] font-bold text-lg tracking-tight">Kalshi</span>
            </div>

            {/* Chart SVG */}
            <div className="absolute inset-x-0 bottom-0 top-0 w-full h-full pointer-events-none">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 400 200">
                    <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#00D991" stopOpacity="0.1"/>
                            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0"/>
                        </linearGradient>
                    </defs>
                    {/* Simplified random walk line ending high */}
                    <path 
                        d="M0,180 C20,175 40,185 60,170 C80,155 100,165 120,150 C140,160 160,140 180,145 C200,130 220,110 240,115 C260,120 280,100 300,90 C320,80 340,85 360,70 C380,60 390,50 400,40"
                        fill="none"
                        stroke="#E8E8E8"
                        strokeWidth="2"
                    />
                    <path 
                        d="M200,130 C220,125 240,140 260,120 C280,110 300,115 320,100 C340,85 360,75 380,65 C390,60 395,50 400,45"
                        fill="none"
                        stroke="#00D991"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        className="animate-[draw_1s_ease-out_forwards]"
                    />
                    {/* Fill Area */}
                    <path 
                         d="M200,130 C220,125 240,140 260,120 C280,110 300,115 320,100 C340,85 360,75 380,65 C390,60 395,50 400,45 L400,200 L200,200 Z"
                         fill="url(#chartGradient)"
                    />
                    {/* Dashed line to current price */}
                    <line x1="0" y1="45" x2="400" y2="45" stroke="#00D991" strokeWidth="1" strokeDasharray="4 4" opacity="0.2" />
                </svg>
            </div>

            {/* Mobile/Tablet fade bottom overlay if needed, mostly for aesthetics */}
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent md:hidden"></div>
        </div>
      </div>
    </section>
  );
}