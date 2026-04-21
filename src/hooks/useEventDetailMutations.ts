import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { eventKeys } from '../utils/events'

export function useEventDetailMutations({
  eventId,
  viewerId,
}: {
  eventId: string
  viewerId: string
}) {
  const queryClient = useQueryClient()
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const detailQueryKey = eventKeys.detail(viewerId, eventId)

  async function invalidateDetail() {
    await queryClient.invalidateQueries({
      queryKey: detailQueryKey,
    })
  }

  async function invalidateDashboard() {
    await queryClient.invalidateQueries({
      queryKey: eventKeys.dashboard(viewerId),
    })
  }

  async function invalidateDetailAndDashboard() {
    await Promise.all([invalidateDetail(), invalidateDashboard()])
  }

  async function runMutation(
    actionKey: string,
    action: () => Promise<void>,
    fallbackMessage: string,
  ) {
    setErrorMessage(null)
    setActiveAction(actionKey)

    try {
      await action()
      return true
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : fallbackMessage,
      )
      return false
    } finally {
      setActiveAction(null)
    }
  }

  return {
    activeAction,
    errorMessage,
    setErrorMessage,
    clearError() {
      setErrorMessage(null)
    },
    detailQueryKey,
    invalidateDetail,
    invalidateDashboard,
    invalidateDetailAndDashboard,
    runMutation,
  }
}
