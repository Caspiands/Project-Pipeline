/**
 * Overview and target calculations — invoice-aware (matching filter slices only).
 */
import { fmtInt, fmtRM, monthKey, num, todayISO } from '@/lib/format'
import { isOpenStage, isWonStage, STAGES } from '@/lib/stages'
import { FINANCE_BOOKED_RULE } from './financeBooked'
import { filterOpportunityViews, isOverdue } from './filters'
import { sumInvoiceAmounts } from './invoices'
import type { BoardData, BoardFilters, Opportunity, OpportunityInvoice } from './types'
import { DEFAULT_FILTERS } from './types'

export function lastReviewAt(data: BoardData): string {
  if (!data.reviews.length) return ''
  return data.reviews.reduce((a, r) => (r.at > a ? r.at : a), data.reviews[0].at)
}

export interface TargetBlockData {
  year: number
  target: number
  booked: number | null
  bookedForGap: number
  countLoaPo: number
  countInvoicedPaid: number
  financeBookedRule: string
  gap: number
  loa: number
  verbal: number
  quoted: number
  early: number
  segs: { k: string; v: number; o: number }[]
  max: number
}

function openInvoicesForYear(views: ReturnType<typeof filterOpportunityViews>, yr: number): OpportunityInvoice[] {
  const out: OpportunityInvoice[] = []
  for (const v of views) {
    for (const inv of v.invoices) {
      if (inv.revenueYear === yr && isOpenStage(inv.stage)) out.push(inv)
    }
  }
  return out
}

const BOOKED_STAGES = new Set(['LOA/PO', 'Invoiced', 'Paid'])

function financeBookedFromViews(views: ReturnType<typeof filterOpportunityViews>, yr: number) {
  let countLoaPo = 0
  let countInvoicedPaid = 0
  const nums: number[] = []
  for (const v of views) {
    for (const inv of v.invoices) {
      if (inv.revenueYear !== yr || !BOOKED_STAGES.has(inv.stage)) continue
      if (inv.stage === 'LOA/PO') countLoaPo++
      if (inv.stage === 'Invoiced' || inv.stage === 'Paid') countInvoicedPaid++
      if (inv.amount != null) nums.push(inv.amount)
    }
  }
  const total = nums.length ? nums.reduce((a, b) => a + b, 0) : null
  return { total, countLoaPo, countInvoicedPaid }
}

export function computeTargetBlock(data: BoardData, filters: BoardFilters = DEFAULT_FILTERS): TargetBlockData {
  const st = data.settings
  const yr = st.year
  const target = num(st.target)
  const yearFilter = filters.year !== 'all' ? filters.year : String(yr)
  const views = filterOpportunityViews(data, { ...filters, year: yearFilter }, {
    respectLostToggle: false,
  })
  const finance = financeBookedFromViews(views, yr)
  const booked = finance.total
  const bookedForGap = booked ?? 0
  const open = openInvoicesForYear(views, yr)
  const by = (s: string) => open.filter((i) => i.stage === s).reduce((a, i) => a + num(i.amount), 0)
  const loa = by('LOA/PO')
  const verbal = by('Verbal yes')
  const quoted = by('Quote sent')
  const early = by('Proposal') + by('Lead')
  const gap = Math.max(0, target - bookedForGap)
  const segs = [
    { k: 'Finance revenue booked', v: bookedForGap, o: 1 },
    { k: 'LOA / PO in hand', v: loa, o: 0.62 },
    { k: 'Verbal yes', v: verbal, o: 0.42 },
    { k: 'Quote sent', v: quoted, o: 0.26 },
    { k: 'Lead / proposal', v: early, o: 0.12 },
  ]
  const total = segs.reduce((a, s) => a + s.v, 0)
  const max = Math.max(target, total) * 1.04 || 1
  return {
    year: yr,
    target,
    booked,
    bookedForGap,
    countLoaPo: finance.countLoaPo,
    countInvoicedPaid: finance.countInvoicedPaid,
    financeBookedRule: FINANCE_BOOKED_RULE,
    gap,
    loa,
    verbal,
    quoted,
    early,
    segs,
    max,
  }
}

export function computeTiles(data: BoardData, filters: BoardFilters) {
  const views = filterOpportunityViews(data, filters, { respectLostToggle: false })
  const allInv = views.flatMap((v) => v.invoices)
  const open = allInv.filter((i) => isOpenStage(i.stage))
  const sum = (list: OpportunityInvoice[]) => {
    const t = sumInvoiceAmounts(list)
    return t == null ? 0 : t
  }
  const noVal = open.filter((i) => i.amount == null).length
  const st = (s: string) => open.filter((i) => i.stage === s)
  const deals = views.map((v) => v.deal)
  return [
    {
      k: 'Open pipeline',
      v: fmtRM(sum(open) || null),
      n: `${fmtInt(open.length)} invoices${noVal ? `, ${fmtInt(noVal)} with no amount` : ''}`,
    },
    { k: 'LOA / PO in hand', v: fmtRM(sum(st('LOA/PO')) || null), n: `${fmtInt(st('LOA/PO').length)} invoices` },
    { k: 'Verbal yes, no LOA', v: fmtRM(sum(st('Verbal yes')) || null), n: `${fmtInt(st('Verbal yes').length)} invoices` },
    {
      k: 'Invoiced, not paid',
      v: fmtRM(sum(allInv.filter((i) => i.stage === 'Invoiced')) || null),
      n: `${fmtInt(allInv.filter((i) => i.stage === 'Invoiced').length)} invoices`,
    },
    {
      k: 'Next steps overdue',
      v: String(deals.filter((o) => isOverdue(o)).length),
      n: 'deals past their next-step date',
    },
    {
      k: 'No next step date',
      v: String(deals.filter((o) => open.some((i) => isOpenStage(i.stage)) && !o.nextDate).length),
      n: 'open deals with nothing scheduled',
    },
  ]
}

