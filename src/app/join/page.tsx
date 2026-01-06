import { Metadata } from 'next'
import { JoinClient } from './JoinClient'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }): Promise<Metadata> {
  const resolvedSearchParams = await searchParams
  const code = (
    resolvedSearchParams.code || 
    resolvedSearchParams.CODE || 
    resolvedSearchParams.invite || 
    resolvedSearchParams.INVITE || 
    ''
  ).toString().toUpperCase()
  
  // Use a absolute URL with a version/timestamp to bust iMessage cache
  const ogUrl = new URL('https://www.draftiq.app/api/og/join')
  if (code) ogUrl.searchParams.set('code', code)
  ogUrl.searchParams.set('v', Date.now().toString())
  // Add a dummy extension to help some social scrapers
  const imageUrl = `${ogUrl.toString()}&type=image.png`

  const title = "You've been invited to DraftIQ"
  const description = "Access Code: " + (code || "DRAFTIQ") + " • Trade NFL markets and win daily prizes on DraftIQ."

  return {
    metadataBase: new URL('https://www.draftiq.app'),
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'DraftIQ',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          type: 'image/png',
          alt: `DraftIQ Invitation Code: ${code}`,
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    // iMessage specific hints
    other: {
      'apple-mobile-web-app-title': 'DraftIQ',
      'og:image:width': '1200',
      'og:image:height': '630',
    }
  }
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020420] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <JoinClient />
    </Suspense>
  )
}
