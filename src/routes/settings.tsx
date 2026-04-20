import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import AnimatedContentLoader from '../components/AnimatedContentLoader'
import { useAuth } from '../components/AuthProvider'
import {
  MemberDirectoryCard,
} from '../components/MemberDirectoryCard'
import { signOut } from '../utils/auth'
import {
  applyThemeMode,
  getStoredThemeMode,
  setThemeMode,
  type ThemeMode,
} from '../utils/theme'
import {
  approvedMemberProfilesQueryOptions,
  approveUser,
  removeUserFromApp,
  pendingProfilesQueryOptions,
  profileKeys,
  promoteUserToAdmin,
  updateOwnProfile,
} from '../utils/profile'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { user, profile, authStatus, isProfileLoading, refreshProfile } = useAuth()
  const queryClient = useQueryClient()
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [bloodGroup, setBloodGroup] = useState(profile?.blood_group ?? '')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [activeMemberAction, setActiveMemberAction] = useState<string | null>(null)

  useEffect(() => {
    setFullName(profile?.full_name ?? '')
    setBloodGroup(profile?.blood_group ?? '')
  }, [profile?.full_name, profile?.blood_group])

  const isAdmin = profile?.role === 'admin'
  const pendingProfilesQuery = useQuery({
    ...pendingProfilesQueryOptions(),
    enabled: isAdmin,
  })
  const approvedMembersQuery = useQuery({
    ...approvedMemberProfilesQueryOptions(),
    enabled: isAdmin,
  })
  const pendingProfiles = pendingProfilesQuery.data ?? []
  const queryAdminError =
        pendingProfilesQuery.error instanceof Error
        ? pendingProfilesQuery.error.message
        : approvedMembersQuery.error instanceof Error
        ? approvedMembersQuery.error.message
        : pendingProfilesQuery.error || approvedMembersQuery.error
          ? 'Failed to load admin data.'
          : null

  async function handleSignOut() {
    setIsSigningOut(true)

    try {
      await signOut()
    } finally {
      setIsSigningOut(false)
    }
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProfileMessage(null)
    setProfileError(null)
    setIsSavingProfile(true)

    try {
      await updateOwnProfile({ fullName, bloodGroup })
      await refreshProfile()
      setProfileMessage('Profile updated.')
    } catch (error) {
      setProfileError(
        error instanceof Error ? error.message : 'Failed to update profile.',
      )
    } finally {
      setIsSavingProfile(false)
    }
  }

  async function refreshAdminLists() {
    setAdminError(null)
    await Promise.all([
      pendingProfilesQuery.refetch(),
      approvedMembersQuery.refetch(),
    ])
  }

  async function handleApprove(userId: string) {
    await runMemberAction(
      `approve:${userId}`,
      () => approveUser(userId),
      'Failed to approve user.',
    )
  }

  async function handlePromote(userId: string) {
    await runMemberAction(
      `promote:${userId}`,
      () => promoteUserToAdmin(userId),
      'Failed to promote user.',
    )
  }

  async function handleRemoveFromApp(userId: string) {
    await runMemberAction(
      `remove:${userId}`,
      () => removeUserFromApp(userId),
      'Failed to remove user from app.',
    )
  }

  async function runMemberAction(
    actionKey: string,
    action: () => Promise<unknown>,
    failureMessage: string,
  ) {
    setAdminError(null)
    setActiveMemberAction(actionKey)
    try {
      await action()
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileKeys.pending }),
        queryClient.invalidateQueries({ queryKey: profileKeys.approvedMembers }),
        queryClient.invalidateQueries({ queryKey: profileKeys.approved }),
      ])
    } catch (error) {
      setAdminError(
        error instanceof Error ? error.message : failureMessage,
      )
    } finally {
      setActiveMemberAction(null)
    }
  }

  const themePreferenceCard = <ThemePreferenceCard />

  if (authStatus === 'initializing') {
    return (
      <div className="stack-lg">
        {themePreferenceCard}
        <AnimatedContentLoader isVisible mode="panel" />
      </div>
    )
  }

  if (authStatus === 'signed-in' && isProfileLoading) {
    return (
      <div className="stack-lg">
        {themePreferenceCard}
        <AnimatedContentLoader isVisible mode="panel" />
      </div>
    )
  }

  if (authStatus === 'signed-out' || !user) {
    return (
      <div className="stack-lg">
        {themePreferenceCard}
        <section className="glass-card panel stack-md">
          <p className="eyebrow">Settings</p>
          <h2 className="panel-title">No active session</h2>
          <div className="actions-row">
            <Link to="/login" className="primary-button">
              Log in
            </Link>
            <Link to="/signup" className="secondary-button">
              Sign up
            </Link>
          </div>
        </section>
      </div>
    )
  }

  const adminSection = isAdmin ? (
    <section className="glass-card panel stack-lg">
      <div className="stack-sm">
        <p className="eyebrow">Admin</p>
        <h2 className="panel-title">User approvals and promotion</h2>
      </div>

      {adminError ? <p className="form-error">{adminError}</p> : null}
      {queryAdminError ? <p className="form-error">{queryAdminError}</p> : null}

      <div className="actions-row">
        <button
          type="button"
          className="secondary-button"
          onClick={() => void refreshAdminLists()}
          disabled={
            pendingProfilesQuery.isPending ||
            pendingProfilesQuery.isRefetching ||
            approvedMembersQuery.isPending ||
            approvedMembersQuery.isRefetching
          }
        >
          {pendingProfilesQuery.isPending ||
          pendingProfilesQuery.isRefetching ||
          approvedMembersQuery.isPending ||
          approvedMembersQuery.isRefetching
            ? 'Refreshing...'
            : 'Refresh admin lists'}
        </button>
      </div>

      <div className="stack-md">
        <h3 className="section-title">Pending approvals</h3>
        {pendingProfiles.length === 0 ? (
          <div className="empty-state">
            <h4 className="empty-state-title">Approval queue is clear</h4>
          </div>
        ) : (
          <div className="stack-sm">
            {pendingProfiles.map((pendingProfile) => (
              <MemberDirectoryCard
                key={pendingProfile.id}
                profile={pendingProfile}
                menuActions={[
                  {
                    id: `approve:${pendingProfile.id}`,
                    label: 'Approve',
                    loadingLabel: 'Approving...',
                    onClick: () => void handleApprove(pendingProfile.id),
                  },
                  {
                    id: `promote:${pendingProfile.id}`,
                    label: 'Promote to Admin',
                    loadingLabel: 'Promoting...',
                    onClick: () => void handlePromote(pendingProfile.id),
                    disabled: pendingProfile.role === 'admin',
                  },
                  ...(pendingProfile.id !== user.id
                    ? [
                        {
                          id: `remove:${pendingProfile.id}`,
                          label: 'Remove from app',
                          loadingLabel: 'Removing...',
                          onClick: () => void handleRemoveFromApp(pendingProfile.id),
                          isDanger: true as const,
                        },
                      ]
                    : []),
                ]}
                activeAction={activeMemberAction}
              />
            ))}
          </div>
        )}
      </div>

      {/* <div className="stack-md">
        <h3 className="section-title">Approved members</h3>
        {approvedMembers.length === 0 ? (
          <div className="empty-state">
            <h4 className="empty-state-title">No promotion candidates</h4>
          </div>
        ) : (
          <div className="stack-sm">
            {approvedMembers.map((approvedProfile) => (
              <MemberDirectoryCard
                key={approvedProfile.id}
                profile={approvedProfile}
                menuActions={(() => {
                  const actions: MemberDirectoryMenuAction[] = []

                  if (approvedProfile.role !== 'admin') {
                    actions.push({
                      id: `promote:${approvedProfile.id}`,
                      label: 'Promote to Admin',
                      loadingLabel: 'Promoting...',
                      onClick: () => void handlePromote(approvedProfile.id),
                    })
                  }

                  if (approvedProfile.id !== user.id) {
                    actions.push({
                      id: `remove:${approvedProfile.id}`,
                      label: 'Remove from app',
                      loadingLabel: 'Removing...',
                      onClick: () => void handleRemoveFromApp(approvedProfile.id),
                      isDanger: true,
                    })
                  }

                  return actions
                })()}
                activeAction={activeMemberAction}
              />
            ))}
          </div>
        )}
      </div> */}
    </section>
  ) : null

  const settingsSection = (
    <section className="glass-card panel stack-md">
      <p className="eyebrow">Settings</p>
      <h2 className="panel-title">Account status</h2>
      <div className="info-grid">
        <InfoItem label="Email" value={user.email ?? 'No email'} />
        <InfoItem label="Role" value={profile?.role ?? 'member'} />
        <InfoItem
          label="Approval"
          value={profile?.is_approved ? 'Approved' : 'Pending approval'}
        />
        <InfoItem
          label="Blood group"
          value={profile?.blood_group ?? 'Not set'}
        />
      </div>
    </section>
  )

  const profileSection = (
    <section className="glass-card panel stack-md">
      <p className="eyebrow">Profile</p>
      <h2 className="panel-title">Update your profile</h2>
      <form className="stack-md" onSubmit={handleProfileSubmit}>
        <label className="stack-xs">
          <span className="field-label">Full name</span>
          <input
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="field-input"
            placeholder="Your full name"
          />
        </label>

        <label className="stack-xs">
          <span className="field-label">Blood group</span>
          <select
            value={bloodGroup}
            onChange={(event) => setBloodGroup(event.target.value)}
            className="field-input"
          >
            <option value="">Select blood group</option>
            {BLOOD_GROUPS.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </label>

        {profileError ? <p className="form-error">{profileError}</p> : null}
        {profileMessage ? <p className="form-success">{profileMessage}</p> : null}

        <div className="actions-row">
          <button
            type="submit"
            className="primary-button"
            disabled={isSavingProfile}
          >
            {isSavingProfile ? 'Saving...' : 'Save profile'}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => void refreshProfile()}
          >
            Refresh profile
          </button>
        </div>
      </form>
    </section>
  )

  const sessionSection = (
    <section className="glass-card panel stack-md">
      <p className="eyebrow">Session</p>
      <div className="actions-row session-actions">
        <button
          type="button"
          className="primary-button session-signout-button"
          onClick={() => void handleSignOut()}
          disabled={isSigningOut}
        >
          {isSigningOut ? 'Signing out...' : 'Sign out'}
        </button>
      </div>
    </section>
  )

  return (
    <div className="stack-lg">
      {adminSection}
      {settingsSection}
      {profileSection}
      {themePreferenceCard}
      {sessionSection}
    </div>
  )
}

