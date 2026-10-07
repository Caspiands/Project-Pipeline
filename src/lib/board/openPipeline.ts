import { presentYearKl, sortYearsFromPresent } from '@/lib/format'
import { sumInvoiceAmounts, type FilteredDealView } from './invoices'
import { opportunityMatchesKeyword } from './opportunitySearch'
import { opportunityMatchesOwner } from './owners'
import { invoiceAmountInRevenueYear, invoiceRevenueYears } from './revenueYearAllocation'
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

/** Expected invoice calendar year from month when set. */
export function invoiceExpectationYearFromMonth(inv: OpportunityInvoice): number | null {
  if (inv.invoiceMonth && inv.invoiceMonth.length >= 4) {
    const y = Number(inv.invoiceMonth.slice(0, 4))
    if (!Number.isNaN(y)) return y
  }
  return null
}

/** Years this open line appears under for open-pipeline invoice year (month, else revenue year(s)). */
export function openPipelineYearsForInvoice(inv: OpportunityInvoice): number[] {
  const fromMonth = invoiceExpectationYearFromMonth(inv)
  if (fromMonth != null) return [fromMonth]
  return invoiceRevenueYears(inv)
}

export function openInvoiceAmountForYear(inv: OpportunityInvoice, year: number): number | null {
  if (!openPipelineYearsForInvoice(inv).includes(year)) return null
  if (inv.amount == null) return null
  if (invoiceExpectationYearFromMonth(inv) != null) return inv.amount
  return invoiceAmountInRevenueYear(inv, year)
}

export function openInvoicesForDeal(deal: Opportunity) {
  return deal.invoices.filter((i) => isOpenStage(i.stage))
}

function openInvoicesMatchingYear(openInvs: OpportunityInvoice[], invoiceYear: string) {
  if (invoiceYear === 'all') return openInvs
  const y = Number(invoiceYear)
  return openInvs.filter((i) => openPipelineYearsForInvoice(i).includes(y))
}

function sumOpenAmounts(invoices: OpportunityInvoice[], invoiceYear: string): number | null {
  if (invoiceYear === 'all') return sumInvoiceAmounts(invoices)
  const y = Number(invoiceYear)
  const nums = invoices.map((i) => openInvoiceAmountForYear(i, y)).filter((v): v is number => v != null)
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0)
}

function dealMatchesNarrow(data: BoardData, deal: Opportunity, filters: OpenPipelineFilters): boolean {
  if (filters.seg !== 'all' && deal.segment !== filters.seg) return false
  if (filters.owner !== 'all' && !opportunityMatchesOwner(deal, filters.owner)) return false
  if (filters.account !== 'all' && deal.account.trim() !== filters.account) return false
  if (!opportunityMatchesKeyword(data, deal, filters.q)) return false
  return true
}

/** One row per deal that still has open invoice lines; amounts use open lines only (split when two revenue years). */
export function computeOpenPipelineViews(data: BoardData, filters: OpenPipelineFilters): FilteredDealView[] {
  const out: FilteredDealView[] = []
  for (const o of data.opps) {
    const openInvs = openInvoicesMatchingYear(openInvoicesForDeal(o), filters.invoiceYear)
    if (!openInvs.length) continue
    if (!dealMatchesNarrow(data, o, filters)) continue
    out.push({ deal: o, invoices: openInvs, total: sumOpenAmounts(openInvs, filters.invoiceYear) })
  }
  return out
}

export function collectOpenInvoiceYears(data: BoardData): number[] {
  const ys = new Set<number>()
  for (const o of data.opps) {
    for (const inv of openInvoicesForDeal(o)) {
      for (const y of openPipelineYearsForInvoice(inv)) ys.add(y)
    }
  }
  return [...ys]
}

export function distinctOpenInvoiceYears(data: BoardData, now = new Date()): number[] {
  return sortYearsFromPresent(collectOpenInvoiceYears(data), presentYearKl(now))
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

function sumOpenStageAmounts(invoices: OpportunityInvoice[], year: number): number | null {
  const nums = invoices.map((i) => openInvoiceAmountForYear(i, year)).filter((v): v is number => v != null)
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0)
}

function viewTotalsRm(views: FilteredDealView[]): number | null {
  const nums = views.map((v) => v.total).filter((v): v is number => v != null)
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0)
}

export function computeOpenPipelineSummary(
  views: FilteredDealView[],
  invoiceYear: 'all' | string = 'all',
): OpenPipelineSummary {
  const allInv = views.flatMap((v) => v.invoices)
  const y = invoiceYear === 'all' ? null : Number(invoiceYear)
  const stageTotal = (invs: OpportunityInvoice[]) => {
    if (y == null) return sumInvoiceAmounts(invs)
    const nums = invs.map((i) => openInvoiceAmountForYear(i, y)).filter((v): v is number => v != null)
    if (!nums.length) return null
    return nums.reduce((a, b) => a + b, 0)
  }
  const byStage = OPEN_STAGES.map((stage) => {
    const invs = allInv.filter((i) => i.stage === stage)
    return { stage, count: invs.length, total: stageTotal(invs) }
  })
  return {
    dealCount: views.length,
    invoiceCount: allInv.length,
    totalRm: y == null ? sumInvoiceAmounts(allInv) : viewTotalsRm(views),
    byStage,
  }
}

/** Per-calendar-year slice of open pipeline (for year blocks when invoice year is All). */
export function computeOpenPipelineSummaryForYear(views: FilteredDealView[], year: number): OpenPipelineSummary {
  const sliced: FilteredDealView[] = []
  for (const v of views) {
    const invs = v.invoices.filter((i) => openPipelineYearsForInvoice(i).includes(year))
    if (!invs.length) continue
    sliced.push({ deal: v.deal, invoices: invs, total: sumOpenStageAmounts(invs, year) })
  }
  const allInv = sliced.flatMap((v) => v.invoices)
  const byStage = OPEN_STAGES.map((stage) => {
    const invs = allInv.filter((i) => i.stage === stage)
    return {
      stage,
      count: invs.length,
      total: sumOpenStageAmounts(invs, year),
    }
  })
  return {
    dealCount: sliced.length,
    invoiceCount: allInv.length,
    totalRm: sumOpenStageAmounts(allInv, year),
    byStage,
  }
}

export interface OpenPipelineYearBlock {
  year: number
  summary: OpenPipelineSummary
}

export function computeOpenPipelineYearBlocks(views: FilteredDealView[], years: number[]): OpenPipelineYearBlock[] {
  return years.map((year) => ({ year, summary: computeOpenPipelineSummaryForYear(views, year) }))
}
