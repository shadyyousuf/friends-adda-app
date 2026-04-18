import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useDeferredValue, useState } from 'react'
import AnimatedContentLoader from '../components/AnimatedContentLoader'
import { useAuth } from '../components/AuthProvider'
import { approvedProfilesQueryOptions } from '../utils/profile'
import type { Database } from '../utils/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

export const Route = createFileRoute('/members')({
  component: MembersPage,
})

function MembersPage() {
  const { user, profile, isLoading } = useAuth()
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const membersQuery = useQuery({
    ...approvedProfilesQueryOptions(),
    enabled: Boolean(user && profile?.is_approved),
  })
  const members = membersQuery.data ?? []
  const errorMessage =
    membersQuery.error instanceof Error
      ? membersQuery.error.message
      : membersQuery.error
        ? 'Failed to load members.'
        : null

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

  if (isLoading) {
    return <AnimatedContentLoader isVisible mode="panel" />
  }

  if (!user) {
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
            <h2 className="panel-title">Approved directory</h2>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => void membersQuery.refetch()}
            disabled={membersQuery.isPending || membersQuery.isRefetching}
          >
            {membersQuery.isPending || membersQuery.isRefetching
              ? 'Refreshing...'
              : 'Refresh'}
          </button>
        </div>
        <label className="stack-xs">
          <span className="field-label">Search</span>
          <input
            type="text"
            className="field-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
          />
        </label>
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
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
            {filteredMembers.map((member) => (
              <article key={member.id} className="member-directory-card">
                <div className="stack-xs">
                  <strong className="info-value">
                    {member.full_name || 'Unnamed member'}
                  </strong>
                  <span className="field-label">{member.email}</span>
                </div>
                <div className="member-directory-meta">
                  <span className="event-badge event-badge-strong">
                    {member.blood_group || 'Blood group not set'}
                  </span>
                  <span className="field-label">
                    {member.role === 'admin' ? 'App Admin' : 'Member'}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
