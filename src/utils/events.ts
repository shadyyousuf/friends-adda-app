import { queryOptions } from '@tanstack/react-query'
import { supabase, type Database } from './supabase'

type EventRow = Database['public']['Tables']['events']['Row']
type SubscriberRow = Database['public']['Tables']['event_subscribers']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type FundRow = Database['public']['Tables']['event_funds']['Row']
type ActivityRow = Database['public']['Tables']['event_activities']['Row']

export type EventType = EventRow['type']
export type EventVisibility = EventRow['visibility']
export type EventWithRole = EventRow & {
  event_role: SubscriberRow['event_role']
}

type CreateEventInput = {
  title: string
  description: string
  type: EventType
  eventDate: string
  visibility: EventVisibility
  targetAmount?: number | null
  monthlyDefaultAmount?: number | null
}

type UpdateEventInput = {
  eventId: string
  title: string
  description: string | null
  eventDate: string
  visibility: EventVisibility
  targetAmount?: number | null
  monthlyDefaultAmount?: number | null
}

export type DashboardData = {
  myEvents: EventWithRole[]
  discoverEvents: EventRow[]
}

export type EventSubscriberWithProfile = SubscriberRow & {
  profiles: Pick<ProfileRow, 'id' | 'email' | 'full_name' | 'blood_group' | 'role'>
}

export type EventDetailData = {
  event: EventRow | null
  subscribers: EventSubscriberWithProfile[]
  funds: FundRow[]
  activities: ActivityRow[]
}

export const eventKeys = {
  dashboard: ['events', 'dashboard'] as const,
  history: ['events', 'history'] as const,
  detail: (eventId: string) => ['events', 'detail', eventId] as const,
}

export function dashboardQueryOptions() {
  return queryOptions({
    queryKey: eventKeys.dashboard,
    queryFn: loadDashboardData,
  })
}

export function eventDetailQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: eventKeys.detail(eventId),
    queryFn: () => loadEventDetail(eventId),
  })
}

export function completedEventsQueryOptions() {
  return queryOptions({
    queryKey: eventKeys.history,
    queryFn: loadCompletedEventsForCurrentUser,
  })
}

export async function loadDashboardData(): Promise<DashboardData> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      myEvents: [],
      discoverEvents: [],
    }
  }

  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from('event_subscribers')
    .select(
      `
        event_role,
        events (
          id,
          title,
          description,
          type,
          event_date,
          status,
          visibility,
          created_by,
          created_at
        )
      `,
    )
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  if (subscriptionsError) {
    throw subscriptionsError
  }

  const myEvents = (subscriptions ?? [])
    .map((subscription) => {
      const event = Array.isArray(subscription.events)
        ? subscription.events[0]
        : subscription.events

      if (!event) {
        return null
      }

      return {
        ...event,
        event_role: subscription.event_role,
      }
    })
    .filter((event): event is EventWithRole => event !== null)

  const subscribedEventIds = new Set(myEvents.map((event) => event.id))

  const { data: publicEvents, error: publicEventsError } = await supabase
    .from('events')
    .select('*')
    .eq('visibility', 'public')
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  if (publicEventsError) {
    throw publicEventsError
  }

  const discoverEvents = (publicEvents ?? []).filter(
    (event) => !subscribedEventIds.has(event.id),
  )

  return {
    myEvents,
    discoverEvents,
  }
}

export async function createEventWithCaptain({
  title,
  description,
  type,
  eventDate,
  visibility,
  targetAmount,
  monthlyDefaultAmount,
}: CreateEventInput) {
  const { data, error } = await supabase.rpc('create_event_with_captain', {
    p_title: title,
    p_description: description,
    p_type: type,
    p_event_date: eventDate,
    p_visibility: visibility,
    p_target_amount: targetAmount ?? null,
    p_monthly_default_amount: monthlyDefaultAmount ?? null,
  })

  if (error) {
    throw error
  }

  return data
}

export async function joinPublicEvent(eventId: string) {
  const { data, error } = await supabase.rpc('join_public_event', {
    p_event_id: eventId,
  })

  if (error) {
    throw error
  }

  return data
}

