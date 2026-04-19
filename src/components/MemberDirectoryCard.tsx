import { MemberAvatar } from './events/EventTypeHelpers'

type ProfileLike = {
  id: string
  full_name: string | null
  email: string
  role: 'admin' | 'member' | string
  blood_group: string | null
}

export type MemberDirectoryMenuAction = {
  id: string
  label: string
  loadingLabel?: string
  onClick: () => void
  disabled?: boolean
  isDanger?: true
}

type MemberDirectoryPrimaryAction = {
  id: string
  label: string
  loadingLabel?: string
  onClick: () => void
  disabled?: boolean
}

type MemberDirectoryCardProps = {
  profile: ProfileLike
  menuActions?: MemberDirectoryMenuAction[]
  primaryAction?: MemberDirectoryPrimaryAction
  activeAction?: string | null
}

export function MemberDirectoryCard({
  profile,
  menuActions = [],
  primaryAction,
  activeAction = null,
}: MemberDirectoryCardProps) {
  const appRoleLabel = profile.role === 'admin' ? 'App Admin' : 'Member'
  const canShowMenu = menuActions.length > 0

  return (
    <article className="member-directory-card">
      <div className="member-row">
        <MemberAvatar
          member={profile}
          avatarText={profile.blood_group?.trim() || null}
        />
        <div className="stack-xs">
          <strong className="info-value">
            {profile.full_name || 'Unnamed member'}
          </strong>
          <span className="member-directory-role-badge">
            {appRoleLabel}
          </span>
        </div>
      </div>

      <div className="member-directory-meta">
        {canShowMenu || primaryAction ? (
          <details className="admin-member-menu">
            <summary
              className="admin-member-menu-trigger"
              aria-label={`Actions for ${profile.full_name || profile.email}`}
            >
              ⋮
            </summary>
            <div className="admin-member-menu-panel">
              {primaryAction ? (
                <button
                  type="button"
                  className="secondary-button admin-member-menu-button"
                  onClick={primaryAction.onClick}
                  disabled={
                    primaryAction.disabled ||
                    (activeAction !== null && activeAction === primaryAction.id)
                  }
                >
                  {activeAction === primaryAction.id && primaryAction.loadingLabel
                    ? primaryAction.loadingLabel
                    : primaryAction.label}
                </button>
              ) : null}
              {menuActions.map((action) => (
                <button
                  type="button"
                  key={action.id}
                  className={`secondary-button admin-member-menu-button${
                    action.isDanger ? ' danger-button' : ''
                  }`}
                  onClick={action.onClick}
                  disabled={
                    action.disabled || (activeAction !== null && activeAction === action.id)
                  }
                >
                  {activeAction === action.id && action.loadingLabel
                    ? action.loadingLabel
                    : action.label}
                </button>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </article>
  )
}
