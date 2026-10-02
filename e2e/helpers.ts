import { execFileSync } from 'node:child_process'
import { expect, type Page } from '@playwright/test'

/** Test logins created by `npm run db:users`. */
export const LOCAL_PASSWORD = 'pipeline-local-2026'
export const ADMIN_EMAIL = 'admin@caspiands.com'
export const EDITOR_EMAIL = 'editor@caspiands.com'
export const VIEWER_EMAIL = 'viewer@caspiands.com'
export const DEACTIVATED_EMAIL = 'off@caspiands.com'

const EDGE_RUNTIME_CONTAINER = process.env.EDGE_RUNTIME_CONTAINER ?? 'supabase_edge_runtime_cds-pipeline-board'

/**
 * Locally mfa-send does not email anything: with MFA_DEV_LOG_CODES=true it prints
 * "[dev] sign-in code for <email>: 123456" to the function console. The test reads it from the
 * edge runtime's container logs, taking only lines newer than `since`.
 */
export function codesLoggedSince(email: string, since: Date): string[] {
  // The edge runtime writes console output to stderr; the shell merges both streams.
  const out = execFileSync(
    'sh',
    ['-c', `docker logs --timestamps --since "${since.toISOString()}" "${EDGE_RUNTIME_CONTAINER}" 2>&1`],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  )
  const re = new RegExp(`sign-in code for ${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: (\\d{6})`, 'g')
  return [...out.matchAll(re)].map((m) => m[1])
}

export async function waitForCode(email: string, since: Date): Promise<string> {
  let codes: string[] = []
  await expect
    .poll(
      () => {
        codes = codesLoggedSince(email, since)
        return codes.length
      },
      { timeout: 30_000, message: `no sign-in code for ${email} appeared in the function logs` },
    )
    .toBeGreaterThan(0)
  return codes[codes.length - 1]
}

export async function signInWithPassword(page: Page, email: string, password = LOCAL_PASSWORD) {
  await page.goto('/sign-in')
  await page.getByLabel('Work email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Continue' }).click()
}

/** Signs in, waits for the code to be logged and enters it. Ends on the board. */
export async function signInFully(page: Page, email: string) {
  const since = new Date(Date.now() - 1000)
  await signInWithPassword(page, email)
  await expect(page).toHaveURL(/\/verify$/)
  const code = await waitForCode(email, since)
  await page.getByLabel('6-digit code').fill(code)
  await expect(page).toHaveURL(/\/overview$/)
}
