import { Link } from '@tanstack/react-router'
import { Clock3, Home, Plus, Settings, Users } from 'lucide-react'

const items = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/history', label: 'History', icon: Clock3 },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

export default function BottomNav() {
  const leftItems = items.slice(0, 2)
  const rightItems = items.slice(2)

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {leftItems.map((item) => {
        const Icon = item.icon
        const search = item.to === '/' ? { create: undefined } : undefined

        return (
          <Link
            key={item.to}
            to={item.to}
            search={search}
            className="bottom-nav-link"
            aria-label={item.label}
            activeProps={{ className: 'bottom-nav-link is-active' }}
          >
            <Icon size={24} strokeWidth={2.2} />
          </Link>
        )
      })}

      <Link
        to="/"
        search={{ create: '1' }}
        className="bottom-nav-create-link"
        aria-label="Create event"
        title="Create event"
      >
        <Plus size={24} strokeWidth={2.2} />
      </Link>

      {rightItems.map((item) => {
        const Icon = item.icon
        const search = item.to === '/' ? { create: undefined } : undefined

        return (
          <Link
            key={item.to}
            to={item.to}
            search={search}
            className="bottom-nav-link"
            aria-label={item.label}
            activeProps={{ className: 'bottom-nav-link is-active' }}
          >
            <Icon size={24} strokeWidth={2.2} />
          </Link>
        )
      })}
    </nav>
  )
}
