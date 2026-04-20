import { describe, expect, it, beforeEach, vi } from 'vitest'
import { completedEventsQueryOptions, dashboardQueryOptions } from './events'

const mocks = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  fromMock: vi.fn(),
}))

function createChain<T>(result: { data: T; error: null }) {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
  }

  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.order.mockResolvedValue(result)

  return chain
}

let eventSubscribersChain = createChain({ data: [], error: null })
let eventsChain = createChain({ data: [], error: null })

mocks.fromMock.mockImplementation((table: string) => {
  if (table === 'event_subscribers') {
    return eventSubscribersChain
  }

  if (table === 'events') {
    return eventsChain
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
    eventSubscribersChain = createChain({
      data: [],
      error: null,
    })
    eventsChain = createChain({
      data: [],
      error: null,
    })
  })

  it('loads the dashboard using the provided user id without calling auth.getUser', async () => {
    eventSubscribersChain = createChain({
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
      ],
      error: null,
    })
    eventsChain = createChain({
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
    const result = await query.queryFn()

    expect(query.queryKey).toEqual(['events', 'dashboard', 'user-42'])
    expect(mocks.getUserMock).not.toHaveBeenCalled()
    expect(eventSubscribersChain.eq).toHaveBeenCalledWith('user_id', 'user-42')
    expect(result.myEvents).toHaveLength(1)
    expect(result.discoverEvents).toEqual([
      expect.objectContaining({
        id: 'event-2',
      }),
    ])
  })

  it('loads completed history using the provided user id without calling auth.getUser', async () => {
    eventSubscribersChain = createChain({
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
    const result = await query.queryFn()

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
})
