import { isOpenStage } from '@/lib/stages'
import { todayISO } from '@/lib/format'
import { invoiceMonthKey, monthKeyFromDate, quarterKeyFromMonth } from './dateFilters'
import { opportunityMatchesKeyword } from './opportunitySearch'
import { opportunityMatchesOwner } from './owners'
import type { BoardData, BoardFilters, Opportunity } from './types'

export interface FilterOptions {
  /** When false, lost rows are hidden unless filters.lost is true. Default true for pipeline. */
  respectLostToggle?: boolean
  /** When false, stage filter is ignored (overview uses global filters only). */
  respectStageFilter?: boolean
}

/** Matches prototype `filtered()` — top-bar filters plus optional stage / show-lost. */
export function filterOpportunities(
  data: BoardData,
  filters: BoardFilters,
  opts: FilterOptions = {},
): Opportunity[] {
  const respectLost = opts.respectLostToggle !== false
  const respectStage = opts.respectStageFilter !== false
  return data.opps.filter((o) => {
    if (respectLost && !filters.lost && o.stage === 'Lost') return false
    if (respectStage && filters.stage !== 'all' && o.stage !== filters.stage) return false
    if (filters.seg !== 'all' && o.segment !== filters.seg) return false
    if (filters.owner !== 'all' && !opportunityMatchesOwner(o, filters.owner)) return false
    if (filters.account !== 'all' && o.account.trim() !== filters.account) return false
    if (filters.year !== 'all' && String(o.revenueYear) !== filters.year) return false
    if (!opportunityMatchesKeyword(data, o, filters.q)) return false
    if (filters.invoiceMonth !== 'all') {
      const im = invoiceMonthKey(o.invoiceMonth)
      if (im !== filters.invoiceMonth) return false
    }
    if (filters.invoiceQuarter !== 'all') {
      const im = invoiceMonthKey(o.invoiceMonth)
      if (!im || quarterKeyFromMonth(im) !== filters.invoiceQuarter) return false
    }
    if (filters.quoteFrom) {
      if (!o.quoteDate || o.quoteDate < filters.quoteFrom) return false
    }
    if (filters.quoteTo) {
      if (!o.quoteDate || o.quoteDate > filters.quoteTo) return false
    }
    if (filters.quoteMonth !== 'all') {
      const qm = monthKeyFromDate(o.quoteDate)
      if (qm !== filters.quoteMonth) return false
    }
    if (filters.quoteQuarter !== 'all') {
      const qm = monthKeyFromDate(o.quoteDate)
      if (!qm || quarterKeyFromMonth(qm) !== filters.quoteQuarter) return false
    }
    return true
  })
}

export function isOverdue(o: Opportunity, today = todayISO()): boolean {
  return isOpenStage(o.stage) && !!o.nextDate && o.nextDate < today
}

export function prospectSortKey(status: string): number {
  const order: Record<string, number> = { green: 0, yellow: 1, orange: 2, white: 3 }
  return order[status] ?? 9
}
