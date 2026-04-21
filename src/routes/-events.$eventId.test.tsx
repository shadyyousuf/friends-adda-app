/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Route } from './events.$eventId'

const mocks = vi.hoisted(() => ({
  approvedProfilesQueryOptionsMock: vi.fn(() => ({
    queryKey: ['profiles', 'approved'],
    queryFn: async () => [],
  })),
  eventDetailQueryOptionsMock: vi.fn(() => ({
    queryKey: ['events', 'detail', 'user-1', 'event-1'],
    queryFn: async () => null,
  })),
  navigateMock: vi.fn(),
  setEventTitleMock: vi.fn(),
  useAuthMock: vi.fn(),
  useEventDetailMutationsMock: vi.fn(),
  useParamsMock: vi.fn(() => ({ eventId: 'event-1' })),
  useQueryMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQueryMock,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactElement | ReactElement[] | string }) => (
    <a>{children}</a>
  ),
  createFileRoute: () => (options: unknown) => ({
    options,
    useNavigate: () => mocks.navigateMock,
    useParams: mocks.useParamsMock,
  }),
}))

vi.mock('../components/AnimatedContentLoader', () => ({
  default: ({ isVisible }: { isVisible: boolean }) =>
    isVisible ? <div aria-label="Loading" /> : null,
}))

vi.mock('../components/events/FundTrackerEventContent', () => ({
  FundTrackerEventContent: ({ canRunModules }: { canRunModules: boolean }) => (
    <div>{`fund-tracker-modules:${String(canRunModules)}`}</div>
  ),
}))

vi.mock('../components/events/GeneralEventContent', () => ({
  GeneralEventContent: ({ event }: { event: { title: string } }) => (
    <div>{event.title}</div>
  ),
}))

vi.mock('../components/events/RandomPickerEventContent', () => ({
  RandomPickerEventContent: ({
    canSpin,
    canEditWinnerAmount,
  }: {
    canSpin: boolean
    canEditWinnerAmount: boolean
  }) => (
    <div>
      <span>{`random-picker-spin:${String(canSpin)}`}</span>
      <span>{`random-picker-edit:${String(canEditWinnerAmount)}`}</span>
    </div>
  ),
}))

vi.mock('../components/MemberDirectoryCard', () => ({
  MemberDirectoryCard: () => <div>member-card</div>,
}))

vi.mock('../components/events/detail/AddMembersDrawer', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div>add-members-drawer</div> : null,
}))

vi.mock('../components/events/detail/EventDetailRouteShell', () => ({
  default: ({
    children,
    detailError,
    errorMessage,
  }: {
    children: ReactElement | ReactElement[]
    detailError?: string | null
    errorMessage?: string | null
  }) => (
    <div>
      {detailError ? <div>{detailError}</div> : null}
      {errorMessage ? <div>{errorMessage}</div> : null}
      {children}
    </div>
  ),
}))

vi.mock('../components/events/detail/EventEditDrawer', () => ({
  default: ({ canEditEvent }: { canEditEvent: boolean }) => (
    <div>{`can-edit:${String(canEditEvent)}`}</div>
  ),
}))

vi.mock('../components/events/detail/EventMembersPanel', () => ({
  default: ({ canManageMembers }: { canManageMembers: boolean }) => (
    <div>{`can-manage-members:${String(canManageMembers)}`}</div>
  ),
}))

vi.mock('../components/events/detail/RandomPickerWinnerAmountDrawer', () => ({
  default: () => null,
}))

vi.mock('../components/events/EventTypeHelpers', () => ({
  ContributionTimeline: () => null,
  formatEventRole: (role: string) => role,
  formatMoney: (value: number) => String(value),
  MemberAvatar: () => <div>avatar</div>,
}))

vi.mock('../components/AuthProvider', () => ({
  useAuth: mocks.useAuthMock,
}))

vi.mock('../components/MobileLayout', () => ({
  useEventPageTitle: () => ({
    setEventTitle: mocks.setEventTitleMock,
  }),
}))

vi.mock('../hooks/useEventDetailMutations', () => ({
  useEventDetailMutations: mocks.useEventDetailMutationsMock,
}))

vi.mock('../utils/events', () => ({
  addMembersToEvent: vi.fn(),
  closeEvent: vi.fn(),
  deleteEvent: vi.fn(),
  demoteEventMemberToMember: vi.fn(),
  eventDetailQueryOptions: mocks.eventDetailQueryOptionsMock,
  extractRandomPickerWinnerId: (activity: { payload?: { winner?: string } }) =>
    activity.payload?.winner ?? null,
  promoteEventMemberToCoCaptain: vi.fn(),
  removeEventMember: vi.fn(),
  spinRandomPicker: vi.fn(),
  transferEventCaptain: vi.fn(),
  updateEvent: vi.fn(),
  updateRandomPickerWinnerAmount: vi.fn(),
  upsertEventFundPayment: vi.fn(),
}))

vi.mock('../utils/profile', () => ({
  approvedProfilesQueryOptions: mocks.approvedProfilesQueryOptionsMock,
}))

