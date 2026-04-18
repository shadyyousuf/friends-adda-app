export type ThemeMode = 'light' | 'dark' | 'auto'

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'auto'
}

export function getStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'auto'
  }

  const stored = window.localStorage.getItem('theme')
  return isThemeMode(stored) ? stored : 'auto'
}

export function resolveThemeMode(mode: ThemeMode) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  return mode === 'auto' ? (prefersDark ? 'dark' : 'light') : mode
}

export function applyThemeMode(mode: ThemeMode) {
  if (typeof window === 'undefined') {
    return
  }

  const resolved = resolveThemeMode(mode)
  const root = document.documentElement

  root.classList.remove('light', 'dark')
  root.classList.add(resolved)

  if (mode === 'auto') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', mode)
  }

  root.style.colorScheme = resolved
}

export function setThemeMode(mode: ThemeMode) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem('theme', mode)
  applyThemeMode(mode)
  window.dispatchEvent(new Event('themechange'))
}
