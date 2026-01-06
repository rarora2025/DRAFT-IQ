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
  
  const ogUrl = new URL('https://www.draftiq.app/api/og/join')
  if (code) ogUrl.searchParams.set('code', code)

  const title = "You've been invited to DraftIQ"
  const description = "Trade player projections. Beat the market."

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: [
        {
          url: ogUrl.toString(),
          width: 1200,
          height: 630,
          alt: `DraftIQ Invitation: ${code}`,
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogUrl.toString()],
    },
  }
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020420] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <JoinClient />
    </Suspense>
  )
}
