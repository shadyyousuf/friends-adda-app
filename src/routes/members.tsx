import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useDeferredValue, useState } from 'react'
import AnimatedContentLoader from '../components/AnimatedContentLoader'
import RefreshIconButton from '../components/RefreshIconButton'
import {
  MemberDirectoryCard,
  type MemberDirectoryMenuAction,
} from '../components/MemberDirectoryCard'
import { useAuth } from '../components/AuthProvider'
import { useMemberAdminActions } from '../hooks/useMemberAdminActions'
import { approvedProfilesQueryOptions } from '../utils/profile'

export const Route = createFileRoute('/members')({
  component: MembersPage,
})

function MembersPage() {
  const { user, profile, authStatus, isProfileLoading } = useAuth()
  const viewerId = user?.id ?? ''
  const [query, setQuery] = useState('')
  const {
    activeAction: activeMemberAction,
    error: memberActionError,
    promoteMember,
    removeMember,
  } = useMemberAdminActions(viewerId)
  const deferredQuery = useDeferredValue(query)
  const membersQuery = useQuery({
    ...approvedProfilesQueryOptions(viewerId),
    enabled: Boolean(user && profile?.is_approved),
  })
  const members = membersQuery.data ?? []
  const errorMessage =
    membersQuery.error instanceof Error
      ? membersQuery.error.message
      : membersQuery.error
        ? 'Failed to load members.'
        : null
  const isMembersRefreshing =
    membersQuery.isPending || membersQuery.isRefetching

  const normalizedQuery = deferredQuery.trim().toLowerCase()
  const filteredMembers = members.filter((member) => {
    if (!normalizedQuery) {
      return true
    }

    const haystack = [
      member.full_name ?? '',
      member.email,
      member.blood_group ?? '',
      member.role,
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(normalizedQuery)
  })

  const canManageMembers = profile?.role === 'admin'

  async function handlePromoteToAdmin(userId: string) {
    await promoteMember(userId)
  }

  async function handleRemoveFromApp(userId: string) {
    await removeMember(userId)
  }

  if (
    authStatus === 'initializing' ||
    (authStatus === 'signed-in' && isProfileLoading && !profile)
  ) {
    return <AnimatedContentLoader isVisible mode="panel" />
  }

  if (authStatus === 'signed-out' || !user) {
    return (
      <section className="glass-card panel stack-md">
        <p className="eyebrow">Members</p>
        <h2 className="panel-title">Login required</h2>
      </section>
    )
  }

  return (
    <div className="stack-lg">
      <section className="glass-card panel stack-md">
        <div className="split-header">
          <div className="section-header-copy">
            <p className="eyebrow">Members</p>
            <h2 className="panel-title">Find approved members fast</h2>
          </div>
          <RefreshIconButton
            label="Refresh members"
            isRefreshing={isMembersRefreshing}
            onClick={() => membersQuery.refetch()}
          />
        </div>
        <label className="stack-xs">
          <span className="field-label">Search</span>
          <input
            type="text"
            className="field-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, email, blood group, or role"
          />
        </label>
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        {memberActionError ? <p className="form-error">{memberActionError}</p> : null}
      </section>

      <section className="glass-card panel stack-md">
        <div className="split-header">
          <h3 className="section-title">Results</h3>
          <span className="status-chip">{filteredMembers.length}</span>
        </div>

        {membersQuery.isPending && members.length === 0 ? (
          <AnimatedContentLoader isVisible mode="panel" />
        ) : filteredMembers.length === 0 ? (
          <div className="empty-state">
            <h4 className="empty-state-title">No match found</h4>
          </div>
        ) : (
          <div className="stack-sm">
            {filteredMembers.map((member) => {
              const menuActions: MemberDirectoryMenuAction[] = []

              if (canManageMembers && member.role !== 'admin') {
                menuActions.push({
                  id: `promote:${member.id}`,
                  label: 'Promote to Admin',
                  loadingLabel: 'Promoting...',
                  onClick: () => void handlePromoteToAdmin(member.id),
                })
              }

              if (canManageMembers && member.id !== user.id) {
                menuActions.push({
                  id: `remove:${member.id}`,
                  label: 'Remove from app',
                  loadingLabel: 'Removing...',
                  onClick: () => void handleRemoveFromApp(member.id),
                  isDanger: true,
                })
              }

              return (
                <MemberDirectoryCard
                  key={member.id}
                  profile={member}
                  menuActions={menuActions}
                  activeAction={activeMemberAction}
                />
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
