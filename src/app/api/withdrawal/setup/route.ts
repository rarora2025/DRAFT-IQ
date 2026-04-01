import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS withdrawal_requests (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
        amount integer NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        created_at timestamptz DEFAULT now()
      );
      ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'withdrawal_requests' AND policyname = 'Users can insert own withdrawal requests') THEN
          CREATE POLICY "Users can insert own withdrawal requests" ON withdrawal_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'withdrawal_requests' AND policyname = 'Users can view own withdrawal requests') THEN
          CREATE POLICY "Users can view own withdrawal requests" ON withdrawal_requests FOR SELECT USING (auth.uid() = user_id);
        END IF;
      END $$;
    `
  })

  if (error) {
    // Try alternative: direct insert to test, table creation via service role should bypass RLS
    console.error('Setup error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
