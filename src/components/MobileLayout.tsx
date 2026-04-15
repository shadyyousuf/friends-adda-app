import { Link, useRouterState } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useAuth } from './AuthProvider'
import BottomNav from './BottomNav'

export default function MobileLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const { user, profile, isLoading } = useAuth()

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
          <div>
            <p className="eyebrow">Friends Adda</p>
            <h1 className="topbar-title">
              {isAuthScreen
                ? 'Welcome'
                : user
                  ? `Hi${profile?.full_name ? `, ${profile.full_name}` : ''}`
                  : 'Plan your next group event'}
            </h1>
          </div>
          <div className="status-chip">
            {isLoading
              ? 'Loading'
              : user
                ? profile?.role === 'admin'
                  ? 'Admin'
                  : profile?.is_approved
                    ? 'Member'
                    : 'Pending'
                : 'Guest'}
          </div>
        </header>

        {showPendingScreen ? (
          <PendingApprovalCard />
        ) : showProfileSetupScreen ? (
          <ProfileSetupCard />
        ) : (
          <main className="content-shell">{children}</main>
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
        </div>
        <Link to="/settings" className="primary-button">
          Open settings
        </Link>
      </section>
    </main>
  )
}
