import { daysSince, fmtDate, fmtFull, fmtInt, fmtMonth } from '@/lib/format'
import { ownersLabel } from './owners'
import { personName } from './names'
import type { BoardData, Opportunity } from './types'

/** Lowercase text used for case-insensitive partial keyword match (pipeline table columns). */
export function opportunitySearchHaystack(data: BoardData, o: Opportunity): string {
  const days = daysSince(o.stageSince)
  const parts = [
    o.account,
    o.item,
    o.segment,
    ownersLabel(data, o.ownerIds),
    ...o.ownerIds.map((id) => personName(data, id)),
    o.stage,
    o.value == null ? '' : String(o.value),
    fmtFull(o.value),
    String(o.revenueYear),
    o.quoteNo,
    o.quoteDate ?? '',
    o.quoteDate ? fmtDate(o.quoteDate) : '',
    o.invoiceMonth ?? '',
    o.invoiceMonth ? fmtMonth(o.invoiceMonth) : '',
    days == null ? '' : String(days),
    days == null ? '' : fmtInt(days),
    o.nextStep,
    personName(data, o.nextOwnerId),
    o.nextDate ?? '',
    o.nextDate ? fmtDate(o.nextDate) : '',
    o.link,
    o.notes,
  ]
  return parts.join(' ').toLowerCase()
}

export function opportunityMatchesKeyword(data: BoardData, o: Opportunity, q: string): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  return opportunitySearchHaystack(data, o).includes(needle)
}
