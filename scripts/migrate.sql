-- DraftIQ Full Database Schema Migration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- PROFILES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  email TEXT,
  balance NUMERIC DEFAULT 1000,
  daily_start_value NUMERIC,
  last_reset_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  default_tolerance NUMERIC DEFAULT 5,
  last_claim_at TIMESTAMPTZ,
  iq_points NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================
-- GAMES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT UNIQUE NOT NULL,
  sport TEXT NOT NULL CHECK (sport IN ('NBA', 'NFL')),
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  game_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed')),
  home_score NUMERIC DEFAULT 0,
  away_score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read games" ON public.games
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage games" ON public.games
  FOR ALL USING (true);

-- =====================
-- PLAYERS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  sport TEXT NOT NULL,
  external_id TEXT,
  photo_url TEXT,
  team TEXT,
  position TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, sport)
);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read players" ON public.players
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage players" ON public.players
  FOR ALL USING (true);

-- =====================
-- PLAYER PROPS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.player_props (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  prop_type TEXT NOT NULL,
  line NUMERIC NOT NULL,
  current_value NUMERIC,
  status TEXT NOT NULL DEFAULT 'PRE_GAME' CHECK (status IN ('PRE_GAME', 'LIVE', 'LOCKED', 'SETTLED')),
  external_id TEXT UNIQUE NOT NULL,
  final_reference_value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.player_props ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read player_props" ON public.player_props
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage player_props" ON public.player_props
  FOR ALL USING (true);

-- =====================
-- POSITIONS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player_prop_id UUID REFERENCES public.player_props(id) ON DELETE SET NULL,
  side TEXT NOT NULL CHECK (side IN ('long', 'short')),
  size NUMERIC NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  entry_price NUMERIC NOT NULL,
  entry_reference_value NUMERIC,
  exit_price NUMERIC,
  exit_reference_value NUMERIC,
  realized_pnl NUMERIC,
  closed_at TIMESTAMPTZ,
  market_ticker TEXT,
  market_title TEXT,
  market_id TEXT,
  market_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own positions" ON public.positions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own positions" ON public.positions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own positions" ON public.positions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage positions" ON public.positions
  FOR ALL USING (true);

-- =====================
-- QUEUED TRADES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.queued_trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player_prop_id UUID REFERENCES public.player_props(id) ON DELETE CASCADE,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('open', 'close')),
  side TEXT CHECK (side IN ('long', 'short')),
  size NUMERIC NOT NULL,
  submitted_price NUMERIC NOT NULL,
  position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'cancelled', 'expired')),
  market_title TEXT,
  filled_at TIMESTAMPTZ,
  filled_price NUMERIC,
  limit_price NUMERIC,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.queued_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own queued_trades" ON public.queued_trades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own queued_trades" ON public.queued_trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queued_trades" ON public.queued_trades
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage queued_trades" ON public.queued_trades
  FOR ALL USING (true);

-- =====================
-- PROP PRICE HISTORY TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.prop_price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prop_id UUID NOT NULL REFERENCES public.player_props(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(prop_id, timestamp)
);

ALTER TABLE public.prop_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read prop_price_history" ON public.prop_price_history
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage prop_price_history" ON public.prop_price_history
  FOR ALL USING (true);

-- =====================
-- APP SETTINGS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app_settings" ON public.app_settings
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage app_settings" ON public.app_settings
  FOR ALL USING (true);

-- Insert default sports settings
INSERT INTO public.app_settings (key, value)
VALUES ('sports_enabled', '{"NBA": true, "NFL": true}')
ON CONFLICT (key) DO NOTHING;

-- =====================
-- CONTESTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.contests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'upcoming')),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  prize_pool NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read contests" ON public.contests
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage contests" ON public.contests
  FOR ALL USING (true);

-- Insert the NFL Playoff contest
INSERT INTO public.contests (id, name, description, status)
VALUES ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'NFL Playoff Challenge', 'Trade player props during the NFL Playoffs', 'active')
ON CONFLICT (id) DO NOTHING;

-- =====================
-- CONTEST PARTICIPANTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.contest_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contest_id UUID NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  join_code TEXT,
  portfolio_value NUMERIC DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contest_id, user_id)
);

ALTER TABLE public.contest_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read contest_participants" ON public.contest_participants
  FOR SELECT USING (true);

CREATE POLICY "Users can join contests" ON public.contest_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage contest_participants" ON public.contest_participants
  FOR ALL USING (true);

