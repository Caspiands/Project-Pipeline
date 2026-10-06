import type { BoardData } from './types'

export const FINANCE_BOOKED_RULE =
  'Finance revenue booked for the target year is the sum of invoice amounts whose stage is LOA/PO, Invoiced, or Paid, and whose revenue year is the target year. Blank amounts are left out, never treated as zero.'

const BOOKED_STAGES = new Set(['LOA/PO', 'Invoiced', 'Paid'])

export interface FinanceBookedBreakdown {
  total: number | null
  countLoaPo: number
  countInvoicedPaid: number
}

export function computeFinanceBooked(data: BoardData, targetYear: number): FinanceBookedBreakdown {
  let countLoaPo = 0
  let countInvoicedPaid = 0
  const nums: number[] = []
  for (const o of data.opps) {
    for (const inv of o.invoices) {
      if (String(inv.revenueYear) !== String(targetYear) || !BOOKED_STAGES.has(inv.stage)) continue
      if (inv.stage === 'LOA/PO') countLoaPo++
      if (inv.stage === 'Invoiced' || inv.stage === 'Paid') countInvoicedPaid++
      if (inv.amount != null) nums.push(inv.amount)
    }
  }
  const total = nums.length ? nums.reduce((a, b) => a + b, 0) : null
  return { total, countLoaPo, countInvoicedPaid }
}
