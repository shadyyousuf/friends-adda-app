import { WifiOff } from 'lucide-react'

export default function OfflineStatusBanner() {
  return (
    <section className="glass-card status-banner-shell offline-status-shell" aria-label="Offline status">
      <div className="install-prompt-content">
        <div className="offline-status-icon" aria-hidden="true">
          <WifiOff size={22} />
        </div>
        <div className="status-banner-copy stack-xs">
          <p className="eyebrow">Offline</p>
          <h2 className="install-prompt-title">Showing last synced data where available.</h2>
          <p className="muted-copy">
            Event, member, and history views can stay readable. New writes wait until you reconnect.
          </p>
        </div>
      </div>
    </section>
  )
}
