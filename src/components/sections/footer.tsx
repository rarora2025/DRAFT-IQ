export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-[#020420] border-t border-white/5 py-12">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col items-center justify-center text-center space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 relative">
              <img src="/logo.png" alt="DraftIQ" className="w-full h-full object-contain" />
            </div>
            <span className="font-display font-black text-2xl text-white tracking-tighter uppercase">
              DraftIQ
            </span>
          </div>
          
          <p className="text-zinc-500 text-sm max-w-md font-medium">
            The ultimate prediction market for player props. Trade, compete, and climb the leaderboard.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-[13px] font-bold uppercase tracking-widest text-zinc-400">
            <a href="/markets" className="hover:text-primary transition-colors">Markets</a>
            <a href="/leaderboard" className="hover:text-primary transition-colors">Leaderboard</a>
            <a href="/portfolio" className="hover:text-primary transition-colors">Portfolio</a>
            <a href="/community" className="hover:text-primary transition-colors">Community</a>
          </div>

          <div className="pt-8 border-t border-white/5 w-full flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-zinc-600 text-[12px] font-medium">
              &copy; {currentYear} DraftIQ. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-[12px] font-medium text-zinc-600">
              <a href="#" className="hover:text-zinc-400 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-zinc-400 transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}