import {
  QueryClient,
  hydrate,
  type DehydrateOptions,
  type Query,
} from '@tanstack/react-query'
import {
  persistQueryClientSubscribe,
  type PersistedClient,
} from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

const QUERY_CACHE_STORAGE_KEY = 'friends-adda:query-cache'
const QUERY_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000
const PERSISTED_QUERY_ROOTS = new Set(['events', 'profiles'])

let hasInitializedPersistence = false
let storagePersister: ReturnType<typeof createSyncStoragePersister> | null = null

function shouldPersistQuery(query: Query) {
  return PERSISTED_QUERY_ROOTS.has(String(query.queryKey[0] ?? ''))
}

function isPersistedClient(value: unknown): value is PersistedClient {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'buster' in value &&
      'timestamp' in value &&
      'clientState' in value,
  )
}

function getStoragePersister() {
  if (typeof window === 'undefined') {
    return null
  }

  if (!storagePersister) {
    storagePersister = createSyncStoragePersister({
      storage: window.localStorage,
      key: QUERY_CACHE_STORAGE_KEY,
      throttleTime: 1_000,
    })
  }

  return storagePersister
}

function restorePersistedQueries(queryClient: QueryClient) {
  const persister = getStoragePersister()

  if (!persister) {
    return
  }

  const restoredClient = persister.restoreClient()

  if (!isPersistedClient(restoredClient)) {
    return
  }

  const isExpired =
    restoredClient.buster !== __APP_VERSION__ ||
    Date.now() - restoredClient.timestamp > QUERY_CACHE_MAX_AGE_MS

  if (isExpired) {
    persister.removeClient()
    return
  }

  hydrate(queryClient, restoredClient.clientState)
}

function setupQueryPersistence(queryClient: QueryClient) {
  if (typeof window === 'undefined' || hasInitializedPersistence) {
    return
  }

  const persister = getStoragePersister()

  if (!persister) {
    return
  }

  restorePersistedQueries(queryClient)
  persistQueryClientSubscribe({
    queryClient,
    persister,
    buster: __APP_VERSION__,
    dehydrateOptions: {
      shouldDehydrateQuery: shouldPersistQuery,
    } satisfies DehydrateOptions,
  })

  hasInitializedPersistence = true
}

export function createQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  })

  setupQueryPersistence(queryClient)

  return queryClient
}

export function clearPersistedQueryCache() {
  getStoragePersister()?.removeClient()
}
