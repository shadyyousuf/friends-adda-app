import { useQueryClient } from '@tanstack/react-query'
import type { AuthChangeEvent, User } from '@supabase/supabase-js'
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { supabase, type Database } from '../utils/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']
type AuthStatus = 'initializing' | 'signed-out' | 'signed-in'

type AuthContextValue = {
  user: User | null
  profile: Profile | null
  authStatus: AuthStatus
  isProfileLoading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)
const AUTH_DEPENDENT_QUERY_ROOTS = new Set(['events', 'profiles'])

async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [authStatus, setAuthStatus] = useState<AuthStatus>('initializing')
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const isMountedRef = useRef(true)
  const currentUserIdRef = useRef<string | null>(null)
  const profileRequestIdRef = useRef(0)
  const profileRef = useRef<Profile | null>(null)

  function setProfileState(nextProfile: Profile | null) {
    profileRef.current = nextProfile
    setProfile(nextProfile)
  }

  function clearAuthDependentQueries() {
    queryClient.removeQueries({
      predicate: (query) =>
        AUTH_DEPENDENT_QUERY_ROOTS.has(String(query.queryKey[0] ?? '')),
    })
  }

  function applySignedOutState() {
    currentUserIdRef.current = null
    profileRequestIdRef.current += 1
    setUser(null)
    setProfileState(null)
    setAuthStatus('signed-out')
    setIsProfileLoading(false)
  }

  async function loadProfile(
    userId: string,
    {
      markLoading,
      preserveExistingProfile,
    }: {
      markLoading: boolean
      preserveExistingProfile?: boolean
    },
  ) {
    const requestId = ++profileRequestIdRef.current
    currentUserIdRef.current = userId

    if (markLoading) {
      setIsProfileLoading(true)
    }

    try {
      const nextProfile = await fetchProfile(userId)

      if (
        !isMountedRef.current ||
        profileRequestIdRef.current !== requestId ||
        currentUserIdRef.current !== userId
      ) {
        return
      }

      setProfileState(nextProfile)
    } catch (error) {
      console.error('Failed to load profile', error)

      if (
        !isMountedRef.current ||
        profileRequestIdRef.current !== requestId ||
        currentUserIdRef.current !== userId
      ) {
        return
      }

      if (!preserveExistingProfile) {
        setProfileState(null)
      }
    } finally {
      if (
        !isMountedRef.current ||
        profileRequestIdRef.current !== requestId ||
        currentUserIdRef.current !== userId
      ) {
        return
      }

      setIsProfileLoading(false)
    }
  }

  function applySignedInState(
    nextUser: User,
    {
      markProfileLoading,
      preserveExistingProfile,
    }: {
      markProfileLoading: boolean
      preserveExistingProfile?: boolean
    },
  ) {
    currentUserIdRef.current = nextUser.id
    setUser(nextUser)
    setAuthStatus('signed-in')
    void loadProfile(nextUser.id, {
      markLoading: markProfileLoading,
      preserveExistingProfile,
    })
  }

  async function reconcileVerifiedUser(sessionUser: User) {
    try {
      const {
        data: { user: verifiedUser },
      } = await supabase.auth.getUser()

      if (!isMountedRef.current || currentUserIdRef.current !== sessionUser.id) {
        return
      }

      if (!verifiedUser) {
        applySignedOutState()
        clearAuthDependentQueries()
        return
      }

      if (verifiedUser.id !== sessionUser.id) {
        const isSameUser = currentUserIdRef.current === verifiedUser.id
        applySignedInState(verifiedUser, {
          markProfileLoading: !isSameUser || !profileRef.current,
          preserveExistingProfile: isSameUser,
        })
        return
      }

      setUser(verifiedUser)
    } catch (error) {
      console.error('Failed to verify cached auth session', error)

      if (!isMountedRef.current || currentUserIdRef.current !== sessionUser.id) {
        return
      }

      applySignedOutState()
      clearAuthDependentQueries()
    }
  }

  async function refreshProfile() {
    if (!user) {
      setProfileState(null)
      setIsProfileLoading(false)
      return
    }

    await loadProfile(user.id, {
      markLoading: false,
      preserveExistingProfile: true,
    })
  }

  useEffect(() => {
    isMountedRef.current = true

    function handleAuthStateChange(event: AuthChangeEvent, nextUser: User | null) {
      if (event === 'SIGNED_OUT' || !nextUser) {
        applySignedOutState()
        clearAuthDependentQueries()
        return
      }

      if (
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        const isSameUser = currentUserIdRef.current === nextUser.id
        applySignedInState(nextUser, {
          markProfileLoading: !isSameUser || !profileRef.current,
          preserveExistingProfile: isSameUser,
        })
      }
    }

    async function initialize() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!isMountedRef.current) {
          return
        }

        const initialUser = session?.user ?? null

        if (!initialUser) {
          applySignedOutState()
          return
        }

        applySignedInState(initialUser, {
          markProfileLoading: true,
        })
        void reconcileVerifiedUser(initialUser)
      } catch (error) {
        console.error('Failed to initialize auth', error)

        if (!isMountedRef.current) {
          return
        }

        applySignedOutState()
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      handleAuthStateChange(event, session?.user ?? null)
    })

    void initialize()

    return () => {
      isMountedRef.current = false
      subscription.unsubscribe()
    }
  }, [queryClient])

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        authStatus,
        isProfileLoading,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
