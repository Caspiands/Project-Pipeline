import { describe, expect, it } from 'vitest'
import { sortYearsFromPresent } from '@/lib/format'
import { mockBoardData } from '@/test/mockBoardData'
import {
  computeOpenPipelineSummary,
  computeOpenPipelineViews,
  DEFAULT_OPEN_PIPELINE_FILTERS,
  distinctOpenInvoiceYears,
  openInvoiceAmountForYear,
  openPipelineYearsForInvoice,
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
    const summary = computeOpenPipelineSummary(views)
    expect(summary.dealCount).toBe(1)
    expect(summary.totalRm).toBe(1000)
  })

  it('orders invoice years from present year ascending, past years last', () => {
    expect(sortYearsFromPresent([2030, 2026, 2029, 2025, 2027, 2028], 2026)).toEqual([
      2026, 2027, 2028, 2029, 2030, 2025,
    ])
    const ordered = distinctOpenInvoiceYears(
      {
        ...mockBoardData,
        opps: [
          {
            ...mockBoardData.opps[0],
            invoices: [
              {
                ...mockBoardData.opps[0].invoices[0],
                stage: 'Lead' as const,
                invoiceMonth: '2030-01',
              },
            ],
          },
        ],
      },
      new Date('2026-06-01'),
    )
    expect(ordered).toEqual([2030])
  })

  it('splits open amount across two revenue years when month is blank', () => {
    const inv = {
      ...mockBoardData.opps[0].invoices[0],
      amount: 100,
      revenueYear: 2026,
      revenueYear2: 2027,
      invoiceMonth: null,
      stage: 'Lead' as const,
    }
    expect(openPipelineYearsForInvoice(inv)).toEqual([2026, 2027])
    expect(openInvoiceAmountForYear(inv, 2026)).toBe(50)
    expect(openInvoiceAmountForYear(inv, 2027)).toBe(50)
  })
})
