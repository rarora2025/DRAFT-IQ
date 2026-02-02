## Project Summary
DraftIQ is a social player-prop trading platform where users trade projections using "IQ" points. It features a combined Social Hub (Feed & Leaderboard), a Rewards Ladder for earning real-world value, and daily activity requirements to maintain IQ scores.

## Tech Stack
- Language: TypeScript
- Framework: Next.js (App Router)
- Backend/Database: Supabase (Auth, DB, Realtime)
- Styling: Tailwind CSS
- Animation: Framer Motion
- Icons: Lucide React
- Currency: IQ Points

## Architecture
- `src/app`: Next.js App Router pages and API routes
- `src/components`: Reusable React components
- `src/hooks`: Custom React hooks for data fetching and state
- `src/lib`: Shared utilities and Supabase client
- `src/app/api`: Server-side logic, IQ sync, and database operations

## User Preferences
- Currency is referred to as "Draft Coins" (displayed as 1,000 DRAFT COINS) in the Rewards section.
- Social Hub at `/community` combines the Feed and Leaderboard tabs.
- Rewards page at `/rewards` features a milestones ladder and daily claims.
- UI features heavy glassmorphism, dark aesthetic (#020420), and professional trading visuals.

## Project Guidelines
- All trade and currency values in the Rewards section must be formatted as "Draft Coins".
- Daily login sync handles IQ penalties for inactivity.
- Users can claim 50 Draft Coins daily via the Rewards page.
- Progress ladder to 2,000 Draft Coins leads to a $20 gift card reward.

## Common Patterns
- IQ sync API (`/api/iq/sync`) for handling daily penalties and rewards.
- Tab-based social interface for Feed and Ranks.
- Ladder-style progression for Rewards and Milestones.
