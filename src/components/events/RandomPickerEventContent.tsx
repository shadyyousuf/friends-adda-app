import { MemberDirectoryCard } from '../MemberDirectoryCard'
import type { FormEvent } from 'react'

type RandomPickerEventContentProps = {
  billAmount: string
  setBillAmount: (value: string) => void
  canSpin: boolean
  canEditWinnerAmount?: boolean
  winners: Array<{
    activityId: string
    winner: {
      user_id: string
      profiles: {
        full_name: string | null
        email: string
        role: string
        blood_group: string | null
      }
    }
    amount: number
    createdAt: string
  }>
  activeAction: string | null
  onSpin: (event: FormEvent<HTMLFormElement>) => void
  onEditWinnerAmount?: (winner: {
    activityId: string
    winnerName: string
    amount: number
  }) => void
}

function formatWinnerAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return '0'
  }

  return Math.round(value).toLocaleString('en-US')
}

function formatWinnerDateTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }

  const dateText = date.toLocaleDateString()
  const timeText = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return `${dateText} ${timeText}`
}

export function RandomPickerEventContent({
  billAmount,
  setBillAmount,
  canSpin,
  canEditWinnerAmount = false,
  winners,
  activeAction,
  onSpin,
  onEditWinnerAmount,
}: RandomPickerEventContentProps) {
  const handleEditAmount = (
    winner: RandomPickerEventContentProps['winners'][number],
) => {
    if (!canEditWinnerAmount || !onEditWinnerAmount) {
      return
    }

    onEditWinnerAmount({
      activityId: winner.activityId,
      winnerName: winner.winner.profiles.full_name || 'Unknown member',
      amount: winner.amount,
    })
  }

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
        <div className="section-header-copy">
          <p className="eyebrow">Winners</p>
          <h3 className="section-title">Winners</h3>
        </div>
        {winners.length === 0 ? (
          <div className="empty-state">
            <h4 className="empty-state-title">No winners yet</h4>
          </div>
        ) : (
          winners.map((winner) => (
            <MemberDirectoryCard
              key={winner.winner.user_id}
              profile={{
                id: winner.winner.user_id,
                full_name: winner.winner.profiles.full_name,
                email: winner.winner.profiles.email,
                role: winner.winner.profiles.role,
                blood_group: winner.winner.profiles.blood_group,
              }}
              roleLabel=""
              detailLines={[
                formatWinnerDateTime(winner.createdAt),
              ]}
              metaClassName="member-directory-meta-random-picker-winner"
              sideContent={
                canEditWinnerAmount ? (
                  <button
                    type="button"
                    className="primary-button random-picker-winner-amount-button"
                    onClick={() => handleEditAmount(winner)}
                    disabled={activeAction === `random-winner:${winner.activityId}`}
                    aria-label={`Edit amount for ${winner.winner.profiles.full_name || 'winner'}`}
                  >
                    {formatWinnerAmount(winner.amount)}
                  </button>
                ) : (
                  <span className="info-value">
                    {formatWinnerAmount(winner.amount)}
                  </span>
                )
              }
            />
          ))
        )}
      </div>
    </section>
  )
}
