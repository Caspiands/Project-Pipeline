import { expect, test } from '@playwright/test'
import { ADMIN_EMAIL, DEACTIVATED_EMAIL, EDITOR_EMAIL, VIEWER_EMAIL, codesLoggedSince, signInFully, signInWithPassword, waitForCode } from './helpers'

test.describe('sign-in with emailed code', () => {
  test('sign in → wrong code → right code → board → reload stays in → sign out', async ({ page }) => {
    const since = new Date(Date.now() - 1000)

    // Signed-out visitors cannot see the board.
    await page.goto('/overview')
    await expect(page).toHaveURL(/\/sign-in$/)
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()

    await signInWithPassword(page, ADMIN_EMAIL)
    await expect(page).toHaveURL(/\/verify$/)
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible()
    await expect(page.getByText(/We sent a 6-digit code to ad•••@caspiands\.com\. It expires in 10 minutes\./)).toBeVisible()
    await expect(page.getByRole('button', { name: /Send a new code \(\d+s\)/ })).toBeDisabled()

    // A wrong code is refused and the board stays closed.
    const code = await waitForCode(ADMIN_EMAIL, since)
    const wrong = code === '000000' ? '111111' : '000000'
    await page.getByLabel('6-digit code').fill(wrong)
    await expect(page.getByRole('alert')).toHaveText('That code is not right. 4 tries left.')
    await page.goto('/overview')
    await expect(page).toHaveURL(/\/verify$/)

    // The right code opens the board (auto-submits at 6 digits).
    await page.getByLabel('6-digit code').fill(code)
    await expect(page).toHaveURL(/\/overview$/)
    await expect(page.getByRole('heading', { name: 'CDS Pipeline Board' })).toBeVisible()
    await expect(page.getByText('Bharg')).toBeVisible()
    await expect(page.getByText('admin', { exact: true })).toBeVisible()
    await expect(page.getByText(/verified until \d\d:\d\d/)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Team & access' })).toBeVisible()

    // Reload keeps the person in: the database, not the browser, remembers the verification.
    await page.reload()
    await expect(page).toHaveURL(/\/overview$/)
    await expect(page.getByRole('heading', { name: 'CDS Pipeline Board' })).toBeVisible()

    // Visiting the code step while verified goes straight back to the board.
    await page.goto('/verify')
    await expect(page).toHaveURL(/\/overview$/)

    // Sign out returns to sign-in and closes the board.
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/sign-in$/)
    await expect(page.getByRole('status')).toHaveText('You are signed out.')
    await page.goto('/overview')
    await expect(page).toHaveURL(/\/sign-in$/)
  })

  test('wrong password shows a neutral message and reveals nothing', async ({ page }) => {
    await signInWithPassword(page, ADMIN_EMAIL, 'definitely-not-the-password')
    await expect(page.getByRole('alert')).toHaveText('That email and password do not match.')
    await signInWithPassword(page, 'nobody@caspiands.com', 'definitely-not-the-password')
    await expect(page.getByRole('alert')).toHaveText('That email and password do not match.')
    await expect(page).toHaveURL(/\/sign-in$/)
  })

  test('a reload on the code step does not send a second code', async ({ page }) => {
    const since = new Date(Date.now() - 1000)
    await signInWithPassword(page, EDITOR_EMAIL)
    await expect(page.getByText(/We sent a 6-digit code to ed••••@caspiands\.com/)).toBeVisible()
    await waitForCode(EDITOR_EMAIL, since)
    await page.reload()
    await expect(page.getByText(/Enter the 6-digit code we emailed you/)).toBeVisible()
    await page.waitForTimeout(1500)
    expect(codesLoggedSince(EDITOR_EMAIL, since)).toHaveLength(1)
  })

  test('a viewer sees no Team & access tab and a view-only banner', async ({ page }) => {
    await signInFully(page, VIEWER_EMAIL)
    await expect(page.getByText('viewer', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Team & access' })).toHaveCount(0)
    await expect(page.getByText(/view-only access/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add opportunity' })).toHaveCount(0)
  })

  test('a login whose access is switched off is signed out with an explanation', async ({ page }) => {
    await signInWithPassword(page, DEACTIVATED_EMAIL)
    await expect(page).toHaveURL(/\/sign-in$/)
    await expect(page.getByRole('alert')).toHaveText('Your access is switched off or not set up yet. Contact the board admin.')
  })

  test('forgot password always shows the same neutral message', async ({ page }) => {
    await page.goto('/sign-in')
    await page.getByRole('link', { name: 'Forgot password?' }).click()
    await expect(page).toHaveURL(/\/reset$/)
    await page.getByLabel('Work email').fill('nobody@caspiands.com')
    await page.getByRole('button', { name: 'Email me a reset link' }).click()
    await expect(page.getByRole('status')).toHaveText(/If that email has an account, a reset link is on its way/)
  })

  test('set-password without a link explains what to do', async ({ page }) => {
    await page.goto('/set-password')
    await expect(page.getByText(/Open the link from your invite or password-reset email/)).toBeVisible()
  })
})
