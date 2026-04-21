import { useEffect, useId, type ReactNode } from 'react'

export default function EventDetailDrawer({
  isOpen,
  eyebrow,
  title,
  onClose,
  children,
  className,
  headerAction,
}: {
  isOpen: boolean
  eyebrow: string
  title: string
  onClose: () => void
  children: ReactNode
  className?: string
  headerAction?: ReactNode
}) {
  const titleId = useId()

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  return (
    <section className="drawer-overlay" onClick={onClose}>
      <div
        className={`glass-card create-drawer${className ? ` ${className}` : ''}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="drawer-handle" aria-hidden="true" />
        <div className="split-header">
          <div className="section-header-copy">
            <p className="eyebrow">{eyebrow}</p>
            <h3 className="section-title" id={titleId}>
              {title}
            </h3>
          </div>
          {headerAction ?? (
            <button
              type="button"
              className="ghost-button"
              onClick={onClose}
            >
              Close
            </button>
          )}
        </div>
        {children}
      </div>
    </section>
  )
}
