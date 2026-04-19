import {
  formatVisibility,
  formatEventType,
  InfoItem,
} from './EventTypeHelpers'
import type { EventDetailData } from '../../utils/events'

type GeneralEventContentProps = {
  event: EventDetailData['event']
  memberCount?: number
}

export function GeneralEventContent({
  event,
  memberCount,
}: GeneralEventContentProps) {
  if (!event) {
    return null
  }

  return (
    <>
      <section className="glass-card panel stack-md">
        <div className="split-header">
          <div className="section-header-copy">
            <p className="eyebrow">Event detail</p>
            <h2 className="panel-title">{event.title}</h2>
          </div>
        </div>
        <p className="section-note">
          {event.description || 'No description added for this event yet.'}
        </p>
        <div className="info-grid">
          <InfoItem label="Type" value={formatEventType(event.type)} />
          <InfoItem label="Privacy" value={formatVisibility(event.visibility)} />
          <InfoItem
            label="Event date"
            value={event.event_date ? new Date(event.event_date).toLocaleDateString() : 'unknown'}
          />
          <InfoItem label="Status" value={event.status ?? 'unknown'} />
          <InfoItem label="Members" value={String(memberCount ?? 0)} />
        </div>
      </section>
    </>
  )
}
