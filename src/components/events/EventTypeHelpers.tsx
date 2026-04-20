import { Crown } from 'lucide-react'
import {
  getAvatarGradient,
  formatPeriodLabel,
  getMemberName,
  periodKey,
  type TimelineItem,
} from '../../utils/fund-tracker'
import type { EventSubscriberWithProfile } from '../../utils/events'

export function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)
}

export function formatEventType(type?: string) {
  if (type === 'general') {
    return 'General'
  }

  if (type === 'random_picker') {
    return 'Random Picker'
  }

  if (type === 'fund_tracker') {
    return 'Fund Tracker'
  }

  return 'Unknown'
}

export function formatVisibility(visibility?: string) {
  if (visibility === 'private') {
    return 'Private'
  }

  if (visibility === 'public') {
    return 'Public'
  }

  return 'Unknown'
}

export function formatEventRole(role: EventSubscriberWithProfile['event_role']) {
  if (role === 'co-captain') {
    return 'Co-Captain'
  }

  if (role === 'captain') {
    return 'Captain'
  }

  return 'Member'
}

type MemberAvatarInput = {
  full_name?: string | null
  email?: string
} & {
  profiles?: {
    full_name?: string | null
    email?: string
  }
}

export function MemberAvatar({
  member,
  highlight = false,
  avatarText,
}: {
  member: MemberAvatarInput
  highlight?: boolean
  avatarText?: string | null
}) {
  const source = member.profiles ?? member
  const fullName = source.full_name ?? null
  const email = source.email ?? ''
  const name = getMemberName({
    profiles: {
      full_name: fullName,
      email,
    },
  })
  const displayText = avatarText?.trim() || name.charAt(0).toUpperCase()

  return (
    <div className="avatar-shell">
      <div
        className="member-avatar"
        style={{ backgroundImage: getAvatarGradient(name) }}
        aria-hidden="true"
      >
        {displayText}
      </div>
      {highlight ? (
        <span className="avatar-crown" aria-hidden="true">
          <Crown size={12} />
        </span>
      ) : null}
    </div>
  )
}

export function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-card">
      <span className="info-label">{label}</span>
      <strong className="info-value">{value}</strong>
    </div>
  )
}

export function ContributionTimeline({
  items,
}: {
  items: TimelineItem[]
}) {
  if (items.length === 0) {
    return (
      <div className="empty-state">
        <h4 className="empty-state-title">No recorded payments yet</h4>
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
                {item.payment
                  ? formatMoney(Number(item.payment.amount))
                  : formatMoney(0)}
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

export function SubscriberPreview({
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
          <span className="member-directory-role-badge">Admin</span>
        ) : null}
        <span className="event-badge event-badge-strong">
          {formatEventRole(subscriber.event_role)}
        </span>
      </div>
    </article>
  )
}
