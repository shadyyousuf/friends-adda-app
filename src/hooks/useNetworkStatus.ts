import { useEffect, useState } from 'react'
import { isOnline } from '../utils/network'

export function useNetworkStatus() {
  const [online, setOnline] = useState(() => isOnline())

  useEffect(() => {
    function handleOnline() {
      setOnline(true)
    }

    function handleOffline() {
      setOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return {
    isOnline: online,
  }
}
