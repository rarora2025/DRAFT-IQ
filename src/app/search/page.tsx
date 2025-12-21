import NavbarTop from '@/components/sections/navbar-top'
import NavbarCategories from '@/components/sections/navbar-categories'
import FeaturedMarketCard from '@/components/sections/featured-market-card'
import InfoCardsGrid from '@/components/sections/info-cards-grid'
import MarketCardsGrid from '@/components/sections/market-cards-grid'
import Footer from '@/components/sections/footer'
import NavbarBottomLiveButton from '@/components/sections/navbar-bottom-live-button'

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavbarTop />
      
      <main className="pt-14">
        <NavbarCategories />
        <FeaturedMarketCard />
        <InfoCardsGrid />
        
        <div className="py-6">
          <MarketCardsGrid />
        </div>
      </main>
      
      <Footer />
      <NavbarBottomLiveButton />
    </div>
  )
}
