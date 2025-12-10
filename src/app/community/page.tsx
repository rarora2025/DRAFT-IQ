'use client'

import { motion } from 'framer-motion'
import { Users, Trophy, Flame, Snowflake, Calendar, MapPin, ExternalLink, Zap } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function CommunityPage() {
  useAuth()

  const features = [
    {
      icon: Zap,
      title: 'Real-Time Trading',
      description: 'Trade weather projections with instant execution and live P/L updates.',
    },
    {
      icon: Trophy,
      title: 'Weekly Competitions',
      description: 'Compete against fellow Columbia students for bragging rights and prizes.',
    },
    {
      icon: Users,
      title: 'Community Learning',
      description: 'Learn prediction market strategies from experienced traders.',
    },
  ]

  const upcomingEvents = [
    {
      title: 'Weekly Trading Competition',
      date: 'Every Monday - Sunday',
      description: 'Top 3 traders win exclusive society merchandise!',
    },
    {
      title: 'Trading Workshop',
      date: 'December 15, 2024',
      description: 'Learn advanced strategies from our top performers.',
    },
  ]

  return (
    <div className="min-h-screen pb-24">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-0 w-[400px] h-[400px] bg-gradient-radial from-purple-500/10 via-transparent to-transparent blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-gradient-radial from-blue-500/10 via-transparent to-transparent blur-3xl" />
      </div>

      <div className="relative max-w-lg mx-auto px-4 py-6 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Flame className="w-8 h-8 text-orange-500" />
            <Snowflake className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="font-display font-bold text-2xl mb-2">
            Columbia Prediction Market Society
          </h1>
          <p className="text-muted-foreground">
            The premier student-run prediction market club at Columbia University
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6"
        >
          <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            About Hot or Cold
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Hot or Cold is our flagship trading simulation game. Trade virtual weather contracts 
            based on NYC temperature projections. It&apos;s a fun, risk-free way to learn prediction 
            market mechanics before we launch our sports trading platform.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <p className="font-display font-bold text-2xl text-orange-400">$1K</p>
              <p className="text-xs text-muted-foreground">Starting Balance</p>
            </div>
            <div className="text-center">
              <p className="font-display font-bold text-2xl text-blue-400">5s</p>
              <p className="text-xs text-muted-foreground">Update Interval</p>
            </div>
            <div className="text-center">
              <p className="font-display font-bold text-2xl text-purple-400">0</p>
              <p className="text-xs text-muted-foreground">Real $ Risk</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <h2 className="font-display font-semibold text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Features
          </h2>
          <div className="grid gap-4">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="glass rounded-xl p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <Icon className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <h2 className="font-display font-semibold text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            Upcoming Events
          </h2>
          <div className="space-y-3">
            {upcomingEvents.map((event, index) => (
              <motion.div
                key={event.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="glass rounded-xl p-4"
              >
                <h3 className="font-display font-semibold">{event.title}</h3>
                <p className="text-xs text-emerald-400 mt-1">{event.date}</p>
                <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass rounded-2xl p-6 text-center"
        >
          <MapPin className="w-8 h-8 text-blue-400 mx-auto mb-3" />
          <h3 className="font-display font-semibold mb-2">Join the Society</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Connect with fellow traders and stay updated on events
          </p>
          <div className="flex gap-3 justify-center">
            <Button className="bg-gradient-to-r from-orange-500 to-blue-500 hover:from-orange-600 hover:to-blue-600">
              <ExternalLink className="w-4 h-4 mr-2" />
              Join Discord
            </Button>
          </div>
        </motion.div>

        <div className="text-center text-xs text-muted-foreground">
          <p>© 2024 Columbia Prediction Market Society</p>
          <p className="mt-1">All trading is simulated with virtual currency only.</p>
        </div>
      </div>

      <Navbar />
    </div>
  )
}
