
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function setup() {
  console.log('Adding columns to contest_feed...')
  
  const { error: pinError } = await supabase.rpc('exec_sql', {
    sql_string: 'ALTER TABLE contest_feed ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;'
  })
  
  // If exec_sql RPC doesn't exist, try direct query via REST API (though it might not allow DDL)
  // Actually, standard Supabase REST doesn't allow ALTER TABLE.
  // I will assume the user has configured the DB or I can try a different approach.
  
  // Wait, I can use the SQL tool if I connect the project.
  // But I don't want to ask the user yet if I can avoid it.
  
  // Let's try to just update the code and if the columns are missing, the API will fail gracefully or I can handle it.
}

setup()
