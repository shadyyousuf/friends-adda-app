import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type TouchEvent,
} from 'react'
import AnimatedContentLoader from '../components/AnimatedContentLoader'
import { FundTrackerEventContent } from '../components/events/FundTrackerEventContent'
import { GeneralEventContent } from '../components/events/GeneralEventContent'
import { RandomPickerEventContent } from '../components/events/RandomPickerEventContent'
import { MemberDirectoryCard } from '../components/MemberDirectoryCard'
import AddMembersDrawer from '../components/events/detail/AddMembersDrawer'
import EventDetailMenu, {
  getEventMenuItems,
} from '../components/events/detail/EventDetailMenu'
import EventDetailRouteShell from '../components/events/detail/EventDetailRouteShell'
import EventEditDrawer from '../components/events/detail/EventEditDrawer'
import EventMembersPanel from '../components/events/detail/EventMembersPanel'
import RandomPickerWinnerAmountDrawer from '../components/events/detail/RandomPickerWinnerAmountDrawer'
import {
  ContributionTimeline,
  formatEventRole,
  formatMoney,
  MemberAvatar,
} from '../components/events/EventTypeHelpers'
import { useAuth } from '../components/AuthProvider'
import { useEventPageTitle } from '../components/MobileLayout'
import { useEventDetailMutations } from '../hooks/useEventDetailMutations'
import {
  buildFundStatusItems,
  buildLeaderboard,
  buildMemberTimeline,
  calculateMonthlyProgress,
  formatPeriodLabel,
  getCurrentPeriod,
  getMemberName,
  getRecentPeriods,
  parsePeriodKey,
  periodKey,
  sumAllPaid,
} from '../utils/fund-tracker'
import {
  demoteEventMemberToMember,
  addMembersToEvent,
  eventDetailQueryOptions,
  deleteEvent,
  extractRandomPickerWinnerId,
  type EventVisibility,
  promoteEventMemberToCoCaptain,
  removeEventMember,
  updateRandomPickerWinnerAmount,
  spinRandomPicker,
  transferEventCaptain,
  updateEvent,
  type EventDetailData,
  upsertEventFundPayment,
} from '../utils/events'
import { approvedProfilesQueryOptions } from '../utils/profile'

export const Route = createFileRoute('/events/$eventId')({
  component: EventDetailPage,
})

function getMonthlyDefaultAmount(event: EventDetailData['event']): number | null {
  if (!event?.monthly_default_amount) {
    return null
  }

  const monthlyDefault = Number(event.monthly_default_amount)
  return Number.isFinite(monthlyDefault) && monthlyDefault > 0
    ? monthlyDefault
    : null
}

