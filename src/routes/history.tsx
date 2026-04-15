import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../components/AuthProvider'
import {
  completedEventsQueryOptions,
  type EventWithRole,
} from '../utils/events'

export const Route = createFileRoute('/history')({
  component: HistoryPage,
})

function HistoryPage() {
  const { user, profile, isLoading } = useAuth()
  const historyQuery = useQuery({
    ...completedEventsQueryOptions(),
    enabled: Boolean(user && profile?.is_approved),
  })
  const events: EventWithRole[] = historyQuery.data ?? []
  const errorMessage =
    historyQuery.error instanceof Error
      ? historyQuery.error.message
      : historyQuery.error
        ? 'Failed to load history.'
        : null

  if (isLoading) {
    return (
      <section className="glass-card panel stack-md">
        <p className="eyebrow">History</p>
        <h2 className="panel-title">Loading history</h2>
        <p className="muted-copy">Checking your session first.</p>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="glass-card panel stack-md">
        <p className="eyebrow">History</p>
        <h2 className="panel-title">Login required</h2>
        <p className="muted-copy">Sign in to review completed events.</p>
      </section>
    )
  }

  return (
    <div className="stack-lg">
      <section className="glass-card panel stack-md">
        <div className="split-header">
          <div className="stack-xs">
            <p className="eyebrow">History</p>
            <h2 className="panel-title">Completed events</h2>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => void historyQuery.refetch()}
            disabled={historyQuery.isPending || historyQuery.isRefetching}
          >
            {historyQuery.isPending || historyQuery.isRefetching
              ? 'Refreshing...'
              : 'Refresh'}
          </button>
        </div>
        <p className="muted-copy">
          This list only includes completed events where you were a subscriber.
        </p>
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      </section>

      <section className="glass-card panel stack-md">
        <div className="split-header">
          <h3 className="section-title">Timeline</h3>
          <span className="status-chip">{events.length}</span>
        </div>

        {historyQuery.isPending && events.length === 0 ? (
          <p className="muted-copy">Loading completed events.</p>
        ) : events.length === 0 ? (
          <p className="muted-copy">
            No completed events are available yet.
          </p>
        ) : (
          <div className="history-timeline">
            {events.map((event) => (
              <Link
                key={event.id}
                to="/events/$eventId"
                params={{ eventId: event.id }}
                className="history-item"
              >
                <div className="history-dot" />
                <div className="history-content">
                  <div className="split-header">
                    <strong className="info-value">{event.title}</strong>
                    <span className="event-badge">{formatEventType(event.type)}</span>
                  </div>
                  <p className="muted-copy">
                    {event.description || 'No description saved for this event.'}
                  </p>
                  <div className="meta-row">
                    <span className="field-label">
                      Role: {formatEventRole(event.event_role)}
                    </span>
                    <span className="field-label">
                      Visibility: {event.visibility}
                    </span>
                    <span className="field-label">
                      Created: {new Date(event.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function formatEventType(type: EventWithRole['type']) {
  return type === 'random_picker' ? 'Random Picker' : 'Fund Tracker'
}

function formatEventRole(role: EventWithRole['event_role']) {
  if (role === 'captain') {
    return 'Captain'
  }

  if (role === 'co-captain') {
    return 'Co-Captain'
  }

  return 'Member'
}
