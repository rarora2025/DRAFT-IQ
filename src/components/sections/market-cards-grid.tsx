'use client';

import React from 'react';
import Image from 'next/image';
import { Plus, Clock, RefreshCw, Flame, Calendar } from 'lucide-react';

// --- Types ---

type Outcome = {
  label: string;
  probability: string;
  yesPrice?: string;
  noPrice?: string;
};

type MarketCardType = {
  id: string;
  title: string;
  icon: string;
  volume: string;
  metaType: 'refresh' | 'clock' | 'flame' | 'calendar';
  metaText: string;
  type: 'list' | 'binary';
  outcomes: Outcome[];
  binaryProbability?: string; // For binary cards (top right)
};

// --- Mock Data ---

const MARKET_DATA: MarketCardType[] = [
  {
    id: '1',
    title: 'Next US Presidential Election Winner?',
    icon: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/200e45b4-6171-4b26-b381-aa6678867b18-kalshi-com/assets/images/images_3.png',
    volume: '$4,931,140',
    metaType: 'refresh',
    metaText: 'Annually',
    type: 'list',
    outcomes: [
      { label: 'J.D. Vance', probability: '29%' },
      { label: 'Gavin Newsom', probability: '21%' },
    ],
  },
  {
    id: '2',
    title: 'Pro Football Champion?',
    icon: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/200e45b4-6171-4b26-b381-aa6678867b18-kalshi-com/assets/images/images_4.png',
    volume: '$47,524,512',
    metaType: 'refresh',
    metaText: 'Annually',
    type: 'list',
    outcomes: [
      { label: 'Los Angeles R', probability: '19%' },
      { label: 'Seattle', probability: '12%' },
    ],
  },
  {
    id: '3',
    title: 'Will Trump release any of the Epstein Files?',
    icon: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/200e45b4-6171-4b26-b381-aa6678867b18-kalshi-com/assets/images/images_5.png',
    volume: '$3,797,711',
    metaType: 'clock',
    metaText: 'Daily',
    type: 'list',
    outcomes: [
      { label: 'Before Dec 20, 2024', probability: '63%' },
      { label: 'Before 2026', probability: '70%' },
    ],
  },
  {
    id: '4',
    title: 'Fed decision in December?',
    icon: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/200e45b4-6171-4b26-b381-aa6678867b18-kalshi-com/assets/images/images_6.png',
    volume: '$31,337,797',
    metaType: 'clock',
    metaText: '14h 52m 03s',
    type: 'list',
    outcomes: [
      { label: 'Cut 25bps', probability: '97%' },
      { label: 'Fed maintains rate', probability: '4%' },
    ],
  },
  {
    id: '5',
    title: 'Pro Basketball Champion?',
    icon: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/200e45b4-6171-4b26-b381-aa6678867b18-kalshi-com/assets/images/images_7.png',
    volume: '$10,416,543',
    metaType: 'refresh',
    metaText: 'Annually',
    type: 'list',
    outcomes: [
      { label: 'Oklahoma City', probability: '44%' },
      { label: 'Denver', probability: '11%' },
    ],
  },
  {
    id: '6',
    title: "TIME's Person of the Year for 2025?",
    icon: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/200e45b4-6171-4b26-b381-aa6678867b18-kalshi-com/assets/images/images_8.png',
    volume: '$7,761,776',
    metaType: 'refresh',
    metaText: 'Annually',
    type: 'list',
    outcomes: [
      { label: 'AI', probability: '72%' },
      { label: 'Jensen Huang', probability: '11%' },
    ],
  },
  {
    id: '7',
    title: 'S&P close price end of 2025?',
    icon: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/200e45b4-6171-4b26-b381-aa6678867b18-kalshi-com/assets/images/images_9.png',
    volume: '$8,052,557',
    metaType: 'refresh',
    metaText: 'Annually',
    type: 'list',
    outcomes: [
      { label: '6,800 to 6,999.99', probability: '44%' },
      { label: '7,000 to 7,199.99', probability: '27%' },
    ],
  },
  {
    id: '8',
    title: 'Highest temperature in NYC today?',
    icon: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/200e45b4-6171-4b26-b381-aa6678867b18-kalshi-com/assets/images/images_10.png',
    volume: '$274,734',
    metaType: 'clock',
    metaText: '52m 03s',
    type: 'list',
    outcomes: [
      { label: '34° to 35°', probability: '83%' },
      { label: '36° to 37°', probability: '6%' },
    ],
  },
  {
    id: '9',
    title: 'Stanley Cup® Champion?',
    icon: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/200e45b4-6171-4b26-b381-aa6678867b18-kalshi-com/assets/images/images_11.png',
    volume: '$3,206,719',
    metaType: 'refresh',
    metaText: 'Annually',
    type: 'list',
    outcomes: [
      { label: 'Colorado Avalanche', probability: '20%' },
      { label: 'Tampa Bay Lightning', probability: '10%' },
    ],
  },
  {
    id: '10',
    title: 'Will Donald Trump attend another football game?',
    icon: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/200e45b4-6171-4b26-b381-aa6678867b18-kalshi-com/assets/images/images_19.png',
    volume: '$508,018',
    metaType: 'clock',
    metaText: 'Weekly',
    type: 'binary',
    binaryProbability: '84%',
    outcomes: [
      { label: 'Yes', probability: '', yesPrice: '$100 → $116' },
      { label: 'No', probability: '', noPrice: '$100 → $625' },
    ]
  },
  {
    id: '11',
    title: 'Will Bitcoin cross $100k again this year?',
    icon: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/200e45b4-6171-4b26-b381-aa6678867b18-kalshi-com/assets/images/images_21.png',
    volume: '$2,540,069',
    metaType: 'refresh',
    metaText: 'Annually',
    type: 'binary',
    binaryProbability: '44%',
    outcomes: [
      { label: 'Yes', probability: '', yesPrice: '$100 → $220' },
      { label: 'No', probability: '', noPrice: '$100 → $168' },
    ]
  },
  {
    id: '12',
    title: 'College Football Championship Winner?',
    icon: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/200e45b4-6171-4b26-b381-aa6678867b18-kalshi-com/assets/images/images_12.png',
    volume: '$21,772,067',
    metaType: 'refresh',
    metaText: 'Annually',
    type: 'list',
    outcomes: [
      { label: 'Ohio St.', probability: '30%' },
      { label: 'Indiana', probability: '22%' },
    ],
  },
];

