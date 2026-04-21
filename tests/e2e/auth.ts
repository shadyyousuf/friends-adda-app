import type { Page } from '@playwright/test'

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.locator('body[data-app-ready="true"]').waitFor()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Log in' }).click()
}

export async function signOut(page: Page) {
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Sign out' }).click()
}
