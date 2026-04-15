import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useDeferredValue, useState } from 'react'
import { useAuth } from '../components/AuthProvider'
import { listApprovedProfiles } from '../utils/profile'
import type { Database } from '../utils/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

export const Route = createFileRoute('/members')({
  component: MembersPage,
})

function MembersPage() {
  const { user, profile, isLoading } = useAuth()
  const [members, setMembers] = useState<Profile[]>([])
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [isMembersLoading, setIsMembersLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !profile?.is_approved) {
      setMembers([])
      setErrorMessage(null)
      return
    }

    void refreshMembers()
  }, [user?.id, profile?.is_approved])

  async function refreshMembers() {
    setErrorMessage(null)
    setIsMembersLoading(true)

    try {
      const approvedProfiles = await listApprovedProfiles()
      setMembers(approvedProfiles)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to load members.',
      )
    } finally {
      setIsMembersLoading(false)
    }
  }

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
    return (
      <section className="glass-card panel stack-md">
        <p className="eyebrow">Members</p>
        <h2 className="panel-title">Loading members</h2>
        <p className="muted-copy">Checking your session first.</p>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="glass-card panel stack-md">
        <p className="eyebrow">Members</p>
        <h2 className="panel-title">Login required</h2>
        <p className="muted-copy">Sign in to browse the approved members list.</p>
      </section>
    )
  }

  return (
    <div className="stack-lg">
      <section className="glass-card panel stack-md">
        <div className="split-header">
          <div className="stack-xs">
            <p className="eyebrow">Members</p>
            <h2 className="panel-title">Approved directory</h2>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => void refreshMembers()}
            disabled={isMembersLoading}
          >
            {isMembersLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        <p className="muted-copy">
          Search by name or blood group. Blood groups stay visible on every card
          to match the Phase 8 requirement.
        </p>
        <label className="stack-xs">
          <span className="field-label">Search</span>
          <input
            type="text"
            className="field-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or blood group"
          />
        </label>
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      </section>

      <section className="glass-card panel stack-md">
        <div className="split-header">
          <h3 className="section-title">Results</h3>
          <span className="status-chip">{filteredMembers.length}</span>
        </div>

        {filteredMembers.length === 0 ? (
          <p className="muted-copy">
            No approved members matched the current search.
          </p>
        ) : (
          <div className="stack-sm">
            {filteredMembers.map((member) => (
              <article key={member.id} className="member-directory-card">
                <div className="stack-xs">
                  <strong className="info-value">
                    {member.full_name || 'Unnamed member'}
                  </strong>
                  <span className="muted-copy">{member.email}</span>
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
