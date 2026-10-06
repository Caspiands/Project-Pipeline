import { describe, expect, it } from 'vitest'
import { computeYoyByAccount } from './yoyAccounts'
import { mockBoardData } from '@/test/mockBoardData'
import { DEFAULT_FILTERS } from './types'

describe('computeYoyByAccount', () => {
  it('counts invoices per revenue year within account', () => {
    const base = mockBoardData.opps[0]
    const data = {
      ...mockBoardData,
      opps: [
        {
          ...base,
          id: 'a',
          account: 'Acme',
          invoices: [
            { id: 'i1', amount: 100, revenueYear: 2025, invoiceMonth: null, stage: 'Invoiced' as const, stageSince: null, sortOrder: 0 },
            { id: 'i2', amount: 200, revenueYear: 2026, invoiceMonth: null, stage: 'Invoiced' as const, stageSince: null, sortOrder: 0 },
          ],
        },
      ],
    }
    const table = computeYoyByAccount(data, { ...DEFAULT_FILTERS, year: '2025' })
    const acme = table.rows.find((r) => r.account === 'Acme')!
    expect(acme.count2025).toBe(1)
    expect(acme.count2026).toBe(1)
    expect(acme.total2025).toBe(100)
    expect(acme.total2026).toBe(200)
  })
})
