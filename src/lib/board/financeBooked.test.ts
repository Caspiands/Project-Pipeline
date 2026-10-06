import { describe, expect, it } from 'vitest'
import { computeFinanceBooked } from './financeBooked'
import { mockBoardData } from '@/test/mockBoardData'

describe('computeFinanceBooked', () => {
  it('sums invoice amounts for target year booked stages only', () => {
    const inv = (stage: string, amount: number | null, year: number) => ({
      id: Math.random().toString(),
      amount,
      revenueYear: year,
      invoiceMonth: null,
      stage: stage as 'LOA/PO',
      stageSince: null,
      sortOrder: 0,
    })
    const data = {
      ...mockBoardData,
      opps: [
        { ...mockBoardData.opps[0], id: 'a', invoices: [inv('LOA/PO', 100000, 2026)] },
        { ...mockBoardData.opps[0], id: 'b', invoices: [inv('Invoiced', 50000, 2026)] },
        { ...mockBoardData.opps[0], id: 'c', invoices: [inv('Paid', null, 2026)] },
        { ...mockBoardData.opps[0], id: 'd', invoices: [inv('LOA/PO', 200000, 2025)] },
      ],
    }
    const r = computeFinanceBooked(data, 2026)
    expect(r.total).toBe(150000)
    expect(r.countLoaPo).toBe(1)
    expect(r.countInvoicedPaid).toBe(2)
  })
})