-- =====================
-- CONTEST DAILY WINDOWS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.contest_daily_windows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contest_id UUID NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contest_daily_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read contest_daily_windows" ON public.contest_daily_windows
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage contest_daily_windows" ON public.contest_daily_windows
  FOR ALL USING (true);

-- =====================
-- CONTEST DAILY WINNERS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.contest_daily_winners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contest_id UUID NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  daily_window_id UUID REFERENCES public.contest_daily_windows(id) ON DELETE SET NULL,
  daily_return NUMERIC,
  portfolio_value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contest_daily_winners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read contest_daily_winners" ON public.contest_daily_winners
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage contest_daily_winners" ON public.contest_daily_winners
  FOR ALL USING (true);

-- =====================
-- CONTEST FEED TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.contest_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contest_id UUID REFERENCES public.contests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT,
  type TEXT DEFAULT 'post',
  is_pinned BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contest_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read contest_feed" ON public.contest_feed
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage contest_feed" ON public.contest_feed
  FOR ALL USING (true);

-- =====================
-- APP FEEDBACK TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.app_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert feedback" ON public.app_feedback
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can read feedback" ON public.app_feedback
  FOR SELECT USING (true);

-- =====================
-- RPC: settle_market
-- =====================
CREATE OR REPLACE FUNCTION public.settle_market(
  p_player_prop_id UUID,
  p_final_value NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_position RECORD;
  v_pnl NUMERIC;
  v_user_balance NUMERIC;
BEGIN
  -- Update the prop status to settled
  UPDATE public.player_props
  SET status = 'SETTLED',
      final_reference_value = p_final_value,
      current_value = p_final_value,
      updated_at = NOW()
  WHERE id = p_player_prop_id;

  -- Settle all open positions for this prop
  FOR v_position IN
    SELECT p.*, pp.line, pp.current_value
    FROM public.positions p
    JOIN public.player_props pp ON pp.id = p.player_prop_id
    WHERE p.player_prop_id = p_player_prop_id
      AND p.closed_at IS NULL
  LOOP
    -- Calculate PnL
    IF v_position.side = 'long' THEN
      v_pnl := v_position.quantity * (p_final_value - v_position.entry_price);
    ELSE
      v_pnl := v_position.quantity * (v_position.entry_price - p_final_value);
    END IF;

    -- Close the position
    UPDATE public.positions
    SET closed_at = NOW(),
        exit_price = p_final_value,
        exit_reference_value = p_final_value,
        realized_pnl = v_pnl,
        updated_at = NOW()
    WHERE id = v_position.id;

    -- Return the size + pnl to user balance
    UPDATE public.profiles
    SET balance = balance + v_position.size + v_pnl,
        updated_at = NOW()
    WHERE id = v_position.user_id;
  END LOOP;
END;
$$;

-- =====================
-- RPC: get_props_needing_settlement
-- =====================
CREATE OR REPLACE FUNCTION public.get_props_needing_settlement(
  p_game_id UUID
)
RETURNS TABLE(
  id UUID,
  current_value NUMERIC,
  line NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT pp.id, pp.current_value, pp.line
  FROM public.player_props pp
  WHERE pp.game_id = p_game_id
    AND pp.status != 'SETTLED'
    AND EXISTS (
      SELECT 1 FROM public.positions pos
      WHERE pos.player_prop_id = pp.id
        AND pos.closed_at IS NULL
    );
END;
$$;

-- =====================
-- TRIGGER: Auto-create profile on user signup
-- =====================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, balance, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    1000,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- INDEXES
-- =====================
CREATE INDEX IF NOT EXISTS idx_games_status ON public.games(status);
CREATE INDEX IF NOT EXISTS idx_games_sport ON public.games(sport);
CREATE INDEX IF NOT EXISTS idx_games_game_time ON public.games(game_time);
CREATE INDEX IF NOT EXISTS idx_player_props_game_id ON public.player_props(game_id);
CREATE INDEX IF NOT EXISTS idx_player_props_status ON public.player_props(status);
CREATE INDEX IF NOT EXISTS idx_positions_user_id ON public.positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_player_prop_id ON public.positions(player_prop_id);
CREATE INDEX IF NOT EXISTS idx_positions_closed_at ON public.positions(closed_at);
CREATE INDEX IF NOT EXISTS idx_queued_trades_user_id ON public.queued_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_queued_trades_status ON public.queued_trades(status);
CREATE INDEX IF NOT EXISTS idx_prop_price_history_prop_id ON public.prop_price_history(prop_id);
