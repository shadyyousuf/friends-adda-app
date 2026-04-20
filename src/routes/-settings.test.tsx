/** @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Route } from './settings'

const mocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
}))

vi.mock('../components/AuthProvider', () => ({
  useAuth: mocks.useAuthMock,
}))

describe('SettingsPage', () => {
  beforeEach(() => {
    mocks.useAuthMock.mockReset()
    window.localStorage.clear()

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('does not show the signed-out state while auth is still initializing', () => {
    mocks.useAuthMock.mockReturnValue({
      user: null,
      profile: null,
      authStatus: 'initializing',
      isProfileLoading: false,
      refreshProfile: vi.fn(),
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    const SettingsComponent = Route.options.component as () => JSX.Element

    render(
      <QueryClientProvider client={queryClient}>
        <SettingsComponent />
      </QueryClientProvider>,
    )

    expect(screen.queryByText('No active session')).toBeNull()
    expect(screen.getByLabelText('Loading')).toBeTruthy()
  })
})
