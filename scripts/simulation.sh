#!/bin/bash

# Configuration
SUPABASE_URL="https://jwszinypqjrebtprovuo.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3c3ppbnlwcWpyZWJ0cHJvdnVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMwMjUzNSwiZXhwIjoyMDgwODc4NTM1fQ.wpERCtXmHCEPRZe6ZXm1nDR4iTsQSvQG84dMGY9p_L0"
PROP_ID="00000000-0000-0000-0000-000000000002"
GAME_ID="00000000-0000-0000-0000-000000000001"

echo "Simulation started. Waiting 60 seconds..."
sleep 60

echo "1 minute passed. Updating price to 101 (+1%)..."
curl -X PATCH "${SUPABASE_URL}/rest/v1/player_props?id=eq.${PROP_ID}" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"current_value\": \"101.0\", \"updated_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"

echo "Waiting 10 seconds before ending game..."
sleep 10

echo "Ending game and settling market..."
# 1. Update game status
curl -X PATCH "${SUPABASE_URL}/rest/v1/games?id=eq.${GAME_ID}" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"status\": \"completed\", \"updated_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"

# 2. Call settle_market RPC
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/settle_market" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"p_player_prop_id\": \"${PROP_ID}\", \"p_final_value\": 101.0}"

echo "Simulation completed."
