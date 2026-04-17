import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Crown,
  Target,
  Users,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type TouchEvent,
} from 'react'
import AnimatedContentLoader from '../components/AnimatedContentLoader'
import { useAuth } from '../components/AuthProvider'
import {
  buildFundStatusItems,
  buildLeaderboard,
  buildMemberTimeline,
  calculateMonthlyProgress,
  DEFAULT_MONTHLY_AMOUNT,
  formatPeriodLabel,
  getAvatarGradient,
  getCurrentPeriod,
  getMemberName,
  getRecentPeriods,
  MONTH_NAMES,
  parsePeriodKey,
  periodKey,
  sumAllPaid,
} from '../utils/fund-tracker'
import {
  demoteEventMemberToMember,
  eventDetailQueryOptions,
  eventKeys,
  promoteEventMemberToCoCaptain,
  removeEventMember,
  spinRandomPicker,
  type EventDetailData,
  type EventSubscriberWithProfile,
  upsertEventFundPayment,
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
  const [selectedPeriodKey, setSelectedPeriodKey] = useState(() =>
    periodKey(getCurrentPeriod()),
  )
  const [paymentDrawerUserId, setPaymentDrawerUserId] = useState<string | null>(
    null,
  )
  const [paymentAmount, setPaymentAmount] = useState(
    String(DEFAULT_MONTHLY_AMOUNT),
  )
  const [historyUserId, setHistoryUserId] = useState<string | null>(null)
  const touchStartXRef = useRef<number | null>(null)

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

  const selectedPeriod = parsePeriodKey(selectedPeriodKey)
  const selectedPeriodLabel = formatPeriodLabel(selectedPeriod)
  const selectedMonthLabel = MONTH_NAMES[selectedPeriod.month - 1]
  const fundPeriods = getRecentPeriods(12)
  const selectedPeriodIndex = fundPeriods.findIndex(
    (period) => periodKey(period) === selectedPeriodKey,
  )
  const currentSubscriber = detail.subscribers.find(
    (subscriber) => subscriber.user_id === user?.id,
  )
  const canManageMembers =
    profile?.role === 'admin' || currentSubscriber?.event_role === 'captain'
  const canRunModules =
    profile?.role === 'admin' ||
    currentSubscriber?.event_role === 'captain' ||
    currentSubscriber?.event_role === 'co-captain'
  const fundStatusItems = buildFundStatusItems(
    detail.subscribers,
    detail.funds,
    selectedPeriod,
  )
  const monthlyProgress = calculateMonthlyProgress(fundStatusItems)
  const leaderboard = buildLeaderboard(detail.subscribers, detail.funds)
  const totalPaid = sumAllPaid(detail.funds)
  const animatedTotalPaid = useAnimatedNumber(totalPaid)
  const selectedHistoryMember =
    detail.subscribers.find((subscriber) => subscriber.user_id === historyUserId) ??
    null
  const historyTimeline =
    detail.event && selectedHistoryMember
      ? buildMemberTimeline(
          selectedHistoryMember,
          detail.funds,
        )
      : []
  const paymentMember =
    detail.subscribers.find(
      (subscriber) => subscriber.user_id === paymentDrawerUserId,
    ) ?? null

  useEffect(() => {
    if (selectedPeriodIndex === -1) {
      setSelectedPeriodKey(periodKey(fundPeriods[0]))
    }
  }, [fundPeriods, selectedPeriodIndex])

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

  async function handlePaymentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!paymentDrawerUserId) {
      return
    }

    const amount = Number(paymentAmount)

    if (!Number.isFinite(amount) || amount < DEFAULT_MONTHLY_AMOUNT) {
      setErrorMessage(
        `Amount must be at least ${formatMoney(DEFAULT_MONTHLY_AMOUNT)}.`,
      )
      return
    }

    await handleModuleAction(`payment:${paymentDrawerUserId}`, async () => {
      await upsertEventFundPayment({
        eventId,
        userId: paymentDrawerUserId,
        amount,
        month: selectedPeriod.month,
        year: selectedPeriod.year,
      })
      setPaymentDrawerUserId(null)
      setPaymentAmount(String(DEFAULT_MONTHLY_AMOUNT))
      await queryClient.invalidateQueries({
        queryKey: eventKeys.detail(eventId),
      })
    })
  }

  function openPaymentDrawer(userId: string) {
    setPaymentDrawerUserId(userId)
    setPaymentAmount(String(DEFAULT_MONTHLY_AMOUNT))
    setErrorMessage(null)
  }

  function goToOlderMonth() {
    if (selectedPeriodIndex === -1 || selectedPeriodIndex >= fundPeriods.length - 1) {
      return
    }

    setSelectedPeriodKey(periodKey(fundPeriods[selectedPeriodIndex + 1]))
  }

  function goToNewerMonth() {
    if (selectedPeriodIndex <= 0) {
      return
    }

    setSelectedPeriodKey(periodKey(fundPeriods[selectedPeriodIndex - 1]))
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    touchStartXRef.current = event.touches[0]?.clientX ?? null
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    if (touchStartXRef.current === null) {
      return
    }

    const touchEndX = event.changedTouches[0]?.clientX ?? touchStartXRef.current
    const deltaX = touchEndX - touchStartXRef.current
    touchStartXRef.current = null

    if (deltaX <= -50) {
      goToNewerMonth()
      return
    }

    if (deltaX >= 50) {
      goToOlderMonth()
    }
  }

  if (isLoading) {
    return (
      <AnimatedContentLoader
        isVisible
        mode="panel"
        title="Loading event"
        copy="Checking your session and event access."
      />
    )
  }

  if (!user) {
    return (
      <section className="glass-card panel stack-md">
        <p className="eyebrow">Event</p>
        <h2 className="panel-title">Login required</h2>
        <p className="muted-copy">Sign in before opening event details.</p>
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
    return (
      <AnimatedContentLoader
        isVisible
        mode="panel"
        title="Loading event"
        copy="Fetching the event overview and member data."
      />
    )
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

  return (
    <div className="stack-lg">
      <section className="glass-card panel stack-md">
        <div className="split-header">
          <div className="section-header-copy">
            <p className="eyebrow">Event detail</p>
            <h2 className="panel-title">{event?.title ?? 'Loading...'}</h2>
            <p className="section-note">
              Track the event hierarchy and the active module without leaving the
              page.
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
          <InfoItem label="Members" value={String(detail.subscribers.length)} />
        </div>
        {event?.type === 'fund_tracker' ? (
          <div className="meta-row">
            <span className="event-badge">
              Target:{' '}
              {event.target_amount ? formatMoney(event.target_amount) : 'Optional'}
            </span>
            <span className="event-badge">
              Default monthly: {formatMoney(DEFAULT_MONTHLY_AMOUNT)}
            </span>
          </div>
        ) : null}
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
        <section
          className="fund-tracker-layout"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <section
            className="glass-card panel stack-md fade-in-up"
            style={{ animationDelay: '0.05s' }}
          >
            <div className="fund-total-card">
              <div className="section-header-copy">
                <p className="eyebrow">Money tracker</p>
                <h3 className="section-title">All-time collected fund</h3>
              </div>
              <div className="fund-total-value">{formatMoney(animatedTotalPaid)}</div>
              <div className="fund-total-meta">
                <span className="event-badge">
                  <Users size={14} />
                  {detail.subscribers.length} members
                </span>
                <span className="event-badge">
                  <Target size={14} />
                  {event.target_amount
                    ? formatMoney(event.target_amount)
                    : 'No target set'}
                </span>
                <span className="event-badge">
                  Monthly default {formatMoney(DEFAULT_MONTHLY_AMOUNT)}
                </span>
              </div>
            </div>
          </section>

          <section
            className="glass-card panel stack-md fade-in-up"
            style={{ animationDelay: '0.1s' }}
          >
            <div className="split-header">
              <div className="section-header-copy">
                <p className="eyebrow">Monthly progress</p>
                <h3 className="section-title">{selectedPeriodLabel}</h3>
              </div>
              <div className="period-controls">
                <button
                  type="button"
                  className="topbar-action-button"
                  onClick={goToOlderMonth}
                  disabled={selectedPeriodIndex >= fundPeriods.length - 1}
                  aria-label="Previous month"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  className="topbar-action-button"
                  onClick={goToNewerMonth}
                  disabled={selectedPeriodIndex <= 0}
                  aria-label="Next month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <label className="stack-xs">
              <span className="field-label">Selected month</span>
              <select
                className="field-input"
                value={selectedPeriodKey}
                onChange={(event) => setSelectedPeriodKey(event.target.value)}
              >
                {fundPeriods.map((period) => (
                  <option key={periodKey(period)} value={periodKey(period)}>
                    {formatPeriodLabel(period)}
                  </option>
                ))}
              </select>
            </label>
            <div className="progress-meta">
              <span className="field-label">
                {monthlyProgress.paidCount}/{monthlyProgress.totalMembers} paid
              </span>
              <span className="field-label">
                {Math.round(monthlyProgress.percentage)}%
              </span>
            </div>
            <div className="progress-track" aria-hidden="true">
              <div
                className={
                  monthlyProgress.percentage === 100
                    ? 'progress-fill is-complete'
                    : 'progress-fill'
                }
                style={{ width: `${monthlyProgress.percentage}%` }}
              />
            </div>
            <p className="module-note">
              Swipe right to move to older months and left to move back toward the
              current month.
            </p>
          </section>

          <section
            className="glass-card panel stack-md fade-in-up"
            style={{ animationDelay: '0.15s' }}
          >
            <div className="split-header">
              <div className="section-header-copy">
                <p className="eyebrow">Payment status</p>
                <h3 className="section-title">Pending first, paid after</h3>
                <p className="section-note">
                  Members below are shown for {selectedPeriodLabel}. Confirming a
                  payment saves it against this exact month and year.
                </p>
              </div>
              <span className="status-chip">{fundStatusItems.length}</span>
            </div>
            {fundStatusItems.length === 0 ? (
              <div className="empty-state">
                <h4 className="empty-state-title">No members in this event yet</h4>
                <p className="muted-copy">
                  Add members to start recording payments for the selected month
                  and year.
                </p>
              </div>
            ) : (
              <div className="stack-sm">
                {fundStatusItems.map((item) => (
                  <article key={item.member.user_id} className="fund-status-card">
                    <div className="member-row">
                      <MemberAvatar member={item.member} />
                      <div className="stack-xs">
                        <strong className="info-value">
                          {getMemberName(item.member)}
                        </strong>
                        <div className="member-card-meta">
                          <span className="event-badge">
                            {formatEventRole(item.member.event_role)}
                          </span>
                          {item.member.profiles.role === 'admin' ? (
                            <span className="event-badge">Admin</span>
                          ) : null}
                          <span className="event-badge event-badge-period">
                            {selectedPeriodLabel}
                          </span>
                        </div>
                        <span className="field-label">
                          Status shown for {selectedPeriodLabel}
                        </span>
                      </div>
                    </div>
                    <div className="fund-status-aside">
                      {item.status === 'paid' ? (
                        <div className="payment-state payment-state-paid">
                          <CheckCircle2 size={16} />
                          <span>{formatMoney(Number(item.payment?.amount ?? 0))}</span>
                        </div>
                      ) : (
                        <div className="payment-state payment-state-pending">
                          <Clock3 size={16} />
                          <span>Pending</span>
                        </div>
                      )}
                      {canRunModules && item.status === 'pending' ? (
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => openPaymentDrawer(item.member.user_id)}
                          disabled={activeAction === `payment:${item.member.user_id}`}
                        >
                          {formatMoney(DEFAULT_MONTHLY_AMOUNT)}
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section
            className="glass-card panel stack-md fade-in-up"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="split-header">
              <div className="section-header-copy">
                <p className="eyebrow">Members</p>
                <h3 className="section-title">Contribution leaderboard</h3>
              </div>
              <span className="status-chip">{leaderboard.length}</span>
            </div>
            {leaderboard.length === 0 ? (
              <p className="muted-copy">No members available for leaderboard data.</p>
            ) : (
              <div className="stack-sm">
                {leaderboard.map((entry, index) => (
                  <button
                    key={entry.member.user_id}
                    type="button"
                    className="leaderboard-card"
                    onClick={() => setHistoryUserId(entry.member.user_id)}
                  >
                    <div className="member-row">
                      <MemberAvatar member={entry.member} highlight={index === 0} />
                      <div className="stack-xs">
                        <strong className="info-value">
                          {getMemberName(entry.member)}
                        </strong>
                        <span className="muted-copy">
                          {entry.monthsPaid} months paid
                        </span>
                      </div>
                    </div>
                    <div className="leaderboard-meta">
                      <span className="leaderboard-rank">#{index + 1}</span>
                      <strong className="info-value">
                        {formatMoney(entry.totalPaid)}
                      </strong>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </section>
      ) : null}

      {event?.type === 'random_picker' ? (
        <RandomPickerModule
          detail={detail}
          billAmount={billAmount}
          setBillAmount={setBillAmount}
          canSpin={Boolean(canRunModules)}
          activeAction={activeAction}
          onSpin={(submitEvent) => void handleSpin(submitEvent)}
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
              Non-admins cannot demote or remove the captain, and captains cannot
              remove themselves.
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

      {paymentDrawerUserId && paymentMember ? (
        <section
          className="drawer-overlay"
          onClick={() => setPaymentDrawerUserId(null)}
        >
          <div
            className="glass-card create-drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawer-handle" aria-hidden="true" />
            <div className="section-header-copy">
              <p className="eyebrow">Record payment</p>
              <h3 className="section-title">{selectedPeriodLabel}</h3>
            </div>
            <div className="member-row">
              <MemberAvatar member={paymentMember} />
              <div className="stack-xs">
                <strong className="info-value">{getMemberName(paymentMember)}</strong>
                <span className="muted-copy">{paymentMember.profiles.email}</span>
                <div className="member-card-meta">
                  <span className="event-badge">Month: {selectedMonthLabel}</span>
                  <span className="event-badge">Year: {selectedPeriod.year}</span>
                </div>
              </div>
            </div>
            <form className="stack-md" onSubmit={handlePaymentSubmit}>
              <label className="stack-xs">
                <span className="field-label">Amount</span>
                <input
                  type="number"
                  min={DEFAULT_MONTHLY_AMOUNT}
                  step="0.01"
                  className="field-input"
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                />
              </label>
              <p className="module-note">
                Minimum amount is {formatMoney(DEFAULT_MONTHLY_AMOUNT)}. Confirming
                this will save a paid transaction for {selectedPeriodLabel}.
              </p>
              <div className="actions-row">
                <button
                  type="submit"
                  className="primary-button"
                  disabled={activeAction === `payment:${paymentDrawerUserId}`}
                >
                  {activeAction === `payment:${paymentDrawerUserId}`
                    ? 'Saving...'
                    : `Confirm ${selectedPeriodLabel}`}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setPaymentDrawerUserId(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </section>
      ) : null}

      {historyUserId && selectedHistoryMember ? (
        <section className="drawer-overlay" onClick={() => setHistoryUserId(null)}>
          <div
            className="glass-card create-drawer member-history-drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawer-handle" aria-hidden="true" />
            <div className="split-header">
              <div className="member-row">
                <MemberAvatar member={selectedHistoryMember} />
                <div className="stack-xs">
                  <strong className="info-value">
                    {getMemberName(selectedHistoryMember)}
                  </strong>
                  <div className="member-card-meta">
                    <span className="event-badge">
                      {formatEventRole(selectedHistoryMember.event_role)}
                    </span>
                    {selectedHistoryMember.profiles.role === 'admin' ? (
                      <span className="event-badge">Admin</span>
                    ) : null}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setHistoryUserId(null)}
              >
                Close
              </button>
            </div>
            <div className="history-summary-grid">
              <div className="info-card">
                <span className="info-label">Total paid</span>
                <strong className="info-value">
                  {formatMoney(
                    leaderboard.find(
                      (entry) => entry.member.user_id === selectedHistoryMember.user_id,
                    )?.totalPaid ?? 0,
                  )}
                </strong>
              </div>
              <div className="info-card">
                <span className="info-label">Months paid</span>
                <strong className="info-value">
                  {
                    leaderboard.find(
                      (entry) => entry.member.user_id === selectedHistoryMember.user_id,
                    )?.monthsPaid ?? 0
                  }
                </strong>
              </div>
            </div>
            <ContributionTimeline items={historyTimeline} />
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
      <div className="member-row">
        <MemberAvatar member={subscriber} />
        <div className="stack-xs">
          <strong className="info-value">{getMemberName(subscriber)}</strong>
          <span className="muted-copy">{subscriber.profiles.email}</span>
        </div>
      </div>
      <div className="member-card-meta">
        {isCurrentUser ? <span className="event-badge">You</span> : null}
        {subscriber.profiles.role === 'admin' ? (
          <span className="event-badge">Admin</span>
        ) : null}
        <span className="event-badge event-badge-strong">
          {formatEventRole(subscriber.event_role)}
        </span>
      </div>
    </article>
  )
}

function MemberAvatar({
  member,
  highlight = false,
}: {
  member: {
    profiles: {
      full_name: string | null
      email: string
    }
  }
  highlight?: boolean
}) {
  const name = getMemberName(member)

  return (
    <div className="avatar-shell">
      <div
        className="member-avatar"
        style={{ backgroundImage: getAvatarGradient(name) }}
        aria-hidden="true"
      >
        {name.charAt(0).toUpperCase()}
      </div>
      {highlight ? (
        <span className="avatar-crown" aria-hidden="true">
          <Crown size={12} />
        </span>
      ) : null}
    </div>
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
      <div className="member-row">
        <MemberAvatar member={subscriber} />
        <div className="stack-xs">
          <strong className="info-value">{getMemberName(subscriber)}</strong>
          <span className="muted-copy">{subscriber.profiles.email}</span>
          <span className="field-label">
            Blood group: {subscriber.profiles.blood_group ?? 'Not set'}
          </span>
          <span className="field-label">
            Event role: {formatEventRole(subscriber.event_role)}
          </span>
        </div>
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

function ContributionTimeline({
  items,
}: {
  items: ReturnType<typeof buildMemberTimeline>
}) {
  if (items.length === 0) {
    return (
      <div className="empty-state">
        <h4 className="empty-state-title">No recorded payments yet</h4>
        <p className="muted-copy">
          This member has no saved payment transactions in this event yet.
        </p>
      </div>
    )
  }

  return (
    <div className="history-timeline contribution-timeline">
      {items.map((item) => (
        <article
          key={periodKey(item.period)}
          className={
            item.status === 'paid'
              ? 'timeline-card timeline-card-paid'
              : 'timeline-card'
          }
        >
          <div className="history-dot" />
          <div className="history-content">
            <div className="split-header">
              <strong className="info-value">{formatPeriodLabel(item.period)}</strong>
              <span
                className={
                  item.status === 'paid'
                    ? 'event-badge event-badge-strong'
                    : 'event-badge'
                }
              >
                {item.status === 'paid' ? 'Paid' : 'Pending'}
              </span>
            </div>
            <div className="meta-row">
              <span className="field-label">
                Amount:{' '}
                {item.payment ? formatMoney(Number(item.payment.amount)) : formatMoney(0)}
              </span>
              <span className="field-label">
                Date:{' '}
                {item.payment
                  ? new Date(item.payment.created_at).toLocaleDateString()
                  : 'Not recorded'}
              </span>
            </div>
          </div>
        </article>
      ))}
    </div>
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
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)
}

function useAnimatedNumber(target: number) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let animationFrame = 0
    const duration = 700
    const startedAt = performance.now()

    function update(now: number) {
      const progress = Math.min((now - startedAt) / duration, 1)
      setValue(target * progress)

      if (progress < 1) {
        animationFrame = requestAnimationFrame(update)
      }
    }

    animationFrame = requestAnimationFrame(update)

    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }, [target])

  return value
}
