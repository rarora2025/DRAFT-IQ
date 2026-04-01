import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
  typescript: true,
})

export const COIN_PACKAGES = [
  {
    id: 'coins_100',
    coins: 100,
    price: 100,
    label: '100 Draft Coins',
    badge: null,
  },
  {
    id: 'coins_500',
    coins: 500,
    price: 450,
    label: '500 Draft Coins',
    badge: '10% OFF',
  },
  {
    id: 'coins_1000',
    coins: 1000,
    price: 800,
    label: '1,000 Draft Coins',
    badge: '20% OFF',
  },
] as const

export type CoinPackageId = (typeof COIN_PACKAGES)[number]['id']
