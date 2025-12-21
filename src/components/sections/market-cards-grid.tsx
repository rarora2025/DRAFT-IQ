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
  <div className="flex items-center justify-between py-2 h-[44px]">
    <span className="text-[14px] font-bold text-white truncate max-w-[55%] flex-1" title={label}>{label}</span>
    <div className="flex items-center gap-3 flex-shrink-0">
      <span className="text-[14px] font-black text-primary min-w-[3ch] text-right">{probability}</span>
      <div className="flex gap-2">
        <button className="flex items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary rounded-lg px-4 h-[32px] text-[12px] font-black uppercase tracking-widest transition-all">
          YES
        </button>
        <button className="flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg px-4 h-[32px] text-[12px] font-black uppercase tracking-widest transition-all">
          NO
        </button>
      </div>
    </div>
  </div>
);

const BinaryOutcomes = ({ outcomes }: { outcomes: Outcome[] }) => (
  <div className="flex gap-3 mt-6 mb-2">
    <div className="flex-1 flex flex-col gap-2">
      <button className="w-full flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-[44px] text-[13px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20">
        YES
      </button>
      {outcomes[0].yesPrice && (
        <span className="text-[10px] text-primary font-black uppercase tracking-widest text-center">{outcomes[0].yesPrice}</span>
      )}
    </div>
    <div className="flex-1 flex flex-col gap-2">
      <button className="w-full flex items-center justify-center bg-card border border-border hover:bg-white/5 text-white rounded-xl h-[44px] text-[13px] font-black uppercase tracking-widest transition-all">
        NO
      </button>
      {outcomes[1].noPrice && (
        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest text-center">{outcomes[1].noPrice}</span>
      )}
    </div>
  </div>
);

const MarketCard = ({ data }: { data: MarketCardType }) => {
  return (
    <div className="group flex flex-col bg-card border border-border rounded-2xl p-5 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* Header */}
      <div className="flex items-start gap-4 mb-4 relative z-10">
        <div className="relative w-10 h-10 flex-shrink-0 rounded-xl bg-background border border-border overflow-hidden p-1.5 shadow-inner">
             
          <Image 
            src={data.icon} 
            alt={data.title} 
            fill
            sizes="40px"
            className="object-contain p-1.5"
          />
        </div>
        <div className="flex-1 min-w-0 pr-6 pt-0.5">
          <h3 className="text-[16px] font-black leading-tight text-white line-clamp-2 tracking-tight group-hover:text-primary transition-colors">
            {data.title}
          </h3>
        </div>
        
        {data.type === 'binary' && data.binaryProbability && (
            <div className="absolute top-0 right-0 text-[16px] font-black text-primary drop-shadow-sm">
                {data.binaryProbability}
            </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-end min-h-[80px] relative z-10">
        {data.type === 'list' ? (
          <div className="flex flex-col gap-1">
            {data.outcomes.map((outcome, idx) => (
              <OutcomeRowList key={idx} {...outcome} />
            ))}
          </div>
        ) : (
          <BinaryOutcomes outcomes={data.outcomes} />
        )}
      </div>

      {/* Footer */}
      <div className="mt-5 pt-4 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground relative z-10">
        <div className="font-bold tabular-nums tracking-widest uppercase">
          {data.volume} VOL
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {getMetaIcon(data.metaType)}
            <span className={`font-bold uppercase tracking-widest ${data.metaType === 'clock' && data.metaText.includes('m') ? "text-primary animate-pulse" : ""}`}>
              {data.metaText}
            </span>
          </div>
          <button className="text-muted-foreground hover:text-primary transition-all p-1 hover:bg-primary/10 rounded-md">
            <Plus size={14} strokeWidth={3} />
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