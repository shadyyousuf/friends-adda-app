import { Loader2 } from 'lucide-react'

export default function AnimatedContentLoader({
  isVisible,
  mode = 'overlay',
}: {
  isVisible: boolean
  mode?: 'overlay' | 'panel'
}) {
  if (!isVisible) {
    return null
  }

  if (mode === 'panel') {
    return (
      <section
        className="glass-card panel stack-md animated-loader-panel"
        role="status"
        aria-label="Loading"
      >
        <div className="animated-loader-topline">
          <Loader2 className="animated-loader-spinner" />
          <span className="animated-loader-pill" />
        </div>
        <div className="animated-loader-stack">
          <div className="animated-loader-card-row">
            <span className="animated-loader-block animated-loader-block-title" />
            <span className="animated-loader-block animated-loader-block-chip" />
          </div>
          <span className="animated-loader-block animated-loader-block-body" />
          <span className="animated-loader-block animated-loader-block-body animated-loader-block-body-alt" />
        </div>
        <div className="animated-loader-grid">
          <div className="animated-loader-mini-card">
            <span className="animated-loader-block animated-loader-block-stat" />
            <span className="animated-loader-block animated-loader-block-line" />
          </div>
          <div className="animated-loader-mini-card">
            <span className="animated-loader-block animated-loader-block-stat" />
            <span className="animated-loader-block animated-loader-block-line" />
          </div>
        </div>
      </section>
    )
  }

  return (
    <div className="animated-loader-overlay" role="status" aria-label="Loading">
      <div className="animated-loader-card">
        <div className="animated-loader-topline">
          <Loader2 className="animated-loader-spinner" />
          <span className="animated-loader-pill" />
        </div>
        <div className="animated-loader-stack">
          <div className="animated-loader-card-row">
            <span className="animated-loader-block animated-loader-block-title" />
            <span className="animated-loader-block animated-loader-block-chip" />
          </div>
          <span className="animated-loader-block animated-loader-block-body" />
          <span className="animated-loader-block animated-loader-block-body animated-loader-block-body-alt" />
        </div>
        <div className="animated-loader-lines">
          <span className="animated-loader-line animated-loader-line-wide" />
          <span className="animated-loader-line animated-loader-line-medium" />
          <span className="animated-loader-line animated-loader-line-short" />
        </div>
      </div>
    </div>
  )
}
