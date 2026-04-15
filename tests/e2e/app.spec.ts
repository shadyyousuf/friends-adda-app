import { expect, test } from '@playwright/test'
import { login, signOut } from './auth'

const adminUser = {
  email: 'admin.test@friends-adda.local',
  password: 'Pass1234!',
}

const memberUser = {
  email: 'member.test@friends-adda.local',
  password: 'Pass1234!',
}

const pendingUser = {
  email: 'pending.test@friends-adda.local',
  password: 'Pass1234!',
}

test('pending user is locked out except for settings', async ({ page }) => {
  await login(page, pendingUser.email, pendingUser.password)

  await expect(page.getByText('Pending Admin Approval')).toBeVisible()
  await page.goto('/settings')
  await expect(page).toHaveURL(/\/settings$/)
  await expect(page.getByText('Account status')).toBeVisible()
})

test('member can access dashboard, members, history, and event detail', async ({
  page,
}) => {
  await login(page, memberUser.email, memberUser.password)

  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText('Your active event space')).toBeVisible()
  await expect(page.getByText('Seed Fund Tracker Open')).toBeVisible()
  await expect(page.getByText('Seed Completed Trip')).toBeVisible()

  await page.getByRole('link', { name: 'Members' }).click()
  await expect(page).toHaveURL(/\/members$/)
  await expect(page.getByText('Approved directory')).toBeVisible()
  await page.getByLabel('Search').fill('A+')
  await expect(page.getByText('Member Tester')).toBeVisible()

  await page.getByRole('link', { name: 'History' }).click()
  await expect(page).toHaveURL(/\/history$/)
  await expect(
    page.getByRole('heading', { name: 'Completed events' }),
  ).toBeVisible()
  await page.getByRole('link', { name: /Seed Completed Trip/ }).click()

  await expect(page).toHaveURL(/\/events\//)
  await expect(page.getByText('Event detail')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Target vs collected' })).toBeVisible()
})

test('admin sees admin controls in settings', async ({ page }) => {
  await login(page, adminUser.email, adminUser.password)

  await expect(page).toHaveURL(/\/$/)
  await page.goto('/settings')

  await expect(page.getByText('User approvals and promotion')).toBeVisible()
  await expect(page.getByText('Pending approvals')).toBeVisible()
  await expect(page.getByText('Pending Tester')).toBeVisible()

  await signOut(page)
  await expect(page.getByText('No active session')).toBeVisible()
})
