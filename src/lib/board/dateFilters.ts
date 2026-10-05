import type { Opportunity } from './types'

/** YYYY-MM from invoice month (stored as YYYY-MM or YYYY-MM-DD). */
export function invoiceMonthKey(iso: string | null | undefined): string | null {
  if (!iso) return null
  const m = String(iso).match(/^(\d{4}-\d{2})/)
  return m ? m[1] : null
}

export function monthKeyFromDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const m = String(iso).match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

/** Internal key e.g. 2026-Q1; label via quarterLabel(). */
export function quarterKeyFromMonth(yyyyMm: string): string {
  const [y, mo] = yyyyMm.split('-').map(Number)
  const q = Math.ceil(mo / 3)
  return `${y}-Q${q}`
}

export function quarterLabel(key: string): string {
  const m = key.match(/^(\d{4})-Q([1-4])$/)
  if (!m) return key
  return `${m[1]} Q${m[2]}`
}

export function distinctInvoiceMonths(opps: Opportunity[]): string[] {
  const s = new Set<string>()
  for (const o of opps) {
    const k = invoiceMonthKey(o.invoiceMonth)
    if (k) s.add(k)
  }
  return [...s].sort()
}

export function distinctQuoteMonths(opps: Opportunity[]): string[] {
  const s = new Set<string>()
  for (const o of opps) {
    const k = monthKeyFromDate(o.quoteDate)
    if (k) s.add(k)
  }
  return [...s].sort()
}

export function distinctQuarters(months: string[]): string[] {
  const s = new Set<string>()
  for (const m of months) s.add(quarterKeyFromMonth(m))
  return [...s].sort((a, b) => a.localeCompare(b))
}
