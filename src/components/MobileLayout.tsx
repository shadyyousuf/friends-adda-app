import { Link, useRouterState } from '@tanstack/react-router'
import { RotateCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { useAuth } from './AuthProvider'
import BottomNav from './BottomNav'
import { DASHBOARD_REFRESH_EVENT } from '../utils/ui-events'

export default function MobileLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const { user, profile, isLoading } = useAuth()
  const pageMeta = getPageMeta(pathname, Boolean(user), profile?.full_name ?? null)
  const status = getStatusCopy({ user: Boolean(user), isLoading, profile })

  const isDashboardRoute = pathname === '/'
  const isAuthScreen = pathname === '/login' || pathname === '/signup'
  const isSettingsRoute = pathname === '/settings'
  const showPendingScreen =
    user && profile && !profile.is_approved && !isSettingsRoute
  const showProfileSetupScreen = user && !profile && !isLoading && !isSettingsRoute

  return (
    <div className="app-shell">
      <div className="app-backdrop app-backdrop-primary" />
      <div className="app-backdrop app-backdrop-secondary" />

      <div className="mobile-frame">
        <header className="glass-card topbar">
          <div className="topbar-copy">
            <p className="eyebrow page-kicker">{pageMeta.kicker}</p>
            <h1 className="topbar-title">{pageMeta.title}</h1>
            {pageMeta.subtitle ? (
              <p className="topbar-support">{pageMeta.subtitle}</p>
            ) : null}
          </div>
          {isDashboardRoute && user && profile?.is_approved ? (
            <button
              type="button"
              className="topbar-action-button"
              aria-label="Refresh dashboard"
              title="Refresh dashboard"
              onClick={() => {
                window.dispatchEvent(new Event(DASHBOARD_REFRESH_EVENT))
              }}
            >
              <RotateCw size={18} />
            </button>
          ) : (
            <div className={`status-chip ${status.className}`}>{status.label}</div>
          )}
        </header>

        {!isAuthScreen && pageMeta.contextLabel && pageMeta.contextHint ? (
          <header className="topbar-context" aria-label="Page context">
            <span className="field-label">{pageMeta.contextLabel}</span>
            <span className="topbar-divider" aria-hidden="true" />
            <span className="field-label">{pageMeta.contextHint}</span>
          </header>
        ) : null}

        {showPendingScreen ? (
          <PendingApprovalCard />
        ) : showProfileSetupScreen ? (
          <ProfileSetupCard />
        ) : (
          <main className="content-shell" aria-live="polite">
            {children}
          </main>
        )}

        {!isAuthScreen ? <BottomNav /> : null}
      </div>
    </div>
  )
}

function PendingApprovalCard() {
  return (
    <main className="content-shell">
      <section className="glass-card panel stack-lg centered-panel">
        <div className="pending-badge">Locked</div>
        <div className="stack-sm">
          <h2 className="panel-title">Pending Admin Approval</h2>
          <p className="muted-copy">
            Your account exists, but an app admin still needs to approve it
            before you can access events and members.
          </p>
          <p className="section-note">
            You can still open settings to complete your profile details and
            confirm your blood group.
          </p>
        </div>
        <Link to="/settings" className="primary-button">
          Open settings
        </Link>
      </section>
    </main>
  )
}

function ProfileSetupCard() {
  return (
    <main className="content-shell">
      <section className="glass-card panel stack-lg centered-panel">
        <div className="pending-badge">Setup</div>
        <div className="stack-sm">
          <h2 className="panel-title">Preparing your account</h2>
          <p className="muted-copy">
            Your auth session is active, but the profile row is not readable
            yet. If this persists, confirm that the SQL migration was applied in
            Supabase and then refresh.
          </p>
          <p className="section-note">
            Until the profile row becomes available, event data and member
            access stay intentionally locked.
          </p>
        </div>
        <Link to="/settings" className="primary-button">
          Open settings
        </Link>
      </section>
    </main>
  )
}

function getPageMeta(
  pathname: string,
  isAuthenticated: boolean,
  fullName: string | null,
) {
  const firstName = fullName?.trim().split(/\s+/)[0]

  if (pathname === '/login') {
    return {
      kicker: 'Friends Adda',
      title: 'Welcome back',
      subtitle: 'Log in to pick up where your group left off.',
      contextLabel: 'Authentication',
      contextHint: 'Secure access',
    }
  }

  if (pathname === '/signup') {
    return {
      kicker: 'Friends Adda',
      title: 'Create account',
      subtitle: 'Join the group space and wait for admin approval.',
      contextLabel: 'Authentication',
      contextHint: 'New member setup',
    }
  }

  if (pathname === '/members') {
    return {
      kicker: 'Friends Adda',
      title: 'Member directory',
      subtitle: '',
      contextLabel: '',
      contextHint: '',
    }
  }

  if (pathname === '/history') {
    return {
      kicker: 'Friends Adda',
      title: 'Event history',
      subtitle: '',
      contextLabel: '',
      contextHint: '',
    }
  }

  if (pathname === '/settings') {
    return {
      kicker: 'Friends Adda',
      title: 'Account settings',
      subtitle: '',
      contextLabel: '',
      contextHint: '',
    }
  }

  if (pathname.startsWith('/events/')) {
    return {
      kicker: 'Friends Adda',
      title: 'Event detail',
      subtitle: 'Review members, modules, and control access from one screen.',
      contextLabel: 'Event',
      contextHint: 'Members and modules',
    }
  }

  if (isAuthenticated) {
    return {
      kicker: 'Friends Adda',
      title: firstName ? `Welcome, ${firstName}` : 'Welcome back',
      subtitle: '',
      contextLabel: '',
      contextHint: '',
    }
  }

  return {
    kicker: 'Friends Adda',
    title: 'Group events, simplified',
    subtitle: 'Plan outings, track money, and manage roles without losing context.',
    contextLabel: 'Overview',
    contextHint: 'Guest view',
  }
}

function getStatusCopy({
  user,
  isLoading,
  profile,
}: {
  user: boolean
  isLoading: boolean
  profile: { role?: string | null; is_approved?: boolean | null } | null
}) {
  if (isLoading) {
    return { label: 'Loading', className: '' }
  }

  if (!user) {
    return { label: 'Guest', className: 'status-chip-guest' }
  }

  if (profile?.role === 'admin') {
    return { label: 'Admin', className: 'status-chip-admin' }
  }

  if (profile?.is_approved) {
    return { label: 'Member', className: 'status-chip-member' }
  }

  return { label: 'Pending', className: 'status-chip-pending' }
}
