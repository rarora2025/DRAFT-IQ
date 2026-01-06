import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'join me on draft iq',
  description: 'Trade player projections. Beat the market.',
  openGraph: {
    title: 'join me on draft iq',
    description: 'Trade player projections. Beat the market.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'join me on draft iq',
    description: 'Trade player projections. Beat the market.',
  },
}

export default function JoinLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
