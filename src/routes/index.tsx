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
  const [eventType, setEventType] = useState<EventType>('fund_tracker')
  const [visibility, setVisibility] = useState<EventVisibility>('public')
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

  async function handleCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreateError(null)
    setIsCreatingEvent(true)

    try {
      await createEventWithCaptain({
        title,
        description,
        type: eventType,
        visibility,
      })
      setTitle('')
      setDescription('')
      setEventType('fund_tracker')
      setVisibility('public')
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
    return <AnimatedContentLoader isVisible mode="panel" title="Loading your account" copy="Establishing your auth session and profile state." />
  }

  if (!user) {
    return (
      <div className="stack-lg">
        <section className="glass-card panel hero-panel">
          <p className="eyebrow">Group management</p>
          <h2 className="hero-title">
            Friends Adda keeps events, money, and roles in one place.
          </h2>
          <p className="muted-copy">
            Sign in if you already have an account, or create one and wait for
            admin approval before joining events.
          </p>
          <div className="actions-row">
            <Link to="/signup" className="primary-button">
              Create account
            </Link>
            <Link to="/login" className="secondary-button">
              Log in
            </Link>
          </div>
        </section>

        <section className="glass-card panel stack-md">
          <p className="eyebrow">Phase 5</p>
          <h3 className="panel-title">Event workflows are ready after sign-in</h3>
          <ul className="feature-list">
            <li>Dashboard event lists</li>
            <li>Public event discovery</li>
            <li>Create-event drawer</li>
            <li>Join flow for open public events</li>
          </ul>
        </section>
      </div>
    )
  }

  if (!profile?.is_approved) {
    return null
  }

  if (dashboardQuery.isPending && dashboardData.myEvents.length === 0) {
    return <AnimatedContentLoader isVisible mode="panel" title="Loading your events" copy="Fetching your subscribed events and the latest public events." />
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
            <p className="muted-copy">
              Create a new event to become the captain, or join an open public
              event from the discover section below.
            </p>
            <div className="actions-row">
              <button
                type="button"
                className="primary-button"
                onClick={() => setIsCreateOpen(true)}
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
            <p className="muted-copy">
              Public events will appear here once another approved member opens
              one up for the group.
            </p>
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
                <h3 className="section-title">Start a new group activity</h3>
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
                <span className="field-label">Title</span>
                <input
                  required
                  type="text"
                  className="field-input"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Friday cricket fund"
                />
              </label>

              <label className="stack-xs">
                <span className="field-label">Description</span>
                <textarea
                  className="field-input field-textarea"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Short context for the group"
                />
              </label>

              <label className="stack-xs">
                <span className="field-label">Type</span>
                <select
                  className="field-input"
                  value={eventType}
                  onChange={(event) => setEventType(event.target.value as EventType)}
                >
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
        onClick={() => setIsCreateOpen(true)}
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
            <span className="muted-copy">
              {event.description || 'No description yet.'}
            </span>
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
          <span className="muted-copy">
            {event.description || 'No description yet.'}
          </span>
        </div>
        <span className="event-badge">{formatEventType(event.type)}</span>
      </div>
      <div className="card-tag-row">
        <span className="field-label">Visibility: public</span>
        <span className="field-label">Status: {event.status}</span>
      </div>
      <div className="actions-row">
        <span className="inline-note">Open to approved members right now.</span>
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
  return type === 'fund_tracker' ? 'Fund Tracker' : 'Random Picker'
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
