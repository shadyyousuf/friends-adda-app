/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import InstallAppPrompt from './InstallAppPrompt'

type PromptEventInit = Event & {
  prompt: ReturnType<typeof vi.fn>
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function mockMatchMedia({ standalone = false }: { standalone?: boolean } = {}) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)' ? standalone : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

function mockNavigator({
  userAgent,
  maxTouchPoints = 0,
}: {
  userAgent: string
  maxTouchPoints?: number
}) {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: userAgent,
  })
  Object.defineProperty(window.navigator, 'maxTouchPoints', {
    configurable: true,
    value: maxTouchPoints,
  })
  Object.defineProperty(window.navigator, 'standalone', {
    configurable: true,
    value: false,
  })
}

function dispatchBeforeInstallPrompt({
  outcome = 'accepted',
  prompt = vi.fn().mockResolvedValue({ outcome }),
}: {
  outcome?: 'accepted' | 'dismissed'
  prompt?: ReturnType<typeof vi.fn>
} = {}) {
  const event = new Event('beforeinstallprompt', {
    cancelable: true,
  }) as PromptEventInit

  event.prompt = prompt
  event.userChoice = Promise.resolve({ outcome })
  window.dispatchEvent(event)

  return { event, prompt }
}

describe('InstallAppPrompt', () => {
  beforeEach(() => {
    cleanup()
    mockMatchMedia()
    mockNavigator({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('stays hidden when the app is already running in standalone mode', () => {
    mockMatchMedia({ standalone: true })

    render(<InstallAppPrompt />)

    expect(screen.queryByText('Install Friends Adda')).toBeNull()
  })

  it('shows immediately for manual-install browsers', async () => {
    mockNavigator({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    })

    render(<InstallAppPrompt />)

    expect(await screen.findByText('Install Friends Adda')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Install app' })).toBeTruthy()
  })

  it('shows after beforeinstallprompt fires', async () => {
    render(<InstallAppPrompt />)

    expect(screen.queryByText('Install Friends Adda')).toBeNull()

    dispatchBeforeInstallPrompt()

    expect(await screen.findByText('Install Friends Adda')).toBeTruthy()
  })

  it('hides after dismissal for the current lifecycle only', async () => {
    mockNavigator({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    })

    const { unmount } = render(<InstallAppPrompt />)

    expect(await screen.findByText('Install Friends Adda')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Close install prompt' }))

    await waitFor(() => {
      expect(screen.queryByText('Install Friends Adda')).toBeNull()
    })

    unmount()
    render(<InstallAppPrompt />)

    expect(await screen.findByText('Install Friends Adda')).toBeTruthy()
  })

  it('opens the native install prompt when available', async () => {
    render(<InstallAppPrompt />)

    const { prompt } = dispatchBeforeInstallPrompt()

    expect(await screen.findByText('Install Friends Adda')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Install app' }))

    await waitFor(() => {
      expect(prompt).toHaveBeenCalledTimes(1)
      expect(screen.queryByText('Install Friends Adda')).toBeNull()
    })
  })

  it('expands manual install instructions when no native prompt is available', async () => {
    mockNavigator({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    })

    render(<InstallAppPrompt />)

    expect(await screen.findByText('Install Friends Adda')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Install app' }))

    expect(
      await screen.findByText(
        'Open your browser share menu, then choose Add to Home Screen.',
      ),
    ).toBeTruthy()
  })

  it('closes when the app is installed', async () => {
    mockNavigator({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    })

    render(<InstallAppPrompt />)

    expect(await screen.findByText('Install Friends Adda')).toBeTruthy()

    window.dispatchEvent(new Event('appinstalled'))

    await waitFor(() => {
      expect(screen.queryByText('Install Friends Adda')).toBeNull()
    })
  })
})
