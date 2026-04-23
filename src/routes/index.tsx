import { Plus } from 'lucide-react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import AnimatedContentLoader from '../components/AnimatedContentLoader'
import { useAuth } from '../components/AuthProvider'
import EventDetailDrawer from '../components/events/detail/EventDetailDrawer'
import { InfoItem } from '../components/events/EventTypeHelpers'
import { useDashboardRefreshRegistration } from '../hooks/useDashboardRefresh'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import {
  createEventWithCaptain,
  dashboardQueryOptions,
  eventKeys,
  joinPublicEvent,
  publicDiscoverEventDetailQueryOptions,
  type DashboardData,
  type EventType,
  type EventVisibility,
  type EventWithRole,
  type PublicDiscoverEventDetail,
} from '../utils/events'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => ({
    create: search.create === '1' ? '1' : undefined,
  }),
  component: HomePage,
})

const GUEST_HERO_METRICS = [
  { value: '3', label: 'event modes' },
  { value: '1', label: 'shared dashboard' },
  { value: '24/7', label: 'member visibility' },
] as const

const GUEST_PREVIEW_ITEMS = [
  {
    title: 'Friday Cricket Meetup',
    meta: 'Public plan with date, status, and captain ready to go.',
  },
  {
    title: 'Monthly Fund Tracker',
    meta: 'Track contributions without losing updates in chat.',
  },
  {
    title: 'Random Picker Night',
    meta: 'Settle the next choice fast when the group cannot decide.',
  },
] as const

const GUEST_FEATURES = [
  {
    eyebrow: 'Organized',
    title: 'Build events without chat chaos',
    copy: 'Create general events, collect money, or run a random picker from one clean flow.',
  },
  {
    eyebrow: 'Shared visibility',
    title: 'Keep members aligned on what is happening',
    copy: 'Everyone sees the same date, status, and next action without scrolling through messages.',
  },
] as const

const GUEST_JOURNEY = [
  {
    step: '01',
    title: 'Create',
    copy: 'Start an event with the exact mode your group needs.',
  },
  {
    step: '02',
    title: 'Invite',
    copy: 'Open it publicly or keep it private for a smaller circle.',
  },
  {
    step: '03',
    title: 'Run it',
    copy: 'Track updates, members, and money from the same dashboard.',
  },
] as const

