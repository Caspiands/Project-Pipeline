import type { Opportunity } from './types'

export function invoiceMonthKey(iso: string | null | undefined): string | null {
  if (!iso) return null
  const m = String(iso).match(/^(\d{4})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}` : null
}

export function monthKeyFromDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const m = String(iso).match(/^(\d{4})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}` : null
}

export function quarterKeyFromMonth(monthKey: string): string {
  const [y, mo] = monthKey.split('-')
  const q = Math.floor((Number(mo) - 1) / 3) + 1
  return `${y}-Q${q}`
}

export function quarterLabel(key: string): string {
  const [y, q] = key.split('-Q')
  return `Q${q} ${y}`
}

export function distinctInvoiceMonths(opps: Opportunity[]): string[] {
  const keys = new Set<string>()
  for (const o of opps) {
    for (const inv of o.invoices) {
      const k = invoiceMonthKey(inv.invoiceMonth)
      if (k) keys.add(k)
    }
  }
  return [...keys].sort()
}

export function distinctQuoteMonths(opps: Opportunity[]): string[] {
  const keys = new Set<string>()
  for (const o of opps) {
    const k = monthKeyFromDate(o.quoteDate)
    if (k) keys.add(k)
  }
  return [...keys].sort()
}

export function distinctQuarters(monthKeys: string[]): string[] {
  const keys = new Set<string>()
  for (const m of monthKeys) keys.add(quarterKeyFromMonth(m))
  return [...keys].sort()
}
