import { Download, Share2, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import {
  getManualInstallMode,
  isStandaloneDisplay,
  type ManualInstallMode,
} from '../utils/pwa'

type InstallAppButtonProps = {
  variant?: 'compact' | 'hero'
}

type InstallPromptOutcome = 'accepted' | 'dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<{ outcome: InstallPromptOutcome }>
  userChoice?: Promise<{ outcome: InstallPromptOutcome }>
}

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean
}

export default function InstallAppButton({
  variant = 'compact',
}: InstallAppButtonProps) {
  const [manualInstallMode, setManualInstallMode] =
    useState<ManualInstallMode>('none')
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [isPrompting, setIsPrompting] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  const helpId = useId()

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const updateInstallState = () => {
      const displayModeStandalone = window.matchMedia
        ? window.matchMedia('(display-mode: standalone)').matches
        : false
      const standalone = isStandaloneDisplay({
        displayModeStandalone,
        navigatorStandalone: Boolean(
          (window.navigator as NavigatorWithStandalone).standalone,
        ),
      })

      setHasMounted(true)
      setIsStandalone(standalone)
      setManualInstallMode(
        getManualInstallMode(
          window.navigator.userAgent,
          window.navigator.maxTouchPoints ?? 0,
        ),
      )

      if (standalone) {
        setDeferredPrompt(null)
        setIsHelpOpen(false)
      }
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent
      promptEvent.preventDefault()
      setDeferredPrompt(promptEvent)
    }

    const handleInstalled = () => {
      setDeferredPrompt(null)
      setIsHelpOpen(false)
      updateInstallState()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateInstallState()
      }
    }

    updateInstallState()

    window.addEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt as EventListener,
    )
    window.addEventListener('appinstalled', handleInstalled)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const displayModeQuery = window.matchMedia
      ? window.matchMedia('(display-mode: standalone)')
      : null
    const handleDisplayModeChange = () => {
      updateInstallState()
    }

    if (displayModeQuery) {
      if (typeof displayModeQuery.addEventListener === 'function') {
        displayModeQuery.addEventListener('change', handleDisplayModeChange)
      } else {
        displayModeQuery.addListener(handleDisplayModeChange)
      }
    }

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt as EventListener,
      )
      window.removeEventListener('appinstalled', handleInstalled)
      document.removeEventListener('visibilitychange', handleVisibilityChange)

      if (displayModeQuery) {
        if (typeof displayModeQuery.removeEventListener === 'function') {
          displayModeQuery.removeEventListener('change', handleDisplayModeChange)
        } else {
          displayModeQuery.removeListener(handleDisplayModeChange)
        }
      }
    }
  }, [])

  if (
    !hasMounted ||
    isStandalone ||
    (!deferredPrompt && manualInstallMode === 'none')
  ) {
    return null
  }

  const isManualInstall = !deferredPrompt
  const label = deferredPrompt
    ? 'Install app'
    : manualInstallMode === 'safari-desktop'
      ? 'Add to Dock'
      : 'Add to Home Screen'
  const Icon = deferredPrompt ? Download : Share2
  const wrapperClassName =
    variant === 'hero' ? 'install-app install-app-hero' : 'install-app'
  const buttonClassName =
    variant === 'hero'
      ? 'secondary-button guest-hero-button install-app-button install-app-button-hero'
      : 'install-app-button install-app-button-compact'

  async function handleButtonClick() {
    if (!deferredPrompt) {
      setIsHelpOpen((currentValue) => !currentValue)
      return
    }

    const activePrompt = deferredPrompt
    setDeferredPrompt(null)
    setIsHelpOpen(false)
    setIsPrompting(true)

    try {
      const promptResult = await activePrompt.prompt()
      const outcome =
        promptResult?.outcome ?? (await activePrompt.userChoice)?.outcome

      if (outcome === 'dismissed') {
        setIsPrompting(false)
      }
    } catch {
      setIsPrompting(false)
    }
  }

  return (
    <div className={wrapperClassName}>
      <button
        type="button"
        className={buttonClassName}
        aria-controls={isManualInstall ? helpId : undefined}
        aria-expanded={isManualInstall ? isHelpOpen : undefined}
        aria-haspopup={isManualInstall ? 'dialog' : undefined}
        onClick={() => void handleButtonClick()}
        disabled={isPrompting}
      >
        <Icon size={variant === 'hero' ? 18 : 16} aria-hidden="true" />
        <span>{isPrompting ? 'Opening...' : label}</span>
      </button>

      {isManualInstall && isHelpOpen ? (
        <div id={helpId} role="dialog" className="glass-card install-app-popover">
          <div className="install-app-popover-header">
            <div className="stack-xs">
              <p className="eyebrow">Install</p>
              <h3 className="install-app-popover-title">{label}</h3>
            </div>

            <button
              type="button"
              className="ghost-button install-app-close"
              aria-label="Close install help"
              onClick={() => setIsHelpOpen(false)}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <p className="muted-copy install-app-popover-copy">
            {manualInstallMode === 'safari-desktop'
              ? 'In Safari on macOS, open the File menu and choose Add to Dock to install this app.'
              : 'Open your browser share menu, then choose Add to Home Screen to install this app.'}
          </p>
        </div>
      ) : null}
    </div>
  )
}
