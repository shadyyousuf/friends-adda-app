import type { ReactNode } from 'react'

export default function EventDetailRouteShell({
  detailError,
  errorMessage,
  children,
}: {
  detailError: string | null
  errorMessage: string | null
  children: ReactNode
}) {
  return (
    <div className="stack-lg">
      {(detailError || errorMessage) && (
        <section className="glass-card panel">
          {detailError ? <p className="form-error">{detailError}</p> : null}
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        </section>
      )}
      {children}
    </div>
  )
}
