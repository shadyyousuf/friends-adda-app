import { Link, createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import AnimatedContentLoader from '../components/AnimatedContentLoader'
import { useAuth } from '../components/AuthProvider'
import {
  createEventWithCaptain,
  dashboardQueryOptions,
  eventKeys,
  joinPublicEvent,
  type DashboardData,
  type EventType,
  type EventVisibility,
  type EventWithRole,
} from '../utils/events'
import { DASHBOARD_REFRESH_EVENT } from '../utils/ui-events'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { user, profile, isLoading } = useAuth()
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventType, setEventType] = useState<EventType>('general')
  const [eventDate, setEventDate] = useState(() => getTodayDateInputValue())
  const [visibility, setVisibility] = useState<EventVisibility>('public')
  const [targetAmount, setTargetAmount] = useState('')
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [activeJoinEventId, setActiveJoinEventId] = useState<string | null>(null)

  const canLoadDashboard = Boolean(user && profile?.is_approved)
  const dashboardQuery = useQuery({
    ...dashboardQueryOptions(),
    enabled: canLoadDashboard,
  })
  const dashboardData: DashboardData = dashboardQuery.data ?? {
    myEvents: [],
    discoverEvents: [],
  }
  const dashboardError =
    dashboardQuery.error instanceof Error
      ? dashboardQuery.error.message
      : dashboardQuery.error
        ? 'Failed to load dashboard.'
        : null
  const isDashboardLoading =
    dashboardQuery.isPending || dashboardQuery.isRefetching

  useEffect(() => {
    function handleDashboardRefresh() {
      void dashboardQuery.refetch()
    }

    window.addEventListener(DASHBOARD_REFRESH_EVENT, handleDashboardRefresh)

    return () => {
      window.removeEventListener(DASHBOARD_REFRESH_EVENT, handleDashboardRefresh)
    }
  }, [dashboardQuery])

  function openCreateDrawer() {
    setTitle('')
    setDescription('')
    setEventType('general')
    setEventDate(getTodayDateInputValue())
    setVisibility('public')
    setTargetAmount('')
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

      if (
        eventType === 'fund_tracker' &&
        normalizedTargetAmount !== null &&
        (!Number.isFinite(normalizedTargetAmount) || normalizedTargetAmount <= 0)
      ) {
        throw new Error('Target amount must be greater than zero.')
      }

      await createEventWithCaptain({
        title,
        description,
        type: eventType,
        eventDate,
        visibility,
        targetAmount: normalizedTargetAmount,
      })
      setTitle('')
      setDescription('')
      setEventType('general')
      setEventDate(getTodayDateInputValue())
      setVisibility('public')
      setTargetAmount('')
      setIsCreateOpen(false)
      await queryClient.invalidateQueries({ queryKey: eventKeys.dashboard })
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : 'Failed to create event.',
      )
    } finally {
      setIsCreatingEvent(false)
    }
  }

  async function handleJoinEvent(eventId: string) {
    setJoinError(null)
    setActiveJoinEventId(eventId)

    try {
      await joinPublicEvent(eventId)
      await queryClient.invalidateQueries({ queryKey: eventKeys.dashboard })
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : 'Failed to join event.')
    } finally {
      setActiveJoinEventId(null)
    }
  }

  if (isLoading) {
    return <AnimatedContentLoader isVisible mode="panel" />
  }

  if (!user) {
    return (
      <div className="stack-lg">
        <section className="glass-card panel hero-panel">
          <p className="eyebrow">Group management</p>
          <h2 className="hero-title">Friends Adda keeps events, money, and roles in one place.</h2>
          <div className="actions-row">
            <Link to="/signup" className="primary-button">
              Create account
            </Link>
            <Link to="/login" className="secondary-button">
              Log in
            </Link>
          </div>
        </section>
      </div>
    )
  }

  if (!profile?.is_approved) {
    return null
  }

  if (dashboardQuery.isPending && dashboardData.myEvents.length === 0) {
    return <AnimatedContentLoader isVisible mode="panel" />
  }

  return (
    <div className="stack-lg">
      {dashboardError || joinError ? (
        <section className="glass-card panel stack-md">
          {dashboardError ? <p className="form-error">{dashboardError}</p> : null}
          {joinError ? <p className="form-error">{joinError}</p> : null}
        </section>
      ) : null}

      <section className="glass-card panel stack-md">
        <div className="split-header">
          <div className="section-header-copy">
            <p className="eyebrow">My events</p>
            <h3 className="section-title">Subscribed and active</h3>
          </div>
          <span className="status-chip">{dashboardData.myEvents.length}</span>
        </div>

        {dashboardData.myEvents.length === 0 ? (
          <div className="empty-state">
            <h4 className="empty-state-title">No active events yet</h4>
            <div className="actions-row">
              <button
                type="button"
                className="primary-button"
                onClick={openCreateDrawer}
              >
                Create your first event
              </button>
            </div>
          </div>
        ) : (
          <div className="stack-sm">
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
            <h3 className="section-title">Public events you can join</h3>
          </div>
          <span className="status-chip">{dashboardData.discoverEvents.length}</span>
        </div>

        {dashboardData.discoverEvents.length === 0 ? (
          <div className="empty-state">
            <h4 className="empty-state-title">Nothing open right now</h4>
          </div>
        ) : (
          <div className="stack-sm">
            {dashboardData.discoverEvents.map((event) => (
              <DiscoverEventCard
                key={event.id}
                event={event}
                isJoining={activeJoinEventId === event.id}
                onJoin={() => void handleJoinEvent(event.id)}
              />
            ))}
          </div>
        )}
      </section>

      {isCreateOpen ? (
        <section className="drawer-overlay" onClick={() => setIsCreateOpen(false)}>
          <div
            className="glass-card create-drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawer-handle" aria-hidden="true" />
            <div className="split-header">
              <div className="section-header-copy">
                <p className="eyebrow">Create event</p>
                <h3 className="section-title">New event</h3>
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
                  onChange={(event) => setEventType(event.target.value as EventType)}
                >
                  <option value="general">General</option>
                  <option value="fund_tracker">Fund tracker</option>
                  <option value="random_picker">Random picker</option>
                </select>
              </label>

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

              {eventType === 'fund_tracker' ? (
                <label className="stack-xs">
                  <span className="field-label">Target amount (optional)</span>
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
              ) : null}

              {createError ? <p className="form-error">{createError}</p> : null}

              <div className="actions-row">
                <button
                  type="submit"
                  className="primary-button"
                  disabled={isCreatingEvent}
                >
                  {isCreatingEvent ? 'Creating...' : 'Create event'}
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

      <button
        type="button"
        className="fab-button"
        onClick={openCreateDrawer}
        aria-label="Create event"
        title="Create event"
      >
        <Plus size={22} />
      </button>
    </div>
  )
}

function MyEventCard({ event }: { event: EventWithRole }) {
  return (
    <Link to="/events/$eventId" params={{ eventId: event.id }} className="event-card-link">
      <article className="event-card">
        <div className="split-header">
          <div className="stack-xs">
            <strong className="info-value">{event.title}</strong>
          </div>
          <div className="stack-xs event-badges">
            <span className="event-badge">{formatEventType(event.type)}</span>
            <span className="event-badge event-badge-strong">
              {formatEventRole(event.event_role)}
            </span>
          </div>
        </div>
        <div className="meta-row">
          <span className="field-label">Visibility: {event.visibility}</span>
          <span className="field-label">Status: {event.status}</span>
          <span className="field-label">
            Event date: {new Date(event.event_date).toLocaleDateString()}
          </span>
          <span className="field-label">
            Created: {new Date(event.created_at).toLocaleDateString()}
          </span>
        </div>
      </article>
    </Link>
  )
}

function DiscoverEventCard({
  event,
  isJoining,
  onJoin,
}: {
  event: DashboardData['discoverEvents'][number]
  isJoining: boolean
  onJoin: () => void
}) {
  return (
    <article className="event-card">
        <div className="split-header">
          <div className="stack-xs">
            <strong className="info-value">{event.title}</strong>
          </div>
        <span className="event-badge">{formatEventType(event.type)}</span>
      </div>
      <div className="card-tag-row">
        <span className="field-label">Visibility: public</span>
        <span className="field-label">Status: {event.status}</span>
        <span className="field-label">
          Event date: {new Date(event.event_date).toLocaleDateString()}
        </span>
      </div>
      <div className="actions-row">
        <button
          type="button"
          className="primary-button"
          onClick={onJoin}
          disabled={isJoining}
        >
          {isJoining ? 'Joining...' : 'Join'}
        </button>
      </div>
    </article>
  )
}

function formatEventType(type: EventType) {
  if (type === 'general') {
    return 'General'
  }

  return type === 'fund_tracker' ? 'Fund Tracker' : 'Random Picker'
}

function getTodayDateInputValue() {
  const now = new Date()
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 10)
}

function formatEventRole(role: EventWithRole['event_role']) {
  if (role === 'co-captain') {
    return 'Co-Captain'
  }

  if (role === 'captain') {
    return 'Captain'
  }

  return 'Member'
}
