import React from "react";

const CATEGORIES = [
  "Trending",
  "New",
  "All",
  "Politics",
  "Sports",
  "Culture",
  "Crypto",
  "Climate",
  "Economics",
  "Mentions",
  "Companies",
  "Financials",
  "Tech & Science",
  "Health",
  "World",
];

const FILTERS = [
  "For you",
  "Pro Football",
  "Golden Globes",
  "CFP",
  "2026 Midterms",
  "Mayor Mamdani",
  "Trump Tariffs",
  "NHL",
  "Grammy Awards",
];

export default function NavbarCategories() {
  return (
    <div className="w-full flex justify-center bg-background/80 backdrop-blur-md border-b border-white/5 fixed top-[104px] z-40">
      <div className="w-full max-w-[1280px] flex flex-col">
        
        {/* Row 1: Text Categories */}
        <div className="w-full relative mt-0.5 md:mt-2 mb-1">
          <div className="w-full overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex items-center w-max px-4 md:px-6 gap-5 h-10">
              {CATEGORIES.map((category, index) => {
                const isActive = category === "Trending";
                return (
                  <button
                    key={category}
                    className={`
                      text-[14px] md:text-[15px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors duration-200
                      ${isActive ? "text-primary italic" : "text-muted-foreground hover:text-white"}
                    `}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 2: Pill Filters */}
        <div className="w-full relative pb-2 md:pb-0">
          <div className="w-full overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex items-center w-max px-4 md:px-6 gap-2 h-10 md:h-12">
              {FILTERS.map((filter, index) => {
                const isActive = filter === "For you";
                return (
                  <button
                    key={filter}
                    className={`
                      inline-flex items-center justify-center h-[32px] px-4 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-200
                      border
                      ${
                        isActive
                          ? "bg-primary/20 text-primary border-primary/50"
                          : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10 hover:text-white"
                      }
                    `}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}