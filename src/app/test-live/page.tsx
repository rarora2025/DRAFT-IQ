'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, RefreshCw, TrendingUp, TrendingDown, Clock, Zap, Activity, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/Navbar'
import { useRouter } from 'next/navigation'

const ADMIN_IDS = process.env.NEXT_PUBLIC_ADMIN_USER_ID?.split(',') || []

export default function TestLivePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [simGame, setSimGame] = useState<any>(null)
  const [simProp, setSimProp] = useState<any>(null)
  const [simPlayer, setSimPlayer] = useState<any>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [currentPrice, setCurrentPrice] = useState(25.5)
  const [inputPrice, setInputPrice] = useState('25.5')
  const [priceHistory, setPriceHistory] = useState<number[]>([25.5])
  const [logs, setLogs] = useState<string[]>([])
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null)
  const [updateInterval, setUpdateInterval] = useState(10)

  useEffect(() => {
    if (!authLoading && (!user || !ADMIN_IDS.includes(user.id))) {
      router.push('/markets')
    }
  }, [user, authLoading, router])

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 49)])
  }

  const createSimulatedGame = async () => {
    if (!user) {
      addLog('Please log in first')
      return
    }

    addLog('Creating simulated live game...')

    const { data: existingGame } = await supabase
      .from('games')
      .select('*')
      .eq('external_id', 'sim_live_test_game')
      .single()

    let gameId = existingGame?.id

    if (!existingGame) {
      const { data: newGame, error: gameError } = await supabase
        .from('games')
          .insert({
            external_id: 'sim_live_test_game',
            sport: 'NBA',
            home_team: 'Test Lakers',
            away_team: 'Test Celtics',
            game_time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            status: 'live',
            home_score: 55,
            away_score: 52,
          })
        .select()
        .single()

      if (gameError) {
        addLog(`Error creating game: ${gameError.message}`)
        return
      }
      gameId = newGame.id
      setSimGame(newGame)
      addLog(`Created game: ${newGame.home_team} vs ${newGame.away_team}`)
      } else {
        await supabase
          .from('games')
          .update({ 
            status: 'live', 
            game_time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString() 
          })
          .eq('id', existingGame.id)
        setSimGame(existingGame)
        addLog(`Using existing game: ${existingGame.home_team} vs ${existingGame.away_team}`)
      }

    const { data: existingPlayer } = await supabase
      .from('players')
      .select('*')
      .eq('external_id', 'sim_player_test')
      .single()

    let playerId = existingPlayer?.id

    if (!existingPlayer) {
      const { data: newPlayer, error: playerError } = await supabase
        .from('players')
        .insert({
          name: 'Sim Player',
          sport: 'NBA',
          external_id: 'sim_player_test',
        })
        .select()
        .single()

      if (playerError) {
        addLog(`Error creating player: ${playerError.message}`)
        return
      }
      playerId = newPlayer.id
      setSimPlayer(newPlayer)
      addLog(`Created player: ${newPlayer.name}`)
    } else {
      setSimPlayer(existingPlayer)
      addLog(`Using existing player: ${existingPlayer.name}`)
    }

    const { data: existingProp } = await supabase
      .from('player_props')
      .select('*')
      .eq('external_id', 'sim_prop_test')
      .single()

    if (!existingProp) {
      const { data: newProp, error: propError } = await supabase
        .from('player_props')
        .insert({
          game_id: gameId,
          player_id: playerId,
          prop_type: 'player_points',
          line: 25.5,
          current_value: 25.5,
          actual_value: 0,
          status: 'LIVE',
          external_id: 'sim_prop_test',
        })
        .select()
        .single()

      if (propError) {
        addLog(`Error creating prop: ${propError.message}`)
        return
      }
      setSimProp(newProp)
      setCurrentPrice(25.5)
      setInputPrice('25.5')
      setPriceHistory([25.5])
      addLog(`Created prop: Points @ 25.5`)
    } else {
      await supabase
        .from('player_props')
        .update({ status: 'LIVE', updated_at: new Date().toISOString() })
        .eq('id', existingProp.id)
      setSimProp(existingProp)
      setCurrentPrice(Number(existingProp.current_value))
      setInputPrice(existingProp.current_value.toString())
      setPriceHistory([Number(existingProp.current_value)])
      addLog(`Using existing prop: Points @ ${existingProp.current_value}`)
    }

    addLog('Simulation ready! Click Start to begin price updates.')
  }

  const updatePrice = async (priceOverride?: number) => {
    if (!simProp) return

    let newPrice: number
    if (priceOverride !== undefined) {
      newPrice = priceOverride
    } else if (isRunning) {
      const change = (Math.random() - 0.5) * 2
      newPrice = Math.max(10, Math.min(50, currentPrice + change))
    } else {
      // Manual update with current input value
      newPrice = parseFloat(inputPrice)
      if (isNaN(newPrice)) {
        addLog('Invalid price input')
        return
      }
    }

    const roundedPrice = Math.round(newPrice * 10) / 10

    setCurrentPrice(roundedPrice)
    setInputPrice(roundedPrice.toString())
    setPriceHistory(prev => [...prev.slice(-29), roundedPrice])

    const { error } = await supabase
      .from('player_props')
      .update({
        current_value: roundedPrice,
        updated_at: new Date().toISOString(),
      })
      .eq('id', simProp.id)

    if (error) {
      addLog(`Error updating price: ${error.message}`)
      return
    }

    await supabase.from('prop_price_history').insert({
      prop_id: simProp.id,
      price: roundedPrice,
      timestamp: new Date().toISOString(),
    })

    addLog(`Price updated: ${currentPrice.toFixed(1)} → ${roundedPrice.toFixed(1)}`)

    try {
      const res = await fetch('/api/queued-trades/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_prop_id: simProp.id,
          new_price: roundedPrice,
        }),
      })
      const data = await res.json()
      if (data.processed > 0) {
        addLog(`Processed ${data.processed} queued trade(s)!`)
      }
    } catch (err) {
      addLog('Error processing queued trades')
    }
  }

  const endSimulation = async () => {
    if (!simGame) return
    stopSimulation()
    addLog('Ending simulation and settling game...')
    
    const { error } = await supabase
      .from('games')
      .update({ status: 'completed' })
      .eq('id', simGame.id)
    
    if (error) {
      addLog(`Error ending simulation: ${error.message}`)
    } else {
      addLog('Simulation ended. Game marked as COMPLETED.')
      // Trigger sync to settle everything
      fetch('/api/sync?force=true')
    }
  }

  const startSimulation = () => {
    if (!simProp) {
      addLog('Please create a simulation first')
      return
    }
    setIsRunning(true)
    addLog(`Starting price updates every ${updateInterval}s...`)
    const id = setInterval(updatePrice, updateInterval * 1000)
    setIntervalId(id)
  }

  const stopSimulation = () => {
    setIsRunning(false)
    if (intervalId) {
      clearInterval(intervalId)
      setIntervalId(null)
    }
    addLog('Simulation paused')
  }

  const manualUpdate = () => {
    updatePrice()
  }

  const resetSimulation = async () => {
    stopSimulation()
    if (simProp) {
      await supabase
        .from('player_props')
        .update({ current_value: 25.5, status: 'LIVE' })
        .eq('id', simProp.id)
    }
    setCurrentPrice(25.5)
    setInputPrice('25.5')
    setPriceHistory([25.5])
    setLogs([])
    addLog('Simulation reset to 25.5')
  }

  useEffect(() => {
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [intervalId])

  if (authLoading || !user || !ADMIN_IDS.includes(user.id)) {
    return (
      <div className="min-h-screen bg-[#020420] flex flex-col items-center justify-center gap-4">
        <Activity className="w-8 h-8 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Verifying Admin Access</p>
      </div>
    )
  }

  const priceChange = priceHistory.length > 1 ? currentPrice - priceHistory[0] : 0
  const isUp = priceChange >= 0

  return (
    <div className="min-h-screen bg-[#020420] text-white pb-24">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] -mr-64 -mt-64" />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 relative z-10 space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/markets" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">Back</span>
          </Link>
          <div className="flex items-center gap-2 text-amber-500">
            <Zap className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">Test Mode</span>
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black uppercase tracking-tight">Live Game Simulator</h1>
          <p className="text-zinc-500 text-sm">Test the queued trades feature with simulated price updates</p>
        </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">Current Price</p>
                <div className="flex items-center gap-2">
                  <span className="text-5xl font-black font-mono">{currentPrice.toFixed(1)}</span>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${isUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="text-xs font-black">{isUp ? '+' : ''}{priceChange.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">Set Price Manually</p>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={inputPrice}
                  onChange={(e) => setInputPrice(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 font-mono font-black text-xl focus:outline-none focus:border-primary/50 transition-colors"
                  step="0.1"
                />
                <Button 
                  onClick={manualUpdate} 
                  disabled={!simProp || isRunning}
                  className="h-14 bg-primary text-black font-black uppercase tracking-widest rounded-xl px-8"
                >
                  Update
                </Button>
              </div>
            </div>

            <div className="h-20 flex items-end gap-1">
            {priceHistory.map((price, i) => {
              const min = Math.min(...priceHistory)
              const max = Math.max(...priceHistory)
              const range = max - min || 1
              const height = ((price - min) / range) * 100
              return (
                <div
                  key={i}
                  className="flex-1 bg-primary/50 rounded-t transition-all"
                  style={{ height: `${Math.max(10, height)}%` }}
                />
              )
            })}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Auto-Update Interval</span>
              <span>{updateInterval}s</span>
            </div>
            <Slider
              value={[updateInterval]}
              onValueChange={([v]) => setUpdateInterval(v)}
              min={5}
              max={60}
              step={5}
              disabled={isRunning}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {!simProp ? (
              <Button onClick={createSimulatedGame} className="col-span-2 h-14 bg-primary text-black font-black uppercase tracking-widest rounded-2xl">
                <Activity className="w-5 h-5 mr-2" />
                Create Simulation
              </Button>
            ) : (
              <>
                <Button
                  onClick={isRunning ? stopSimulation : startSimulation}
                  className={`col-span-2 h-14 font-black uppercase tracking-widest rounded-2xl ${isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                >
                  {isRunning ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                  {isRunning ? 'Pause Auto-Updates' : 'Start Auto-Updates'}
                </Button>
              </>
            )}
          </div>

            <div className="flex gap-3">
              <Button onClick={resetSimulation} variant="outline" className="flex-1 h-10 bg-white/5 border-white/10 text-white font-black uppercase text-xs rounded-xl">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button onClick={endSimulation} variant="outline" className="flex-1 h-10 border-red-500/50 text-red-500 font-black uppercase text-xs rounded-xl hover:bg-red-500/10">
                End Simulation
              </Button>
            </div>
            {simProp && (
              <Link href={`/markets/${simGame?.id}/${simPlayer?.id}`} className="block">
                <Button className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-black uppercase text-xs rounded-xl">
                  Open Trading Page
                </Button>
              </Link>
            )}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-500" />
            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Activity Log</h3>
          </div>
          <div className="h-48 overflow-y-auto space-y-1 font-mono text-[10px]">
            {logs.length === 0 ? (
              <p className="text-zinc-600">No activity yet. Create a simulation to start.</p>
            ) : (
              logs.map((log, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-zinc-400"
                >
                  {log}
                </motion.div>
              ))
            )}
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 space-y-2">
          <h3 className="text-sm font-black text-amber-500 uppercase">How to Test</h3>
          <ol className="text-xs text-zinc-400 space-y-1 list-decimal list-inside">
            <li>Click "Create Simulation" to set up a test live game</li>
            <li>Click "Open Trading Page" to go to the market</li>
            <li>Place a trade (it will be queued)</li>
            <li>Come back here and enter a new price manually or start auto-updates</li>
            <li>Watch your queued trade get executed at the new price!</li>
          </ol>
        </div>
      </div>

      <Navbar isDark={true} />
    </div>
  )
}
