import type { User } from '@supabase/supabase-js'
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { supabase, type Database } from '../utils/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

type AuthContextValue = {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

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
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  async function hydrateAuthState(nextUser: User | null) {
    setUser(nextUser)

    if (!nextUser) {
      setProfile(null)
      setIsLoading(false)
      return
    }

    try {
      const nextProfile = await fetchProfile(nextUser.id)
      setProfile(nextProfile)
    } catch (error) {
      console.error('Failed to load profile', error)
      setProfile(null)
    } finally {
      setIsLoading(false)
    }
  }

  async function refreshProfile() {
    if (!user) {
      setProfile(null)
      return
    }

    const nextProfile = await fetchProfile(user.id)
    setProfile(nextProfile)
  }

  useEffect(() => {
    let isMounted = true

    async function initialize() {
      try {
        const {
          data: { user: initialUser },
        } = await supabase.auth.getUser()

        if (isMounted) {
          await hydrateAuthState(initialUser)
        }
      } catch (error) {
        console.error('Failed to initialize auth', error)
        if (isMounted) {
          setUser(null)
          setProfile(null)
          setIsLoading(false)
        }
      }
    }

    void initialize()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoading(true)
      void hydrateAuthState(session?.user ?? null)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, refreshProfile }}>
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