export async function loadEventDetail(eventId: string): Promise<EventDetailData> {
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle()

  if (eventError) {
    throw eventError
  }

  if (!event) {
    return {
      event: null,
      subscribers: [],
      funds: [],
      activities: [],
    }
  }

  const { data: subscribers, error: subscribersError } = await supabase
    .from('event_subscribers')
    .select(
      `
        event_id,
        user_id,
        event_role,
        joined_at,
        profiles (
          id,
          email,
          full_name,
          blood_group,
          role
        )
      `,
    )
    .eq('event_id', eventId)
    .order('joined_at', { ascending: true })

  if (subscribersError) {
    throw subscribersError
  }

  const { data: funds, error: fundsError } = await supabase
    .from('event_funds')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (fundsError) {
    throw fundsError
  }

  const { data: activities, error: activitiesError } = await supabase
    .from('event_activities')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (activitiesError) {
    throw activitiesError
  }

  const normalizedSubscribers = (subscribers ?? []).map((subscriber) => ({
    ...subscriber,
    profiles: Array.isArray(subscriber.profiles)
      ? subscriber.profiles[0]
      : subscriber.profiles,
  }))

  return {
    event,
    subscribers: normalizedSubscribers.filter(
      (
        subscriber,
      ): subscriber is EventSubscriberWithProfile => Boolean(subscriber.profiles),
    ),
    funds: funds ?? [],
    activities: activities ?? [],
  }
}

export async function promoteEventMemberToCoCaptain(
  eventId: string,
  userId: string,
) {
  const { data, error } = await supabase.rpc(
    'promote_event_member_to_cocaptain',
    {
      p_event_id: eventId,
      p_user_id: userId,
    },
  )

  if (error) {
    throw error
  }

  return data
}

export async function deleteEvent(eventId: string) {
  const { error } = await supabase.from('events').delete().eq('id', eventId)

  if (error) {
    throw error
  }
}

export async function transferEventCaptain(eventId: string, userId: string) {
  const { data, error } = await supabase.rpc('transfer_event_captain', {
    p_event_id: eventId,
    p_user_id: userId,
  })

  if (error) {
    throw error
  }

  return data
}

export async function updateEvent(input: UpdateEventInput) {
  const {
    eventId,
    title,
    description,
    eventDate,
    visibility,
    targetAmount,
    monthlyDefaultAmount,
  } = input

  const payload: Partial<{
    title: string
    description: string | null
    event_date: string
    visibility: EventVisibility
    target_amount: number | null
    monthly_default_amount: number | null
  }> = {
    title,
    description,
    event_date: eventDate,
    visibility,
  }

  if (targetAmount !== undefined) {
    payload.target_amount = targetAmount
  }
  if (monthlyDefaultAmount !== undefined) {
    payload.monthly_default_amount = monthlyDefaultAmount
  }

  const { data, error } = await supabase
    .from('events')
    .update(payload)
    .eq('id', eventId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function demoteEventMemberToMember(eventId: string, userId: string) {
  const { data, error } = await supabase.rpc('demote_event_member_to_member', {
    p_event_id: eventId,
    p_user_id: userId,
  })

  if (error) {
    throw error
  }

  return data
}

export async function removeEventMember(eventId: string, userId: string) {
  const { data, error } = await supabase.rpc('remove_event_member', {
    p_event_id: eventId,
    p_user_id: userId,
  })

  if (error) {
    throw error
  }

  return data
}

export async function upsertEventFundPayment({
  eventId,
  userId,
  amount,
  month,
  year,
}: {
  eventId: string
  userId: string
  amount: number
  month: number
  year: number
}) {
  const { data, error } = await supabase.rpc('upsert_event_fund_payment', {
    p_event_id: eventId,
    p_user_id: userId,
    p_amount: amount,
    p_month: month,
    p_year: year,
  })

  if (error) {
    throw error
  }

  return data
}

export async function spinRandomPicker(eventId: string, amount: number) {
  const { data, error } = await supabase.rpc('spin_random_picker', {
    p_event_id: eventId,
    p_amount: amount,
  })

  if (error) {
    throw error
  }

  return data
}

export async function loadCompletedEventsForCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('event_subscribers')
    .select(
      `
        event_role,
        events!inner (
          id,
          title,
          description,
          type,
          event_date,
          status,
          visibility,
          created_by,
          created_at
        )
      `,
    )
    .eq('user_id', user.id)
    .eq('events.status', 'completed')
    .order('joined_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? [])
    .map((subscription) => {
      const event = Array.isArray(subscription.events)
        ? subscription.events[0]
        : subscription.events

      if (!event) {
        return null
      }

      return {
        ...event,
        event_role: subscription.event_role,
      }
    })
    .filter((event): event is EventWithRole => event !== null)
}
