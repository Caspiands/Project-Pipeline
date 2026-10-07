import { describe, expect, it } from 'vitest'
import { mockBoardData } from '@/test/mockBoardData'
import {
  computeOpenPipelineSummary,
  computeOpenPipelineViews,
  DEFAULT_OPEN_PIPELINE_FILTERS,
  invoiceExpectationYear,
} from './openPipeline'

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

  it('uses invoice month year for expectation year, else revenue year', () => {
    const base = mockBoardData.opps[0].invoices[0]
    expect(invoiceExpectationYear({ ...base, invoiceMonth: '2025-03', revenueYear: 2026 })).toBe(2025)
    expect(invoiceExpectationYear({ ...base, invoiceMonth: null, revenueYear: 2026 })).toBe(2026)
  })

  it('filters open lines by invoice year', () => {
    const base = mockBoardData.opps[0]
    const inv = base.invoices[0]
    const data = {
      ...mockBoardData,
      opps: [
        {
          ...base,
          id: 'yrs',
          invoices: [
            { ...inv, id: 'y25', stage: 'Lead' as const, amount: 100, revenueYear: 2026, invoiceMonth: '2025-06' },
            { ...inv, id: 'y26', stage: 'Proposal' as const, amount: 200, revenueYear: 2025, invoiceMonth: '2026-01' },
          ],
        },
      ],
    }
    const y2025 = computeOpenPipelineViews(data, { ...DEFAULT_OPEN_PIPELINE_FILTERS, invoiceYear: '2025' })
    expect(y2025[0].invoices.map((i) => i.id)).toEqual(['y25'])
    expect(y2025[0].total).toBe(100)
    const y2026 = computeOpenPipelineViews(data, { ...DEFAULT_OPEN_PIPELINE_FILTERS, invoiceYear: '2026' })
    expect(y2026[0].invoices.map((i) => i.id)).toEqual(['y26'])
    expect(y2026[0].total).toBe(200)
  })
})
