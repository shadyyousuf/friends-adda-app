import { Download, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  getManualInstallMode,
  isStandaloneDisplay,
  type ManualInstallMode,
} from '../utils/pwa'

type InstallPromptOutcome = 'accepted' | 'dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<{ outcome: InstallPromptOutcome }>
  userChoice?: Promise<{ outcome: InstallPromptOutcome }>
}

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean
}

export default function InstallAppPrompt() {
  const [manualInstallMode, setManualInstallMode] =
    useState<ManualInstallMode>('none')
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [isPrompting, setIsPrompting] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)

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
        setIsInstructionsOpen(false)
        setIsPrompting(false)
      }
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent
      promptEvent.preventDefault()
      setDeferredPrompt(promptEvent)
    }

    const handleInstalled = () => {
      setDeferredPrompt(null)
      setIsInstructionsOpen(false)
      setIsDismissed(true)
      setIsPrompting(false)
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

  const isManualInstall = !deferredPrompt
  const isAvailable =
    !isStandalone && (manualInstallMode !== 'none' || Boolean(deferredPrompt))

  if (!hasMounted || !isAvailable || isDismissed) {
    return null
  }

  async function handleInstallClick() {
    if (!deferredPrompt) {
      setIsInstructionsOpen((currentValue) => !currentValue)
      return
    }

    setIsPrompting(true)

    try {
      const promptResult = await deferredPrompt.prompt()
      const outcome =
        promptResult?.outcome ?? (await deferredPrompt.userChoice)?.outcome

      if (outcome === 'dismissed') {
        setIsDismissed(true)
      }
    } catch {
      setIsDismissed(true)
    } finally {
      setDeferredPrompt(null)
      setIsInstructionsOpen(false)
      setIsPrompting(false)
    }
  }

  return (
    <section
      className="glass-card install-prompt-shell"
      aria-label="Install app prompt"
    >
      <div className="install-prompt-content">
        <img
          src="/logo.png"
          alt=""
          className="install-prompt-logo"
          width={56}
          height={56}
        />

        <div className="stack-xs install-prompt-copy">
          <p className="eyebrow">Install</p>
          <h2 className="install-prompt-title">Install Friends Adda</h2>
          <p className="muted-copy">
            Keep Friends Adda on your home screen for faster access and a more
            app-like experience.
          </p>
        </div>
      </div>

      <div className="install-prompt-actions">
        <button
          type="button"
          className="primary-button install-prompt-button"
          onClick={() => void handleInstallClick()}
          disabled={isPrompting}
        >
          <Download size={18} aria-hidden="true" />
          <span>{isPrompting ? 'Opening...' : 'Install app'}</span>
        </button>

        <button
          type="button"
          className="ghost-button install-prompt-dismiss"
          aria-label="Close install prompt"
          onClick={() => {
            setIsDismissed(true)
            setIsInstructionsOpen(false)
          }}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {isManualInstall && isInstructionsOpen ? (
        <div className="install-prompt-instructions">
          <p className="eyebrow">How to install</p>
          <p className="muted-copy">
            {manualInstallMode === 'safari-desktop'
              ? 'In Safari on macOS, open the File menu and choose Add to Dock.'
              : 'Open your browser share menu, then choose Add to Home Screen.'}
          </p>
        </div>
      ) : null}
    </section>
  )
}
