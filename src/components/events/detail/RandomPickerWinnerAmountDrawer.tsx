import type { FormEvent } from 'react'
import EventDetailDrawer from './EventDetailDrawer'

type EditingWinner = {
  activityId: string
  winnerName: string
  amount: number
}

export default function RandomPickerWinnerAmountDrawer({
  winner,
  amount,
  activeAction,
  onAmountChange,
  onSubmit,
  onClose,
}: {
  winner: EditingWinner | null
  amount: string
  activeAction: string | null
  onAmountChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onClose: () => void
}) {
  return (
    <EventDetailDrawer
      isOpen={Boolean(winner)}
      eyebrow="Random picker"
      title="Edit winner amount"
      onClose={onClose}
    >
      {winner ? (
        <>
          <p className="field-label">{winner.winnerName}</p>
          <form className="stack-md" onSubmit={onSubmit}>
            <label className="stack-xs">
              <span className="field-label">Amount</span>
              <input
                type="number"
                min="1"
                step="1"
                className="field-input"
                value={amount}
                onChange={(event) => onAmountChange(event.target.value)}
              />
            </label>
            <div className="actions-row">
              <button
                type="submit"
                className="primary-button"
                disabled={activeAction === `random-winner:${winner.activityId}`}
              >
                {activeAction === `random-winner:${winner.activityId}`
                  ? 'Updating...'
                  : 'Update'}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </form>
        </>
      ) : null}
    </EventDetailDrawer>
  )
}
