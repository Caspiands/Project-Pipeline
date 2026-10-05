import type { BoardData } from './types'

export const FINANCE_BOOKED_RULE =
  'Finance revenue booked for the target year is the sum of deal values whose stage is LOA/PO, Invoiced, or Paid, and whose revenue year is the target year. Blank values are left out, never treated as zero.'

const BOOKED_STAGES = new Set(['LOA/PO', 'Invoiced', 'Paid'])

export interface FinanceBookedBreakdown {
  total: number | null
  countLoaPo: number
  countInvoicedPaid: number
}

export function computeFinanceBooked(data: BoardData, targetYear: number): FinanceBookedBreakdown {
  const rows = data.opps.filter(
    (o) => String(o.revenueYear) === String(targetYear) && BOOKED_STAGES.has(o.stage),
  )
  const loa = rows.filter((o) => o.stage === 'LOA/PO')
  const invPaid = rows.filter((o) => o.stage === 'Invoiced' || o.stage === 'Paid')
  const nums = rows.map((o) => o.value).filter((v): v is number => v != null)
  const total = nums.length ? nums.reduce((a, b) => a + b, 0) : null
  return {
    total,
    countLoaPo: loa.length,
    countInvoicedPaid: invPaid.length,
  }
}
