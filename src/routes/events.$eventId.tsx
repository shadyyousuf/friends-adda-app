import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import AnimatedContentLoader from '../components/AnimatedContentLoader'
import { useAuth } from '../components/AuthProvider'
import {
  eventDetailQueryOptions,
  eventKeys,
  markEventFundPaid,
  demoteEventMemberToMember,
  promoteEventMemberToCoCaptain,
  removeEventMember,
  spinRandomPicker,
  type EventDetailData,
  type EventSubscriberWithProfile,
} from '../utils/events'

export const Route = createFileRoute('/events/$eventId')({
  component: EventDetailPage,
})

function EventDetailPage() {
  const { eventId } = Route.useParams()
  const { user, profile, isLoading } = useAuth()
  const queryClient = useQueryClient()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [billAmount, setBillAmount] = useState('')
  const detailQuery = useQuery({
    ...eventDetailQueryOptions(eventId),
    enabled: Boolean(user && profile?.is_approved),
  })
  const detail: EventDetailData = detailQuery.data ?? {
    event: null,
    subscribers: [],
    funds: [],
    activities: [],
  }
  const detailError =
    detailQuery.error instanceof Error
      ? detailQuery.error.message
      : detailQuery.error
        ? 'Failed to load event detail.'
        : null

  async function handleAction(
    action: 'promote' | 'demote' | 'remove',
    userId: string,
  ) {
    const actionKey = `${action}:${userId}`
    setErrorMessage(null)
    setActiveAction(actionKey)

    try {
      if (action === 'promote') {
        await promoteEventMemberToCoCaptain(eventId, userId)
      } else if (action === 'demote') {
        await demoteEventMemberToMember(eventId, userId)
      } else {
        await removeEventMember(eventId, userId)
      }

      await queryClient.invalidateQueries({
        queryKey: eventKeys.detail(eventId),
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to update event members.',
      )
    } finally {
      setActiveAction(null)
    }
  }

  if (isLoading) {
    return <AnimatedContentLoader isVisible mode="panel" title="Loading event" copy="Checking your session and event access." />
  }

  if (!user) {
    return (
      <section className="glass-card panel stack-md">
        <p className="eyebrow">Event</p>
        <h2 className="panel-title">Login required</h2>
        <p className="muted-copy">
          Sign in before opening event details.
        </p>
        <div className="actions-row">
          <Link to="/login" className="primary-button">
            Log in
          </Link>
          <Link to="/" className="secondary-button">
            Back to dashboard
          </Link>
        </div>
      </section>
    )
  }

  if (detailQuery.isPending && !detail.event) {
    return <AnimatedContentLoader isVisible mode="panel" title="Loading event" copy="Fetching the event overview and member data." />
  }

  if (!detail.event && !detailQuery.isPending) {
    return (
      <section className="glass-card panel stack-md">
        <p className="eyebrow">Event</p>
        <h2 className="panel-title">Event not found</h2>
        <p className="muted-copy">
          The event could not be loaded, or your account does not have access to
          it.
        </p>
        <Link to="/" className="secondary-button">
          Back to dashboard
        </Link>
      </section>
    )
  }

  const event = detail.event
  const currentSubscriber = detail.subscribers.find(
    (subscriber) => subscriber.user_id === user.id,
  )
  const canManageMembers =
    profile?.role === 'admin' || currentSubscriber?.event_role === 'captain'
  const canRunModules =
    profile?.role === 'admin' ||
    currentSubscriber?.event_role === 'captain' ||
    currentSubscriber?.event_role === 'co-captain'

  return (
    <div className="stack-lg">
      <section className="glass-card panel stack-md">
        <div className="split-header">
          <div className="section-header-copy">
            <p className="eyebrow">Event detail</p>
            <h2 className="panel-title">{event?.title ?? 'Loading...'}</h2>
            <p className="section-note">
              Track the event hierarchy and the active module without leaving
              the page.
            </p>
          </div>
          <Link to="/" className="secondary-button">
            Back
          </Link>
        </div>
        <p className="muted-copy">
          {event?.description || 'No description added for this event yet.'}
        </p>
        <div className="info-grid">
          <InfoItem label="Type" value={formatEventType(event?.type)} />
          <InfoItem label="Privacy" value={formatVisibility(event?.visibility)} />
          <InfoItem label="Status" value={event?.status ?? 'unknown'} />
          <InfoItem
            label="Members"
            value={String(detail.subscribers.length)}
          />
        </div>
        {detailError ? <p className="form-error">{detailError}</p> : null}
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      </section>

      <section className="glass-card panel stack-md">
        <div className="split-header">
          <div className="section-header-copy">
            <p className="eyebrow">Members</p>
            <h3 className="section-title">Event hierarchy</h3>
          </div>
          {canManageMembers ? (
            <button
              type="button"
              className="secondary-button"
              onClick={() => setIsDrawerOpen(true)}
            >
              <Users size={16} />
              Manage
            </button>
          ) : (
            <span className="status-chip">{detail.subscribers.length} members</span>
          )}
        </div>
        <div className="stack-sm">
          {detail.subscribers.map((subscriber) => (
            <SubscriberPreview
              key={subscriber.user_id}
              subscriber={subscriber}
              isCurrentUser={subscriber.user_id === user.id}
            />
          ))}
        </div>
      </section>

      {event?.type === 'fund_tracker' ? (
        <FundTrackerModule
          eventId={eventId}
          detail={detail}
          canMarkPaid={Boolean(canRunModules)}
          activeAction={activeAction}
          onMarkPaid={(userId) => void handleModuleAction(`fund:${userId}`, async () => {
            await markEventFundPaid(eventId, userId)
            await queryClient.invalidateQueries({
              queryKey: eventKeys.detail(eventId),
            })
          })}
        />
      ) : null}

      {event?.type === 'random_picker' ? (
        <RandomPickerModule
          detail={detail}
          billAmount={billAmount}
          setBillAmount={setBillAmount}
          canSpin={Boolean(canRunModules)}
          activeAction={activeAction}
          onSpin={(event) => void handleSpin(event)}
        />
      ) : null}

      {isDrawerOpen ? (
        <section className="drawer-overlay" onClick={() => setIsDrawerOpen(false)}>
          <div
            className="glass-card create-drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawer-handle" aria-hidden="true" />
            <div className="split-header">
              <div className="section-header-copy">
                <p className="eyebrow">Member management</p>
                <h3 className="section-title">Captain and admin controls</h3>
                <p className="section-note">
                  Promote members to co-captain, demote them back to member, or
                  remove them from the event.
                </p>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setIsDrawerOpen(false)}
              >
                Close
              </button>
            </div>

            <p className="drawer-footer-note">
              Non-admins cannot demote or remove the captain, and captains
              cannot remove themselves.
            </p>

            <p className="muted-copy">
              Each action is applied immediately and refreshes the event detail
              state after completion.
            </p>

            <div className="stack-sm">
              {detail.subscribers.map((subscriber) => (
                <MemberManagementCard
                  key={subscriber.user_id}
                  subscriber={subscriber}
                  canManageMembers={Boolean(canManageMembers)}
                  isAdmin={profile?.role === 'admin'}
                  isCurrentUser={subscriber.user_id === user.id}
                  activeAction={activeAction}
                  onPromote={() => void handleAction('promote', subscriber.user_id)}
                  onDemote={() => void handleAction('demote', subscriber.user_id)}
                  onRemove={() => void handleAction('remove', subscriber.user_id)}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )

  async function handleModuleAction(actionKey: string, action: () => Promise<void>) {
    setErrorMessage(null)
    setActiveAction(actionKey)

    try {
      await action()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to update event module.',
      )
    } finally {
      setActiveAction(null)
    }
  }

  async function handleSpin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const amount = Number(billAmount)

    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage('Enter a valid bill amount before spinning.')
      return
    }

    await handleModuleAction('spin', async () => {
      await spinRandomPicker(eventId, amount)
      setBillAmount('')
      await queryClient.invalidateQueries({
        queryKey: eventKeys.detail(eventId),
      })
    })
  }
}

function SubscriberPreview({
  subscriber,
  isCurrentUser,
}: {
  subscriber: EventSubscriberWithProfile
  isCurrentUser: boolean
}) {
  return (
    <article className="member-card">
      <div className="stack-xs">
        <strong className="info-value">
          {subscriber.profiles.full_name || 'Unnamed member'}
        </strong>
        <span className="muted-copy">{subscriber.profiles.email}</span>
      </div>
      <div className="member-card-meta">
        {isCurrentUser ? (
          <span className="event-badge">You</span>
        ) : null}
        <span className="event-badge event-badge-strong">
          {formatEventRole(subscriber.event_role)}
        </span>
      </div>
    </article>
  )
}

function MemberManagementCard({
  subscriber,
  canManageMembers,
  isAdmin,
  isCurrentUser,
  activeAction,
  onPromote,
  onDemote,
  onRemove,
}: {
  subscriber: EventSubscriberWithProfile
  canManageMembers: boolean
  isAdmin: boolean
  isCurrentUser: boolean
  activeAction: string | null
  onPromote: () => void
  onDemote: () => void
  onRemove: () => void
}) {
  const canPromote =
    canManageMembers && subscriber.event_role === 'member' && !isCurrentUser
  const canDemote =
    canManageMembers &&
    subscriber.event_role === 'co-captain' &&
    (!isCurrentUser || isAdmin)
  const canRemove =
    canManageMembers &&
    subscriber.event_role !== 'captain' &&
    (!isCurrentUser || isAdmin)

  return (
    <article className="admin-user-card">
      <div className="stack-xs">
        <strong className="info-value">
          {subscriber.profiles.full_name || 'Unnamed member'}
        </strong>
        <span className="muted-copy">{subscriber.profiles.email}</span>
        <span className="field-label">
          Blood group: {subscriber.profiles.blood_group ?? 'Not set'}
        </span>
        <span className="field-label">
          Event role: {formatEventRole(subscriber.event_role)}
        </span>
      </div>
      <div className="actions-row">
        {canPromote ? (
          <button
            type="button"
            className="primary-button"
            onClick={onPromote}
            disabled={activeAction === `promote:${subscriber.user_id}`}
          >
            {activeAction === `promote:${subscriber.user_id}`
              ? 'Promoting...'
              : 'Promote'}
          </button>
        ) : null}
        {canDemote ? (
          <button
            type="button"
            className="secondary-button"
            onClick={onDemote}
            disabled={activeAction === `demote:${subscriber.user_id}`}
          >
            {activeAction === `demote:${subscriber.user_id}`
              ? 'Demoting...'
              : 'Demote'}
          </button>
        ) : null}
        {canRemove ? (
          <button
            type="button"
            className="danger-button"
            onClick={onRemove}
            disabled={activeAction === `remove:${subscriber.user_id}`}
          >
            {activeAction === `remove:${subscriber.user_id}`
              ? 'Removing...'
              : 'Remove'}
          </button>
        ) : null}
      </div>
    </article>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-card">
      <span className="info-label">{label}</span>
      <strong className="info-value">{value}</strong>
    </div>
  )
}

function FundTrackerModule({
  eventId,
  detail,
  canMarkPaid,
  activeAction,
  onMarkPaid,
}: {
  eventId: string
  detail: EventDetailData
  canMarkPaid: boolean
  activeAction: string | null
  onMarkPaid: (userId: string) => void
}) {
  const fundMap = new Map(detail.funds.map((fund) => [fund.user_id, fund]))
  const targetTotal = detail.funds.reduce((sum, fund) => sum + Number(fund.amount), 0)
  const collectedTotal = detail.funds
    .filter((fund) => fund.status === 'paid')
    .reduce((sum, fund) => sum + Number(fund.amount), 0)

  return (
    <section className="glass-card panel stack-md">
      <div className="section-header-copy">
        <p className="eyebrow">Fund tracker</p>
        <h3 className="section-title">Target vs collected</h3>
        <p className="module-note">
          Track who still owes money and mark paid entries directly from the
          member list.
        </p>
      </div>
      <div className="info-grid">
        <InfoItem label="Target total" value={formatMoney(targetTotal)} />
        <InfoItem label="Collected" value={formatMoney(collectedTotal)} />
        <InfoItem label="Pending entries" value={String(detail.funds.filter((fund) => fund.status === 'pending').length)} />
        <InfoItem label="Event id" value={eventId.slice(0, 8)} />
      </div>
      {!canMarkPaid ? (
        <p className="module-note">
          Only captains, co-captains, and app admins can mark funds as paid.
        </p>
      ) : null}
      <div className="stack-sm">
        {detail.subscribers.map((subscriber) => {
          const fund = fundMap.get(subscriber.user_id)

          return (
            <article key={subscriber.user_id} className="admin-user-card">
              <div className="stack-xs">
                <strong className="info-value">
                  {subscriber.profiles.full_name || 'Unnamed member'}
                </strong>
                <span className="muted-copy">{subscriber.profiles.email}</span>
                <span className="field-label">
                  Amount: {formatMoney(Number(fund?.amount ?? 0))}
                </span>
                <span className="field-label">
                  Status: {fund?.status ?? 'No fund entry'}
                </span>
              </div>
              {canMarkPaid && fund?.status === 'pending' ? (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => onMarkPaid(subscriber.user_id)}
                  disabled={activeAction === `fund:${subscriber.user_id}`}
                >
                  {activeAction === `fund:${subscriber.user_id}`
                    ? 'Updating...'
                    : 'Mark as paid'}
                </button>
              ) : (
                <span className="event-badge event-badge-strong">
                  {fund?.status === 'paid' ? 'Paid' : 'Pending'}
                </span>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function RandomPickerModule({
  detail,
  billAmount,
  setBillAmount,
  canSpin,
  activeAction,
  onSpin,
}: {
  detail: EventDetailData
  billAmount: string
  setBillAmount: (value: string) => void
  canSpin: boolean
  activeAction: string | null
  onSpin: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <section className="glass-card panel stack-md">
      <div className="section-header-copy">
        <p className="eyebrow">Random picker</p>
        <h3 className="section-title">Spin to choose who pays</h3>
        <p className="module-note">
          Record every random pick so the group has a visible payment trail.
        </p>
      </div>

      <form className="stack-md" onSubmit={onSpin}>
        <label className="stack-xs">
          <span className="field-label">Bill amount</span>
          <input
            type="number"
            min="1"
            step="0.01"
            className="field-input"
            value={billAmount}
            onChange={(event) => setBillAmount(event.target.value)}
            placeholder="500"
          />
        </label>
        <button
          type="submit"
          className="primary-button spin-button"
          disabled={!canSpin || activeAction === 'spin'}
        >
          {activeAction === 'spin' ? 'Picking...' : 'Spin / Pick'}
        </button>
        {!canSpin ? (
          <p className="module-note">
            Only captains, co-captains, and app admins can spin the picker.
          </p>
        ) : null}
      </form>

      <div className="stack-sm">
        {detail.activities.length === 0 ? (
          <p className="muted-copy">No random picks have been recorded yet.</p>
        ) : (
          detail.activities.map((activity) => {
            const winnerId =
              activity.payload &&
              typeof activity.payload === 'object' &&
              'winner' in activity.payload
                ? String(activity.payload.winner)
                : null
            const amount =
              activity.payload &&
              typeof activity.payload === 'object' &&
              'amount' in activity.payload
                ? Number(activity.payload.amount)
                : 0
            const winner = detail.subscribers.find(
              (subscriber) => subscriber.user_id === winnerId,
            )

            return (
              <article key={activity.id} className="event-card">
                <div className="split-header">
                  <strong className="info-value">
                    {winner?.profiles.full_name || 'Unknown member'}
                  </strong>
                  <span className="event-badge">{formatMoney(amount)}</span>
                </div>
                <span className="muted-copy">
                  Picked at {new Date(activity.created_at).toLocaleString()}
                </span>
              </article>
            )
          })
        )}
      </div>
    </section>
  )
}

function formatEventType(type?: string) {
  if (type === 'random_picker') {
    return 'Random Picker'
  }

  if (type === 'fund_tracker') {
    return 'Fund Tracker'
  }

  return 'Unknown'
}

function formatVisibility(visibility?: string) {
  if (visibility === 'private') {
    return 'Private'
  }

  if (visibility === 'public') {
    return 'Public'
  }

  return 'Unknown'
}

function formatEventRole(role: EventSubscriberWithProfile['event_role']) {
  if (role === 'co-captain') {
    return 'Co-Captain'
  }

  if (role === 'captain') {
    return 'Captain'
  }

  return 'Member'
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)
}
