/** @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Route } from './index'

const mocks = vi.hoisted(() => ({
  createEventWithCaptainMock: vi.fn(),
  dashboardQueryOptionsMock: vi.fn(),
  joinPublicEventMock: vi.fn(),
  navigateMock: vi.fn(),
  publicDiscoverEventDetailQueryOptionsMock: vi.fn(),
  useAuthMock: vi.fn(),
  useDashboardRefreshRegistrationMock: vi.fn(),
  useNetworkStatusMock: vi.fn(),
  useSearchMock: vi.fn(() => ({})),
}))

let dashboardData: {
  myEvents: Array<Record<string, unknown>>
  discoverEvents: Array<Record<string, unknown>>
} = {
  myEvents: [],
  discoverEvents: [],
}

const discoverDetailByEventId = new Map<
  string,
  unknown | (() => Promise<unknown> | unknown)
>()

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
  }: {
    children: ReactElement | ReactElement[] | string
  }) => <a>{children}</a>,
  createFileRoute: () => (options: unknown) => ({
    options,
    useNavigate: () => mocks.navigateMock,
    useSearch: () => mocks.useSearchMock(),
  }),
}))

vi.mock('../components/AnimatedContentLoader', () => ({
  default: ({ isVisible }: { isVisible: boolean }) =>
    isVisible ? <div aria-label="Loading" /> : null,
}))

vi.mock('../components/AuthProvider', () => ({
  useAuth: mocks.useAuthMock,
}))

vi.mock('../hooks/useDashboardRefresh', () => ({
  useDashboardRefreshRegistration: mocks.useDashboardRefreshRegistrationMock,
}))

vi.mock('../hooks/useNetworkStatus', () => ({
  useNetworkStatus: mocks.useNetworkStatusMock,
}))

vi.mock('../utils/events', () => ({
  createEventWithCaptain: mocks.createEventWithCaptainMock,
  dashboardQueryOptions: mocks.dashboardQueryOptionsMock,
  eventKeys: {
    dashboard: (userId: string) => ['events', 'dashboard', userId],
    discoverDetail: (userId: string, eventId: string) => [
      'events',
      'discover-detail',
      userId,
      eventId,
    ],
  },
  joinPublicEvent: mocks.joinPublicEventMock,
  publicDiscoverEventDetailQueryOptions:
    mocks.publicDiscoverEventDetailQueryOptionsMock,
}))

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })

  return { promise, resolve, reject }
}

function createApprovedAuthState() {
  return {
    user: {
      id: 'user-1',
      email: 'user@example.com',
    },
    profile: {
      id: 'user-1',
      full_name: 'Member User',
      role: 'member',
      is_approved: true,
    },
    authStatus: 'signed-in',
    isProfileLoading: false,
  }
}

function createDiscoverEvent(overrides?: Record<string, unknown>) {
  return {
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
    ...overrides,
  }
}

function renderHomePage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')
  const HomePage = Route.options.component as () => ReactElement

  const renderResult = render(
    <QueryClientProvider client={queryClient}>
      <HomePage />
    </QueryClientProvider>,
  )

  return {
    ...renderResult,
    invalidateQueriesSpy,
    queryClient,
  }
}

describe('HomePage discover event drawer', () => {
  beforeEach(() => {
    dashboardData = {
      myEvents: [],
      discoverEvents: [],
    }
    discoverDetailByEventId.clear()

    mocks.createEventWithCaptainMock.mockReset()
    mocks.dashboardQueryOptionsMock.mockReset()
    mocks.dashboardQueryOptionsMock.mockImplementation((userId: string) => ({
      queryKey: ['events', 'dashboard', userId],
      queryFn: async () => dashboardData,
    }))
    mocks.joinPublicEventMock.mockReset()
    mocks.joinPublicEventMock.mockResolvedValue({ success: true })
    mocks.navigateMock.mockReset()
    mocks.publicDiscoverEventDetailQueryOptionsMock.mockReset()
    mocks.publicDiscoverEventDetailQueryOptionsMock.mockImplementation(
      (userId: string, eventId: string) => ({
        queryKey: ['events', 'discover-detail', userId, eventId],
        queryFn: async () => {
          const nextValue = discoverDetailByEventId.get(eventId)

          if (typeof nextValue === 'function') {
            return nextValue()
          }

          return (
            nextValue ?? {
              event: null,
              memberCount: null,
              organizer: null,
            }
          )
        },
      }),
    )
    mocks.useAuthMock.mockReset()
    mocks.useAuthMock.mockReturnValue(createApprovedAuthState())
    mocks.useDashboardRefreshRegistrationMock.mockReset()
    mocks.useNetworkStatusMock.mockReset()
    mocks.useNetworkStatusMock.mockReturnValue({ isOnline: true })
    mocks.useSearchMock.mockReset()
    mocks.useSearchMock.mockReturnValue({})
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the redesigned discover card with a leading type icon and no inline join button', async () => {
    dashboardData = {
      myEvents: [],
      discoverEvents: [createDiscoverEvent()],
    }

    const { container } = renderHomePage()

    await screen.findByText('Tea Stall Meetup')

    const card = container.querySelector('.discover-event-card')
    expect(card).toBeTruthy()
    expect(
      card?.querySelector('.discover-event-title-row .event-type-icon'),
    ).toBeTruthy()
    expect(card?.querySelector('.event-type-badge')).toBeNull()
    expect(card?.querySelector('.discover-event-open-button')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Join event' })).toBeNull()
    expect(
      screen.getAllByRole('button', {
        name: 'Open details for Tea Stall Meetup',
      }),
    ).toHaveLength(2)
  })

  it('opens the discover drawer from the card hit-area and hydrates organizer and member count details', async () => {
    const event = createDiscoverEvent()
    const detailDeferred = createDeferred<{
      event: ReturnType<typeof createDiscoverEvent>
      memberCount: number
      organizer: { full_name: string; email: string }
    }>()

    dashboardData = {
      myEvents: [],
      discoverEvents: [event],
    }
    discoverDetailByEventId.set(event.id, () => detailDeferred.promise)

    const { container } = renderHomePage()

    await screen.findByText(event.title)

    fireEvent.click(
      container.querySelector(
        '.discover-event-card-hitarea',
      ) as HTMLButtonElement,
    )

    expect(screen.getByRole('heading', { name: 'Event details' })).toBeTruthy()
    expect(screen.getAllByText(event.title).length).toBeGreaterThan(0)
    expect(screen.getByText('Public tea hangout')).toBeTruthy()
    expect(screen.getAllByText('Loading...')).toHaveLength(2)

    detailDeferred.resolve({
      event,
      memberCount: 7,
      organizer: {
        full_name: 'Admin One',
        email: 'admin@example.com',
      },
    })

    await waitFor(() => {
      expect(screen.getByText('Admin One')).toBeTruthy()
      expect(screen.getByText('7')).toBeTruthy()
    })
  })

  it('opens the same discover drawer from the plus button', async () => {
    const event = createDiscoverEvent()

    dashboardData = {
      myEvents: [],
      discoverEvents: [event],
    }
    discoverDetailByEventId.set(event.id, {
      event,
      memberCount: 5,
      organizer: {
        full_name: 'Admin One',
        email: 'admin@example.com',
      },
    })

    const { container } = renderHomePage()

    await screen.findByText(event.title)

    fireEvent.click(
      container.querySelector(
        '.discover-event-open-button',
      ) as HTMLButtonElement,
    )

    expect(screen.getByRole('heading', { name: 'Event details' })).toBeTruthy()
    expect(await screen.findByText('Admin One')).toBeTruthy()
  })

  it('joins from the drawer, closes it, and invalidates the dashboard query', async () => {
    const event = createDiscoverEvent()

    dashboardData = {
      myEvents: [],
      discoverEvents: [event],
    }
    discoverDetailByEventId.set(event.id, {
      event,
      memberCount: 5,
      organizer: {
        full_name: 'Admin One',
        email: 'admin@example.com',
      },
    })

    const { container, invalidateQueriesSpy } = renderHomePage()

    await screen.findByText(event.title)

    fireEvent.click(
      container.querySelector(
        '.discover-event-card-hitarea',
      ) as HTMLButtonElement,
    )

    await screen.findByText('Admin One')

    fireEvent.click(screen.getByRole('button', { name: 'Join event' }))

    await waitFor(() => {
      expect(mocks.joinPublicEventMock).toHaveBeenCalledWith(event.id)
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['events', 'dashboard', 'user-1'],
      })
      expect(
        screen.queryByRole('heading', { name: 'Event details' }),
      ).toBeNull()
    })
  })

  it('keeps the drawer open and shows a local error when join fails', async () => {
    const event = createDiscoverEvent()

    dashboardData = {
      myEvents: [],
      discoverEvents: [event],
    }
    discoverDetailByEventId.set(event.id, {
      event,
      memberCount: 5,
      organizer: {
        full_name: 'Admin One',
        email: 'admin@example.com',
      },
    })
    mocks.joinPublicEventMock.mockRejectedValueOnce(new Error('Join failed.'))

    const { container, invalidateQueriesSpy } = renderHomePage()

    await screen.findByText(event.title)

    fireEvent.click(
      container.querySelector(
        '.discover-event-card-hitarea',
      ) as HTMLButtonElement,
    )

    await screen.findByText('Admin One')
    fireEvent.click(screen.getByRole('button', { name: 'Join event' }))

    await waitFor(() => {
      expect(screen.getByText('Join failed.')).toBeTruthy()
      expect(
        screen.getByRole('heading', { name: 'Event details' }),
      ).toBeTruthy()
    })

    expect(invalidateQueriesSpy).not.toHaveBeenCalled()
  })

  it('opens the drawer while offline and disables the join button', async () => {
    const event = createDiscoverEvent()

    dashboardData = {
      myEvents: [],
      discoverEvents: [event],
    }
    discoverDetailByEventId.set(event.id, {
      event,
      memberCount: 5,
      organizer: {
        full_name: 'Admin One',
        email: 'admin@example.com',
      },
    })
    mocks.useNetworkStatusMock.mockReturnValue({ isOnline: false })

    const { container } = renderHomePage()

    await screen.findByText(event.title)

    fireEvent.click(
      container.querySelector(
        '.discover-event-card-hitarea',
      ) as HTMLButtonElement,
    )

    const reconnectButton = await screen.findByRole('button', {
      name: 'Reconnect to join',
    })

    expect((reconnectButton as HTMLButtonElement).disabled).toBe(true)
    expect(
      screen.getByText(
        'Reconnect to join this event. Offline mode keeps existing reads available only.',
      ),
    ).toBeTruthy()
  })

  it('closes the drawer from the header close button', async () => {
    const event = createDiscoverEvent()

    dashboardData = {
      myEvents: [],
      discoverEvents: [event],
    }
    discoverDetailByEventId.set(event.id, {
      event,
      memberCount: 5,
      organizer: {
        full_name: 'Admin One',
        email: 'admin@example.com',
      },
    })

    const { container } = renderHomePage()

    await screen.findByText(event.title)

    fireEvent.click(
      container.querySelector(
        '.discover-event-card-hitarea',
      ) as HTMLButtonElement,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Close' }))

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: 'Event details' }),
      ).toBeNull()
    })
  })

  it('closes the drawer when the overlay is clicked', async () => {
    const event = createDiscoverEvent()

    dashboardData = {
      myEvents: [],
      discoverEvents: [event],
    }
    discoverDetailByEventId.set(event.id, {
      event,
      memberCount: 5,
      organizer: {
        full_name: 'Admin One',
        email: 'admin@example.com',
      },
    })

    const { container } = renderHomePage()

    await screen.findByText(event.title)

    fireEvent.click(
      container.querySelector(
        '.discover-event-card-hitarea',
      ) as HTMLButtonElement,
    )

    fireEvent.click(container.querySelector('.drawer-overlay') as HTMLElement)

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: 'Event details' }),
      ).toBeNull()
    })
  })

  it('closes the drawer when escape is pressed', async () => {
    const event = createDiscoverEvent()

    dashboardData = {
      myEvents: [],
      discoverEvents: [event],
    }
    discoverDetailByEventId.set(event.id, {
      event,
      memberCount: 5,
      organizer: {
        full_name: 'Admin One',
        email: 'admin@example.com',
      },
    })

    const { container } = renderHomePage()

    await screen.findByText(event.title)

    fireEvent.click(
      container.querySelector(
        '.discover-event-card-hitarea',
      ) as HTMLButtonElement,
    )

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: 'Event details' }),
      ).toBeNull()
    })
  })
})
