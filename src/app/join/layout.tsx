import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "You've been invited to DraftIQ",
  description: 'Trade player projections. Beat the market.',
  openGraph: {
    title: "You've been invited to DraftIQ",
    description: 'Trade player projections. Beat the market.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "You've been invited to DraftIQ",
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
