export const DEFAULT_MONTHLY_AMOUNT = 3000

export const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

export type FundPeriod = {
  year: number
  month: number
}

export type FundTrackerMember = {
  user_id: string
  joined_at: string
  event_role: 'captain' | 'co-captain' | 'member'
  profiles: {
    email: string
    full_name: string | null
    role: 'admin' | 'member'
  }
}

export type FundTrackerContribution = {
  id: string
  user_id: string
  amount: number
  month: number
  year: number
  status: 'pending' | 'paid'
  created_at: string
}

export type FundStatusItem = {
  member: FundTrackerMember
  payment: FundTrackerContribution | null
  status: 'pending' | 'paid'
}

export type LeaderboardEntry = {
  member: FundTrackerMember
  totalPaid: number
  monthsPaid: number
}

export type TimelineItem = {
  period: FundPeriod
  payment: FundTrackerContribution | null
  status: 'pending' | 'paid'
}

export function getCurrentPeriod(referenceDate = new Date()): FundPeriod {
  return {
    year: referenceDate.getFullYear(),
    month: referenceDate.getMonth() + 1,
  }
}

export function formatPeriodLabel(period: FundPeriod) {
  return `${MONTH_NAMES[period.month - 1]} ${period.year}`
}

export function periodKey(period: FundPeriod) {
  return `${period.year}-${String(period.month).padStart(2, '0')}`
}

export function parsePeriodKey(value: string): FundPeriod {
  const [year, month] = value.split('-').map(Number)

  return {
    year,
    month,
  }
}

export function shiftPeriod(period: FundPeriod, delta: number): FundPeriod {
  const nextDate = new Date(Date.UTC(period.year, period.month - 1 + delta, 1))

  return {
    year: nextDate.getUTCFullYear(),
    month: nextDate.getUTCMonth() + 1,
  }
}

export function getRecentPeriods(
  count: number,
  referenceDate = new Date(),
): FundPeriod[] {
  const current = getCurrentPeriod(referenceDate)

  return Array.from({ length: count }, (_, index) =>
    shiftPeriod(current, -index),
  )
}

export function getPeriodsBetween(
  start: FundPeriod,
  end: FundPeriod,
): FundPeriod[] {
  const periods: FundPeriod[] = []
  let cursor = { ...end }

  while (comparePeriods(cursor, start) >= 0) {
    periods.push(cursor)
    cursor = shiftPeriod(cursor, -1)
  }

  return periods
}

export function comparePeriods(a: FundPeriod, b: FundPeriod) {
  if (a.year !== b.year) {
    return a.year - b.year
  }

  return a.month - b.month
}

export function isMemberActiveForPeriod(
  member: Pick<FundTrackerMember, 'joined_at'>,
  period: FundPeriod,
) {
  const joinedAt = new Date(member.joined_at).getTime()
  const periodEnd = Date.UTC(period.year, period.month, 0, 23, 59, 59, 999)

  return joinedAt <= periodEnd
}

export function findPaymentForPeriod(
  contributions: FundTrackerContribution[],
  userId: string,
  period: FundPeriod,
) {
  return (
    contributions.find(
      (payment) =>
        payment.user_id === userId &&
        payment.year === period.year &&
        payment.month === period.month,
    ) ?? null
  )
}

export function sumAllPaid(contributions: FundTrackerContribution[]) {
  return contributions.reduce((total, contribution) => {
    if (contribution.status !== 'paid') {
      return total
    }

    return total + Number(contribution.amount)
  }, 0)
}

export function buildFundStatusItems(
  members: FundTrackerMember[],
  contributions: FundTrackerContribution[],
  period: FundPeriod,
) {
  return members
    .filter((member) => isMemberActiveForPeriod(member, period))
    .map((member) => {
      const payment = findPaymentForPeriod(contributions, member.user_id, period)
      const status = payment?.status === 'paid' ? 'paid' : 'pending'

      return {
        member,
        payment,
        status,
      } satisfies FundStatusItem
    })
    .sort((left, right) => {
      if (left.status !== right.status) {
        return left.status === 'pending' ? -1 : 1
      }

      return getMemberName(left.member).localeCompare(getMemberName(right.member))
    })
}

export function calculateMonthlyProgress(items: FundStatusItem[]) {
  const totalMembers = items.length
  const paidCount = items.filter((item) => item.status === 'paid').length
  const percentage = totalMembers === 0 ? 0 : (paidCount / totalMembers) * 100

  return {
    paidCount,
    totalMembers,
    percentage,
  }
}

export function buildLeaderboard(
  members: FundTrackerMember[],
  contributions: FundTrackerContribution[],
) {
  return members
    .map((member) => {
      const paidContributions = contributions.filter(
        (contribution) =>
          contribution.user_id === member.user_id && contribution.status === 'paid',
      )

      return {
        member,
        totalPaid: paidContributions.reduce(
          (total, contribution) => total + Number(contribution.amount),
          0,
        ),
        monthsPaid: paidContributions.length,
      } satisfies LeaderboardEntry
    })
    .sort((left, right) => {
      if (right.totalPaid !== left.totalPaid) {
        return right.totalPaid - left.totalPaid
      }

      if (right.monthsPaid !== left.monthsPaid) {
        return right.monthsPaid - left.monthsPaid
      }

      return getMemberName(left.member).localeCompare(getMemberName(right.member))
    })
}

export function buildMemberTimeline(
  member: FundTrackerMember,
  contributions: FundTrackerContribution[],
  eventCreatedAt: string,
  referenceDate = new Date(),
) {
  const currentPeriod = getCurrentPeriod(referenceDate)
  const eventStart = getCurrentPeriod(new Date(eventCreatedAt))
  const memberStart = getCurrentPeriod(new Date(member.joined_at))
  const start =
    comparePeriods(eventStart, memberStart) > 0 ? eventStart : memberStart

  return getPeriodsBetween(start, currentPeriod).map((period) => {
    const payment = findPaymentForPeriod(contributions, member.user_id, period)
    const status = payment?.status === 'paid' ? 'paid' : 'pending'

    return {
      period,
      payment,
      status,
    } satisfies TimelineItem
  })
}

export function getAvatarGradient(seed: string) {
  const gradients = [
    ['#57d1be', '#7fd9ff'],
    ['#f6d68f', '#f0a0aa'],
    ['#7fd9ff', '#9de6d8'],
    ['#f0a0aa', '#57d1be'],
    ['#f6d68f', '#7fd9ff'],
  ] as const

  const hash = Array.from(seed).reduce(
    (value, character) => value + character.charCodeAt(0),
    0,
  )
  const [start, end] = gradients[Math.abs(hash) % gradients.length]

  return `linear-gradient(135deg, ${start} 0%, ${end} 100%)`
}

export function getMemberName(member: {
  profiles: {
    full_name: string | null
    email: string
  }
}) {
  return member.profiles.full_name?.trim() || member.profiles.email
}
