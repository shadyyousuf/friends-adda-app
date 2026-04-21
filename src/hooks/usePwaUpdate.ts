import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

type PwaState = {
  isOfflineReady: boolean
  isUpdateReady: boolean
  isUpdating: boolean
}

const initialState: PwaState = {
  isOfflineReady: false,
  isUpdateReady: false,
  isUpdating: false,
}

let pwaState = initialState
let hasRegistered = false
let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null = null
const listeners = new Set<(state: PwaState) => void>()

function emitPwaState() {
  for (const listener of listeners) {
    listener(pwaState)
  }
}

export function registerPwa() {
  if (typeof window === 'undefined' || hasRegistered) {
    return
  }

  if (import.meta.env.DEV) {
    hasRegistered = true

    void window.navigator.serviceWorker
      ?.getRegistrations()
      .then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      )
      .catch(() => {})

    return
  }

  hasRegistered = true
  updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      pwaState = {
        ...pwaState,
        isUpdateReady: true,
      }
      emitPwaState()
    },
    onOfflineReady() {
      pwaState = {
        ...pwaState,
        isOfflineReady: true,
      }
      emitPwaState()
    },
    onRegisterError(error) {
      console.error('Failed to register service worker', error)
    },
  })
}

function subscribePwaState(listener: (state: PwaState) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function usePwaUpdate() {
  const [state, setState] = useState<PwaState>(pwaState)

  useEffect(() => {
    registerPwa()
    return subscribePwaState(setState)
  }, [])

  async function applyUpdate() {
    if (!updateServiceWorker) {
      return
    }

    pwaState = {
      ...pwaState,
      isUpdating: true,
    }
    emitPwaState()

    await updateServiceWorker(true)
  }

  return {
    ...state,
    applyUpdate,
  }
}
