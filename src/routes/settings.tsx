import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../components/AuthProvider'
import { signOut } from '../utils/auth'
import {
  approveUser,
  listApprovedMemberProfiles,
  listPendingProfiles,
  promoteUserToAdmin,
  updateOwnProfile,
} from '../utils/profile'
import type { Database } from '../utils/supabase'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [bloodGroup, setBloodGroup] = useState(profile?.blood_group ?? '')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [isAdminLoading, setIsAdminLoading] = useState(false)
  const [pendingProfiles, setPendingProfiles] = useState<Profile[]>([])
  const [approvedMembers, setApprovedMembers] = useState<Profile[]>([])

  useEffect(() => {
    setFullName(profile?.full_name ?? '')
    setBloodGroup(profile?.blood_group ?? '')
  }, [profile?.full_name, profile?.blood_group])

  useEffect(() => {
    if (profile?.role !== 'admin') {
      setPendingProfiles([])
      setApprovedMembers([])
      setAdminError(null)
      return
    }

    void refreshAdminLists()
  }, [profile?.role])

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
    setIsAdminLoading(true)

    try {
      const [pending, approved] = await Promise.all([
        listPendingProfiles(),
        listApprovedMemberProfiles(),
      ])
      setPendingProfiles(pending)
      setApprovedMembers(approved)
    } catch (error) {
      setAdminError(
        error instanceof Error ? error.message : 'Failed to load admin data.',
      )
    } finally {
      setIsAdminLoading(false)
    }
  }

  async function handleApprove(userId: string) {
    setAdminError(null)

    try {
      await approveUser(userId)
      await refreshAdminLists()
    } catch (error) {
      setAdminError(
        error instanceof Error ? error.message : 'Failed to approve user.',
      )
    }
  }

  async function handlePromote(userId: string) {
    setAdminError(null)

    try {
      await promoteUserToAdmin(userId)
      await refreshAdminLists()
    } catch (error) {
      setAdminError(
        error instanceof Error ? error.message : 'Failed to promote user.',
      )
    }
  }

  if (!user) {
    return (
      <section className="glass-card panel stack-md">
        <p className="eyebrow">Settings</p>
        <h2 className="panel-title">No active session</h2>
        <p className="muted-copy">
          Log in or create an account first. Profile editing arrives in Phase 4.
        </p>
        <div className="actions-row">
          <Link to="/login" className="primary-button">
            Log in
          </Link>
          <Link to="/signup" className="secondary-button">
            Sign up
          </Link>
        </div>
      </section>
    )
  }

  return (
    <div className="stack-lg">
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

      {profile?.role === 'admin' ? (
        <section className="glass-card panel stack-lg">
          <div className="stack-sm">
            <p className="eyebrow">Admin</p>
            <h2 className="panel-title">User approvals and promotion</h2>
            <p className="muted-copy">
              Approve new users and promote approved members to global admin.
            </p>
          </div>

          {adminError ? <p className="form-error">{adminError}</p> : null}

          <div className="actions-row">
            <button
              type="button"
              className="secondary-button"
              onClick={() => void refreshAdminLists()}
              disabled={isAdminLoading}
            >
              {isAdminLoading ? 'Refreshing...' : 'Refresh admin lists'}
            </button>
          </div>

          <div className="stack-md">
            <h3 className="section-title">Pending approvals</h3>
            {pendingProfiles.length === 0 ? (
              <p className="muted-copy">No users are waiting for approval.</p>
            ) : (
              <div className="stack-sm">
                {pendingProfiles.map((pendingProfile) => (
                  <UserAdminCard
                    key={pendingProfile.id}
                    profile={pendingProfile}
                    primaryActionLabel="Approve"
                    onPrimaryAction={() => void handleApprove(pendingProfile.id)}
                    secondaryActionLabel="Promote to admin"
                    onSecondaryAction={() => void handlePromote(pendingProfile.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="stack-md">
            <h3 className="section-title">Approved members</h3>
            {approvedMembers.length === 0 ? (
              <p className="muted-copy">No approved members are available to promote.</p>
            ) : (
              <div className="stack-sm">
                {approvedMembers.map((approvedProfile) => (
                  <UserAdminCard
                    key={approvedProfile.id}
                    profile={approvedProfile}
                    primaryActionLabel="Promote to admin"
                    onPrimaryAction={() => void handlePromote(approvedProfile.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}

      <section className="glass-card panel stack-md">
        <p className="eyebrow">Session</p>
        <div className="actions-row">
          <button
            type="button"
            className="primary-button"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
          >
            {isSigningOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </section>
    </div>
  )
}

function UserAdminCard({
  profile,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
}: {
  profile: Profile
  primaryActionLabel: string
  onPrimaryAction: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
}) {
  return (
    <article className="admin-user-card">
      <div className="stack-xs">
        <strong className="info-value">
          {profile.full_name || 'Unnamed user'}
        </strong>
        <span className="muted-copy">{profile.email}</span>
        <span className="field-label">
          Blood group: {profile.blood_group ?? 'Not set'}
        </span>
      </div>
      <div className="actions-row">
        <button type="button" className="primary-button" onClick={onPrimaryAction}>
          {primaryActionLabel}
        </button>
        {secondaryActionLabel && onSecondaryAction ? (
          <button
            type="button"
            className="secondary-button"
            onClick={onSecondaryAction}
          >
            {secondaryActionLabel}
          </button>
        ) : null}
      </div>
    </article>
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

type Profile = Database['public']['Tables']['profiles']['Row']

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
