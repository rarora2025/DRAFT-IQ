'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function signUpUser({ email, password, username }: any) {
  // 1. Check if username is taken
  const { data: existingUser } = await supabaseAdmin
    .from('profiles')
    .select('username')
    .eq('username', username.trim())
    .maybeSingle()

  if (existingUser) {
    return { error: 'Username is already taken' }
  }

  // 2. Create the user using admin API to bypass email confirmation
  const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    user_metadata: { username: username.trim() },
    email_confirm: true
  })

  if (createError) {
    return { error: createError.message }
  }

  // 3. Sign in the user normally to get a session
  const supabase = await createClient()
  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (signInError) {
    return { error: signInError.message }
  }

  return { success: true, session: data.session }
}
