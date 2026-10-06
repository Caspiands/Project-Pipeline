import { describe, expect, it } from 'vitest'
import { mockBoardData } from '@/test/mockBoardData'
import { computeOpenPipelineSummary, computeOpenPipelineViews, DEFAULT_OPEN_PIPELINE_FILTERS } from './openPipeline'

describe('openPipeline', () => {
  it('lists deals with open lines only and sums open amounts', () => {
    const base = mockBoardData.opps[0]
    const inv = base.invoices[0]
    const data = {
      ...mockBoardData,
      opps: [
        {
          ...base,
          id: 'open-mix',
          invoices: [
            { ...inv, id: 'a', stage: 'Proposal' as const, amount: 1000, revenueYear: 2026 },
            { ...inv, id: 'b', stage: 'Invoiced' as const, amount: 5000, revenueYear: 2026 },
          ],
        },
        {
          ...base,
          id: 'closed',
          invoices: [{ ...inv, id: 'c', stage: 'Paid' as const, amount: 900, revenueYear: 2025 }],
        },
      ],
    }
    const views = computeOpenPipelineViews(data, DEFAULT_OPEN_PIPELINE_FILTERS)
    expect(views.map((v) => v.deal.id)).toEqual(['open-mix'])
    expect(views[0].total).toBe(1000)
    expect(views[0].invoices.map((i) => i.stage)).toEqual(['Proposal'])
    const summary = computeOpenPipelineSummary(views)
    expect(summary.dealCount).toBe(1)
    expect(summary.invoiceCount).toBe(1)
    expect(summary.totalRm).toBe(1000)
  })
})
