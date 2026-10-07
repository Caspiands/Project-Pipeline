import { num } from '@/lib/format'
import { SEGMENTS, STAGES } from '@/lib/stages'
import { filterOpportunityViews } from './filters'
import { ownersLabel } from './owners'
import { invoiceReportingAmount } from './revenueYearAllocation'
import type { BoardData, OpportunityInvoice } from './types'

export interface PieSliceRow {
  label: string
  value: number
  count: number
}

function bucketInvoices(
  rows: OpportunityInvoice[],
  label: (i: OpportunityInvoice) => string,
  order?: string[],
  yearFilter: 'all' | string = 'all',
): PieSliceRow[] {
  const map = new Map<string, { value: number; count: number }>()
  for (const inv of rows) {
    const k = label(inv)
    const cur = map.get(k) ?? { value: 0, count: 0 }
    cur.count += 1
    cur.value += num(invoiceReportingAmount(inv, yearFilter))
    map.set(k, cur)
  }
  const keys = order
    ? order.filter((k) => map.has(k)).concat([...map.keys()].filter((k) => !order.includes(k)).sort())
    : [...map.keys()].sort()
  return keys.map((k) => ({ label: k, value: map.get(k)!.value, count: map.get(k)!.count }))
}

export function pieByStageFromViews(
  views: ReturnType<typeof filterOpportunityViews>,
  yearFilter: 'all' | string = 'all',
): PieSliceRow[] {
  const invs = views.flatMap((v) => v.invoices)
  return bucketInvoices(invs, (i) => i.stage, [...STAGES], yearFilter)
}

export function pieBySegmentFromViews(
  views: ReturnType<typeof filterOpportunityViews>,
  yearFilter: 'all' | string = 'all',
): PieSliceRow[] {
  const invs = views.flatMap((v) => v.invoices.map((inv) => ({ inv, seg: v.deal.segment })))
  const map = new Map<string, { value: number; count: number }>()
  for (const { inv, seg } of invs) {
    const cur = map.get(seg) ?? { value: 0, count: 0 }
    cur.count += 1
    cur.value += num(invoiceReportingAmount(inv, yearFilter))
    map.set(seg, cur)
  }
  const extra = [...map.keys()].filter((k) => !(SEGMENTS as readonly string[]).includes(k)).sort()
  const keys = [...[...SEGMENTS].filter((k) => map.has(k)), ...extra]
  return keys.map((k) => ({ label: k, value: map.get(k)!.value, count: map.get(k)!.count }))
}

export function pieByOwnerFromViews(
  data: BoardData,
  views: ReturnType<typeof filterOpportunityViews>,
  yearFilter: 'all' | string = 'all',
): PieSliceRow[] {
  const map = new Map<string, { value: number; count: number }>()
  for (const v of views) {
    const k = v.deal.ownerIds.length ? ownersLabel(data, v.deal.ownerIds) : 'Unassigned'
    for (const inv of v.invoices) {
      const cur = map.get(k) ?? { value: 0, count: 0 }
      cur.count += 1
      cur.value += num(invoiceReportingAmount(inv, yearFilter))
      map.set(k, cur)
    }
  }
  return [...map.entries()]
    .map(([label, { value, count }]) => ({ label, value, count }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
}
