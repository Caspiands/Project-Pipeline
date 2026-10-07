import { sumInvoiceAmounts, type FilteredDealView } from './invoices'
import { opportunityMatchesKeyword } from './opportunitySearch'
import { opportunityMatchesOwner } from './owners'
import type { BoardData, Opportunity, OpportunityInvoice } from './types'
import { isOpenStage, OPEN_STAGES, type Stage } from '@/lib/stages'

export interface OpenPipelineFilters {
  seg: 'all' | 'Tech' | 'Agency' | 'Mixed'
  owner: string
  account: string
  q: string
  invoiceYear: 'all' | string
}

export const DEFAULT_OPEN_PIPELINE_FILTERS: OpenPipelineFilters = {
  seg: 'all',
  owner: 'all',
  account: 'all',
  q: '',
  invoiceYear: 'all',
}

/** Expected invoice calendar year: from invoice month when set, otherwise revenue year. */
export function invoiceExpectationYear(inv: OpportunityInvoice): number {
  if (inv.invoiceMonth && inv.invoiceMonth.length >= 4) {
    const y = Number(inv.invoiceMonth.slice(0, 4))
    if (!Number.isNaN(y)) return y
  }
  return inv.revenueYear
}

export function openInvoicesForDeal(deal: Opportunity) {
  return deal.invoices.filter((i) => isOpenStage(i.stage))
}

function openInvoicesMatchingYear(openInvs: OpportunityInvoice[], invoiceYear: string) {
  if (invoiceYear === 'all') return openInvs
  const y = Number(invoiceYear)
  return openInvs.filter((i) => invoiceExpectationYear(i) === y)
}

function dealMatchesNarrow(data: BoardData, deal: Opportunity, filters: OpenPipelineFilters): boolean {
  if (filters.seg !== 'all' && deal.segment !== filters.seg) return false
  if (filters.owner !== 'all' && !opportunityMatchesOwner(deal, filters.owner)) return false
  if (filters.account !== 'all' && deal.account.trim() !== filters.account) return false
  if (!opportunityMatchesKeyword(data, deal, filters.q)) return false
  return true
}

/** One row per deal that still has open invoice lines; amounts and columns use open lines only. */
export function computeOpenPipelineViews(data: BoardData, filters: OpenPipelineFilters): FilteredDealView[] {
  const out: FilteredDealView[] = []
  for (const o of data.opps) {
    const openInvs = openInvoicesMatchingYear(openInvoicesForDeal(o), filters.invoiceYear)
    if (!openInvs.length) continue
    if (!dealMatchesNarrow(data, o, filters)) continue
    out.push({ deal: o, invoices: openInvs, total: sumInvoiceAmounts(openInvs) })
  }
  return out
}

export function distinctOpenInvoiceYears(data: BoardData): number[] {
  const ys = new Set<number>()
  for (const o of data.opps) {
    for (const inv of openInvoicesForDeal(o)) {
      ys.add(invoiceExpectationYear(inv))
    }
  }
  return [...ys].sort((a, b) => b - a)
}

export interface OpenStageSummary {
  stage: Stage
  count: number
  total: number | null
}

export interface OpenPipelineSummary {
  dealCount: number
  invoiceCount: number
  totalRm: number | null
  byStage: OpenStageSummary[]
}

export function computeOpenPipelineSummary(views: FilteredDealView[]): OpenPipelineSummary {
  const allInv = views.flatMap((v) => v.invoices)
  const byStage = OPEN_STAGES.map((stage) => {
    const invs = allInv.filter((i) => i.stage === stage)
    return { stage, count: invs.length, total: sumInvoiceAmounts(invs) }
  })
  return {
    dealCount: views.length,
    invoiceCount: allInv.length,
    totalRm: sumInvoiceAmounts(allInv),
    byStage,
  }
}

/** Per-calendar-year slice of open pipeline (for year blocks when invoice year is All). */
export function computeOpenPipelineSummaryForYear(views: FilteredDealView[], year: number): OpenPipelineSummary {
  const sliced: FilteredDealView[] = []
  for (const v of views) {
    const invs = v.invoices.filter((i) => invoiceExpectationYear(i) === year)
    if (!invs.length) continue
    sliced.push({ deal: v.deal, invoices: invs, total: sumInvoiceAmounts(invs) })
  }
  return computeOpenPipelineSummary(sliced)
}

export interface OpenPipelineYearBlock {
  year: number
  summary: OpenPipelineSummary
}

export function computeOpenPipelineYearBlocks(views: FilteredDealView[], years: number[]): OpenPipelineYearBlock[] {
  return years.map((year) => ({ year, summary: computeOpenPipelineSummaryForYear(views, year) }))
}
