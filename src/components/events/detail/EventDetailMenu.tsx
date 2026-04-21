import {
  CheckCircle2,
  Info,
  Menu,
  Pencil,
  Trash2,
  Trophy,
  UserRoundPlus,
  Users,
} from 'lucide-react'
import type { ReactNode } from 'react'

export type EventDetailMenuActionType =
  | 'close-event'
  | 'edit-event'
  | 'event-details'
  | 'leaderboard'
  | 'members'
  | 'invite-friends'
  | 'delete-event'

export type EventDetailMenuItem = {
  type: EventDetailMenuActionType
  label: string
  icon: ReactNode
  tone?: 'danger' | 'success'
}

export function getEventMenuItems(
  eventType?: string,
  canCloseEvent?: boolean,
  canDelete?: boolean,
  canEditEvent?: boolean,
  canManageMembers?: boolean,
  isClosed?: boolean,
): EventDetailMenuItem[] {
  const items: EventDetailMenuItem[] = []

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
      ...(canManageMembers
        ? [
            {
              type: 'invite-friends' as const,
              label: 'Add Friend',
              icon: <UserRoundPlus size={16} />,
            },
          ]
        : []),
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
      ...(canManageMembers
        ? [
            {
              type: 'invite-friends' as const,
              label: 'Add Friend',
              icon: <UserRoundPlus size={16} />,
            },
          ]
        : []),
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
      ...(canManageMembers
        ? [
            {
              type: 'invite-friends' as const,
              label: 'Add Friend',
              icon: <UserRoundPlus size={16} />,
            },
          ]
        : []),
    )
  }

  if (canCloseEvent && !isClosed) {
    items.push({
      type: 'close-event',
      label: 'Close Event',
      icon: <CheckCircle2 size={16} />,
      tone: 'success',
    })
  }

  if (canDelete && !isClosed) {
    items.push({
      type: 'delete-event',
      label: 'Delete event',
      icon: <Trash2 size={16} />,
      tone: 'danger',
    })
  }

  return items
}

export default function EventDetailMenu({
  isOpen,
  items,
  onToggle,
  onClose,
  onSelect,
}: {
  isOpen: boolean
  items: EventDetailMenuItem[]
  onToggle: () => void
  onClose: () => void
  onSelect: (type: EventDetailMenuActionType) => void
}) {
  return (
    <>
      <button
        type="button"
        className="fab-button event-fab-trigger"
        aria-label="Open event actions"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={onToggle}
      >
        <Menu size={20} />
      </button>

      {isOpen ? (
        <div className="event-fab-menu-overlay" onClick={onClose} />
      ) : null}

      {isOpen ? (
        <div className="event-fab-menu" role="menu" aria-label="Event actions">
          {items.map((item) => (
            <button
              key={item.type}
              type="button"
              className={`event-fab-menu-item${
                item.tone === 'danger'
                  ? ' is-danger'
                  : item.tone === 'success'
                    ? ' is-success'
                    : ''
              }`}
              onClick={() => onSelect(item.type)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </>
  )
}
