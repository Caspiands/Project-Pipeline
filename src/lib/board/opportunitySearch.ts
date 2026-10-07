import { daysSince, fmtDate, fmtFull, fmtInt, fmtMonth } from '@/lib/format'
import { formatInvoiceRevenueYears } from './revenueYearAllocation'
import { ownersLabel } from './owners'
import { personName } from './names'
import type { BoardData, Opportunity } from './types'

/** Lowercase text used for case-insensitive partial keyword match (deal + invoice lines). */
export function opportunitySearchHaystack(data: BoardData, o: Opportunity): string {
  const invParts = o.invoices.flatMap((inv) => {
    const days = daysSince(inv.stageSince)
    return [
      inv.stage,
      String(inv.revenueYear),
      formatInvoiceRevenueYears(inv),
      inv.invoiceMonth ?? '',
      inv.invoiceMonth ? fmtMonth(inv.invoiceMonth) : '',
      inv.amount == null ? '' : String(inv.amount),
      fmtFull(inv.amount),
      days == null ? '' : String(days),
      days == null ? '' : fmtInt(days),
    ]
  })
  const parts = [
    o.account,
    o.item,
    o.segment,
    ownersLabel(data, o.ownerIds),
    ...o.ownerIds.map((id) => personName(data, id)),
    ...invParts,
    o.quoteNo,
    o.quoteDate ?? '',
    o.quoteDate ? fmtDate(o.quoteDate) : '',
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