// --- Helpers ---

const getMetaIcon = (type: MarketCardType['metaType']) => {
  switch (type) {
    case 'refresh': return <RefreshCw size={12} className="text-text-secondary" />;
    case 'clock': return <Clock size={12} className="text-text-secondary" />;
    case 'flame': return <Flame size={12} className="text-text-secondary" />;
    case 'calendar': return <Calendar size={12} className="text-text-secondary" />;
    default: return null;
  }
};

// --- Components ---

const OutcomeRowList = ({ label, probability }: { label: string; probability: string }) => (
  <div className="flex items-center justify-between py-1.5 h-[36px]">
    <span className="text-[14px] text-text-x10 truncate max-w-[55%] flex-1" title={label}>{label}</span>
    <div className="flex items-center gap-2 flex-shrink-0">
      <span className="text-[14px] font-semibold text-text-x10 min-w-[3ch] text-right">{probability}</span>
      <div className="flex gap-1">
        <button className="flex items-center justify-center bg-[#e3f2fd] hover:bg-[#bbdefb] text-[#1976d2] rounded-md px-2.5 h-[24px] text-[13px] font-medium transition-colors duration-200">
          Yes
        </button>
        <button className="flex items-center justify-center bg-[#fce4ec] hover:bg-[#f8bbd0] text-[#c2185b] rounded-md px-2.5 h-[24px] text-[13px] font-medium transition-colors duration-200">
          No
        </button>
      </div>
    </div>
  </div>
);

const BinaryOutcomes = ({ outcomes }: { outcomes: Outcome[] }) => (
  <div className="flex gap-2 mt-4 mb-2">
    <div className="flex-1 flex flex-col gap-1.5">
      <button className="w-full flex items-center justify-center bg-[#e3f2fd] hover:bg-[#bbdefb] text-[#1976d2] rounded-lg h-[40px] text-[14px] font-medium transition-colors duration-200">
        Yes
      </button>
      {outcomes[0].yesPrice && (
        <span className="text-[11px] text-[#22c55e] font-medium text-center">{outcomes[0].yesPrice}</span>
      )}
    </div>
    <div className="flex-1 flex flex-col gap-1.5">
      <button className="w-full flex items-center justify-center bg-[#fce4ec] hover:bg-[#f8bbd0] text-[#c2185b] rounded-lg h-[40px] text-[14px] font-medium transition-colors duration-200">
        No
      </button>
      {outcomes[1].noPrice && (
        <span className="text-[11px] text-[#22c55e] font-medium text-center">{outcomes[1].noPrice}</span>
      )}
    </div>
  </div>
);

const MarketCard = ({ data }: { data: MarketCardType }) => {
  return (
    <div className="group flex flex-col bg-surface-x10 border border-[#e0e0e0] rounded-xl p-4 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:border-[#d1d1d1] transition-all duration-200 cursor-pointer h-full relative">
      {/* Header */}
      <div className="flex items-start gap-3 mb-2">
        <div className="relative w-8 h-8 flex-shrink-0 rounded-md overflow-hidden">
             
          <Image 
            src={data.icon} 
            alt={data.title} 
            fill
            sizes="32px"
            className="object-contain"
          />
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <h3 className="text-[15px] font-semibold leading-snug text-text-x10 line-clamp-2">
            {data.title}
          </h3>
        </div>
        
        {data.type === 'binary' && data.binaryProbability && (
            <div className="absolute top-4 right-4 text-[16px] font-semibold text-text-x10">
                {data.binaryProbability}
            </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-end min-h-[72px]">
        {data.type === 'list' ? (
          <div className="flex flex-col gap-0.5">
            {data.outcomes.map((outcome, idx) => (
              <OutcomeRowList key={idx} {...outcome} />
            ))}
          </div>
        ) : (
          <BinaryOutcomes outcomes={data.outcomes} />
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-[#f0f0f0] flex items-center justify-between text-[12px] text-text-secondary">
        <div className="font-normal tabular-nums tracking-tight">
          {data.volume}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            {getMetaIcon(data.metaType)}
            <span className={data.metaType === 'clock' && data.metaText.includes('m') ? "text-[#e85d04] font-medium" : ""}>
              {data.metaText}
            </span>
          </div>
          <button className="text-text-secondary hover:text-brand-primary transition-colors duration-200">
            <Plus size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function MarketCardsGrid() {
  return (
    <section className="container mx-auto px-4 md:px-6 w-full max-w-[1280px]">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {MARKET_DATA.map((market) => (
          <MarketCard key={market.id} data={market} />
        ))}
      </div>
    </section>
  );
}