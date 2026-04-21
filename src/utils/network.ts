export function isOnline() {
  if (typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean') {
    return true
  }

  return navigator.onLine
}

export function assertOnlineForMutation(action: string) {
  if (!isOnline()) {
    throw new Error(`You're offline. Reconnect to ${action}.`)
  }
}
