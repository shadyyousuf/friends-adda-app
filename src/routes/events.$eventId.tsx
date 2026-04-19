import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Info,
  Menu,
  Pencil,
  Trash2,
  Share2,
  Trophy,
  UserRoundPlus,
  Users,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type TouchEvent,
} from 'react'
import AnimatedContentLoader from '../components/AnimatedContentLoader'
import { FundTrackerEventContent } from '../components/events/FundTrackerEventContent'
import { GeneralEventContent } from '../components/events/GeneralEventContent'
import { RandomPickerEventContent } from '../components/events/RandomPickerEventContent'
import {
  MemberDirectoryCard,
  type MemberDirectoryMenuAction,
} from '../components/MemberDirectoryCard'
import {
  ContributionTimeline,
  formatEventRole,
  formatEventType,
  formatMoney,
  formatVisibility,
  InfoItem,
  MemberAvatar,
} from '../components/events/EventTypeHelpers'
import { useAuth } from '../components/AuthProvider'
import { useEventPageTitle } from '../components/MobileLayout'
import {
  buildFundStatusItems,
  buildLeaderboard,
  buildMemberTimeline,
  calculateMonthlyProgress,
  formatPeriodLabel,
  MONTH_NAMES,
  getCurrentPeriod,
  getMemberName,
  getRecentPeriods,
  parsePeriodKey,
  periodKey,
  sumAllPaid,
} from '../utils/fund-tracker'
import {
  demoteEventMemberToMember,
  eventDetailQueryOptions,
  eventKeys,
  deleteEvent,
  type EventVisibility,
  promoteEventMemberToCoCaptain,
  removeEventMember,
  spinRandomPicker,
  transferEventCaptain,
  updateEvent,
  type EventDetailData,
  upsertEventFundPayment,
} from '../utils/events'

export const Route = createFileRoute('/events/$eventId')({
  component: EventDetailPage,
})

type FloatingEventMenuActionType =
  | 'edit-event'
  | 'event-details'
  | 'leaderboard'
  | 'members'
  | 'invite-friends'
  | 'delete-event'

type FloatingEventMenuItem = {
  type: FloatingEventMenuActionType
  label: string
  icon: ReactNode
  isDanger?: true
}

