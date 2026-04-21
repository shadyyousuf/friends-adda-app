/** @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Route } from './settings'

const mocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  getStoredThemeModeMock: vi.fn(() => 'auto'),
  applyThemeModeMock: vi.fn(),
  setThemeModeMock: vi.fn(),
  signOutMock: vi.fn(),
  pendingProfilesQueryOptionsMock: vi.fn(() => ({
    queryKey: ['profiles', 'pending'],
    queryFn: async () => [],
  })),
  approvedMemberProfilesQueryOptionsMock: vi.fn(() => ({
    queryKey: ['profiles', 'approved-members'],
    queryFn: async () => [],
  })),
  approveUserMock: vi.fn(),
  removeUserFromAppMock: vi.fn(),
  promoteUserToAdminMock: vi.fn(),
  updateOwnProfileMock: vi.fn(),
}))

vi.mock('../components/AuthProvider', () => ({
  useAuth: mocks.useAuthMock,
}))

vi.mock('../utils/auth', () => ({
  signOut: mocks.signOutMock,
}))

vi.mock('../utils/theme', () => ({
  applyThemeMode: mocks.applyThemeModeMock,
  getStoredThemeMode: mocks.getStoredThemeModeMock,
  setThemeMode: mocks.setThemeModeMock,
}))

vi.mock('../utils/profile', () => ({
  approvedMemberProfilesQueryOptions:
    mocks.approvedMemberProfilesQueryOptionsMock,
  approveUser: mocks.approveUserMock,
  pendingProfilesQueryOptions: mocks.pendingProfilesQueryOptionsMock,
  profileKeys: {
    pending: (viewerId: string) => ['profiles', 'pending', viewerId],
    approvedMembers: (viewerId: string) => ['profiles', 'approved-members', viewerId],
    approved: (viewerId: string) => ['profiles', 'approved', viewerId],
  },
  promoteUserToAdmin: mocks.promoteUserToAdminMock,
  removeUserFromApp: mocks.removeUserFromAppMock,
  updateOwnProfile: mocks.updateOwnProfileMock,
}))

function renderSettings() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  const SettingsComponent = Route.options.component as () => ReactElement

  return render(
    <QueryClientProvider client={queryClient}>
      <SettingsComponent />
    </QueryClientProvider>,
  )
}

function getSectionOrder(container: HTMLElement) {
  const sectionNames = new Set([
    'Admin',
    'Settings',
    'Profile',
    'Appearance',
    'Session',
  ])

  return Array.from(container.querySelectorAll('.eyebrow'))
    .map((node) => node.textContent?.trim() ?? '')
    .filter((text) => sectionNames.has(text))
}

function createSignedInAuthState(overrides?: Record<string, unknown>) {
  return {
    user: {
      id: 'user-1',
      email: 'very-long-email-address-that-should-wrap-on-the-settings-card@example.com',
    },
    profile: {
      id: 'profile-1',
      role: 'member',
      full_name: 'Test User',
      blood_group: 'A+',
      is_approved: true,
    },
    authStatus: 'signed-in',
    isProfileLoading: false,
    refreshProfile: vi.fn(),
    ...overrides,
  }
}

describe('SettingsPage', () => {
  beforeEach(() => {
    mocks.useAuthMock.mockReset()
    mocks.getStoredThemeModeMock.mockReset()
    mocks.getStoredThemeModeMock.mockReturnValue('auto')
    mocks.applyThemeModeMock.mockReset()
    mocks.setThemeModeMock.mockReset()
    mocks.signOutMock.mockReset()
    mocks.pendingProfilesQueryOptionsMock.mockClear()
    mocks.approvedMemberProfilesQueryOptionsMock.mockClear()
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

    renderSettings()

    expect(screen.queryByText('No active session')).toBeNull()
    expect(screen.getByLabelText('Loading')).toBeTruthy()
  })

  it('renders admin users in the requested section order', () => {
    mocks.useAuthMock.mockReturnValue(
      createSignedInAuthState({
        profile: {
          id: 'profile-1',
          role: 'admin',
          full_name: 'Admin User',
          blood_group: 'AB+',
          is_approved: true,
        },
      }),
    )

    const { container } = renderSettings()

    expect(getSectionOrder(container)).toEqual([
      'Admin',
      'Settings',
      'Profile',
      'Appearance',
      'Session',
    ])
    expect(screen.queryByRole('heading', { name: 'Theme' })).toBeNull()
    expect(screen.getByText('Mode')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy()
  })

  it('renders non-admin users in the requested section order without the admin section', () => {
    mocks.useAuthMock.mockReturnValue(createSignedInAuthState())

    const { container } = renderSettings()

    expect(getSectionOrder(container)).toEqual([
      'Settings',
      'Profile',
      'Appearance',
      'Session',
    ])
    expect(screen.queryByText('Admin')).toBeNull()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy()
  })
})
