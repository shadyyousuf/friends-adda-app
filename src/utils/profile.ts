import { supabase, type Database } from './supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

type UpdateOwnProfileInput = {
  fullName: string
  bloodGroup: string
}

export async function updateOwnProfile({
  fullName,
  bloodGroup,
}: UpdateOwnProfileInput) {
  const { data, error } = await supabase.rpc('update_own_profile', {
    p_full_name: fullName,
    p_blood_group: bloodGroup,
  })

  if (error) {
    throw error
  }

  return data
}

export async function approveUser(userId: string) {
  const { data, error } = await supabase.rpc('approve_user', {
    p_user_id: userId,
  })

  if (error) {
    throw error
  }

  return data
}

export async function promoteUserToAdmin(userId: string) {
  const { data, error } = await supabase.rpc('promote_user_to_admin', {
    p_user_id: userId,
  })

  if (error) {
    throw error
  }

  return data
}

export async function listPendingProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_approved', false)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return data satisfies Profile[]
}

export async function listApprovedMemberProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_approved', true)
    .eq('role', 'member')
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return data satisfies Profile[]
}

export async function listApprovedProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_approved', true)
    .order('full_name', { ascending: true })

  if (error) {
    throw error
  }

  return data satisfies Profile[]
}
