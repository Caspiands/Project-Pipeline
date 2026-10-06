import { isOpenStage } from '@/lib/stages'
import { todayISO } from '@/lib/format'
import { filterDeals } from './invoices'
import type { BoardData, BoardFilters, Opportunity } from './types'

export interface FilterOptions {
  respectLostToggle?: boolean
  respectStageFilter?: boolean
}

/** Deals with at least one invoice matching invoice-level filters. */
export function filterOpportunities(
  data: BoardData,
  filters: BoardFilters,
  opts: FilterOptions = {},
): Opportunity[] {
  return filterDeals(data, filters, opts).map((v) => v.deal)
}

export function filterOpportunityViews(data: BoardData, filters: BoardFilters, opts: FilterOptions = {}) {
  return filterDeals(data, filters, opts)
}

export function isOverdue(o: Opportunity, today = todayISO()): boolean {
  if (!o.nextDate || o.nextDate >= today) return false
  return o.invoices.some((i) => isOpenStage(i.stage))
}

export function prospectSortKey(status: string): number {
  const order: Record<string, number> = { green: 0, yellow: 1, orange: 2, white: 3 }
  return order[status] ?? 9
}