function getEventMenuItems(
  eventType?: string,
  canDelete?: boolean,
  canEditEvent?: boolean,
): FloatingEventMenuItem[] {
  const items: FloatingEventMenuItem[] = []

  if (eventType === 'fund_tracker') {
    items.push(
      {
        type: 'event-details',
        label: 'Event details',
        icon: <Info size={16} />,
      },
      {
        type: 'leaderboard',
        label: 'Leaderboard',
        icon: <Trophy size={16} />,
      },
      {
        type: 'members',
        label: 'Members',
        icon: <Users size={16} />,
      },
      {
        type: 'invite-friends',
        label: 'Invite friends',
        icon: <UserRoundPlus size={16} />,
      },
    )
  } else if (eventType === 'random_picker') {
    items.push(
      {
        type: 'event-details',
        label: 'Event details',
        icon: <Info size={16} />,
      },
      {
        type: 'members',
        label: 'Members',
        icon: <Users size={16} />,
      },
      {
        type: 'invite-friends',
        label: 'Invite friends',
        icon: <Share2 size={16} />,
      },
    )
  } else {
    if (canEditEvent) {
      items.push({
        type: 'edit-event',
        label: 'Edit event',
        icon: <Pencil size={16} />,
      })
    }

    items.push(
      {
        type: 'members',
        label: 'Members',
        icon: <Users size={16} />,
      },
      {
        type: 'invite-friends',
        label: 'Invite friends',
        icon: <Share2 size={16} />,
      },
    )
  }

  if (canDelete) {
    items.push({
      type: 'delete-event',
      label: 'Delete event',
      icon: <Trash2 size={16} />,
      isDanger: true,
    })
  }

  return items
}

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
  const { user, profile, isLoading } = useAuth()
  const queryClient = useQueryClient()
  const { setEventTitle } = useEventPageTitle()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activePanel, setActivePanel] = useState<
    null | 'members' | 'leaderboard' | 'event-details'
  >(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isEditingEvent, setIsEditingEvent] = useState(false)
  const [activeAction, setActiveAction] = useState<string | null>(null)
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

  const event = detail.event

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
  const canEditEvent =
    profile?.role === 'admin' || currentSubscriber?.event_role === 'captain'
  const canRunModules =
    profile?.role === 'admin' ||
    currentSubscriber?.event_role === 'captain' ||
    currentSubscriber?.event_role === 'co-captain'
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
  )
  const monthlyDefaultAmount = getMonthlyDefaultAmount(event)
  const defaultPaymentAmount = monthlyDefaultAmount !== null ? String(monthlyDefaultAmount) : ''
  const paymentMinAmount = monthlyDefaultAmount ?? 0.01

  useEffect(() => {
    if (!event) {
      setEventTitle(null)
      return
    }

    setEventTitle(event.title)
    setEditTitle(event.title)
    setEditDescription(event.description ?? '')
    setEditEventDate(event.event_date.split('T')[0] ?? '')
    setEditVisibility(event.visibility)
    setEditTargetAmount(event.target_amount ? String(event.target_amount) : '')
    setEditMonthlyDefaultAmount(
      event.monthly_default_amount ? String(event.monthly_default_amount) : '',
    )

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
    setErrorMessage(null)
    setActiveAction(actionKey)

    try {
      if (action === 'make-captain') {
        await transferEventCaptain(eventId, userId)
      } else if (action === 'make-co-captain') {
        await promoteEventMemberToCoCaptain(eventId, userId)
      } else if (action === 'make-member') {
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

  async function handleEventUpdate(eventForm: FormEvent<HTMLFormElement>) {
    eventForm.preventDefault()

    if (!detail.event) {
      return
    }

    const title = editTitle.trim()

    if (!title) {
      setErrorMessage('Event title is required.')
      return
    }

    if (!editEventDate) {
      setErrorMessage('Event date is required.')
      return
    }

    setActiveAction('event-update')

    try {
      const normalizedTargetAmount =
        detail.event.type === 'fund_tracker' && editTargetAmount.trim()
          ? Number(editTargetAmount)
          : null
      const normalizedMonthlyDefaultAmount =
        detail.event.type === 'fund_tracker' && editMonthlyDefaultAmount.trim()
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
        eventId: detail.event.id,
        title,
        description: editDescription.trim() || null,
        eventDate: editEventDate,
        visibility: editVisibility,
        targetAmount:
          detail.event.type === 'fund_tracker' ? normalizedTargetAmount : undefined,
        monthlyDefaultAmount:
          detail.event.type === 'fund_tracker'
            ? normalizedMonthlyDefaultAmount
            : undefined,
      })

      setIsEditingEvent(false)
      await queryClient.invalidateQueries({
        queryKey: eventKeys.detail(eventId),
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to update event.',
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

    await handleModuleAction(`payment:${paymentDrawerUserId}`, async () => {
      await upsertEventFundPayment({
        eventId,
        userId: paymentDrawerUserId,
        amount,
        month: selectedPeriod.month,
        year: selectedPeriod.year,
      })
      setPaymentDrawerUserId(null)
      setPaymentAmount(defaultPaymentAmount)
      await queryClient.invalidateQueries({
        queryKey: eventKeys.detail(eventId),
      })
    })
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

  function openEventDetailsPanel(editMode: boolean) {
    if (!detail.event) {
      return
    }

    setIsEditingEvent(canEditEvent && editMode)
    setActivePanel('event-details')
    setIsMenuOpen(false)

    if (canEditEvent && editMode) {
      setEditTitle(detail.event.title)
      setEditDescription(detail.event.description ?? '')
      setEditEventDate(detail.event.event_date.split('T')[0] ?? '')
      setEditVisibility(detail.event.visibility)
      setEditTargetAmount(
        detail.event.type === 'fund_tracker' && detail.event.target_amount
          ? String(detail.event.target_amount)
          : '',
      )
      setEditMonthlyDefaultAmount(
        detail.event.type === 'fund_tracker' && detail.event.monthly_default_amount
          ? String(detail.event.monthly_default_amount)
          : '',
      )
    } else {
      setEditTitle(detail.event.title)
      setEditDescription(detail.event.description ?? '')
      setEditEventDate(detail.event.event_date.split('T')[0] ?? '')
      setEditVisibility(detail.event.visibility)
      setEditTargetAmount(
        detail.event.type === 'fund_tracker' && detail.event.target_amount
          ? String(detail.event.target_amount)
          : '',
      )
      setEditMonthlyDefaultAmount(
        detail.event.type === 'fund_tracker' && detail.event.monthly_default_amount
          ? String(detail.event.monthly_default_amount)
          : '',
      )
    }
  }

  async function handleInviteFriends() {
    if (!detail.event) {
      return
    }

    const inviteUrl = window.location.href
    const sharePayload = {
      title: detail.event.title,
      text: `Join ${detail.event.title} on Friends Adda`,
      url: inviteUrl,
    }

    setIsMenuOpen(false)

    try {
      if (typeof navigator.share === 'function') {
        await navigator.share(sharePayload)
        return
      }

      if (typeof navigator.clipboard?.writeText === 'function') {
        await navigator.clipboard.writeText(inviteUrl)
        setErrorMessage('Invite link copied to clipboard.')
        return
      }

      window.prompt('Copy this invite link:', inviteUrl)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }

      setErrorMessage('Failed to share invite link.')
    }
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

    setActiveAction('delete-event')

    try {
      await deleteEvent(eventId)
      setIsDeleteConfirmOpen(false)
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: eventKeys.dashboard,
        }),
        queryClient.invalidateQueries({
          queryKey: eventKeys.detail(eventId),
        }),
      ])
      void navigate({ to: '/' })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to delete event.',
      )
    } finally {
      setActiveAction(null)
    }
  }

  function openDeleteConfirmation() {
    setIsDeleteConfirmOpen(true)
    setErrorMessage(null)
    setIsMenuOpen(false)
  }

  function closeDeleteConfirmation() {
    setIsDeleteConfirmOpen(false)
  }

  function closePanel() {
    setActivePanel(null)
    setIsEditingEvent(false)
    setErrorMessage(null)
  }

  function closeFloatingMenu() {
    setIsMenuOpen(false)
  }

  function handleFloatingMenuSelect(action: FloatingEventMenuActionType) {
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
      void handleInviteFriends()
      return
    }

    if (action === 'delete-event') {
      openDeleteConfirmation()
    }
  }

  if (isLoading) {
    return <AnimatedContentLoader isVisible mode="panel" />
  }

  if (!user) {
    return (
      <section className="glass-card panel stack-md">
        <p className="eyebrow">Event</p>
        <h2 className="panel-title">Login required</h2>
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
    return <AnimatedContentLoader isVisible mode="panel" />
  }

  if (!detail.event && !detailQuery.isPending) {
    return (
      <section className="glass-card panel stack-md">
        <p className="eyebrow">Event</p>
        <h2 className="panel-title">Event not found</h2>
        <Link to="/" className="secondary-button">
          Back to dashboard
        </Link>
      </section>
    )
  }

  return (
    <div className="stack-lg">
      {(detailError || errorMessage) && (
        <section className="glass-card panel">
          {detailError ? <p className="form-error">{detailError}</p> : null}
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        </section>
      )}

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
          detail={detail}
          billAmount={billAmount}
          setBillAmount={setBillAmount}
          canSpin={Boolean(canRunModules)}
          activeAction={activeAction}
          onSpin={(submitEvent) => void handleSpin(submitEvent)}
        />
      ) : null}

      {event?.type === 'general' ? (
        <GeneralEventContent
          event={event}
          memberCount={detail.subscribers.length}
        />
      ) : null}

      {activePanel === 'members' ? (
        <section className="drawer-overlay" onClick={() => closePanel()}>
          <div
            className="glass-card create-drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawer-handle" aria-hidden="true" />
            <div className="split-header">
              <div className="section-header-copy">
                <p className="eyebrow">Event members</p>
                <h3 className="section-title">Members</h3>
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

            <div className="stack-sm">
              {detail.subscribers.map((subscriber) => {
                const isCurrentUser = subscriber.user_id === user?.id
                const canMakeCaptain =
                  Boolean(canManageMembers) &&
                  subscriber.event_role !== 'captain' &&
                  !isCurrentUser
                const canMakeCoCaptain =
                  Boolean(canManageMembers) &&
                  (subscriber.event_role === 'member' ||
                    subscriber.event_role === 'co-captain') &&
                  !isCurrentUser
                const canMakeMember =
                  Boolean(canManageMembers) &&
                  subscriber.event_role === 'co-captain' &&
                  (!isCurrentUser || profile?.role === 'admin')
                const canRemove =
                  Boolean(canManageMembers) &&
                  subscriber.event_role !== 'captain' &&
                  (!isCurrentUser || profile?.role === 'admin')
                const menuActions: MemberDirectoryMenuAction[] = []

                if (canMakeCaptain) {
                  menuActions.push({
                    id: `make-captain:${subscriber.user_id}`,
                    label:
                      activeAction === `make-captain:${subscriber.user_id}`
                        ? 'Making captain...'
                        : 'Make Captain',
                    onClick: () => void handleAction('make-captain', subscriber.user_id),
                  })
                }

                if (canMakeCoCaptain) {
                  const isCoCaptainLimitReached =
                    subscriber.event_role !== 'co-captain' && coCaptainCount >= 2

                  menuActions.push({
                    id: `make-co-captain:${subscriber.user_id}`,
                    label:
                      activeAction === `make-co-captain:${subscriber.user_id}`
                        ? 'Promoting...'
                        : subscriber.event_role === 'co-captain'
                          ? 'Already co-captain'
                          : isCoCaptainLimitReached
                            ? 'Co-captain limit reached'
                            : 'Make Co-captain',
                    disabled:
                      subscriber.event_role === 'co-captain' ||
                      isCoCaptainLimitReached,
                    onClick: () =>
                      void handleAction('make-co-captain', subscriber.user_id),
                  })
                }

                if (canMakeMember) {
                  menuActions.push({
                    id: `make-member:${subscriber.user_id}`,
                    label:
                      activeAction === `make-member:${subscriber.user_id}`
                        ? 'Updating...'
                        : 'Make Member',
                    onClick: () => void handleAction('make-member', subscriber.user_id),
                  })
                }

                if (canRemove) {
                  menuActions.push({
                    id: `remove:${subscriber.user_id}`,
                    label: 'Remove',
                    onClick: () => void handleAction('remove', subscriber.user_id),
                    isDanger: true,
                  })
                }

                return (
                  <MemberDirectoryCard
                    key={subscriber.user_id}
                    profile={{
                      id: subscriber.user_id,
                      full_name: getMemberName(subscriber),
                      email: subscriber.profiles.email,
                      role: subscriber.profiles.role,
                      blood_group: subscriber.profiles.blood_group,
                    }}
                    roleLabel={formatEventRole(subscriber.event_role)}
                    detailLines={[]}
                    menuActions={menuActions}
                    activeAction={activeAction}
                  />
                )
              })}
            </div>
          </div>
        </section>
      ) : null}

      {activePanel === 'leaderboard' ? (
        <section className="drawer-overlay" onClick={() => closePanel()}>
          <div
            className="glass-card create-drawer"
            onClick={(event) => event.stopPropagation()}
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
                      roleLabel={formatEventRole(entry.member.event_role)}
                      detailLines={[`${entry.monthsPaid} months paid`]}
                      sideContent={
                        <div className="member-directory-leaderboard-meta">
                          <span className="member-directory-rank">
                            #{index + 1}
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

      {activePanel === 'event-details' && detail.event ? (
        <section
          className="drawer-overlay"
          onClick={() => {
            closePanel()
          }}
        >
          <div
            className="glass-card create-drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawer-handle" aria-hidden="true" />
            <div className="split-header">
              <div className="section-header-copy">
                <p className="eyebrow">Event details</p>
                <h3 className="section-title">{detail.event.title}</h3>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => closePanel()}
              >
                Close
              </button>
            </div>

              {!isEditingEvent && (
                <>
                  <p className="section-note">
                    {detail.event.description || 'No description added for this event yet.'}
                  </p>
                  <div className="info-grid">
                    <InfoItem
                      label="Type"
                      value={formatEventType(detail.event.type)}
                    />
                    <InfoItem
                      label="Privacy"
                      value={formatVisibility(detail.event.visibility)}
                    />
                    <InfoItem
                      label="Date"
                      value={
                        detail.event.event_date
                          ? new Date(detail.event.event_date).toLocaleDateString()
                          : 'Unknown'
                      }
                    />
                    <InfoItem
                      label="Status"
                      value={detail.event.status ?? 'Unknown'}
                    />
                    <InfoItem
                      label="Members"
                      value={String(detail.subscribers.length)}
                    />
                    {detail.event.type === 'fund_tracker' ? (
                      <>
                        <InfoItem
                          label="Target"
                          value={
                            detail.event.target_amount
                              ? formatMoney(detail.event.target_amount)
                              : 'No target'
                          }
                        />
                        <InfoItem
                          label="Monthly default"
                          value={
                            detail.event.monthly_default_amount
                              ? formatMoney(detail.event.monthly_default_amount)
                              : 'Not set'
                          }
                        />
                      </>
                    ) : null}
                  </div>
                  {canEditEvent && (
                    <div className="actions-row" style={{ justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => {
                          setIsEditingEvent(true)
                          setEditTitle(detail.event?.title ?? '')
                          setEditDescription(detail.event?.description ?? '')
                          setEditEventDate(detail.event?.event_date.split('T')[0] ?? '')
                          setEditVisibility(detail.event?.visibility ?? 'public')
                          setEditTargetAmount(
                            detail.event.type === 'fund_tracker' &&
                              detail.event.target_amount
                              ? String(detail.event.target_amount)
                              : '',
                          )
                          setEditMonthlyDefaultAmount(
                            detail.event.type === 'fund_tracker' &&
                              detail.event.monthly_default_amount
                              ? String(detail.event.monthly_default_amount)
                              : '',
                          )
                        }}
                      >
                        Edit event
                      </button>
                    </div>
                  )}
                </>
              )}
              {isEditingEvent && (
                <form className="stack-md" onSubmit={handleEventUpdate}>
                  <label className="stack-xs">
                    <span className="field-label">Title</span>
                    <input
                      required
                      type="text"
                      className="field-input"
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                    />
                  </label>

                  <label className="stack-xs">
                    <span className="field-label">Description</span>
                    <textarea
                      className="field-input field-textarea"
                      value={editDescription}
                      onChange={(event) => setEditDescription(event.target.value)}
                    />
                  </label>

                  <div className="create-form-row">
                    <label className="stack-xs">
                      <span className="field-label">Event date</span>
                      <input
                        required
                        type="date"
                        className="field-input"
                        value={editEventDate}
                        onChange={(event) => setEditEventDate(event.target.value)}
                      />
                    </label>

                    <label className="stack-xs">
                      <span className="field-label">Privacy</span>
                      <select
                        className="field-input"
                        value={editVisibility}
                        onChange={(event) =>
                          setEditVisibility(event.target.value as EventVisibility)
                        }
                      >
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                      </select>
                    </label>
                  </div>

                  {detail.event.type === 'fund_tracker' ? (
                    <div className="create-form-row">
                      <label className="stack-xs">
                        <span className="field-label">Target amount</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="field-input"
                          value={editTargetAmount}
                          onChange={(event) => setEditTargetAmount(event.target.value)}
                        />
                      </label>
                      <label className="stack-xs">
                        <span className="field-label">Monthly(Optional)</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="field-input"
                          value={editMonthlyDefaultAmount}
                          onChange={(event) =>
                            setEditMonthlyDefaultAmount(event.target.value)
                          }
                        />
                      </label>
                    </div>
                  ) : null}

                  <div className="actions-row">
                    <button
                      type="submit"
                      className="primary-button"
                      disabled={activeAction === 'event-update'}
                    >
                      {activeAction === 'event-update' ? 'Saving...' : 'Save changes'}
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setIsEditingEvent(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
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
                <strong className="info-value">
                  {getMemberName(paymentMember)}
                </strong>
                <span className="field-label">{paymentMember.profiles.email}</span>
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

      <button
        type="button"
        className="fab-button event-fab-trigger"
        aria-label="Open event actions"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((current) => !current)}
      >
        <Menu size={20} />
      </button>

      {isMenuOpen ? (
        <div className="event-fab-menu-overlay" onClick={closeFloatingMenu} />
      ) : null}

      {isMenuOpen ? (
        <div className="event-fab-menu" role="menu" aria-label="Event actions">
          {menuActionItems.map((item) => (
            <button
              key={item.type}
              type="button"
              className={`event-fab-menu-item${item.isDanger ? ' is-danger' : ''}`}
              onClick={() => handleFloatingMenuSelect(item.type)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      {isDeleteConfirmOpen ? (
        <section
          className="drawer-overlay"
          onClick={closeDeleteConfirmation}
        >
          <div
            className="glass-card create-drawer delete-event-drawer"
            onClick={(event) => event.stopPropagation()}
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
