/**
 * Number and date formatting, ported from the prototype so every screen shows the same text.
 * "Today" is always Kuala Lumpur time, as the specification requires for overdue calculations.
 */
export const KL_TIME_ZONE = 'Asia/Kuala_Lumpur'

const pad = (n: number) => String(n).padStart(2, '0')

/** Today's date as YYYY-MM-DD in Kuala Lumpur, whatever the browser's own time zone. */
/** Calendar year in Kuala Lumpur (for open-pipeline year ordering). */
export function presentYearKl(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: KL_TIME_ZONE,
    year: 'numeric',
  }).formatToParts(now)
  return Number(parts.find((p) => p.type === 'year')?.value ?? '0')
}

/** Present year first, then later years ascending, then earlier years (oldest last). */
export function sortYearsFromPresent(years: number[], presentYear: number): number[] {
  const uniq = [...new Set(years)]
  const future = uniq.filter((y) => y >= presentYear).sort((a, b) => a - b)
  const past = uniq.filter((y) => y < presentYear).sort((a, b) => a - b)
  return [...future, ...past]
}

export function todayISO(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: KL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** Parses a date-only string as local midnight (so it does not shift a day), else a full timestamp. */
export function parseDate(iso: string | null | undefined): Date {
  if (!iso) return new Date(NaN)
  return new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)
}

/** Whole days from the given date until now; null when the date is unknown or invalid. */
export function daysSince(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (!iso) return null
  const t = parseDate(iso)
  if (isNaN(t.getTime())) return null
  return Math.floor((now.getTime() - t.getTime()) / 864e5)
}

function formatAmount(n: number): string {
  return n.toLocaleString('en-GB', { maximumFractionDigits: 2, minimumFractionDigits: 0 })
}

/** Money with RM prefix: RM 262,000, RM 1,500,000. Dash when unknown. */
export function fmtRM(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  return 'RM ' + formatAmount(n)
}

/** Money with RM prefix, always two decimal places (deal totals, typed amounts). */
export function fmtRMCents(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  return (
    'RM ' +
    n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  )
}

/** Table money (no prefix): 262,000. Dash when blank; never turns null into zero. */
export function fmtFull(n: number | string | null | undefined): string {
  if (n == null || n === '') return '—'
  const x = Number(n)
  if (Number.isNaN(x)) return '—'
  return formatAmount(x)
}

/** Counts and other whole numbers: 1,500. Dash when unknown. */
export function fmtInt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  return Math.round(n).toLocaleString('en-GB')
}

/** 7 Oct 2026 (en-GB). Dash when unknown. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = parseDate(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** 18:00 (en-GB). Empty when invalid. */
export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

/** "2026-10" or "2026-10-01" → Oct 2026. Dash when unknown. */
export function fmtMonth(m: string | null | undefined): string {
  if (!m) return '—'
  const [y, mo] = m.split('-')
  const d = new Date(Number(y), Number(mo) - 1, 1)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

/** Blank or null → 0 for sums; never turns a stored null into a stored zero. */
export function num(v: number | string | null | undefined): number {
  if (v == null || v === '') return 0
  return Number(v) || 0
}

/** YYYY-MM for the first day of a month in local time. */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}
