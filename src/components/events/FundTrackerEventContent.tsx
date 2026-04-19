import { CheckCircle2, Clock3, ChevronLeft, ChevronRight, Target, Users } from 'lucide-react'
import type { TouchEvent } from 'react'
import {
  buildFundStatusItems,
  calculateMonthlyProgress,
  formatPeriodLabel,
  getMemberName,
  periodKey,
  type FundPeriod,
} from '../../utils/fund-tracker'
import { formatMoney, MemberAvatar } from './EventTypeHelpers'
import type { EventDetailData } from '../../utils/events'

type FundTrackerEventContentProps = {
  event: EventDetailData['event']
  detail: EventDetailData
  totalCollected: number
  selectedPeriodLabel: string
  selectedPeriodKey: string
  fundPeriods: FundPeriod[]
  selectedPeriodIndex: number
  fundStatusItems: ReturnType<typeof buildFundStatusItems>
  monthlyProgress: ReturnType<typeof calculateMonthlyProgress>
  monthlyDefaultAmount: number | null
  canRunModules: boolean
  activeAction: string | null
  onTouchStart: (event: TouchEvent<HTMLElement>) => void
  onTouchEnd: (event: TouchEvent<HTMLElement>) => void
  onOlderMonth: () => void
  onNewerMonth: () => void
  onPeriodChange: (value: string) => void
  onOpenPaymentDrawer: (userId: string) => void
}

export function FundTrackerEventContent({
  event,
  detail,
  totalCollected,
  selectedPeriodLabel,
  selectedPeriodKey,
  fundPeriods,
  selectedPeriodIndex,
  fundStatusItems,
  monthlyProgress,
  monthlyDefaultAmount,
  canRunModules,
  activeAction,
  onTouchStart,
  onTouchEnd,
  onOlderMonth,
  onNewerMonth,
  onPeriodChange,
  onOpenPaymentDrawer,
}: FundTrackerEventContentProps) {
  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('en-BD', {
      maximumFractionDigits: 2,
    }).format(amount)

  if (!event) {
    return null
  }

  return (
    <section
      className="fund-tracker-layout"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
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
          <div className="fund-total-value">{formatMoney(totalCollected)}</div>
          <div className="fund-total-meta">
            <span className="event-badge">
              <Users size={14} />
              {detail.subscribers.length} members
            </span>
            <span className="event-badge">
              <Target size={14} />
              {event.target_amount ? formatMoney(event.target_amount) : 'No target set'}
            </span>
            <span className="event-badge">
              Monthly default
              {monthlyDefaultAmount ? ` ${formatMoney(monthlyDefaultAmount)}` : ' not set'}
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
              onClick={onOlderMonth}
              disabled={selectedPeriodIndex >= fundPeriods.length - 1}
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="topbar-action-button"
              onClick={onNewerMonth}
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
            onChange={(event) => onPeriodChange(event.target.value)}
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
          <span className="field-label">{Math.round(monthlyProgress.percentage)}%</span>
        </div>
        <div className="progress-track" aria-hidden="true">
          <div
            className={
              monthlyProgress.percentage === 100 ? 'progress-fill is-complete' : 'progress-fill'
            }
            style={{ width: `${monthlyProgress.percentage}%` }}
          />
        </div>
      </section>

      <section
        className="glass-card panel stack-md fade-in-up"
        style={{ animationDelay: '0.15s' }}
      >
        <div className="split-header">
          <div className="section-header-copy">
            <p className="eyebrow">Payment status</p>
            <h3 className="section-title">Pending first, paid after</h3>
          </div>
          <span className="status-chip">{fundStatusItems.length}</span>
        </div>
        {fundStatusItems.length === 0 ? (
          <div className="empty-state">
            <h4 className="empty-state-title">No members in this event yet</h4>
          </div>
        ) : (
          <div className="stack-sm">
            {fundStatusItems.map((item) => (
              <article key={item.member.user_id} className="fund-status-card">
                <div className="member-row">
                  <MemberAvatar member={item.member} />
                  <div className="stack-xs">
                    <strong className="info-value">{getMemberName(item.member)}</strong>
                    {item.status === 'paid' ? (
                      <div className="payment-state payment-state-paid">
                        <CheckCircle2 size={16} color="#22c55e" />
                        <span className="fund-status-paid-amount">
                          {formatAmount(Number(item.payment?.amount ?? 0))}
                        </span>
                      </div>
                    ) : (
                      <div className="payment-state payment-state-pending">
                        <Clock3 size={16} />
                        <span>Pending</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="fund-status-aside">
                  {canRunModules && item.status === 'pending' ? (
                    <button
                      type="button"
                      className="primary-button fund-status-action"
                      onClick={() => onOpenPaymentDrawer(item.member.user_id)}
                      disabled={activeAction === `payment:${item.member.user_id}`}
                    >
                      {monthlyDefaultAmount
                        ? formatAmount(monthlyDefaultAmount)
                        : 'Set amount'}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
