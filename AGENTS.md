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
- Currency is strictly "IQ" (displayed as 1,000 IQ).
- Social Hub at `/community` combines the Feed and Leaderboard tabs.
- Rewards page at `/rewards` features a milestones ladder and challenges.
- UI features heavy glassmorphism, dark aesthetic (#020420), and professional trading visuals.

## Project Guidelines
- All trade and currency values must be formatted as "IQ".
- Daily login sync handles IQ penalties for inactivity.
- Maintain responsive design for both laptop and mobile users.
- Use the distinctive IQ coin logo for all brand-related icons.

## Common Patterns
- IQ sync API (`/api/iq/sync`) for handling daily penalties and rewards.
- Tab-based social interface for Feed and Ranks.
- Ladder-style progression for Rewards and Milestones.
