import type { OpportunityInvoice } from './types'

const MIN_YEAR = 2020
const MAX_YEAR = 2100

export type RevenueYearInvoice = Pick<OpportunityInvoice, 'amount' | 'revenueYear' | 'revenueYear2'>

export function validRevenueYear(y: number): boolean {
  return Number.isInteger(y) && y >= MIN_YEAR && y <= MAX_YEAR
}

/** Primary year plus optional second year (unchanged order: primary first). */
export function invoiceRevenueYears(inv: RevenueYearInvoice): number[] {
  if (inv.revenueYear2 != null && inv.revenueYear2 !== inv.revenueYear) {
    return [inv.revenueYear, inv.revenueYear2]
  }
  return [inv.revenueYear]
}

export function invoiceMatchesRevenueYear(inv: RevenueYearInvoice, year: number): boolean {
  return invoiceRevenueYears(inv).includes(year)
}

export function formatInvoiceRevenueYears(inv: RevenueYearInvoice): string {
  const yrs = invoiceRevenueYears(inv)
  if (yrs.length === 1) return String(yrs[0])
  return `${yrs[0]} and ${yrs[1]}`
}

/** Even split in sen; leftover sen on the primary (first) revenue year. */
export function splitAmountAcrossRevenueYears(
  amount: number | null,
  primaryYear: number,
  secondaryYear: number,
): Record<number, number | null> {
  if (amount == null) {
    return { [primaryYear]: null, [secondaryYear]: null }
  }
  const cents = Math.round(amount * 100)
  const half = Math.floor(cents / 2)
  const firstCents = half + (cents % 2)
  const secondCents = half
  return { [primaryYear]: firstCents / 100, [secondaryYear]: secondCents / 100 }
}

/** Amount attributed to a calendar revenue year for reporting and filters. */
export function invoiceAmountInRevenueYear(inv: RevenueYearInvoice, year: number): number | null {
  if (inv.amount == null) return null
  const yrs = invoiceRevenueYears(inv)
  if (!yrs.includes(year)) return null
  if (yrs.length === 1) return inv.amount
  const parts = splitAmountAcrossRevenueYears(inv.amount, inv.revenueYear, inv.revenueYear2!)
  return parts[year] ?? null
}

export function invoiceReportingAmount(inv: RevenueYearInvoice, yearFilter: 'all' | string): number | null {
  if (yearFilter === 'all') return inv.amount
  return invoiceAmountInRevenueYear(inv, Number(yearFilter))
}

export function sumReportingAmounts(invoices: RevenueYearInvoice[], yearFilter: 'all' | string): number | null {
  const nums = invoices
    .map((i) => invoiceReportingAmount(i, yearFilter))
    .filter((v): v is number => v != null)
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0)
}

const YEAR_INPUT_RE = /^(\d{4})(?:\s*(?:,|and)\s*(\d{4}))?$/

export function parseRevenueYearsInput(raw: string): { revenueYear: number; revenueYear2: number | null } | 'invalid' {
  const t = raw.trim().replace(/\s+and\s+/gi, ',')
  const m = t.match(YEAR_INPUT_RE)
  if (!m) return 'invalid'
  const y1 = Number(m[1])
  if (!validRevenueYear(y1)) return 'invalid'
  if (!m[2]) return { revenueYear: y1, revenueYear2: null }
  const y2 = Number(m[2])
  if (!validRevenueYear(y2) || y2 === y1) return 'invalid'
  return { revenueYear: y1, revenueYear2: y2 }
}

export function formatRevenueYearsInput(revenueYear: number, revenueYear2: number | null | undefined): string {
  if (revenueYear2 == null || revenueYear2 === revenueYear) return String(revenueYear)
  return `${revenueYear} and ${revenueYear2}`
}
