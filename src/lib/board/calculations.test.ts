import { describe, expect, it } from 'vitest'
import { computeFinanceBooked } from './financeBooked'
import { computeTargetBlock } from './calculations'
import { effectiveBoardFilters, filterOpportunities } from './filters'
import { DEFAULT_FILTERS } from './types'
import { mockBoardData } from '@/test/mockBoardData'

describe('computeTargetBlock', () => {
  it('books finance from all invoiced target-year rows, ignoring the filter bar', () => {
    const inv = mockBoardData.opps[0].invoices[0]
    const data = {
      ...mockBoardData,
      settings: { ...mockBoardData.settings, year: 2026, target: 7_000_000 },
      opps: [
        {
          ...mockBoardData.opps[0],
          id: 'booked',
          invoices: [{ ...inv, id: 'i1', stage: 'Invoiced' as const, amount: 250_000, revenueYear: 2026 }],
        },
      ],
    }
    const narrow = { ...DEFAULT_FILTERS, stage: 'Proposal' as const }
    const target = computeTargetBlock(data)
    expect(target.booked).toBe(250_000)
    expect(computeFinanceBooked(data, 2026).total).toBe(250_000)
    expect(target.booked).toBe(computeFinanceBooked(data, 2026).total)
    expect(narrow.stage).toBe('Proposal')
  })
})

describe('effectiveBoardFilters', () => {
  it('includes invoiced deals in the match count on overview when pipeline stage is set', () => {
    const inv = mockBoardData.opps[0].invoices[0]
    const data = {
      ...mockBoardData,
      opps: [
        {
          ...mockBoardData.opps[0],
          id: 'won',
          invoices: [{ ...inv, id: 'i1', stage: 'Invoiced' as const, amount: 1000, revenueYear: 2026 }],
        },
      ],
    }
    const pipelineStage = { ...DEFAULT_FILTERS, stage: 'Proposal' as const }
    expect(filterOpportunities(data, pipelineStage)).toHaveLength(0)
    const overviewFilters = effectiveBoardFilters(pipelineStage, '/overview')
    expect(filterOpportunities(data, overviewFilters)).toHaveLength(1)
  })
})
