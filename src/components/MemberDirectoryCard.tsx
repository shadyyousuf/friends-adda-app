import { MemberAvatar } from './events/EventTypeHelpers'
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'

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
  roleLabel?: string
  detailLines?: ReactNode[]
  sideContent?: ReactNode
  sideContentClassName?: string
  menuActions?: MemberDirectoryMenuAction[]
  primaryAction?: MemberDirectoryPrimaryAction
  activeAction?: string | null
  highlight?: boolean
  metaClassName?: string
}

export function MemberDirectoryCard({
  profile,
  menuActions = [],
  primaryAction,
  activeAction = null,
  roleLabel,
  detailLines = [],
  sideContent,
  sideContentClassName,
  highlight = false,
  metaClassName,
}: MemberDirectoryCardProps) {
  const appRoleLabel = roleLabel?.trim() ?? (profile.role === 'admin' ? 'App Admin' : 'Member')
  const canShowMenu = menuActions.length > 0
  const menuRef = useRef<HTMLDetailsElement>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    if (!isMenuOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current || menuRef.current.contains(event.target as Node)) {
        return
      }

      setIsMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown, true)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [isMenuOpen])

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  const toggleMenu = (event: MouseEvent<HTMLSummaryElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsMenuOpen((previouslyOpen) => !previouslyOpen)
  }

  const handlePrimaryAction = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (!primaryAction) {
      return
    }

    if (
      primaryAction.disabled ||
      (activeAction !== null && activeAction === primaryAction.id)
    ) {
      return
    }

    closeMenu()
    primaryAction.onClick()
  }

  const handleMenuAction = (
    event: MouseEvent<HTMLButtonElement>,
    action: MemberDirectoryMenuAction,
  ) => {
    event.stopPropagation()

    if (action.disabled || (activeAction !== null && activeAction === action.id)) {
      return
    }

    closeMenu()
    action.onClick()
  }

  return (
    <article className="member-directory-card">
      <div className="member-row member-directory-main">
        <MemberAvatar
          member={profile}
          highlight={highlight}
          avatarText={profile.blood_group?.trim() || null}
        />
        <div className="stack-xs">
          <strong className="info-value member-directory-name">
            {profile.full_name || 'Unnamed member'}
          </strong>
          {detailLines.map((line, index) => (
            <span className="field-label" key={index}>
              {line}
            </span>
          ))}
          {appRoleLabel ? <span className="member-directory-role-badge">{appRoleLabel}</span> : null}
        </div>
      </div>

      <div
        className={`member-directory-meta${metaClassName ? ` ${metaClassName}` : ''}`}
      >
        {sideContent ? <div className="member-directory-side-content">{sideContent}</div> : null}
        {canShowMenu || primaryAction ? (
          <details
            ref={menuRef}
            className="admin-member-menu"
            open={isMenuOpen}
          >
            <summary
              className="admin-member-menu-trigger"
              aria-label={`Actions for ${profile.full_name || profile.email}`}
              onClick={toggleMenu}
            >
              ⋮
            </summary>
            <div className="admin-member-menu-panel">
              {primaryAction ? (
                <button
                  type="button"
                  className="secondary-button admin-member-menu-button"
                  onClick={handlePrimaryAction}
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
                  onClick={(event) => handleMenuAction(event, action)}
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
