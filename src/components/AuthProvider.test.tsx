/** @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { AuthChangeEvent, User } from '@supabase/supabase-js'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './AuthProvider'

const mocks = vi.hoisted(() => ({
  authStateChangeHandler: null as
    | ((event: AuthChangeEvent, session: { user: User | null } | null) => void)
    | null,
  getSessionMock: vi.fn(),
  getUserMock: vi.fn(),
  maybeSingleMock: vi.fn(),
  unsubscribeMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
  eqMock: vi.fn(),
  selectMock: vi.fn(),
  fromMock: vi.fn(),
}))

mocks.eqMock.mockImplementation(() => ({
  maybeSingle: mocks.maybeSingleMock,
}))
mocks.selectMock.mockImplementation(() => ({
  eq: mocks.eqMock,
}))
mocks.fromMock.mockImplementation((table: string) => {
  if (table !== 'profiles') {
    throw new Error(`Unexpected table lookup: ${table}`)
  }

  return {
    select: mocks.selectMock,
  }
})

vi.mock('../utils/supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSessionMock,
      getUser: mocks.getUserMock,
      onAuthStateChange: mocks.onAuthStateChangeMock,
    },
    from: mocks.fromMock,
  },
}))

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })

  return { promise, resolve, reject }
}

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-04-21T00:00:00.000Z',
    email: 'user@example.com',
    ...overrides,
  } as User
}

function createProfile(userId: string) {
  return {
    id: userId,
    full_name: 'Friends User',
    email: 'user@example.com',
    role: 'member' as const,
    is_approved: true,
    blood_group: 'A+',
    created_at: '2026-04-21T00:00:00.000Z',
  }
}

function AuthSnapshot() {
  const { user, profile, authStatus, isProfileLoading } = useAuth()

  return (
    <div>
      <span>{`auth:${authStatus}`}</span>
      <span>{`user:${user?.id ?? 'none'}`}</span>
      <span>{`profile:${profile?.id ?? 'none'}`}</span>
      <span>{`profileLoading:${String(isProfileLoading)}`}</span>
    </div>
  )
}

function renderAuthProvider() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthSnapshot />
      </AuthProvider>
    </QueryClientProvider>,
  )

  return queryClient
}

describe('AuthProvider', () => {
  beforeEach(() => {
    mocks.authStateChangeHandler = null
    mocks.getSessionMock.mockReset()
    mocks.getUserMock.mockReset()
    mocks.maybeSingleMock.mockReset()
    mocks.unsubscribeMock.mockReset()
    mocks.selectMock.mockClear()
    mocks.eqMock.mockClear()
    mocks.fromMock.mockClear()
    mocks.onAuthStateChangeMock.mockImplementation((callback) => {
      mocks.authStateChangeHandler = callback

      return {
        data: {
          subscription: {
            unsubscribe: mocks.unsubscribeMock,
          },
        },
      }
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('marks a cached session as signed-in before user verification finishes', async () => {
    const cachedUser = createUser()
    const verifiedUser = createDeferred<{ data: { user: User | null } }>()

    mocks.getSessionMock.mockResolvedValue({
      data: {
        session: {
          user: cachedUser,
        },
      },
    })
    mocks.getUserMock.mockReturnValue(verifiedUser.promise)
    mocks.maybeSingleMock.mockResolvedValue({
      data: createProfile(cachedUser.id),
      error: null,
    })

    renderAuthProvider()

    await waitFor(() => {
      expect(screen.getByText('auth:signed-in')).toBeTruthy()
      expect(screen.getByText(`user:${cachedUser.id}`)).toBeTruthy()
    })

    expect(mocks.getUserMock).toHaveBeenCalledTimes(1)

    verifiedUser.resolve({
      data: {
        user: cachedUser,
      },
    })

    await waitFor(() => {
      expect(screen.getByText(`profile:${cachedUser.id}`)).toBeTruthy()
    })
  })

  it('transitions to signed-out when no cached session exists', async () => {
    mocks.getSessionMock.mockResolvedValue({
      data: {
        session: null,
      },
    })

    renderAuthProvider()

    await waitFor(() => {
      expect(screen.getByText('auth:signed-out')).toBeTruthy()
      expect(screen.getByText('user:none')).toBeTruthy()
      expect(screen.getByText('profile:none')).toBeTruthy()
    })

    expect(mocks.getUserMock).not.toHaveBeenCalled()
    expect(mocks.maybeSingleMock).not.toHaveBeenCalled()
  })

  it('clears auth-dependent query caches on sign-out', async () => {
    const cachedUser = createUser()

    mocks.getSessionMock.mockResolvedValue({
      data: {
        session: {
          user: cachedUser,
        },
      },
    })
    mocks.getUserMock.mockResolvedValue({
      data: {
        user: cachedUser,
      },
    })
    mocks.maybeSingleMock.mockResolvedValue({
      data: createProfile(cachedUser.id),
      error: null,
    })

    const hydratedQueryClient = renderAuthProvider()

    await waitFor(() => {
      expect(screen.getByText('auth:signed-in')).toBeTruthy()
      expect(screen.getByText(`profile:${cachedUser.id}`)).toBeTruthy()
    })

    hydratedQueryClient.setQueryData(['events', 'dashboard', cachedUser.id], {
      myEvents: [],
      discoverEvents: [],
    })
    hydratedQueryClient.setQueryData(['profiles', 'approved'], [{ id: cachedUser.id }])
    hydratedQueryClient.setQueryData(['theme'], 'auto')

    act(() => {
      mocks.authStateChangeHandler?.('SIGNED_OUT', null)
    })

    await waitFor(() => {
      expect(screen.getByText('auth:signed-out')).toBeTruthy()
      expect(screen.getByText('user:none')).toBeTruthy()
    })

    expect(
      hydratedQueryClient.getQueryData(['events', 'dashboard', cachedUser.id]),
    ).toBeUndefined()
    expect(
      hydratedQueryClient.getQueryData(['profiles', 'approved']),
    ).toBeUndefined()
    expect(hydratedQueryClient.getQueryData(['theme'])).toBe('auto')
  })
})
