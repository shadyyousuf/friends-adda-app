import { supabase } from './supabase'
import { assertOnlineForMutation } from './network'

type SignInInput = {
  email: string
  password: string
}

type SignUpInput = {
  fullName: string
  email: string
  password: string
}

export async function signIn({ email, password }: SignInInput) {
  assertOnlineForMutation('sign in.')

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw error
  }

  return data
}

export async function signUp({ fullName, email, password }: SignUpInput) {
  assertOnlineForMutation('create your account.')

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    throw error
  }

  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}
