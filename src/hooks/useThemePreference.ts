import { useEffect, useState } from 'react'
import {
  applyThemeMode,
  getStoredThemeMode,
  setThemeMode,
  type ThemeMode,
} from '../utils/theme'

export function useThemePreference() {
  const [mode, setModeState] = useState<ThemeMode>('auto')

  useEffect(() => {
    const initialMode = getStoredThemeMode()
    setModeState(initialMode)
    applyThemeMode(initialMode)
  }, [])

  useEffect(() => {
    if (mode !== 'auto') {
      return
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyThemeMode('auto')

    media.addEventListener('change', onChange)
    return () => {
      media.removeEventListener('change', onChange)
    }
  }, [mode])

  useEffect(() => {
    function handleThemeUpdate() {
      const nextMode = getStoredThemeMode()
      setModeState(nextMode)
      applyThemeMode(nextMode)
    }

    window.addEventListener('themechange', handleThemeUpdate)
    window.addEventListener('storage', handleThemeUpdate)
    return () => {
      window.removeEventListener('themechange', handleThemeUpdate)
      window.removeEventListener('storage', handleThemeUpdate)
    }
  }, [])

  function updateMode(nextMode: ThemeMode) {
    setModeState(nextMode)
    setThemeMode(nextMode)
  }

  function cycleMode() {
    const nextMode: ThemeMode =
      mode === 'light' ? 'dark' : mode === 'dark' ? 'auto' : 'light'
    updateMode(nextMode)
  }

  return {
    mode,
    setMode: updateMode,
    cycleMode,
  }
}
