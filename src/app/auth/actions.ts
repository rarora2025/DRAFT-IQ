'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function signUpUser({ email, password, username }: any) {
  // 1. Check if username is taken in profiles
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('username')
    .eq('username', username.trim())
    .maybeSingle()

  if (existingProfile) {
    return { error: 'Username is already taken' }
  }

  // 2. Check if user already exists in Auth but is unconfirmed
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
  const existingUser = users.find(u => u.email === email)

  if (existingUser) {
    // Update existing user to be confirmed and set their password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      existingUser.id,
      { 
        password,
        email_confirm: true,
        user_metadata: { username: username.trim() }
      }
    )
    if (updateError) return { error: updateError.message }
  } else {
    // Create new user using admin API to bypass email confirmation
    const { error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { username: username.trim() },
      email_confirm: true
    })
    if (createError) return { error: createError.message }
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
