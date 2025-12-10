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
    <div className="w-full flex justify-center bg-white border-b border-gray-100/50 md:border-none sticky top-[56px] z-40">
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
                      text-[14px] md:text-[15px] font-medium whitespace-nowrap transition-colors duration-200
                      ${isActive ? "text-[#1a1a1a] font-semibold" : "text-[#666666] hover:text-[#1a1a1a]"}
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
                      inline-flex items-center justify-center h-[32px] px-[10px] rounded-full text-[13px] font-medium whitespace-nowrap transition-all duration-83
                      border border-solid
                      ${
                        isActive
                          ? "bg-[#D4F8EA] text-[#00D991] border-[#5FE8B8]"
                          : "bg-transparent text-[#1a1a1a] border-[#e0e0e0] hover:bg-[#f5f5f5]"
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