function HomePage() {
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  const { user, profile, authStatus, isProfileLoading } = useAuth()
  const { isOnline } = useNetworkStatus()
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventType, setEventType] = useState<EventType>('general')
  const [eventDate, setEventDate] = useState(() => getTodayDateInputValue())
  const [visibility, setVisibility] = useState<EventVisibility>('public')
  const [targetAmount, setTargetAmount] = useState('')
  const [monthlyDefaultAmount, setMonthlyDefaultAmount] = useState('')
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [discoverJoinError, setDiscoverJoinError] = useState<string | null>(
    null,
  )
  const [activeDiscoverEvent, setActiveDiscoverEvent] = useState<
    DashboardData['discoverEvents'][number] | null
  >(null)
  const [activeJoinEventId, setActiveJoinEventId] = useState<string | null>(
    null,
  )
  const isFundTracker = eventType === 'fund_tracker'
  const userId = user?.id ?? ''
  const activeDiscoverEventId = activeDiscoverEvent?.id ?? ''

  const canLoadDashboard =
    authStatus === 'signed-in' && Boolean(user && profile?.is_approved)
  const dashboardQuery = useQuery({
    ...dashboardQueryOptions(userId),
    enabled: canLoadDashboard,
  })
  const discoverDetailQuery = useQuery({
    ...publicDiscoverEventDetailQueryOptions(userId, activeDiscoverEventId),
    enabled: canLoadDashboard && Boolean(activeDiscoverEventId),
  })
  const dashboardData: DashboardData = dashboardQuery.data ?? {
    myEvents: [],
    discoverEvents: [],
  }
  const discoverDetailData = discoverDetailQuery.data ?? null
  const dashboardError =
    dashboardQuery.error instanceof Error
      ? dashboardQuery.error.message
      : dashboardQuery.error
        ? 'Failed to load dashboard.'
        : null
  const discoverDetailError =
    discoverDetailQuery.error instanceof Error
      ? discoverDetailQuery.error.message
      : discoverDetailQuery.error
        ? 'Failed to load extra event details.'
        : null

  useDashboardRefreshRegistration(async () => {
    await dashboardQuery.refetch()
  }, canLoadDashboard)

  useEffect(() => {
    if (search.create !== '1') {
      return
    }

    if (isCreateOpen) {
      return
    }

    setTitle('')
    setDescription('')
    setEventType('general')
    setEventDate(getTodayDateInputValue())
    setVisibility('public')
    setTargetAmount('')
    setMonthlyDefaultAmount('')
    setCreateError(null)
    setIsCreateOpen(true)

    void navigate({
      to: '/',
      search: (current) => ({
        ...current,
        create: undefined,
      }),
      replace: true,
    })
  }, [isCreateOpen, navigate, search.create])

  function openCreateDrawer() {
    setTitle('')
    setDescription('')
    setEventType('general')
    setEventDate(getTodayDateInputValue())
    setVisibility('public')
    setTargetAmount('')
    setMonthlyDefaultAmount('')
    setCreateError(null)
    setIsCreateOpen(true)
  }

  async function handleCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreateError(null)
    setIsCreatingEvent(true)

    try {
      const normalizedTargetAmount =
        eventType === 'fund_tracker' && targetAmount.trim()
          ? Number(targetAmount)
          : null
      const normalizedMonthlyDefaultAmount =
        eventType === 'fund_tracker' && monthlyDefaultAmount.trim()
          ? Number(monthlyDefaultAmount)
          : null

      if (
        eventType === 'fund_tracker' &&
        normalizedTargetAmount !== null &&
        (!Number.isFinite(normalizedTargetAmount) ||
          normalizedTargetAmount <= 0)
      ) {
        throw new Error('Target amount must be greater than zero.')
      }
      if (
        eventType === 'fund_tracker' &&
        normalizedMonthlyDefaultAmount !== null &&
        (!Number.isFinite(normalizedMonthlyDefaultAmount) ||
          normalizedMonthlyDefaultAmount <= 0)
      ) {
        throw new Error('Monthly default amount must be greater than zero.')
      }

      const createdEvent = await createEventWithCaptain({
        title,
        description,
        type: eventType,
        eventDate,
        visibility,
        targetAmount: normalizedTargetAmount,
        monthlyDefaultAmount: normalizedMonthlyDefaultAmount,
      })
      if (!createdEvent?.id) {
        throw new Error('Failed to create event.')
      }

      await queryClient.invalidateQueries({
        queryKey: eventKeys.dashboard(userId),
      })

      void navigate({
        to: '/events/$eventId',
        params: { eventId: createdEvent.id },
      })
      setTitle('')
      setDescription('')
      setEventType('general')
      setEventDate(getTodayDateInputValue())
      setVisibility('public')
      setTargetAmount('')
      setMonthlyDefaultAmount('')
      setIsCreateOpen(false)
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : 'Failed to create event.',
      )
    } finally {
      setIsCreatingEvent(false)
    }
  }

  function openDiscoverDrawer(event: DashboardData['discoverEvents'][number]) {
    setDiscoverJoinError(null)
    setActiveDiscoverEvent(event)
  }

  function closeDiscoverDrawer() {
    setDiscoverJoinError(null)
    setActiveDiscoverEvent(null)
  }

  async function handleJoinEvent(eventId: string) {
    setDiscoverJoinError(null)
    setActiveJoinEventId(eventId)

    try {
      await joinPublicEvent(eventId)
      await queryClient.invalidateQueries({
        queryKey: eventKeys.dashboard(userId),
      })
      closeDiscoverDrawer()
    } catch (error) {
      setDiscoverJoinError(
        error instanceof Error ? error.message : 'Failed to join event.',
      )
    } finally {
      setActiveJoinEventId(null)
    }
  }

  if (
    authStatus === 'initializing' ||
    (authStatus === 'signed-in' && isProfileLoading && !profile)
  ) {
    return <AnimatedContentLoader isVisible mode="panel" />
  }

  if (authStatus === 'signed-out' || !user) {
    return <GuestLanding />
  }

  if (!profile?.is_approved) {
    return null
  }

  if (dashboardQuery.isPending && dashboardData.myEvents.length === 0) {
    return <AnimatedContentLoader isVisible mode="panel" />
  }

  return (
    <div className="stack-lg">
      {dashboardError ? (
        <section className="glass-card panel stack-md">
          <p className="form-error">{dashboardError}</p>
        </section>
      ) : null}

      <section className="glass-card panel stack-md">
        <div className="split-header">
          <div className="section-header-copy">
            <p className="eyebrow">My events</p>
            <h3 className="section-title">Pick up your active plans</h3>
          </div>
          <span className="status-chip">{dashboardData.myEvents.length}</span>
        </div>
        {!isOnline ? (
          <p className="field-label">
            You are offline. Cached reads stay available, but creating or
            joining events is disabled until you reconnect.
          </p>
        ) : null}

        {dashboardData.myEvents.length === 0 ? (
          <div className="empty-state">
            <h4 className="empty-state-title">No active events yet</h4>
            <div className="actions-row">
              <button
                type="button"
                className="primary-button"
                onClick={openCreateDrawer}
                disabled={!isOnline}
              >
                {isOnline ? 'Create your first event' : 'Reconnect to create'}
              </button>
            </div>
          </div>
        ) : (
          <div className="event-card-carousel">
            {dashboardData.myEvents.map((event) => (
              <MyEventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      <section className="glass-card panel stack-md">
        <div className="split-header">
          <div className="section-header-copy">
            <p className="eyebrow">Discover</p>
            <h3 className="section-title">Join an open public event</h3>
          </div>
          <span className="status-chip">
            {dashboardData.discoverEvents.length}
          </span>
        </div>

        {dashboardData.discoverEvents.length === 0 ? (
          <div className="empty-state">
            <h4 className="empty-state-title">Nothing open right now</h4>
          </div>
        ) : (
          <div className="event-card-carousel">
            {dashboardData.discoverEvents.map((event) => (
              <DiscoverEventCard
                key={event.id}
                event={event}
                onOpen={() => openDiscoverDrawer(event)}
              />
            ))}
          </div>
        )}
      </section>

      <DiscoverEventDrawer
        event={activeDiscoverEvent}
        detail={discoverDetailData}
        detailError={discoverDetailError}
        isDetailResolved={discoverDetailQuery.isFetched}
        isLoadingDetail={
          discoverDetailQuery.isPending || discoverDetailQuery.isFetching
        }
        isJoining={activeJoinEventId === activeDiscoverEvent?.id}
        isOnline={isOnline}
        joinError={discoverJoinError}
        onClose={closeDiscoverDrawer}
        onJoin={() =>
          activeDiscoverEvent
            ? void handleJoinEvent(activeDiscoverEvent.id)
            : undefined
        }
      />

      {isCreateOpen ? (
        <section
          className="drawer-overlay"
          onClick={() => setIsCreateOpen(false)}
        >
          <div
            className="glass-card create-drawer"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-event-title"
          >
            <div className="drawer-handle" aria-hidden="true" />
            <div className="split-header">
              <div className="section-header-copy">
                <p className="eyebrow">Create event</p>
                <h3 className="section-title" id="create-event-title">
                  Start a new group plan
                </h3>
                <p className="field-label">
                  Choose the event mode first, then fill in the schedule and
                  visibility.
                </p>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setIsCreateOpen(false)}
              >
                Close
              </button>
            </div>

            <form className="stack-md" onSubmit={handleCreateEvent}>
              <label className="stack-xs">
                <span className="field-label">Name</span>
                <input
                  required
                  type="text"
                  className="field-input"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Friday cricket meetup"
                />
              </label>

              <label className="stack-xs">
                <span className="field-label">Description</span>
                <textarea
                  className="field-input field-textarea"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>

              <div className="create-form-row">
                <label className="stack-xs">
                  <span className="field-label">Event date</span>
                  <input
                    required
                    type="date"
                    className="field-input"
                    value={eventDate}
                    onChange={(event) => setEventDate(event.target.value)}
                  />
                </label>

                <label className="stack-xs">
                  <span className="field-label">Type</span>
                  <select
                    className="field-input"
                    value={eventType}
                    onChange={(event) =>
                      setEventType(event.target.value as EventType)
                    }
                  >
                    <option value="general">General</option>
                    <option value="fund_tracker">Fund tracker</option>
                    <option value="random_picker">Random picker</option>
                  </select>
                </label>
              </div>

              <div className="create-form-row">
                <label className="stack-xs">
                  <span className="field-label">Visibility</span>
                  <select
                    className="field-input"
                    value={visibility}
                    onChange={(event) =>
                      setVisibility(event.target.value as EventVisibility)
                    }
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </label>
              </div>

              {isFundTracker ? (
                <div className="create-form-row">
                  <label className="stack-xs">
                    <span className="field-label">
                      Target amount (optional)
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      className="field-input"
                      value={targetAmount}
                      onChange={(event) => setTargetAmount(event.target.value)}
                      placeholder="15000"
                    />
                  </label>
                  <label className="stack-xs">
                    <span className="field-label">Monthly(Optional)</span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      className="field-input"
                      value={monthlyDefaultAmount}
                      onChange={(event) =>
                        setMonthlyDefaultAmount(event.target.value)
                      }
                      placeholder="Optional"
                    />
                  </label>
                </div>
              ) : null}

              {createError ? <p className="form-error">{createError}</p> : null}
              {!isOnline ? (
                <p className="field-label">
                  Reconnect to create new events. Offline mode keeps existing
                  reads available only.
                </p>
              ) : null}

              <div className="actions-row create-drawer-actions">
                <button
                  type="submit"
                  className="primary-button"
                  disabled={isCreatingEvent || !isOnline}
                >
                  {!isOnline
                    ? 'Reconnect to create'
                    : isCreatingEvent
                      ? 'Creating...'
                      : 'Create event'}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </section>
      ) : null}
    </div>
  )
}

function GuestLanding() {
  return (
    <div className="stack-lg guest-home">
      <section className="glass-card panel guest-hero">
        <div className="stack-md guest-hero-copy">
          <div className="stack-sm">
            <div className="guest-pill-row" aria-hidden="true">
              <span className="guest-pill">Events</span>
              <span className="guest-pill">Funds</span>
              <span className="guest-pill">Members</span>
            </div>
            <p className="eyebrow">Friends Adda</p>
            <h2 className="guest-home-title">
              Plan hangouts, track money, and keep every member in sync.
            </h2>
            <p className="muted-copy guest-home-copy">
              A larger landing screen for guests that shows how the app keeps
              your group organized from the first invite to the final update.
            </p>
          </div>

          <div className="actions-row guest-hero-actions">
            <Link to="/signup" className="primary-button guest-hero-button">
              Create account
            </Link>
            <Link to="/login" className="secondary-button guest-hero-button">
              Log in
            </Link>
          </div>
        </div>

        <div className="guest-hero-showcase">
          <div
            className="guest-hero-orb guest-hero-orb-primary"
            aria-hidden="true"
          />
          <div
            className="guest-hero-orb guest-hero-orb-secondary"
            aria-hidden="true"
          />

          <div className="glass-card guest-showcase-card">
            <div className="guest-showcase-head">
              <div className="stack-xs">
                <p className="eyebrow guest-showcase-kicker">Live preview</p>
                <h3 className="panel-title guest-showcase-title">
                  One home for every group plan.
                </h3>
              </div>
              <span className="guest-live-badge">Sync</span>
            </div>

            <div className="guest-metric-grid">
              {GUEST_HERO_METRICS.map((metric) => (
                <article key={metric.label} className="guest-metric-card">
                  <strong className="guest-metric-value">{metric.value}</strong>
                  <span className="guest-metric-label">{metric.label}</span>
                </article>
              ))}
            </div>

            <div className="guest-preview-list">
              {GUEST_PREVIEW_ITEMS.map((item) => (
                <article key={item.title} className="guest-preview-item">
                  <div className="guest-preview-dot" aria-hidden="true" />
                  <div className="stack-xs">
                    <strong className="guest-preview-title">
                      {item.title}
                    </strong>
                    <p className="guest-preview-meta">{item.meta}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="guest-feature-grid">
        {GUEST_FEATURES.map((feature) => (
          <article
            key={feature.title}
            className="glass-card panel guest-feature-card stack-sm"
          >
            <p className="eyebrow">{feature.eyebrow}</p>
            <h3 className="panel-title guest-feature-title">{feature.title}</h3>
            <p className="muted-copy">{feature.copy}</p>
          </article>
        ))}
      </section>

      <section className="glass-card panel guest-journey">
        <div className="stack-xs">
          <p className="eyebrow">How it works</p>
          <h3 className="panel-title">
            Go from invite to active event in minutes.
          </h3>
        </div>

        <div className="guest-journey-grid">
          {GUEST_JOURNEY.map((item) => (
            <article key={item.step} className="guest-journey-step">
              <span className="guest-journey-number">{item.step}</span>
              <div className="stack-xs">
                <strong className="guest-journey-title">{item.title}</strong>
                <p className="guest-journey-copy">{item.copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function MyEventCard({ event }: { event: EventWithRole }) {
  return (
    <Link
      to="/events/$eventId"
      params={{ eventId: event.id }}
      className="event-card-link event-card-slide"
    >
      <article className="event-card">
        <div className="split-header">
          <div className="stack-xs">
            <strong className="info-value">{event.title}</strong>
          </div>
          <div className="stack-xs event-badges">
            <span className="event-badge event-badge-strong event-type-badge">
              <span
                className="event-type-icon"
                aria-hidden="true"
                aria-label={formatEventType(event.type)}
                title={formatEventType(event.type)}
              >
                {getEventTypeIcon(event.type)}
              </span>
            </span>
          </div>
        </div>
        <div className="event-card-footer">
          <span className="field-label">Status: {event.status}</span>
          <span className="field-label">
            Date: {formatDisplayDate(event.event_date, event.created_at)}
          </span>
        </div>
      </article>
    </Link>
  )
}

function DiscoverEventCard({
  event,
  onOpen,
}: {
  event: DashboardData['discoverEvents'][number]
  onOpen: () => void
}) {
  const openLabel = `Open details for ${event.title}`

  return (
    <article className="event-card event-card-slide discover-event-card">
      <div className="discover-event-card-content">
        <div className="stack-xs">
          <div className="discover-event-title-row">
            <span
              className="event-type-icon"
              aria-hidden="true"
              aria-label={formatEventType(event.type)}
              title={formatEventType(event.type)}
            >
              {getEventTypeIcon(event.type)}
            </span>
            <strong className="info-value">{event.title}</strong>
          </div>
        </div>
        <div className="event-card-footer">
          <span className="field-label">Status: {event.status}</span>
          <span className="field-label">
            Date: {formatDisplayDate(event.event_date, event.created_at)}
          </span>
        </div>
      </div>
      <button
        type="button"
        className="discover-event-card-hitarea"
        aria-label={openLabel}
        title={openLabel}
        onClick={onOpen}
      />
      <button
        type="button"
        className="icon-button discover-event-open-button"
        aria-label={openLabel}
        title={openLabel}
        onClick={onOpen}
      >
        <Plus size={18} strokeWidth={2.2} />
      </button>
    </article>
  )
}

function DiscoverEventDrawer({
  event,
  detail,
  detailError,
  isDetailResolved,
  isLoadingDetail,
  isJoining,
  isOnline,
  joinError,
  onClose,
  onJoin,
}: {
  event: DashboardData['discoverEvents'][number] | null
  detail: PublicDiscoverEventDetail | null
  detailError: string | null
  isDetailResolved: boolean
  isLoadingDetail: boolean
  isJoining: boolean
  isOnline: boolean
  joinError: string | null
  onClose: () => void
  onJoin: () => void
}) {
  if (!event) {
    return null
  }

  const resolvedEvent = detail?.event ?? event
  const isUnavailable = isDetailResolved && detail?.event === null
  const organizerLabel = detail?.organizer
    ? getDiscoverOrganizerLabel(detail.organizer)
    : isUnavailable || detailError
      ? '—'
      : isLoadingDetail
        ? 'Loading...'
        : 'Unknown organizer'
  const memberCountLabel =
    typeof detail?.memberCount === 'number'
      ? String(detail.memberCount)
      : isUnavailable || detailError
        ? '—'
        : isLoadingDetail
          ? 'Loading...'
          : '0'

  return (
    <EventDetailDrawer
      isOpen={Boolean(event)}
      eyebrow="Discover event"
      title="Event details"
      onClose={onClose}
    >
      <div className="stack-md">
        <section className="stack-sm">
          <div className="stack-xs">
            <div className="discover-event-title-row">
              <span
                className="event-type-icon"
                aria-hidden="true"
                aria-label={formatEventType(resolvedEvent.type)}
                title={formatEventType(resolvedEvent.type)}
              >
                {getEventTypeIcon(resolvedEvent.type)}
              </span>
              <h4 className="panel-title">{resolvedEvent.title}</h4>
            </div>
            <p className="section-note">
              {resolvedEvent.description ||
                'No description added for this event yet.'}
            </p>
          </div>

          {isUnavailable ? (
            <p className="form-error">This event is no longer available.</p>
          ) : null}
          {detailError ? <p className="field-label">{detailError}</p> : null}
        </section>

        <div className="info-grid discover-event-drawer-meta">
          <InfoItem label="Type" value={formatEventType(resolvedEvent.type)} />
          <InfoItem label="Status" value={resolvedEvent.status} />
          <InfoItem
            label="Date"
            value={formatDisplayDate(
              resolvedEvent.event_date,
              resolvedEvent.created_at,
            )}
          />
          <InfoItem
            label="Visibility"
            value={formatVisibility(resolvedEvent.visibility)}
          />
          <InfoItem label="Organizer" value={organizerLabel} />
          <InfoItem label="Members" value={memberCountLabel} />
        </div>

        {joinError ? <p className="form-error">{joinError}</p> : null}
        {!isOnline ? (
          <p className="field-label">
            Reconnect to join this event. Offline mode keeps existing reads
            available only.
          </p>
        ) : null}

        <div className="actions-row create-drawer-actions">
          <button
            type="button"
            className="primary-button"
            onClick={onJoin}
            disabled={isJoining || !isOnline || isUnavailable}
          >
            {!isOnline
              ? 'Reconnect to join'
              : isJoining
                ? 'Joining...'
                : 'Join event'}
          </button>
        </div>
      </div>
    </EventDetailDrawer>
  )
}

function formatEventType(type: EventType) {
  if (type === 'general') {
    return 'General'
  }

  return type === 'fund_tracker' ? 'Fund Tracker' : 'Random Picker'
}

function formatVisibility(visibility: EventVisibility) {
  return visibility === 'private' ? 'Private' : 'Public'
}

function getEventTypeIcon(type: EventType) {
  if (type === 'general') {
    return '🗓️'
  }

  return type === 'fund_tracker' ? '💸' : '🎲'
}

function formatDisplayDate(eventDate: string, createdAt: string) {
  const eventDateValue = new Date(eventDate)
  const createdDateValue = new Date(createdAt)
  const hasEventDate = !Number.isNaN(eventDateValue.getTime())
  const hasCreatedDate = !Number.isNaN(createdDateValue.getTime())

  const selectedDate = hasEventDate
    ? hasCreatedDate && eventDateValue > createdDateValue
      ? eventDateValue
      : hasCreatedDate
        ? createdDateValue
        : eventDateValue
    : hasCreatedDate
      ? createdDateValue
      : null

  if (!selectedDate) {
    return '—'
  }

  return selectedDate.toLocaleDateString()
}

function getDiscoverOrganizerLabel(organizer: {
  full_name?: string | null
  email?: string | null
}) {
  const fullName = organizer.full_name?.trim()
  const email = organizer.email?.trim()

  if (fullName) {
    return fullName
  }

  if (email) {
    return email
  }

  return 'Unknown organizer'
}

function getTodayDateInputValue() {
  const now = new Date()
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 10)
}
