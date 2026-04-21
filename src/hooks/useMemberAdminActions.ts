import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  approveUser,
  profileKeys,
  promoteUserToAdmin,
  removeUserFromApp,
} from '../utils/profile'

export function useMemberAdminActions(viewerId: string) {
  const queryClient = useQueryClient()
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runMemberAction(
    actionKey: string,
    action: () => Promise<unknown>,
    failureMessage: string,
  ) {
    setError(null)
    setActiveAction(actionKey)

    try {
      await action()
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileKeys.pending(viewerId) }),
        queryClient.invalidateQueries({
          queryKey: profileKeys.approvedMembers(viewerId),
        }),
        queryClient.invalidateQueries({ queryKey: profileKeys.approved(viewerId) }),
      ])
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : failureMessage,
      )
    } finally {
      setActiveAction(null)
    }
  }

  return {
    activeAction,
    error,
    clearError() {
      setError(null)
    },
    approveMember(userId: string) {
      return runMemberAction(
        `approve:${userId}`,
        () => approveUser(userId),
        'Failed to approve user.',
      )
    },
    promoteMember(userId: string) {
      return runMemberAction(
        `promote:${userId}`,
        () => promoteUserToAdmin(userId),
        'Failed to promote user to admin.',
      )
    },
    removeMember(userId: string) {
      return runMemberAction(
        `remove:${userId}`,
        () => removeUserFromApp(userId),
        'Failed to remove user from app.',
      )
    },
  }
}
