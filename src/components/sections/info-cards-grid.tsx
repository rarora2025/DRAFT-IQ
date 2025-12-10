import React from 'react';
import { Landmark, TrendingUp, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function InfoCardsGrid() {
  const cards = [
    {
      icon: <Landmark className="w-6 h-6" />,
      title: "Legal & regulated in the US",
      description: "Trade on the election, Oscars, Bitcoin, and more",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Grow your entire portfolio",
      description: "3.5% APY on all your cash and positions",
    },
    {
      icon: <RefreshCw className="w-6 h-6" />,
      title: "Fund your account freely",
      description: "Bank transfer, debit card, crypto, or wire",
    },
  ];

  return (
    <section className="w-full bg-surface-x10 py-6 md:py-8 border-b border-fill-x50">
      <div className="container mx-auto px-4 md:px-6 max-w-[1280px]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {cards.map((card, index) => (
            <div key={index} className="flex flex-row items-center gap-4 group cursor-default">
              <div
                className="flex items-center justify-center w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl bg-[#D4F8EA] text-[#00D991]"
              >
                {card.icon}
              </div>
              <div className="flex flex-col justify-center gap-0.5">
                <h3 className="text-[15px] font-semibold text-[#00D991] leading-tight">
                  {card.title}
                </h3>
                <p className="text-[13px] text-text-secondary leading-normal">
                  {card.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}