function EventDetailPage() {
  const { eventId } = Route.useParams()
  const navigate = Route.useNavigate()
  const { user, profile, authStatus, isProfileLoading } = useAuth()
  const { setEventTitle } = useEventPageTitle()
  const [activePanel, setActivePanel] = useState<
    null | 'members' | 'leaderboard' | 'event-details' | 'add-members'
  >(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isEditingEvent, setIsEditingEvent] = useState(false)
  const [billAmount, setBillAmount] = useState('')
  const [selectedPeriodKey, setSelectedPeriodKey] = useState(() =>
    periodKey(getCurrentPeriod()),
  )
  const [paymentDrawerUserId, setPaymentDrawerUserId] = useState<string | null>(
    null,
  )
  const [paymentAmount, setPaymentAmount] = useState(
    '',
  )
  const [historyUserId, setHistoryUserId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editEventDate, setEditEventDate] = useState('')
  const [editVisibility, setEditVisibility] = useState<EventVisibility>('public')
  const [editTargetAmount, setEditTargetAmount] = useState('')
  const [editMonthlyDefaultAmount, setEditMonthlyDefaultAmount] = useState('')
  const [addMemberSearch, setAddMemberSearch] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [editingRandomPickerWinner, setEditingRandomPickerWinner] = useState<{
    activityId: string
    winnerName: string
    amount: number
  } | null>(null)
  const [randomPickerWinnerAmount, setRandomPickerWinnerAmount] = useState('')
  const touchStartXRef = useRef<number | null>(null)
  const userId = user?.id ?? ''
  const {
    activeAction,
    errorMessage,
    setErrorMessage,
    clearError,
    invalidateDetail,
    invalidateDetailAndDashboard,
    runMutation,
  } = useEventDetailMutations({
    eventId,
    viewerId: userId,
  })

  const detailQuery = useQuery({
    ...eventDetailQueryOptions(userId, eventId),
    enabled: authStatus === 'signed-in' && Boolean(user && profile?.is_approved),
  })
  const approvedProfilesQuery = useQuery({
    ...approvedProfilesQueryOptions(userId),
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

  const event = detail.event

  const selectedPeriod = parsePeriodKey(selectedPeriodKey)
  const selectedPeriodLabel = formatPeriodLabel(selectedPeriod)
  const fundPeriods = getRecentPeriods(12)
  const selectedPeriodIndex = fundPeriods.findIndex(
    (period) => periodKey(period) === selectedPeriodKey,
  )
  const currentSubscriber = detail.subscribers.find(
    (subscriber) => subscriber.user_id === user?.id,
  )
  const canManageMembers =
    profile?.role === 'admin' || currentSubscriber?.event_role === 'captain'
  const canEditEvent =
    profile?.role === 'admin' || currentSubscriber?.event_role === 'captain'
  const canRunModules =
    profile?.role === 'admin' ||
    currentSubscriber?.event_role === 'captain' ||
    currentSubscriber?.event_role === 'co-captain'
  const randomPickerWinnerIds = new Set(
    detail.activities
      .map((activity) => extractRandomPickerWinnerId(activity))
      .filter((winnerId): winnerId is string => Boolean(winnerId)),
  )
  const randomPickerRemainingMembers = detail.subscribers.filter(
    (subscriber) => !randomPickerWinnerIds.has(subscriber.user_id),
  )
  const randomPickerWinnersByLatest = new Map<
    string,
    {
      activityId: string
      winner: EventDetailData['subscribers'][number]
      amount: number
      createdAt: string
    }
  >()

  for (const activity of detail.activities) {
    const winnerId = extractRandomPickerWinnerId(activity)

    if (!winnerId || randomPickerWinnersByLatest.has(winnerId)) {
      continue
    }

    const winner = detail.subscribers.find(
      (subscriber) => subscriber.user_id === winnerId,
    )

    if (!winner) {
      continue
    }

    const payload = activity.payload
    const amount =
      payload && typeof payload === 'object' && 'amount' in payload
        ? Number(payload.amount)
        : 0

    randomPickerWinnersByLatest.set(winnerId, {
      activityId: activity.id,
      winner,
      amount: Number.isFinite(amount) ? amount : 0,
      createdAt: activity.created_at,
    })
  }
  const randomPickerWinners = Array.from(randomPickerWinnersByLatest.values())
  const canSpinRandomPicker =
    (currentSubscriber?.event_role === 'captain' ||
      currentSubscriber?.event_role === 'co-captain') &&
    randomPickerRemainingMembers.length > 0
  const canEditRandomPickerWinnerAmount = canRunModules
  const canDeleteEvent = canEditEvent
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
  const coCaptainCount = detail.subscribers.reduce(
    (count, subscriber) =>
      count + (subscriber.event_role === 'co-captain' ? 1 : 0),
    0,
  )
  const menuActionItems = getEventMenuItems(
    event?.type,
    canDeleteEvent,
    canEditEvent,
    canManageMembers,
  )
  const monthlyDefaultAmount = getMonthlyDefaultAmount(event)
  const defaultPaymentAmount = monthlyDefaultAmount !== null ? String(monthlyDefaultAmount) : ''
  const paymentMinAmount = monthlyDefaultAmount ?? 0.01
  const allApprovedMembers = approvedProfilesQuery.data ?? []
  const subscriberIds = new Set(detail.subscribers.map((subscriber) => subscriber.user_id))
  const addMemberCandidates = allApprovedMembers.filter(
    (member) => !subscriberIds.has(member.id),
  )
  const addMemberSearchTerm = addMemberSearch.trim().toLowerCase()
  const filteredAddMemberCandidates = addMemberSearchTerm
    ? addMemberCandidates.filter((member) => {
        const name = member.full_name?.trim().toLowerCase() ?? ''
        return (
          name.includes(addMemberSearchTerm) ||
          member.email.toLowerCase().includes(addMemberSearchTerm)
        )
      })
    : addMemberCandidates

  function syncEventEditFields(nextEvent: EventDetailData['event']) {
    if (!nextEvent) {
      return
    }

    setEditTitle(nextEvent.title)
    setEditDescription(nextEvent.description ?? '')
    setEditEventDate(nextEvent.event_date.split('T')[0] ?? '')
    setEditVisibility(nextEvent.visibility)
    setEditTargetAmount(
      nextEvent.target_amount ? String(nextEvent.target_amount) : '',
    )
    setEditMonthlyDefaultAmount(
      nextEvent.monthly_default_amount
        ? String(nextEvent.monthly_default_amount)
        : '',
    )
  }

  useEffect(() => {
    if (!event) {
      setEventTitle(null)
      return
    }

    setEventTitle(event.title)
    syncEventEditFields(event)

    return () => {
      setEventTitle(null)
    }
  }, [event, setEventTitle])

  useEffect(() => {
    if (selectedPeriodIndex === -1) {
      setSelectedPeriodKey(periodKey(fundPeriods[0]))
    }
  }, [fundPeriods, selectedPeriodIndex])

  async function handleAction(
    action:
      | 'make-captain'
      | 'make-co-captain'
      | 'make-member'
      | 'remove',
    userId: string,
  ) {
    const actionKey = `${action}:${userId}`

    await runMutation(
      actionKey,
      async () => {
        if (action === 'make-captain') {
          await transferEventCaptain(eventId, userId)
        } else if (action === 'make-co-captain') {
          await promoteEventMemberToCoCaptain(eventId, userId)
        } else if (action === 'make-member') {
          await demoteEventMemberToMember(eventId, userId)
        } else {
          await removeEventMember(eventId, userId)
        }

        await invalidateDetail()
      },
      'Failed to update event members.',
    )
  }

  async function handleEventUpdate(eventForm: FormEvent<HTMLFormElement>) {
    eventForm.preventDefault()

    if (!detail.event) {
      return
    }

    const currentEvent = detail.event

    const title = editTitle.trim()

    if (!title) {
      setErrorMessage('Event title is required.')
      return
    }

    if (!editEventDate) {
      setErrorMessage('Event date is required.')
      return
    }

    await runMutation(
      'event-update',
      async () => {
        const normalizedTargetAmount =
        currentEvent.type === 'fund_tracker' && editTargetAmount.trim()
          ? Number(editTargetAmount)
          : null
        const normalizedMonthlyDefaultAmount =
        currentEvent.type === 'fund_tracker' && editMonthlyDefaultAmount.trim()
          ? Number(editMonthlyDefaultAmount)
          : null

      if (
        normalizedTargetAmount !== null &&
        (!Number.isFinite(normalizedTargetAmount) || normalizedTargetAmount <= 0)
      ) {
        throw new Error('Target amount must be greater than zero.')
      }
      if (
        normalizedMonthlyDefaultAmount !== null &&
        (!Number.isFinite(normalizedMonthlyDefaultAmount) ||
          normalizedMonthlyDefaultAmount <= 0)
      ) {
        throw new Error('Monthly default amount must be greater than zero.')
      }

      await updateEvent({
        eventId: currentEvent.id,
        title,
        description: editDescription.trim() || null,
        eventDate: editEventDate,
        visibility: editVisibility,
        targetAmount:
          currentEvent.type === 'fund_tracker' ? normalizedTargetAmount : undefined,
        monthlyDefaultAmount:
          currentEvent.type === 'fund_tracker'
            ? normalizedMonthlyDefaultAmount
            : undefined,
      })

      setIsEditingEvent(false)
      await invalidateDetail()
      },
      'Failed to update event.',
    )
  }

  async function handlePaymentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!paymentDrawerUserId) {
      return
    }

    const amount = Number(paymentAmount)

    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage('Amount must be greater than zero.')
      return
    }

    if (monthlyDefaultAmount !== null && amount < monthlyDefaultAmount) {
      setErrorMessage(
        `Amount must be at least ${formatMoney(monthlyDefaultAmount)}.`,
      )
      return
    }

    await runMutation(
      `payment:${paymentDrawerUserId}`,
      async () => {
        await upsertEventFundPayment({
          eventId,
          userId: paymentDrawerUserId,
          amount,
          month: selectedPeriod.month,
          year: selectedPeriod.year,
        })
        setPaymentDrawerUserId(null)
        setPaymentAmount(defaultPaymentAmount)
        await invalidateDetail()
      },
      'Failed to save payment.',
    )
  }

  function openRandomPickerWinnerAmountDrawer(
    winner: {
      activityId: string
      winnerName: string
      amount: number
    },
  ) {
    setEditingRandomPickerWinner(winner)
    setRandomPickerWinnerAmount(String(Math.round(winner.amount)))
    setErrorMessage(null)
  }

  function closeRandomPickerWinnerAmountDrawer() {
    setEditingRandomPickerWinner(null)
    setRandomPickerWinnerAmount('')
  }

  async function handleRandomPickerWinnerAmountSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!editingRandomPickerWinner) {
      return
    }

    const amount = Number(randomPickerWinnerAmount)

    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage('Amount must be greater than zero.')
      return
    }

    const normalizedAmount = Math.round(amount)

    await runMutation(
      `random-winner:${editingRandomPickerWinner.activityId}`,
      async () => {
        await updateRandomPickerWinnerAmount(
          editingRandomPickerWinner.activityId,
          normalizedAmount,
        )
        setEditingRandomPickerWinner(null)
        setRandomPickerWinnerAmount('')
        await invalidateDetail()
      },
      'Failed to update winner amount.',
    )
  }

  function openPaymentDrawer(userId: string) {
    setPaymentDrawerUserId(userId)
    setPaymentAmount(defaultPaymentAmount)
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

  function openMemberPanel() {
    setActivePanel('members')
    setIsMenuOpen(false)
  }

  function openLeaderboardPanel() {
    setActivePanel('leaderboard')
    setIsMenuOpen(false)
  }

  function openAddMembersPanel() {
    setActivePanel('add-members')
    setIsMenuOpen(false)
    setAddMemberSearch('')
    setSelectedMemberIds([])
    clearError()
  }

  function openEventDetailsPanel(editMode: boolean) {
    if (!detail.event) {
      return
    }

    setIsEditingEvent(canEditEvent && editMode)
    setActivePanel('event-details')
    setIsMenuOpen(false)
    syncEventEditFields(detail.event)
  }

  function toggleAddMemberSelection(memberId: string) {
    setSelectedMemberIds((currentIds) =>
      currentIds.includes(memberId)
        ? currentIds.filter((id) => id !== memberId)
        : [...currentIds, memberId],
    )
  }

  async function handleAddMembers() {
    if (selectedMemberIds.length === 0) {
      return
    }

    await runMutation(
      'add-members',
      async () => {
        await addMembersToEvent(eventId, selectedMemberIds)
        setActivePanel(null)
        setAddMemberSearch('')
        setSelectedMemberIds([])
        await invalidateDetailAndDashboard()
      },
      'Failed to add members.',
    )
  }

  async function handleDeleteEvent() {
    if (!detail.event) {
      return
    }

    if (!canDeleteEvent) {
      setErrorMessage('Only app admins or event captains can delete this event.')
      setIsDeleteConfirmOpen(false)
      return
    }

    const wasDeleted = await runMutation(
      'delete-event',
      async () => {
        await deleteEvent(eventId)
        setIsDeleteConfirmOpen(false)
        await invalidateDetailAndDashboard()
      },
      'Failed to delete event.',
    )

    if (wasDeleted) {
      void navigate({ to: '/', search: { create: undefined } })
    }
  }

  function openDeleteConfirmation() {
    setIsDeleteConfirmOpen(true)
    clearError()
    setIsMenuOpen(false)
  }

  function closeDeleteConfirmation() {
    setIsDeleteConfirmOpen(false)
  }

  function closePanel() {
    if (activePanel === 'add-members') {
      setAddMemberSearch('')
      setSelectedMemberIds([])
    }

    setActivePanel(null)
    setIsEditingEvent(false)
    clearError()
  }

  function closeFloatingMenu() {
    setIsMenuOpen(false)
  }

  function handleFloatingMenuSelect(
    action: Parameters<typeof EventDetailMenu>[0]['items'][number]['type'],
  ) {
    closeFloatingMenu()

    if (action === 'edit-event') {
      openEventDetailsPanel(true)
      return
    }

    if (action === 'event-details') {
      openEventDetailsPanel(false)
      return
    }

    if (action === 'members') {
      openMemberPanel()
      return
    }

    if (action === 'leaderboard') {
      openLeaderboardPanel()
      return
    }

    if (action === 'invite-friends') {
      openAddMembersPanel()
      return
    }

    if (action === 'delete-event') {
      openDeleteConfirmation()
    }
  }

  if (
    authStatus === 'initializing' ||
    (authStatus === 'signed-in' && isProfileLoading && !profile)
  ) {
    return <AnimatedContentLoader isVisible mode="panel" />
  }

  if (authStatus === 'signed-out' || !user) {
    return (
      <section className="glass-card panel stack-md">
        <p className="eyebrow">Event</p>
        <h2 className="panel-title">Login required</h2>
        <div className="actions-row">
          <Link to="/login" className="primary-button">
            Log in
          </Link>
          <Link
            to="/"
            search={{ create: undefined }}
            className="secondary-button"
          >
            Back to dashboard
          </Link>
        </div>
      </section>
    )
  }

  if (detailQuery.isPending && !detail.event) {
    return <AnimatedContentLoader isVisible mode="panel" />
  }

  if (!detail.event && !detailQuery.isPending) {
    return (
      <section className="glass-card panel stack-md">
        <p className="eyebrow">Event</p>
        <h2 className="panel-title">Event not found</h2>
        <Link
          to="/"
          search={{ create: undefined }}
          className="secondary-button"
        >
          Back to dashboard
        </Link>
      </section>
    )
  }

  return (
    <EventDetailRouteShell
      detailError={detailError}
      errorMessage={errorMessage}
    >
      {event?.type === 'fund_tracker' ? (
        <FundTrackerEventContent
          event={event}
          detail={detail}
          totalCollected={animatedTotalPaid}
          selectedPeriodLabel={selectedPeriodLabel}
          selectedPeriodKey={selectedPeriodKey}
          fundPeriods={fundPeriods}
          selectedPeriodIndex={selectedPeriodIndex}
          fundStatusItems={fundStatusItems}
          monthlyProgress={monthlyProgress}
          monthlyDefaultAmount={monthlyDefaultAmount}
          canRunModules={Boolean(canRunModules)}
          activeAction={activeAction}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onOlderMonth={goToOlderMonth}
          onNewerMonth={goToNewerMonth}
          onPeriodChange={setSelectedPeriodKey}
          onOpenPaymentDrawer={openPaymentDrawer}
        />
      ) : null}

      {event?.type === 'random_picker' ? (
        <RandomPickerEventContent
          billAmount={billAmount}
          setBillAmount={setBillAmount}
          canSpin={Boolean(canSpinRandomPicker)}
          canEditWinnerAmount={canEditRandomPickerWinnerAmount}
          winners={randomPickerWinners}
          activeAction={activeAction}
          onEditWinnerAmount={openRandomPickerWinnerAmountDrawer}
          onSpin={(submitEvent) => void handleSpin(submitEvent)}
        />
      ) : null}

      {event?.type === 'general' ? (
        <GeneralEventContent
          event={event}
          memberCount={detail.subscribers.length}
        />
      ) : null}

      <EventMembersPanel
        isOpen={activePanel === 'members'}
        subscribers={detail.subscribers}
        currentUserId={user.id}
        currentUserRole={profile?.role}
        canManageMembers={Boolean(canManageMembers)}
        coCaptainCount={coCaptainCount}
        activeAction={activeAction}
        onClose={closePanel}
        onAction={(action, memberUserId) => {
          void handleAction(action, memberUserId)
        }}
      />

      {activePanel === 'leaderboard' ? (
        <section className="drawer-overlay" onClick={() => closePanel()}>
          <div
            className="glass-card create-drawer"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Contribution leaderboard"
          >
            <div className="drawer-handle" aria-hidden="true" />
            <div className="split-header">
              <div className="section-header-copy">
                <p className="eyebrow">Fund tracker</p>
                <h3 className="section-title">Contribution leaderboard</h3>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  closePanel()
                }}
              >
                Close
              </button>
            </div>
            {leaderboard.length === 0 ? (
              <div className="empty-state">
                <h4 className="empty-state-title">No members yet</h4>
              </div>
            ) : (
              <div className="stack-sm">
                {leaderboard.map((entry, index) => (
                  <button
                    key={entry.member.user_id}
                    type="button"
                    className="member-directory-card-button"
                    onClick={() => setHistoryUserId(entry.member.user_id)}
                  >
                    <MemberDirectoryCard
                      profile={{
                        id: entry.member.user_id,
                        full_name: getMemberName(entry.member),
                        email: entry.member.profiles.email,
                      role: entry.member.profiles.role,
                      blood_group: entry.member.profiles.blood_group,
                    }}
                      roleLabel=""
                      detailLines={[`${entry.monthsPaid} months paid`]}
                      sideContent={
                        <div className="member-directory-leaderboard-meta">
                          <span className="member-directory-rank">
                            {formatEventRole(entry.member.event_role)} #{index + 1}
                          </span>
                          <strong className="info-value">
                            {formatMoney(entry.totalPaid)}
                          </strong>
                        </div>
                      }
                      highlight={index === 0}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}

      <AddMembersDrawer
        isOpen={activePanel === 'add-members'}
        members={filteredAddMemberCandidates}
        selectedMemberIds={selectedMemberIds}
        searchValue={addMemberSearch}
        activeAction={activeAction}
        onSearchChange={setAddMemberSearch}
        onToggleMember={toggleAddMemberSelection}
        onAddMembers={() => {
          void handleAddMembers()
        }}
        onClose={closePanel}
      />

      <EventEditDrawer
        event={detail.event}
        memberCount={detail.subscribers.length}
        isOpen={activePanel === 'event-details'}
        isEditing={isEditingEvent}
        canEditEvent={Boolean(canEditEvent)}
        activeAction={activeAction}
        title={editTitle}
        description={editDescription}
        eventDate={editEventDate}
        visibility={editVisibility}
        targetAmount={editTargetAmount}
        monthlyDefaultAmount={editMonthlyDefaultAmount}
        onTitleChange={setEditTitle}
        onDescriptionChange={setEditDescription}
        onEventDateChange={setEditEventDate}
        onVisibilityChange={setEditVisibility}
        onTargetAmountChange={setEditTargetAmount}
        onMonthlyDefaultAmountChange={setEditMonthlyDefaultAmount}
        onSubmit={(eventForm) => {
          void handleEventUpdate(eventForm)
        }}
        onStartEditing={() => {
          setIsEditingEvent(true)
          syncEventEditFields(detail.event)
        }}
        onStopEditing={() => {
          setIsEditingEvent(false)
          syncEventEditFields(detail.event)
        }}
        onClose={closePanel}
      />

      {paymentDrawerUserId && paymentMember ? (
        <section
          className="drawer-overlay"
          onClick={() => setPaymentDrawerUserId(null)}
        >
          <div
            className="glass-card create-drawer"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Record fund payment"
          >
            <div className="drawer-handle" aria-hidden="true" />
            <div className="section-header-copy">
              <p className="eyebrow">Record payment</p>
              <h3 className="section-title">{selectedPeriodLabel}</h3>
            </div>
            <div className="member-row">
              <MemberAvatar member={paymentMember} />
              <div className="stack-xs">
                <strong className="info-value">
                  {getMemberName(paymentMember)}
                </strong>
                <span className="field-label">{paymentMember.profiles.email}</span>
              </div>
            </div>
            <form className="stack-md" onSubmit={handlePaymentSubmit}>
              <label className="stack-xs">
                <span className="field-label">Amount</span>
                <input
                  type="number"
                  min={paymentMinAmount}
                  step="0.01"
                  className="field-input"
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                />
              </label>
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

      <RandomPickerWinnerAmountDrawer
        winner={editingRandomPickerWinner}
        amount={randomPickerWinnerAmount}
        activeAction={activeAction}
        onAmountChange={setRandomPickerWinnerAmount}
        onSubmit={(eventForm) => {
          void handleRandomPickerWinnerAmountSubmit(eventForm)
        }}
        onClose={closeRandomPickerWinnerAmountDrawer}
      />

      {historyUserId && selectedHistoryMember ? (
        <section className="drawer-overlay" onClick={() => setHistoryUserId(null)}>
          <div
            className="glass-card create-drawer member-history-drawer"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Member contribution history"
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
                      <span className="member-directory-role-badge">App Admin</span>
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

      <EventDetailMenu
        isOpen={isMenuOpen}
        items={menuActionItems}
        onToggle={() => setIsMenuOpen((current) => !current)}
        onClose={closeFloatingMenu}
        onSelect={handleFloatingMenuSelect}
      />

      {isDeleteConfirmOpen ? (
        <section
          className="drawer-overlay"
          onClick={closeDeleteConfirmation}
        >
          <div
            className="glass-card create-drawer delete-event-drawer"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Delete event confirmation"
          >
            <div className="drawer-handle" aria-hidden="true" />
            <div className="section-header-copy">
              <p className="eyebrow">Danger zone</p>
              <h3 className="section-title">Delete this event?</h3>
            </div>
            <p className="event-detail-meta">
              This will remove the event and all related records (members,
              payments, and history) permanently.
            </p>
            <div className="actions-row">
              <button
                type="button"
                className="danger-button"
                onClick={() => {
                  void handleDeleteEvent()
                }}
                disabled={activeAction === 'delete-event'}
              >
                {activeAction === 'delete-event' ? 'Deleting...' : 'Confirm'}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={closeDeleteConfirmation}
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </EventDetailRouteShell>
  )

  async function handleSpin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const amount = Number(billAmount)

    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage('Enter a valid bill amount before spinning.')
      return
    }

    if (randomPickerRemainingMembers.length === 0) {
      setErrorMessage('No eligible members left to spin.')
      return
    }

    await runMutation(
      'spin',
      async () => {
        const maxAttempts = Math.max(detail.subscribers.length * 12, 24)
        let validSpinPicked = false

        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
          const activity = await spinRandomPicker(eventId, amount)
          const pickedWinnerId = extractRandomPickerWinnerId(activity)

          if (pickedWinnerId && !randomPickerWinnerIds.has(pickedWinnerId)) {
            validSpinPicked = true
            break
          }
        }

        if (!validSpinPicked) {
          throw new Error('Could not pick a new winner. Please try again.')
        }

        setBillAmount('')
        await invalidateDetail()
      },
      'Failed to update event module.',
    )
  }
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