function createDetailData({
  eventType = 'general',
  status = 'open',
  profileRole = 'admin',
  eventRole = 'captain',
}: {
  eventType?: 'fund_tracker' | 'general' | 'random_picker'
  status?: 'completed' | 'open'
  profileRole?: 'admin' | 'member'
  eventRole?: 'captain' | 'co-captain' | 'member'
}) {
  return {
    event: {
      id: 'event-1',
      title: 'Event One',
      description: 'Test event',
      type: eventType,
      event_date: '2026-04-21',
      status,
      visibility: 'public',
      target_amount: eventType === 'fund_tracker' ? 5000 : null,
      monthly_default_amount: eventType === 'fund_tracker' ? 500 : null,
      created_by: 'user-1',
      created_at: '2026-04-20T00:00:00.000Z',
    },
    subscribers: [
      {
        event_id: 'event-1',
        user_id: 'user-1',
        event_role: eventRole,
        joined_at: '2026-04-20T00:00:00.000Z',
        profiles: {
          id: 'user-1',
          email: 'user@example.com',
          full_name: 'User One',
          blood_group: 'A+',
          role: profileRole,
        },
      },
      {
        event_id: 'event-1',
        user_id: 'user-2',
        event_role: 'member',
        joined_at: '2026-04-20T00:05:00.000Z',
        profiles: {
          id: 'user-2',
          email: 'friend@example.com',
          full_name: 'Friend Two',
          blood_group: 'B+',
          role: 'member',
        },
      },
    ],
    funds: [],
    activities: [],
  }
}

function renderEventRoute({
  eventType = 'general',
  status = 'open',
  profileRole = 'admin',
  eventRole = 'captain',
}: {
  eventType?: 'fund_tracker' | 'general' | 'random_picker'
  status?: 'completed' | 'open'
  profileRole?: 'admin' | 'member'
  eventRole?: 'captain' | 'co-captain' | 'member'
} = {}) {
  mocks.useParamsMock.mockReturnValue({ eventId: 'event-1' })
  mocks.useAuthMock.mockReturnValue({
    user: {
      id: 'user-1',
      email: 'user@example.com',
    },
    profile: {
      id: 'user-1',
      role: profileRole,
      full_name: 'User One',
      blood_group: 'A+',
      is_approved: true,
    },
    authStatus: 'signed-in',
    isProfileLoading: false,
  })
  mocks.useEventDetailMutationsMock.mockReturnValue({
    activeAction: null,
    errorMessage: null,
    setErrorMessage: vi.fn(),
    clearError: vi.fn(),
    invalidateDetail: vi.fn(),
    invalidateDetailAndDashboard: vi.fn(),
    invalidateDetailDashboardAndHistory: vi.fn(),
    runMutation: vi.fn(async (_key: string, action: () => Promise<void>) => {
      await action()
      return true
    }),
  })
  const detailResult = {
    data: createDetailData({ eventType, status, profileRole, eventRole }),
    error: null,
    isPending: false,
    isRefetching: false,
  }
  const approvedProfilesResult = {
    data: [],
    error: null,
    isPending: false,
    isRefetching: false,
  }
  mocks.useQueryMock.mockReset()
  mocks.useQueryMock.mockImplementation(
    (options: { queryKey?: string[] }) =>
      options.queryKey?.[0] === 'events'
        ? detailResult
        : approvedProfilesResult,
  )

  const EventDetailComponent = Route.options.component as () => ReactElement

  return render(<EventDetailComponent />)
}

describe('Event detail close-event flow', () => {
  beforeEach(() => {
    mocks.approvedProfilesQueryOptionsMock.mockClear()
    mocks.eventDetailQueryOptionsMock.mockClear()
    mocks.navigateMock.mockReset()
    mocks.setEventTitleMock.mockReset()
    mocks.useAuthMock.mockReset()
    mocks.useEventDetailMutationsMock.mockReset()
    mocks.useParamsMock.mockReset()
    mocks.useQueryMock.mockReset()
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 0))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows Close Event to admins on open events', () => {
    renderEventRoute({
      eventType: 'general',
      status: 'open',
      profileRole: 'admin',
      eventRole: 'captain',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Open event actions' }))

    expect(screen.getByText('Close Event')).toBeTruthy()
    expect(screen.getByText('Delete event')).toBeTruthy()
    expect(screen.getByText('can-edit:true')).toBeTruthy()
  })

  it('hides write actions for completed general events', () => {
    renderEventRoute({
      eventType: 'general',
      status: 'completed',
      profileRole: 'admin',
      eventRole: 'captain',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Open event actions' }))

    expect(screen.queryByText('Close Event')).toBeNull()
    expect(screen.queryByText('Delete event')).toBeNull()
    expect(screen.getByText('can-edit:false')).toBeTruthy()
    expect(screen.getByText('can-manage-members:false')).toBeTruthy()
  })

  it('disables fund tracker module writes for completed events', () => {
    renderEventRoute({
      eventType: 'fund_tracker',
      status: 'completed',
      profileRole: 'member',
      eventRole: 'captain',
    })

    expect(screen.getByText('fund-tracker-modules:false')).toBeTruthy()
  })

  it('disables random picker module writes for completed events', () => {
    renderEventRoute({
      eventType: 'random_picker',
      status: 'completed',
      profileRole: 'member',
      eventRole: 'captain',
    })

    expect(screen.getByText('random-picker-spin:false')).toBeTruthy()
    expect(screen.getByText('random-picker-edit:false')).toBeTruthy()
  })

  it('does not show Close Event to co-captains or regular members', () => {
    const cases = [
      { eventRole: 'co-captain' as const, label: 'co-captain' },
      { eventRole: 'member' as const, label: 'member' },
    ]

    for (const testCase of cases) {
      cleanup()

      renderEventRoute({
        eventType: 'general',
        status: 'open',
        profileRole: 'member',
        eventRole: testCase.eventRole,
      })

      fireEvent.click(screen.getByRole('button', { name: 'Open event actions' }))

      expect(
        screen.queryByText('Close Event'),
        `Close Event should stay hidden for ${testCase.label}`,
      ).toBeNull()
    }
  })
})
