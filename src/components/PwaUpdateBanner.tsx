import { RefreshCcw } from 'lucide-react'

export default function PwaUpdateBanner({
  isUpdating,
  onUpdate,
}: {
  isUpdating: boolean
  onUpdate: () => Promise<void>
}) {
  return (
    <section className="glass-card status-banner-shell pwa-update-shell" aria-label="App update available">
      <div className="status-banner-copy stack-xs">
        <p className="eyebrow">Update ready</p>
        <h2 className="install-prompt-title">A newer version of Friends Adda is available.</h2>
        <p className="muted-copy">
          Refresh once to activate the latest app shell and cached assets.
        </p>
      </div>

      <div className="status-banner-actions">
        <button
          type="button"
          className="primary-button status-banner-button"
          onClick={() => void onUpdate()}
          disabled={isUpdating}
        >
          <RefreshCcw size={18} aria-hidden="true" />
          <span>{isUpdating ? 'Refreshing...' : 'Refresh app'}</span>
        </button>
      </div>
    </section>
  )
}
