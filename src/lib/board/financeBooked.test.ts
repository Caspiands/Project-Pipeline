import { describe, expect, it } from 'vitest'
import { computeFinanceBooked } from './financeBooked'
import { mockBoardData } from '@/test/mockBoardData'

describe('computeFinanceBooked', () => {
  it('sums LOA/PO, Invoiced, and Paid for the target year and ignores blank values', () => {
    const data = {
      ...mockBoardData,
      opps: [
        { ...mockBoardData.opps[0], id: 'a', stage: 'LOA/PO' as const, value: 100000, revenueYear: 2026 },
        { ...mockBoardData.opps[0], id: 'b', stage: 'Invoiced' as const, value: 50000, revenueYear: 2026 },
        { ...mockBoardData.opps[0], id: 'c', stage: 'Paid' as const, value: null, revenueYear: 2026 },
        { ...mockBoardData.opps[0], id: 'd', stage: 'LOA/PO' as const, value: 200000, revenueYear: 2025 },
      ],
    }
    const b = computeFinanceBooked(data, 2026)
    expect(b.total).toBe(150000)
    expect(b.countLoaPo).toBe(1)
    expect(b.countInvoicedPaid).toBe(2)
  })
})
