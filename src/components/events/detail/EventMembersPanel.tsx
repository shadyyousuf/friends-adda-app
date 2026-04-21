import {
  MemberDirectoryCard,
  type MemberDirectoryMenuAction,
} from '../../MemberDirectoryCard'
import { formatEventRole } from '../EventTypeHelpers'
import type { EventSubscriberWithProfile } from '../../../utils/events'
import { getMemberName } from '../../../utils/fund-tracker'
import EventDetailDrawer from './EventDetailDrawer'

type MemberActionType =
  | 'make-captain'
  | 'make-co-captain'
  | 'make-member'
  | 'remove'

export default function EventMembersPanel({
  isOpen,
  subscribers,
  currentUserId,
  currentUserRole,
  canManageMembers,
  coCaptainCount,
  activeAction,
  onClose,
  onAction,
}: {
  isOpen: boolean
  subscribers: EventSubscriberWithProfile[]
  currentUserId?: string
  currentUserRole?: string | null
  canManageMembers: boolean
  coCaptainCount: number
  activeAction: string | null
  onClose: () => void
  onAction: (action: MemberActionType, userId: string) => void
}) {
  return (
    <EventDetailDrawer
      isOpen={isOpen}
      eyebrow="Event members"
      title="Members"
      onClose={onClose}
    >
      <div className="stack-sm">
        {subscribers.map((subscriber) => {
          const isCurrentUser = subscriber.user_id === currentUserId
          const canMakeCaptain =
            canManageMembers &&
            subscriber.event_role !== 'captain' &&
            !isCurrentUser
          const canMakeCoCaptain =
            canManageMembers &&
            (subscriber.event_role === 'member' ||
              subscriber.event_role === 'co-captain') &&
            !isCurrentUser
          const canMakeMember =
            canManageMembers &&
            subscriber.event_role === 'co-captain' &&
            (!isCurrentUser || currentUserRole === 'admin')
          const canRemove =
            canManageMembers &&
            subscriber.event_role !== 'captain' &&
            (!isCurrentUser || currentUserRole === 'admin')
          const menuActions: MemberDirectoryMenuAction[] = []

          if (canMakeCaptain) {
            menuActions.push({
              id: `make-captain:${subscriber.user_id}`,
              label:
                activeAction === `make-captain:${subscriber.user_id}`
                  ? 'Making captain...'
                  : 'Make Captain',
              onClick: () => onAction('make-captain', subscriber.user_id),
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
              onClick: () => onAction('make-co-captain', subscriber.user_id),
            })
          }

          if (canMakeMember) {
            menuActions.push({
              id: `make-member:${subscriber.user_id}`,
              label:
                activeAction === `make-member:${subscriber.user_id}`
                  ? 'Updating...'
                  : 'Make Member',
              onClick: () => onAction('make-member', subscriber.user_id),
            })
          }

          if (canRemove) {
            menuActions.push({
              id: `remove:${subscriber.user_id}`,
              label: 'Remove',
              onClick: () => onAction('remove', subscriber.user_id),
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
    </EventDetailDrawer>
  )
}
