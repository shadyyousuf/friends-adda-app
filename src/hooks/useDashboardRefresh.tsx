import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type DashboardRefreshHandler = (() => Promise<void>) | null

type DashboardRefreshContextValue = {
  isRefreshing: boolean
  requestRefresh: () => Promise<void>
  registerRefreshHandler: (handler: DashboardRefreshHandler) => void
}

const DashboardRefreshContext = createContext<DashboardRefreshContextValue | null>(
  null,
)

export function DashboardRefreshProvider({
  children,
}: {
  children: ReactNode
}) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const handlerRef = useRef<DashboardRefreshHandler>(null)

  async function requestRefresh() {
    if (isRefreshing || !handlerRef.current) {
      return
    }

    setIsRefreshing(true)

    try {
      await handlerRef.current()
    } finally {
      setIsRefreshing(false)
    }
  }

  function registerRefreshHandler(handler: DashboardRefreshHandler) {
    handlerRef.current = handler
  }

  return (
    <DashboardRefreshContext.Provider
      value={{
        isRefreshing,
        requestRefresh,
        registerRefreshHandler,
      }}
    >
      {children}
    </DashboardRefreshContext.Provider>
  )
}

export function useDashboardRefresh() {
  const context = useContext(DashboardRefreshContext)

  if (!context) {
    throw new Error('useDashboardRefresh must be used within DashboardRefreshProvider')
  }

  return context
}

export function useDashboardRefreshRegistration(
  handler: DashboardRefreshHandler,
  enabled = true,
) {
  const { registerRefreshHandler } = useDashboardRefresh()

  useEffect(() => {
    if (!enabled) {
      registerRefreshHandler(null)
      return
    }

    registerRefreshHandler(handler)
    return () => {
      registerRefreshHandler(null)
    }
  }, [enabled, handler, registerRefreshHandler])
}