function ThemePreferenceCard() {
  const [mode, setMode] = useState<ThemeMode>('auto')

  useEffect(() => {
    const initialMode = getStoredThemeMode()
    setMode(initialMode)
    applyThemeMode(initialMode)
  }, [])

  useEffect(() => {
    if (mode !== 'auto') {
      return
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyThemeMode('auto')

    media.addEventListener('change', onChange)
    return () => {
      media.removeEventListener('change', onChange)
    }
  }, [mode])

  useEffect(() => {
    function handleThemeUpdate() {
      const nextMode = getStoredThemeMode()
      setMode(nextMode)
      applyThemeMode(nextMode)
    }

    window.addEventListener('themechange', handleThemeUpdate)
    window.addEventListener('storage', handleThemeUpdate)
    return () => {
      window.removeEventListener('themechange', handleThemeUpdate)
      window.removeEventListener('storage', handleThemeUpdate)
    }
  }, [])

  function handleThemeChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextMode = event.target.value as ThemeMode
    setMode(nextMode)
    setThemeMode(nextMode)
  }

  return (
    <section className="glass-card panel stack-md">
      <p className="eyebrow">Appearance</p>
      <label className="stack-xs">
        <span className="field-label">Mode</span>
        <select
          value={mode}
          onChange={handleThemeChange}
          className="field-input"
        >
          {THEME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </section>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-card">
      <span className="info-label">{label}</span>
      <strong className="info-value">{value}</strong>
    </div>
  )
}

const BLOOD_GROUPS = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
] as const

const THEME_OPTIONS: Array<{
  value: ThemeMode
  label: string
}> = [
  { value: 'auto', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]