export function computeFunnel(data: BoardData, filters: BoardFilters) {
  const views = filterOpportunityViews(data, filters, { respectLostToggle: false })
  const invs = views.flatMap((v) => v.invoices)
  const stages = STAGES.filter((s) => s !== 'Lost')
  const rows = stages.map((s, i) => {
    const rs = invs.filter((inv) => inv.stage === s)
    return { s, i, c: rs.length, v: rs.reduce((a, inv) => a + num(inv.amount), 0) }
  })
  const lost = invs.filter((i) => i.stage === 'Lost')
  const max = Math.max(1, ...rows.map((d) => d.v))
  return { rows, lost, max, stages }
}

export function computeInvoices(data: BoardData, filters: BoardFilters, now = new Date()) {
  const views = filterOpportunityViews(data, filters, { respectLostToggle: false })
  const invs = views.flatMap((v) => v.invoices).filter((i) => i.stage !== 'Lost')
  const months: string[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    months.push(monthKey(d))
  }
  const yr = String(data.settings.year)
  const rows = months.map((m) => {
    const rs = invs.filter((inv) => inv.invoiceMonth === m)
    return {
      m,
      c: rs.length,
      a: rs.filter((inv) => String(inv.revenueYear) === yr).reduce((x, inv) => x + num(inv.amount), 0),
      b: rs.filter((inv) => String(inv.revenueYear) !== yr).reduce((x, inv) => x + num(inv.amount), 0),
    }
  })
  const max = Math.max(1, ...rows.map((d) => d.a + d.b))
  const none = invs.filter((inv) => !inv.invoiceMonth && (isOpenStage(inv.stage) || inv.stage === 'Invoiced')).length
  return { months, rows, max, yr, none }
}

export interface OwnerRow {
  id: string | null
  n: string
  com: number | null
  tr: number
  sec: number
  oc: number
  ov: number
  od: number
  nn: number
}

export function computeOwners(data: BoardData, filters: BoardFilters, personName: (id: string | null) => string): OwnerRow[] {
  const views = filterOpportunityViews(data, { ...filters, owner: 'all' }, { respectLostToggle: false })
  const yr = data.settings.year
  const com = (id: string) => {
    const c = data.commitments.find((x) => x.personId === id && x.year === yr)
    return c ? c.amount : null
  }
  const uniqueIds: (string | null)[] = []
  const pushId = (id: string | null) => {
    if (!uniqueIds.some((x) => x === id)) uniqueIds.push(id)
  }
  data.people.filter((p) => p.isActive).forEach((p) => pushId(p.id))
  if (views.some((v) => !v.deal.ownerIds.length)) pushId(null)
  views.forEach((v) => v.deal.ownerIds.forEach((pid) => pushId(pid)))
  const rows = uniqueIds.map((id) => {
    const mine = views.filter((v) => (id == null ? !v.deal.ownerIds.length : v.deal.ownerIds.includes(id)))
    const yInv = mine.flatMap((v) => v.invoices.filter((i) => i.revenueYear === yr && i.stage !== 'Lost'))
    const openDeals = mine.filter((v) => v.invoices.some((i) => isOpenStage(i.stage)))
    return {
      id,
      n: personName(id),
      com: id ? com(id) : null,
      tr: yInv.reduce((a, i) => a + num(i.amount), 0),
      sec: yInv.filter((i) => i.stage === 'LOA/PO' || isWonStage(i.stage)).reduce((a, i) => a + num(i.amount), 0),
      oc: openDeals.length,
      ov: openDeals.reduce((a, v) => a + num(sumInvoiceAmounts(v.invoices.filter((i) => isOpenStage(i.stage)))), 0),
      od: mine.filter((v) => isOverdue(v.deal)).length,
      nn: openDeals.filter((v) => !v.deal.nextDate).length,
    }
  })
  return rows.filter((x) => x.com != null || x.oc || x.tr).sort((a, b) => b.ov - a.ov)
}

export function pipelineRows(data: BoardData, filters: BoardFilters): Opportunity[] {
  const views = filterOpportunityViews(data, filters)
  let deals = views.map((v) => v.deal)
  if (!filters.lost) deals = deals.filter((d) => !d.invoices.every((i) => i.stage === 'Lost'))
  return deals
}

export { todayISO }
