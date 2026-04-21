import type { FormEvent } from 'react'
import type { EventDetailData, EventVisibility } from '../../../utils/events'
import {
  formatEventType,
  formatMoney,
  formatVisibility,
  InfoItem,
} from '../EventTypeHelpers'
import EventDetailDrawer from './EventDetailDrawer'

export default function EventEditDrawer({
  event,
  memberCount,
  isOpen,
  isEditing,
  canEditEvent,
  activeAction,
  title,
  description,
  eventDate,
  visibility,
  targetAmount,
  monthlyDefaultAmount,
  onTitleChange,
  onDescriptionChange,
  onEventDateChange,
  onVisibilityChange,
  onTargetAmountChange,
  onMonthlyDefaultAmountChange,
  onSubmit,
  onStartEditing,
  onStopEditing,
  onClose,
}: {
  event: EventDetailData['event']
  memberCount: number
  isOpen: boolean
  isEditing: boolean
  canEditEvent: boolean
  activeAction: string | null
  title: string
  description: string
  eventDate: string
  visibility: EventVisibility
  targetAmount: string
  monthlyDefaultAmount: string
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onEventDateChange: (value: string) => void
  onVisibilityChange: (value: EventVisibility) => void
  onTargetAmountChange: (value: string) => void
  onMonthlyDefaultAmountChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onStartEditing: () => void
  onStopEditing: () => void
  onClose: () => void
}) {
  if (!event) {
    return null
  }

  return (
    <EventDetailDrawer
      isOpen={isOpen}
      eyebrow="Event details"
      title={event.title}
      onClose={onClose}
    >
      {!isEditing ? (
        <>
          <p className="section-note">
            {event.description || 'No description added for this event yet.'}
          </p>
          <div className="info-grid">
            <InfoItem label="Type" value={formatEventType(event.type)} />
            <InfoItem
              label="Privacy"
              value={formatVisibility(event.visibility)}
            />
            <InfoItem
              label="Date"
              value={
                event.event_date
                  ? new Date(event.event_date).toLocaleDateString()
                  : 'Unknown'
              }
            />
            <InfoItem label="Status" value={event.status ?? 'Unknown'} />
            <InfoItem label="Members" value={String(memberCount)} />
            {event.type === 'fund_tracker' ? (
              <>
                <InfoItem
                  label="Target"
                  value={
                    event.target_amount
                      ? formatMoney(event.target_amount)
                      : 'No target'
                  }
                />
                <InfoItem
                  label="Monthly default"
                  value={
                    event.monthly_default_amount
                      ? formatMoney(event.monthly_default_amount)
                      : 'Not set'
                  }
                />
              </>
            ) : null}
          </div>
          {canEditEvent ? (
            <div className="actions-row" style={{ justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="primary-button"
                onClick={onStartEditing}
              >
                Edit event
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <form className="stack-md" onSubmit={onSubmit}>
          <label className="stack-xs">
            <span className="field-label">Title</span>
            <input
              required
              type="text"
              className="field-input"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
            />
          </label>

          <label className="stack-xs">
            <span className="field-label">Description</span>
            <textarea
              className="field-input field-textarea"
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
            />
          </label>

          <div className="create-form-row">
            <label className="stack-xs">
              <span className="field-label">Event date</span>
              <input
                required
                type="date"
                className="field-input"
                value={eventDate}
                onChange={(event) => onEventDateChange(event.target.value)}
              />
            </label>

            <label className="stack-xs">
              <span className="field-label">Privacy</span>
              <select
                className="field-input"
                value={visibility}
                onChange={(event) =>
                  onVisibilityChange(event.target.value as EventVisibility)
                }
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </label>
          </div>

          {event.type === 'fund_tracker' ? (
            <div className="create-form-row">
              <label className="stack-xs">
                <span className="field-label">Target amount</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="field-input"
                  value={targetAmount}
                  onChange={(event) => onTargetAmountChange(event.target.value)}
                />
              </label>
              <label className="stack-xs">
                <span className="field-label">Monthly(Optional)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="field-input"
                  value={monthlyDefaultAmount}
                  onChange={(event) =>
                    onMonthlyDefaultAmountChange(event.target.value)
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
              onClick={onStopEditing}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </EventDetailDrawer>
  )
}
