import { describe, expect, it } from 'vitest'
import { filterOpportunities, isOverdue } from './filters'
import { mockBoardData } from '@/test/mockBoardData'
import { DEFAULT_FILTERS } from './types'

describe('filterOpportunities', () => {
  it('hides lost rows unless show lost is on', () => {
    const data = {
      ...mockBoardData,
      opps: [
        ...mockBoardData.opps,
        {
          ...mockBoardData.opps[0],
          id: 'o2',
          invoices: [{ ...mockBoardData.opps[0].invoices[0], id: 'i2', stage: 'Lost' as const }],
        },
      ],
    }
    const hidden = filterOpportunities(data, DEFAULT_FILTERS, { respectStageFilter: false })
    expect(hidden).toHaveLength(1)
    const shown = filterOpportunities(data, { ...DEFAULT_FILTERS, lost: true }, { respectStageFilter: false })
    expect(shown).toHaveLength(2)
  })

  it('marks overdue open rows before today in KL', () => {
    const o = { ...mockBoardData.opps[0], nextDate: '2020-01-01' }
    expect(isOverdue(o, '2026-10-02')).toBe(true)
  })

  it('includes a deal when any invoice matches year and stage filters', () => {
    const baseInv = mockBoardData.opps[0].invoices[0]
    const data = {
      ...mockBoardData,
      opps: [
        {
          ...mockBoardData.opps[0],
          id: 'mixed',
          invoices: [
            { ...baseInv, id: 'i-inv', revenueYear: 2026, stage: 'Invoiced' as const },
            { ...baseInv, id: 'i-prop', revenueYear: 2026, stage: 'Proposal' as const },
          ],
        },
      ],
    }
    const proposal = filterOpportunities(data, {
      ...DEFAULT_FILTERS,
      year: '2026',
      stage: 'Proposal',
    })
    expect(proposal.map((o) => o.id)).toEqual(['mixed'])
    const paid = filterOpportunities(data, {
      ...DEFAULT_FILTERS,
      year: '2026',
      stage: 'Paid',
    })
    expect(paid).toHaveLength(0)
  })

  it('filters by invoice month and quote range', () => {
    const data = {
      ...mockBoardData,
      opps: [
        {
          ...mockBoardData.opps[0],
          id: 'a',
          invoices: [{ ...mockBoardData.opps[0].invoices[0], id: 'ia', invoiceMonth: '2026-06' }],
          quoteDate: '2026-03-10',
        },
        {
          ...mockBoardData.opps[0],
          id: 'b',
          invoices: [{ ...mockBoardData.opps[0].invoices[0], id: 'ib', invoiceMonth: '2026-09' }],
          quoteDate: '2026-08-01',
        },
      ],
    }
    const june = filterOpportunities(
      data,
      { ...DEFAULT_FILTERS, invoiceMonth: '2026-06' },
      { respectStageFilter: false },
    )
    expect(june).toHaveLength(1)
    expect(june[0].id).toBe('a')
    const qRange = filterOpportunities(
      data,
      { ...DEFAULT_FILTERS, quoteFrom: '2026-03-01', quoteTo: '2026-05-31' },
      { respectStageFilter: false },
    )
    expect(qRange.map((o) => o.id)).toEqual(['a'])
  })
})
