/**
 * Overview and target calculations — ported from the prototype so numbers match demo mode.
 */
import { fmtRM, monthKey, num, todayISO } from '@/lib/format'
import { isOpenStage, isWonStage, STAGES } from '@/lib/stages'
import { filterOpportunities, isOverdue } from './filters'
import type { BoardData, BoardFilters, Opportunity } from './types'

export function lastReviewAt(data: BoardData): string {
  if (!data.reviews.length) return ''
  return data.reviews.reduce((a, r) => (r.at > a ? r.at : a), data.reviews[0].at)
}

export interface TargetBlockData {
  year: number
  target: number
  booked: number
  gap: number
  loa: number
  verbal: number
  quoted: number
  early: number
  segs: { k: string; v: number; o: number }[]
  max: number
  financeAsOf: string
}

export function computeTargetBlock(data: BoardData): TargetBlockData {
  const st = data.settings
  const yr = st.year
  const target = num(st.target)
  const booked = num(st.financeRevenue)
  const rows = data.opps.filter((o) => String(o.revenueYear) === String(yr) && isOpenStage(o.stage))
  const by = (s: string) => rows.filter((o) => o.stage === s).reduce((a, o) => a + num(o.value), 0)
  const loa = by('LOA/PO')
  const verbal = by('Verbal yes')
  const quoted = by('Quote sent')
  const early = by('Proposal') + by('Lead')
  const gap = Math.max(0, target - booked)
  const segs = [
    { k: 'Booked (finance)', v: booked, o: 1 },
    { k: 'LOA / PO in hand', v: loa, o: 0.62 },
    { k: 'Verbal yes', v: verbal, o: 0.42 },
    { k: 'Quote sent', v: quoted, o: 0.26 },
    { k: 'Lead / proposal', v: early, o: 0.12 },
  ]
  const total = segs.reduce((a, s) => a + s.v, 0)
  const max = Math.max(target, total) * 1.04 || 1
  return { year: yr, target, booked, gap, loa, verbal, quoted, early, segs, max, financeAsOf: st.financeAsOf }
}

export function computeTiles(data: BoardData, filters: BoardFilters) {
  const r = filterOpportunities(data, filters, { respectStageFilter: false, respectLostToggle: false })
  const open = r.filter((o) => isOpenStage(o.stage))
  const sum = (a: Opportunity[]) => a.reduce((x, o) => x + num(o.value), 0)
  const noVal = open.filter((o) => o.value == null).length
  const st = (s: string) => open.filter((o) => o.stage === s)
  return [
    {
      k: 'Open pipeline',
      v: fmtRM(sum(open)),
      n: `${open.length} opportunities${noVal ? `, ${noVal} with no value` : ''}`,
    },
    { k: 'LOA / PO in hand', v: fmtRM(sum(st('LOA/PO'))), n: `${st('LOA/PO').length} opportunities` },
    { k: 'Verbal yes, no LOA', v: fmtRM(sum(st('Verbal yes'))), n: `${st('Verbal yes').length} opportunities` },
    {
      k: 'Invoiced, not paid',
      v: fmtRM(sum(r.filter((o) => o.stage === 'Invoiced'))),
      n: `${r.filter((o) => o.stage === 'Invoiced').length} opportunities`,
    },
    {
      k: 'Next steps overdue',
      v: String(open.filter((o) => isOverdue(o)).length),
      n: 'open rows past their next-step date',
    },
    {
      k: 'No next step date',
      v: String(open.filter((o) => !o.nextDate).length),
      n: 'open rows with nothing scheduled',
    },
  ]
}

export function computeFunnel(data: BoardData, filters: BoardFilters) {
  const r = filterOpportunities(data, filters, { respectStageFilter: false, respectLostToggle: false })
  const stages = STAGES.filter((s) => s !== 'Lost')
  const rows = stages.map((s, i) => {
    const rs = r.filter((o) => o.stage === s)
    return { s, i, c: rs.length, v: rs.reduce((a, o) => a + num(o.value), 0) }
  })
  const lost = r.filter((o) => o.stage === 'Lost')
  const max = Math.max(1, ...rows.map((d) => d.v))
  return { rows, lost, max, stages }
}

export function computeInvoices(data: BoardData, filters: BoardFilters, now = new Date()) {
  const r = filterOpportunities(data, filters, { respectStageFilter: false, respectLostToggle: false }).filter((o) => o.stage !== 'Lost')
  const months: string[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    months.push(monthKey(d))
  }
  const yr = String(data.settings.year)
  const rows = months.map((m) => {
    const rs = r.filter((o) => o.invoiceMonth === m)
    return {
      m,
      c: rs.length,
      a: rs.filter((o) => String(o.revenueYear) === yr).reduce((x, o) => x + num(o.value), 0),
      b: rs.filter((o) => String(o.revenueYear) !== yr).reduce((x, o) => x + num(o.value), 0),
    }
  })
  const max = Math.max(1, ...rows.map((d) => d.a + d.b))
  const none = r.filter((o) => !o.invoiceMonth && (isOpenStage(o.stage) || o.stage === 'Invoiced')).length
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
  const rNoOwner = filterOpportunities(
    data,
    { ...filters, owner: 'all' },
    { respectStageFilter: false, respectLostToggle: false },
  )
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
  if (rNoOwner.some((o) => !o.ownerId)) pushId(null)
  rNoOwner.forEach((o) => {
    if (o.ownerId) pushId(o.ownerId)
  })
  const rows = uniqueIds.map((id) => {
    const mine = rNoOwner.filter((o) => (o.ownerId || null) === id)
    const y = mine.filter((o) => o.revenueYear === yr && o.stage !== 'Lost')
    return {
      id,
      n: personName(id),
      com: id ? com(id) : null,
      tr: y.reduce((a, o) => a + num(o.value), 0),
      sec: y.filter((o) => o.stage === 'LOA/PO' || isWonStage(o.stage)).reduce((a, o) => a + num(o.value), 0),
      oc: mine.filter((o) => isOpenStage(o.stage)).length,
      ov: mine.filter((o) => isOpenStage(o.stage)).reduce((a, o) => a + num(o.value), 0),
      od: mine.filter((o) => isOverdue(o)).length,
      nn: mine.filter((o) => isOpenStage(o.stage) && !o.nextDate).length,
    }
  })
  return rows.filter((x) => x.com != null || x.oc || x.tr).sort((a, b) => b.ov - a.ov)
}

export function pipelineRows(data: BoardData, filters: BoardFilters): Opportunity[] {
  let r = filterOpportunities(data, filters, { respectStageFilter: false }).filter((o) => filters.lost || o.stage !== 'Lost')
  if (filters.stage !== 'all') r = r.filter((o) => o.stage === filters.stage)
  return r
}

export { todayISO }
