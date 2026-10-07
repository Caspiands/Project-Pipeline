import { invoiceMonthKey, monthKeyFromDate, quarterKeyFromMonth } from './dateFilters'
import { opportunityMatchesKeyword } from './opportunitySearch'
import { opportunityMatchesOwner } from './owners'
import { invoiceMatchesRevenueYear, sumReportingAmounts } from './revenueYearAllocation'
import type { BoardData, BoardFilters, Opportunity, OpportunityInvoice } from './types'
import { isOpenStage, isWonStage, STAGES, type Stage } from '@/lib/stages'
import { fmtInt } from '@/lib/format'

export function sumInvoiceAmounts(invoices: { amount: number | null }[]): number | null {
  const nums = invoices.map((i) => i.amount).filter((v): v is number => v != null)
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0)
}

export function invoiceMatchesFilters(inv: OpportunityInvoice, filters: BoardFilters, deal: Opportunity): boolean {
  if (filters.year !== 'all' && !invoiceMatchesRevenueYear(inv, Number(filters.year))) return false
  if (filters.stage !== 'all' && inv.stage !== filters.stage) return false
  if (filters.invoiceMonth !== 'all') {
    const im = invoiceMonthKey(inv.invoiceMonth)
    if (im !== filters.invoiceMonth) return false
  }
  if (filters.invoiceQuarter !== 'all') {
    const im = invoiceMonthKey(inv.invoiceMonth)
    if (!im || quarterKeyFromMonth(im) !== filters.invoiceQuarter) return false
  }
  if (filters.quoteFrom && (!deal.quoteDate || deal.quoteDate < filters.quoteFrom)) return false
  if (filters.quoteTo && (!deal.quoteDate || deal.quoteDate > filters.quoteTo)) return false
  if (filters.quoteMonth !== 'all') {
    const qm = monthKeyFromDate(deal.quoteDate)
    if (qm !== filters.quoteMonth) return false
  }
  if (filters.quoteQuarter !== 'all') {
    const qm = monthKeyFromDate(deal.quoteDate)
    if (!qm || quarterKeyFromMonth(qm) !== filters.quoteQuarter) return false
  }
  return true
}

export function matchingInvoices(deal: Opportunity, filters: BoardFilters, respectStageFilter = true): OpportunityInvoice[] {
  return deal.invoices.filter((inv) => {
    if (!invoiceMatchesFilters(inv, { ...filters, stage: respectStageFilter ? filters.stage : 'all' }, deal)) return false
    return true
  })
}

function stageSummaryWord(stage: Stage): string {
  if (stage === 'LOA/PO') return 'LOA/PO'
  if (stage === 'Quote sent') return 'quote sent'
  if (stage === 'Verbal yes') return 'verbal yes'
  return stage.toLowerCase()
}

export function formatDealStageLabel(invoices: OpportunityInvoice[]): string {
  if (!invoices.length) return '—'
  const stages = invoices.map((i) => i.stage)
  const unique = [...new Set(stages)]
  if (unique.length === 1) return unique[0]
  const counts = new Map<Stage, number>()
  for (const s of stages) counts.set(s, (counts.get(s) ?? 0) + 1)
  return STAGES.filter((s) => counts.has(s))
    .map((s) => `${fmtInt(counts.get(s)!)} ${stageSummaryWord(s)}`)
    .join(', ')
}

export function dealAllLost(invoices: OpportunityInvoice[]): boolean {
  return invoices.length > 0 && invoices.every((i) => i.stage === 'Lost')
}

export function dealHasOpenInvoice(deal: Opportunity): boolean {
  return deal.invoices.some((i) => isOpenStage(i.stage))
}

export function dealHasAnyStage(deal: Opportunity, stages: Stage[]): boolean {
  return deal.invoices.some((i) => stages.includes(i.stage))
}

export function dealHasWonInvoice(deal: Opportunity): boolean {
  return deal.invoices.some((i) => isWonStage(i.stage))
}

export function primaryStageSince(deal: Opportunity): string | null {
  return primaryStageSinceInvoices(deal.invoices)
}

export function primaryStageSinceInvoices(invoices: OpportunityInvoice[]): string | null {
  const dates = invoices.map((i) => i.stageSince).filter(Boolean) as string[]
  if (!dates.length) return null
  return dates.sort()[0]
}

export interface FilteredDealView {
  deal: Opportunity
  invoices: OpportunityInvoice[]
  total: number | null
}

export function filterDeals(
  data: BoardData,
  filters: BoardFilters,
  opts: { respectLostToggle?: boolean; respectStageFilter?: boolean } = {},
): FilteredDealView[] {
  const respectLost = opts.respectLostToggle !== false
  const respectStage = opts.respectStageFilter !== false
  const out: FilteredDealView[] = []

  for (const o of data.opps) {
    if (filters.seg !== 'all' && o.segment !== filters.seg) continue
    if (filters.owner !== 'all' && !opportunityMatchesOwner(o, filters.owner)) continue
    if (filters.account !== 'all' && o.account.trim() !== filters.account) continue
    if (!opportunityMatchesKeyword(data, o, filters.q)) continue

    if (respectLost && !filters.lost && filters.stage === 'all' && dealAllLost(o.invoices)) continue

    const invs = matchingInvoices(o, filters, respectStage)
    if (!invs.length) continue

    out.push({ deal: o, invoices: invs, total: sumReportingAmounts(invs, filters.year) })
  }
  return out
}
