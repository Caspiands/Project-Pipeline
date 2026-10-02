import { execFileSync } from 'node:child_process'
import { expect, type Page } from '@playwright/test'

/** Test logins created by `npm run db:users`. */
export const LOCAL_PASSWORD = 'pipeline-local-2026'
export const ADMIN_EMAIL = 'admin@caspiands.com'
export const EDITOR_EMAIL = 'editor@caspiands.com'
export const VIEWER_EMAIL = 'viewer@caspiands.com'
export const DEACTIVATED_EMAIL = 'off@caspiands.com'
export const RESET_EMAIL = 'reset@caspiands.com'

const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324'

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

interface MailpitSummary {
  ID: string
  Subject: string
  Created: string
  To: { Address: string }[]
}

/** Auth emails (password resets, invites) land in the local Mailpit inbox. Returns the first link in the newest one. */
export async function waitForAuthEmailLink(to: string, since: Date, subjectMatch: RegExp): Promise<string> {
  let link = ''
  await expect
    .poll(
      async () => {
        const list = (await (await fetch(`${MAILPIT_URL}/api/v1/messages?limit=25`)).json()) as { messages: MailpitSummary[] }
        const msg = list.messages.find(
          (m) => m.To.some((t) => t.Address.toLowerCase() === to) && subjectMatch.test(m.Subject) && new Date(m.Created) >= since,
        )
        if (!msg) return ''
        const full = (await (await fetch(`${MAILPIT_URL}/api/v1/message/${msg.ID}`)).json()) as { Text: string; HTML: string }
        const m = (full.Text || full.HTML).match(/https?:\/\/[^\s"<>]+/)
        link = m ? m[0].replace(/&amp;/g, '&') : ''
        return link
      },
      { timeout: 30_000, message: `no "${subjectMatch}" email for ${to} arrived in Mailpit (${MAILPIT_URL})` },
    )
    .not.toBe('')
  return link
}
