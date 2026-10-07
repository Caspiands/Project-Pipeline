import { describe, expect, it } from 'vitest'
import { STAGES } from '@/lib/stages'
import { pipelineRows } from './calculations'
import { effectiveBoardFilters, filterOpportunities, filterOpportunityViews, isOverdue } from './filters'
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

  it('keeps invoiced deals when stage is all', () => {
    const inv = mockBoardData.opps[0].invoices[0]
    const data = {
      ...mockBoardData,
      opps: [
        {
          ...mockBoardData.opps[0],
          id: 'inv',
          invoices: [{ ...inv, id: 'i1', stage: 'Invoiced' as const, revenueYear: 2026, amount: 500 }],
        },
      ],
    }
    expect(filterOpportunities(data, DEFAULT_FILTERS)).toHaveLength(1)
    expect(effectiveBoardFilters({ ...DEFAULT_FILTERS, stage: 'Lead' }, '/overview').stage).toBe('all')
  })

  it('filters by each invoice stage the same way (include matching, exclude others)', () => {
    const baseInv = mockBoardData.opps[0].invoices[0]
    const invoices = STAGES.map((stage, i) => ({
      ...baseInv,
      id: `i-${i}`,
      revenueYear: 2026,
      stage,
    }))
    const data = {
      ...mockBoardData,
      opps: [{ ...mockBoardData.opps[0], id: 'multi-stage', invoices }],
    }
    const baseFilters = { ...DEFAULT_FILTERS, year: '2026' as const }

    for (const stage of STAGES) {
      const filters = { ...baseFilters, stage }
      const views = filterOpportunityViews(data, filters)
      expect(views.map((v) => v.deal.id)).toEqual(['multi-stage'])
      expect(views[0].invoices.map((i) => i.stage)).toEqual([stage])
      expect(pipelineRows(data, filters).map((o) => o.id)).toEqual(['multi-stage'])
      expect(filterOpportunities(data, filters).map((o) => o.id)).toEqual(['multi-stage'])
    }

    for (const stage of STAGES) {
      const other = STAGES.find((s) => s !== stage)!
      const views = filterOpportunityViews(data, { ...baseFilters, stage })
      expect(views[0].invoices.some((i) => i.stage === other)).toBe(false)
    }
  })

  it('shows all-lost deals when stage is Lost even if show lost is off', () => {
    const baseInv = mockBoardData.opps[0].invoices[0]
    const data = {
      ...mockBoardData,
      opps: [
        {
          ...mockBoardData.opps[0],
          id: 'all-lost',
          invoices: [
            { ...baseInv, id: 'l1', revenueYear: 2026, stage: 'Lost' as const },
            { ...baseInv, id: 'l2', revenueYear: 2026, stage: 'Lost' as const },
          ],
        },
      ],
    }
    const hidden = filterOpportunities(data, { ...DEFAULT_FILTERS, year: '2026', lost: false, stage: 'all' })
    expect(hidden).toHaveLength(0)
    const lostOnly = filterOpportunities(data, {
      ...DEFAULT_FILTERS,
      year: '2026',
      lost: false,
      stage: 'Lost',
    })
    expect(lostOnly.map((o) => o.id)).toEqual(['all-lost'])
    expect(pipelineRows(data, { ...DEFAULT_FILTERS, year: '2026', lost: false, stage: 'Lost' })).toHaveLength(1)
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
