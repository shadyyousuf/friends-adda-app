import { Link } from '@tanstack/react-router'
import { Clock3, Home, Settings, Users } from 'lucide-react'

const items = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/history', label: 'History', icon: Clock3 },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

export default function BottomNav() {
  return (
    <nav className="bottom-nav glass-card" aria-label="Primary">
      {items.map((item) => {
        const Icon = item.icon

        return (
          <Link
            key={item.to}
            to={item.to}
            className="bottom-nav-link"
            activeProps={{ className: 'bottom-nav-link is-active' }}
          >
            <Icon size={18} strokeWidth={2.1} />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
