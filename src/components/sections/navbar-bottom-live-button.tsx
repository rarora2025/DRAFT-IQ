import React from 'react';
import { Radio } from 'lucide-react';

export default function NavbarBottomLiveButton() {
  return (
    <div 
      className="hidden md:flex flex-col w-full fixed bottom-0 left-0 z-[91]" 
      data-testid="navbar-bottom"
    >
      <div className="flex mb-2 mr-2 justify-end">
        <div className="">
          <button className="inline-flex w-auto items-center h-6 px-1.5 rounded-[30px] min-w-[24px] whitespace-nowrap box-border shrink-0 border border-solid border-transparent cursor-pointer transition-[opacity,background-color,transform] duration-[83ms] active:scale-90 active:transition-[opacity,background-color,transform] active:duration-50 [&:not(:active)]:transition-[opacity,background-color,transform] [&:not(:active)]:duration-[83ms,83ms,167ms] text-[#FFFFFF] bg-[#FF4444] hover:opacity-80 gap-1.5 shadow-sm">
            <Radio className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span className="text-[11px] font-semibold leading-none pt-[1px]">LIVE</span>
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between w-full m-auto box-border min-h-7 p-0.5 bg-[#FFFFFF]"></div>
    </div>
  );
}