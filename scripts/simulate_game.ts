import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const GAME_ID = '00000000-0000-4000-a000-000000000001'
const PROP_ID = '00000000-0000-4000-a000-000000000003'

async function run() {
  console.log('Simulation script started...')
  
  // Task 1: Update line at 7:05 PM EST
  const target1 = new Date('2025-12-24T19:05:00-05:00').getTime()
  let now = Date.now()
  let delay1 = target1 - now
  
  if (delay1 > 0) {
    console.log(`Waiting ${delay1/1000}s until 7:05 PM...`)
    await new Promise(resolve => setTimeout(resolve, delay1))
  }
  
  console.log('Updating line to 260.5...')
  const { error: error1 } = await supabase.from('player_props').update({ line: 260.5 }).eq('id', PROP_ID)
  if (error1) console.error('Error updating line:', error1)
  
  const { error: errorHist } = await supabase.from('prop_price_history').insert({
    prop_id: PROP_ID,
    price: 260.5,
    timestamp: new Date().toISOString()
  })
  if (errorHist) console.error('Error inserting history:', errorHist)
  
  // Task 2: End game at 7:10 PM EST
  const target2 = new Date('2025-12-24T19:10:00-05:00').getTime()
  now = Date.now()
  let delay2 = target2 - now
  
  if (delay2 > 0) {
    console.log(`Waiting ${delay2/1000}s until 7:10 PM...`)
    await new Promise(resolve => setTimeout(resolve, delay2))
  }
  
  console.log('Ending game and settling prop...')
  const { error: errorGame } = await supabase.from('games').update({
    status: 'completed',
    home_score: 24,
    away_score: 21
  }).eq('id', GAME_ID)
  if (errorGame) console.error('Error updating game:', errorGame)
  
  const { error: errorProp } = await supabase.from('player_props').update({
    status: 'SETTLED',
    final_reference_value: 265
  }).eq('id', PROP_ID)
  if (errorProp) console.error('Error settling prop:', errorProp)
  
  console.log('Simulation complete.')
}

run().catch(console.error)
