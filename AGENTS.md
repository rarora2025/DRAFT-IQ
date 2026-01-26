## Project Summary
DraftIQ is a live player projection trading platform where users can trade NFL and other sports projections in real-time. It features a community feed, leaderboards, and a portfolio management system.

## Tech Stack
- Language: TypeScript
- Framework: Next.js (App Router)
- Backend/Database: Supabase (Auth, DB, Realtime)
- Styling: Tailwind CSS
- Animation: Framer Motion
- Icons: Lucide React

## Architecture
- `src/app`: Next.js App Router pages and API routes
- `src/components`: Reusable React components
- `src/hooks`: Custom React hooks for data fetching and state
- `src/lib`: Shared utilities and Supabase client
- `src/app/api`: Server-side logic and database operations

## User Preferences
- Feed should be general community-oriented, not tied to a specific contest.
- All trades should be automatically posted to the feed.
- No join code required for joining contests (simple click-to-join).
- UI should be responsive and look great on both laptop and mobile.

## Project Guidelines
- Use functional components with 'use client' where interactivity is needed.
- Follow the App Router structure for pages and API routes.
- Implement automatic trade tracking to the community feed.
- Maintain a dark, sleek aesthetic (primarily #020420 background).

## Common Patterns
- Automatic trade recording to the feed via `recordTradeToFeed` in trade processing logic.
- Real-time updates using Supabase subscriptions for feed and leaderboards.
- Responsive container sizing (e.g., `max-w-4xl` for desktop-focused pages).
