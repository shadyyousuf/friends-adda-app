import { describe, expect, it } from 'vitest'
import {
  buildFundStatusItems,
  buildLeaderboard,
  buildMemberTimeline,
  calculateMonthlyProgress,
  DEFAULT_MONTHLY_AMOUNT,
  getAvatarGradient,
  type FundTrackerContribution,
  type FundTrackerMember,
} from './fund-tracker'

const members: FundTrackerMember[] = [
  {
    user_id: 'captain',
    joined_at: '2026-01-05T00:00:00.000Z',
    event_role: 'captain',
    profiles: {
      email: 'captain@example.com',
      full_name: 'Captain',
      role: 'member',
    },
  },
  {
    user_id: 'member',
    joined_at: '2026-03-02T00:00:00.000Z',
    event_role: 'member',
    profiles: {
      email: 'member@example.com',
      full_name: 'Member',
      role: 'member',
    },
  },
]

const contributions: FundTrackerContribution[] = [
  {
    id: 'jan-captain',
    user_id: 'captain',
    amount: DEFAULT_MONTHLY_AMOUNT,
    month: 1,
    year: 2026,
    status: 'paid',
    created_at: '2026-01-10T00:00:00.000Z',
  },
  {
    id: 'mar-captain',
    user_id: 'captain',
    amount: 3500,
    month: 3,
    year: 2026,
    status: 'paid',
    created_at: '2026-03-11T00:00:00.000Z',
  },
  {
    id: 'mar-member',
    user_id: 'member',
    amount: DEFAULT_MONTHLY_AMOUNT,
    month: 3,
    year: 2026,
    status: 'paid',
    created_at: '2026-03-12T00:00:00.000Z',
  },
  {
    id: 'apr-captain-pending',
    user_id: 'captain',
    amount: DEFAULT_MONTHLY_AMOUNT,
    month: 4,
    year: 2026,
    status: 'pending',
    created_at: '2026-04-10T00:00:00.000Z',
  },
]

describe('fund-tracker helpers', () => {
  it('sorts pending members before paid members for the selected period', () => {
    const items = buildFundStatusItems(members, contributions, {
      year: 2026,
      month: 1,
    })

    expect(items).toHaveLength(2)
    expect(items.map((item) => item.member.user_id)).toEqual([
      'member',
      'captain',
    ])
    expect(items.map((item) => item.status)).toEqual(['pending', 'paid'])

    const marchItems = buildFundStatusItems(members, contributions, {
      year: 2026,
      month: 4,
    })

    expect(marchItems.map((item) => item.member.user_id)).toEqual([
      'captain',
      'member',
    ])
    expect(marchItems.map((item) => item.status)).toEqual(['pending', 'pending'])
  })

  it('calculates the monthly progress from mapped items', () => {
    const items = buildFundStatusItems(members, contributions, {
      year: 2026,
      month: 3,
    })

    expect(calculateMonthlyProgress(items)).toEqual({
      paidCount: 2,
      totalMembers: 2,
      percentage: 100,
    })
  })

  it('builds a leaderboard by total paid and months paid', () => {
    const leaderboard = buildLeaderboard(members, contributions)

    expect(leaderboard[0]?.member.user_id).toBe('captain')
    expect(leaderboard[0]?.totalPaid).toBe(6500)
    expect(leaderboard[0]?.monthsPaid).toBe(2)
    expect(leaderboard[1]?.member.user_id).toBe('member')
  })

  it('builds a timeline sorted by month and year in ascending order without pending entries', () => {
    const timeline = buildMemberTimeline(
      members[0],
      contributions,
    )

    expect(timeline.map((item) => item.period.month)).toEqual([1, 3])
    expect(timeline.map((item) => item.period.year)).toEqual([2026, 2026])
    expect(timeline.map((item) => item.status)).toEqual(['paid', 'paid'])
    expect(timeline.some((item) => item.status === 'pending')).toBe(false)
  })

  it('returns deterministic avatar gradients', () => {
    expect(getAvatarGradient('Captain')).toBe(getAvatarGradient('Captain'))
    expect(getAvatarGradient('Captain')).not.toBe(getAvatarGradient('Member'))
  })
})
