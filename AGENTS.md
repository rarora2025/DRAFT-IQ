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
- Social Hub at `/community` combines the Feed and Leaderboard tabs (recently renamed to "Ranks").
- Rewards page at `/rewards` features a simplified top-down milestone ladder towards a $20 gift card.
- UI features heavy glassmorphism, dark aesthetic (#020420), and professional trading visuals.

## Project Guidelines
- All trade and currency values in the Rewards section must be formatted as "Draft Coins".
- Leaderboard (Ranks) values must be displayed with "DRAFT" after the number instead of a "$" symbol.
- Daily login sync handles IQ penalties for inactivity.
- Progress ladder on the Rewards page fills from top to bottom towards a 2,000 Draft Coins goal.

## Common Patterns
- IQ sync API (`/api/iq/sync`) for handling daily penalties and rewards.
- Tab-based social interface for Feed and Ranks.
- Top-down ladder progression for Rewards.
