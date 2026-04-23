import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  completedEventsQueryOptions,
  dashboardQueryOptions,
  publicDiscoverEventDetailQueryOptions,
  type DashboardData,
  type EventWithRole,
} from './events'

const mocks = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  fromMock: vi.fn(),
}))

function createOrderedChain<T>(result: { data: T; error: null }) {
  const chain = {
    maybeSingle: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
  }

  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.order.mockResolvedValue(result)
  chain.maybeSingle.mockResolvedValue(result)

  return chain
}

function createCountChain(result: {
  count: number | null
  data: null
  error: null
}) {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
  }

  chain.select.mockReturnValue(chain)
  chain.eq.mockResolvedValue(result)

  return chain
}

let eventSubscribersChain = createOrderedChain({ data: [], error: null })
let eventSubscribersCountChain = createCountChain({
  count: 0,
  data: null,
  error: null,
})
let eventsChain = createOrderedChain({ data: [], error: null })
let profilesChain = createOrderedChain({ data: null, error: null })

mocks.fromMock.mockImplementation((table: string) => {
  if (table === 'event_subscribers') {
    return {
      select: (...args: unknown[]) => {
        const chain = args[1]
          ? eventSubscribersCountChain
          : eventSubscribersChain
        return chain.select(...args)
      },
    }
  }

  if (table === 'events') {
    return eventsChain
  }

  if (table === 'profiles') {
    return profilesChain
  }

  throw new Error(`Unexpected table lookup: ${table}`)
})

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getUser: mocks.getUserMock,
    },
    from: mocks.fromMock,
  },
}))

describe('event query helpers', () => {
  beforeEach(() => {
    mocks.getUserMock.mockReset()
    mocks.fromMock.mockClear()
    eventSubscribersChain = createOrderedChain({
      data: [],
      error: null,
    })
    eventSubscribersCountChain = createCountChain({
      count: 0,
      data: null,
      error: null,
    })
    eventsChain = createOrderedChain({
      data: [],
      error: null,
    })
    profilesChain = createOrderedChain({
      data: null,
      error: null,
    })
  })

  it('loads the dashboard using the provided user id without calling auth.getUser', async () => {
    eventSubscribersChain = createOrderedChain({
      data: [
        {
          event_role: 'member',
          events: {
            id: 'event-1',
            title: 'Friday Cricket',
            description: null,
            type: 'general',
            event_date: '2026-04-21',
            status: 'open',
            visibility: 'public',
            created_by: 'admin-1',
            created_at: '2026-04-21T00:00:00.000Z',
          },
        },
        {
          event_role: 'captain',
          events: {
            id: 'event-closed',
            title: 'Finished Fund',
            description: null,
            type: 'fund_tracker',
            event_date: '2026-04-19',
            status: 'completed',
            visibility: 'private',
            created_by: 'user-42',
            created_at: '2026-04-19T00:00:00.000Z',
          },
        },
      ],
      error: null,
    })
    eventsChain = createOrderedChain({
      data: [
        {
          id: 'event-1',
          title: 'Friday Cricket',
          description: null,
          type: 'general',
          event_date: '2026-04-21',
          status: 'open',
          visibility: 'public',
          target_amount: null,
          monthly_default_amount: null,
          created_by: 'admin-1',
          created_at: '2026-04-21T00:00:00.000Z',
        },
        {
          id: 'event-2',
          title: 'Tea Stall Meetup',
          description: null,
          type: 'general',
          event_date: '2026-04-22',
          status: 'open',
          visibility: 'public',
          target_amount: null,
          monthly_default_amount: null,
          created_by: 'admin-1',
          created_at: '2026-04-22T00:00:00.000Z',
        },
      ],
      error: null,
    })

    const query = dashboardQueryOptions('user-42')
    const queryFn = query.queryFn as unknown as () => Promise<DashboardData>
    const result = await queryFn()

    expect(query.queryKey).toEqual(['events', 'dashboard', 'user-42'])
    expect(mocks.getUserMock).not.toHaveBeenCalled()
    expect(eventSubscribersChain.eq).toHaveBeenCalledWith('user_id', 'user-42')
    expect(result.myEvents).toHaveLength(1)
    expect(result.myEvents).toEqual([
      expect.objectContaining({
        id: 'event-1',
      }),
    ])
    expect(result.discoverEvents).toEqual([
      expect.objectContaining({
        id: 'event-2',
      }),
    ])
  })

  it('loads completed history using the provided user id without calling auth.getUser', async () => {
    eventSubscribersChain = createOrderedChain({
      data: [
        {
          event_role: 'captain',
          events: {
            id: 'event-9',
            title: 'Monthly Fund',
            description: null,
            type: 'fund_tracker',
            event_date: '2026-04-20',
            status: 'completed',
            visibility: 'private',
            created_by: 'user-42',
            created_at: '2026-04-01T00:00:00.000Z',
          },
        },
      ],
      error: null,
    })

    const query = completedEventsQueryOptions('user-42')
    const queryFn = query.queryFn as unknown as () => Promise<EventWithRole[]>
    const result = await queryFn()

    expect(query.queryKey).toEqual(['events', 'history', 'user-42'])
    expect(mocks.getUserMock).not.toHaveBeenCalled()
    expect(eventSubscribersChain.eq).toHaveBeenCalledWith('user_id', 'user-42')
    expect(result).toEqual([
      expect.objectContaining({
        id: 'event-9',
        event_role: 'captain',
      }),
    ])
  })

  it('loads public discover detail using a public-safe event query', async () => {
    eventsChain = createOrderedChain({
      data: {
        id: 'event-2',
        title: 'Tea Stall Meetup',
        description: 'Public tea hangout',
        type: 'general',
        event_date: '2026-04-22',
        status: 'open',
        visibility: 'public',
        target_amount: null,
        monthly_default_amount: null,
        created_by: 'admin-1',
        created_at: '2026-04-20T00:00:00.000Z',
      },
      error: null,
    })
    eventSubscribersCountChain = createCountChain({
      count: 7,
      data: null,
      error: null,
    })
    profilesChain = createOrderedChain({
      data: {
        full_name: null,
        email: 'organizer@example.com',
      },
      error: null,
    })

    const query = publicDiscoverEventDetailQueryOptions('user-42', 'event-2')
    const queryFn = query.queryFn as unknown as () => Promise<{
      event: { id: string; created_by: string }
      memberCount: number | null
      organizer: { full_name: string | null; email: string | null } | null
    }>
    const result = await queryFn()

    expect(query.queryKey).toEqual([
      'events',
      'discover-detail',
      'user-42',
      'event-2',
    ])
    expect(mocks.getUserMock).not.toHaveBeenCalled()
    expect(eventsChain.eq).toHaveBeenCalledWith('id', 'event-2')
    expect(eventsChain.eq).toHaveBeenCalledWith('visibility', 'public')
    expect(eventsChain.eq).toHaveBeenCalledWith('status', 'open')
    expect(eventSubscribersCountChain.select).toHaveBeenCalledWith('*', {
      count: 'exact',
      head: true,
    })
    expect(profilesChain.eq).toHaveBeenCalledWith('id', 'admin-1')
    expect(result).toEqual({
      event: expect.objectContaining({
        id: 'event-2',
        created_by: 'admin-1',
      }),
      memberCount: 7,
      organizer: {
        full_name: null,
        email: 'organizer@example.com',
      },
    })
  })
})
