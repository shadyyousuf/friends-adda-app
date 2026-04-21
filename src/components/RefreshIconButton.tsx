import { RotateCw } from 'lucide-react'

type RefreshIconButtonProps = {
  label: string
  onClick: () => Promise<unknown> | void
  isRefreshing?: boolean
  disabled?: boolean
  className?: string
}

export default function RefreshIconButton({
  label,
  onClick,
  isRefreshing = false,
  disabled = false,
  className,
}: RefreshIconButtonProps) {
  const classes = ['icon-button', isRefreshing ? 'is-spinning' : '', className ?? '']
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      className={classes}
      aria-label={label}
      title={label}
      onClick={() => void onClick()}
      disabled={disabled || isRefreshing}
    >
      <RotateCw size={18} />
    </button>
  )
}
