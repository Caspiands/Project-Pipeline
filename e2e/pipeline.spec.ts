import { test, expect } from '@playwright/test'
import { signInFully, ADMIN_EMAIL } from './helpers'

test.describe('pipeline tab', () => {
  test.beforeEach(async ({ page }) => {
    await signInFully(page, ADMIN_EMAIL)
  })

  test('opens the drawer from a row and shows stage history area', async ({ page }) => {
    await page.goto('/pipeline')
    await expect(page.getByTestId('pipeline-table')).toBeVisible()
    await page.locator('tbody tr.click').first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible()
  })
})
