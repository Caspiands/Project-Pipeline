import { sumInvoiceAmounts, type FilteredDealView } from './invoices'
import { opportunityMatchesKeyword } from './opportunitySearch'
import { opportunityMatchesOwner } from './owners'
import type { BoardData, Opportunity } from './types'
import { isOpenStage, OPEN_STAGES, type Stage } from '@/lib/stages'

export interface OpenPipelineFilters {
  seg: 'all' | 'Tech' | 'Agency' | 'Mixed'
  owner: string
  account: string
  q: string
}

export const DEFAULT_OPEN_PIPELINE_FILTERS: OpenPipelineFilters = {
  seg: 'all',
  owner: 'all',
  account: 'all',
  q: '',
}

export function openInvoicesForDeal(deal: Opportunity) {
  return deal.invoices.filter((i) => isOpenStage(i.stage))
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
    const openInvs = openInvoicesForDeal(o)
    if (!openInvs.length) continue
    if (!dealMatchesNarrow(data, o, filters)) continue
    out.push({ deal: o, invoices: openInvs, total: sumInvoiceAmounts(openInvs) })
  }
  return out
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
