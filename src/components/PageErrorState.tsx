type PageErrorStateProps = {
  title?: string
  message?: string
  error?: unknown
  onRetry?: () => void
}

export default function PageErrorState({
  title = 'Something went wrong',
  message = 'Reload the page or try the last action again.',
  error,
  onRetry,
}: PageErrorStateProps) {
  const errorMessage =
    error instanceof Error ? error.message : typeof error === 'string' ? error : null

  return (
    <section className="glass-card panel stack-md" role="alert" aria-live="assertive">
      <p className="eyebrow">Error</p>
      <h2 className="panel-title">{title}</h2>
      <p className="muted-copy">{message}</p>
      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      {onRetry ? (
        <div className="actions-row">
          <button type="button" className="primary-button" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : null}
    </section>
  )
}
