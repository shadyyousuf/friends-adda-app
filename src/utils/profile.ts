import { queryOptions } from '@tanstack/react-query'
import { supabase, type Database } from './supabase'
import { assertOnlineForMutation } from './network'

type Profile = Database['public']['Tables']['profiles']['Row']

type UpdateOwnProfileInput = {
  fullName: string
  bloodGroup: string
}

export const profileKeys = {
  approved: (viewerId: string) => ['profiles', 'approved', viewerId] as const,
  approvedMembers: (viewerId: string) =>
    ['profiles', 'approved-members', viewerId] as const,
  pending: (viewerId: string) => ['profiles', 'pending', viewerId] as const,
}

export function approvedProfilesQueryOptions(viewerId: string) {
  return queryOptions({
    queryKey: profileKeys.approved(viewerId),
    queryFn: listApprovedProfiles,
  })
}

export function approvedMemberProfilesQueryOptions(viewerId: string) {
  return queryOptions({
    queryKey: profileKeys.approvedMembers(viewerId),
    queryFn: listApprovedMemberProfiles,
  })
}

export function pendingProfilesQueryOptions(viewerId: string) {
  return queryOptions({
    queryKey: profileKeys.pending(viewerId),
    queryFn: listPendingProfiles,
  })
}

export async function updateOwnProfile({
  fullName,
  bloodGroup,
}: UpdateOwnProfileInput) {
  assertOnlineForMutation('save your profile.')

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
  assertOnlineForMutation('approve members.')

  const { data, error } = await supabase.rpc('approve_user', {
    p_user_id: userId,
  })

  if (error) {
    throw error
  }

  return data
}

export async function promoteUserToAdmin(userId: string) {
  assertOnlineForMutation('promote members.')

  const { data, error } = await supabase.rpc('promote_user_to_admin', {
    p_user_id: userId,
  })

  if (error) {
    throw error
  }

  return data
}

export async function removeUserFromApp(userId: string) {
  assertOnlineForMutation('remove members.')

  const { data, error } = await supabase
    .from('profiles')
    .update({ is_approved: false })
    .eq('id', userId)
    .select()
    .single()

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
