'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function signUpUser({ email, password, username }: { email: string; password: string; username: string }) {
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('username')
    .eq('username', username.trim())
    .maybeSingle()

  if (existingProfile) {
    return { error: 'Username is already taken' }
  }

  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
  const existingUser = users.find(u => u.email === email)

  if (existingUser) {
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
    const { error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { username: username.trim() },
      email_confirm: true
    })
    if (createError) return { error: createError.message }
  }

  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (signInError) {
    return { error: signInError.message }
  }

  return { success: true }
}

export async function signInUser({ email, password }: { email: string; password: string }) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
