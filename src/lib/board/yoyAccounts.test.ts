import { describe, expect, it } from 'vitest'
import { computeYoyByAccount, totalRmKnown } from './yoyAccounts'
import { mockBoardData } from '@/test/mockBoardData'
import { DEFAULT_FILTERS } from './types'

describe('yoyAccounts', () => {
  it('does not use the revenue-year filter from the bar', () => {
    const data = {
      ...mockBoardData,
      opps: [
        { ...mockBoardData.opps[0], id: 'a', account: 'Acme', revenueYear: 2025, value: 100 },
        { ...mockBoardData.opps[0], id: 'b', account: 'Acme', revenueYear: 2026, value: 200 },
      ],
    }
    const table = computeYoyByAccount(data, { ...DEFAULT_FILTERS, year: '2025' })
    expect(table.rows).toHaveLength(1)
    expect(table.rows[0].count2025).toBe(1)
    expect(table.rows[0].count2026).toBe(1)
    expect(table.rows[0].diff).toBe(100)
  })

  it('leaves total RM blank when every value is null', () => {
    expect(totalRmKnown([{ ...mockBoardData.opps[0], value: null }])).toBeNull()
  })
})
