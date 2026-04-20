import { Link, useRouterState } from '@tanstack/react-router'
import { RotateCw } from 'lucide-react'
import {
  createContext,
  type ReactNode,
  useContext,
  useState,
} from 'react'
import { useAuth } from './AuthProvider'
import BottomNav from './BottomNav'
import InstallAppButton from './InstallAppButton'
import { DASHBOARD_REFRESH_EVENT } from '../utils/ui-events'

type EventTitleContextValue = {
  eventTitle: string | null
  setEventTitle: (value: string | null) => void
}

const EventTitleContext = createContext<EventTitleContextValue>({
  eventTitle: null,
  setEventTitle: () => {},
})

export function useEventPageTitle() {
  return useContext(EventTitleContext)
}

export default function MobileLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const { user, profile, isLoading } = useAuth()
  const pageMeta = getPageMeta(pathname, Boolean(user), profile?.full_name ?? null)
  const status = getStatusCopy({ user: Boolean(user), isLoading, profile })
  const [eventTitle, setEventTitle] = useState<string | null>(null)

  const isDashboardRoute = pathname === '/'
  const isAuthScreen = pathname === '/login' || pathname === '/signup'
  const isSettingsRoute = pathname === '/settings'
  const isEventRoute = pathname.startsWith('/events/')
  const showPendingScreen =
    user && profile && !profile.is_approved && !isSettingsRoute
  const showProfileSetupScreen = user && !profile && !isLoading && !isSettingsRoute
  const showBottomNav = Boolean(user && profile?.is_approved) && !isAuthScreen
  const showInstallButtonInTopbar = !(pathname === '/' && !user)

  const topbarTitle = isEventRoute
    ? eventTitle ?? pageMeta.title
    : pageMeta.title

  return (
    <div className="app-shell">
      <div className="app-backdrop app-backdrop-primary" />
      <div className="app-backdrop app-backdrop-secondary" />

      <div className={`mobile-frame ${showBottomNav ? 'mobile-frame-with-nav' : 'mobile-frame-no-nav'}`}>
        <header className="glass-card topbar">
          <div className="topbar-copy">
            {!isEventRoute ? (
              <p className="eyebrow page-kicker">{pageMeta.kicker}</p>
            ) : null}
            <h1 className="topbar-title">{topbarTitle}</h1>
          </div>

          <div className="topbar-actions">
            {showInstallButtonInTopbar ? <InstallAppButton /> : null}

            {isEventRoute ? null : isDashboardRoute && user && profile?.is_approved ? (
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
          </div>
        </header>

        {showPendingScreen ? (
          <PendingApprovalCard />
        ) : showProfileSetupScreen ? (
          <ProfileSetupCard />
        ) : (
          <EventTitleContext.Provider value={{ eventTitle, setEventTitle }}>
            <main className="content-shell" aria-live="polite">
              {children}
            </main>
          </EventTitleContext.Provider>
        )}

        {showBottomNav ? <BottomNav /> : null}
      </div>
    </div>
  )
}

function PendingApprovalCard() {
  return (
    <main className="content-shell">
      <section className="glass-card panel stack-lg centered-panel">
        <div className="pending-badge">Locked</div>
        <h2 className="panel-title">Pending Approval</h2>
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
        <h2 className="panel-title">Account Setup</h2>
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
    }
  }

  if (pathname === '/signup') {
    return {
      kicker: 'Friends Adda',
      title: 'Create account',
    }
  }

  if (pathname === '/members') {
    return {
      kicker: 'Friends Adda',
      title: 'Member directory',
    }
  }

  if (pathname === '/history') {
    return {
      kicker: 'Friends Adda',
      title: 'Event history',
    }
  }

  if (pathname === '/settings') {
    return {
      kicker: 'Friends Adda',
      title: 'Account settings',
    }
  }

  if (pathname.startsWith('/events/')) {
    return {
      kicker: 'Friends Adda',
      title: 'Loading event',
    }
  }

  if (isAuthenticated) {
    return {
      kicker: 'Friends Adda',
      title: firstName ? `Welcome, ${firstName}` : 'Welcome back',
    }
  }

  return {
    kicker: 'Friends Adda',
    title: 'Group events, simplified',
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
