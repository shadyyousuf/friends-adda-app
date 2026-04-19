import { formatMoney } from './EventTypeHelpers'
import type { EventDetailData } from '../../utils/events'
import type { FormEvent } from 'react'

type RandomPickerEventContentProps = {
  detail: EventDetailData
  billAmount: string
  setBillAmount: (value: string) => void
  canSpin: boolean
  activeAction: string | null
  onSpin: (event: FormEvent<HTMLFormElement>) => void
}

export function RandomPickerEventContent({
  detail,
  billAmount,
  setBillAmount,
  canSpin,
  activeAction,
  onSpin,
}: RandomPickerEventContentProps) {
  return (
    <section className="glass-card panel stack-md">
      <div className="section-header-copy">
        <p className="eyebrow">Random picker</p>
        <h3 className="section-title">Spin to choose who pays</h3>
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
      </form>

      <div className="stack-sm">
        {detail.activities.length === 0 ? (
          <div className="empty-state">
            <h4 className="empty-state-title">No random picks yet</h4>
          </div>
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
                <span className="field-label">
                  {new Date(activity.created_at).toLocaleString()}
                </span>
              </article>
            )
          })
        )}
      </div>
    </section>
  )
}
