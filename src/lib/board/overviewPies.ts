import { num } from '@/lib/format'
import { SEGMENTS, STAGES } from '@/lib/stages'
import type { Opportunity } from './types'

export interface PieSliceRow {
  label: string
  value: number
  count: number
}

function bucket(rows: Opportunity[], label: (o: Opportunity) => string, order?: string[]): PieSliceRow[] {
  const map = new Map<string, { value: number; count: number }>()
  for (const o of rows) {
    const k = label(o)
    const cur = map.get(k) ?? { value: 0, count: 0 }
    cur.count += 1
    cur.value += num(o.value)
    map.set(k, cur)
  }
  const keys = order ? order.filter((k) => map.has(k)).concat([...map.keys()].filter((k) => !order.includes(k)).sort()) : [...map.keys()].sort()
  return keys.map((k) => ({ label: k, value: map.get(k)!.value, count: map.get(k)!.count }))
}

export function pieByStage(rows: Opportunity[]): PieSliceRow[] {
  return bucket(rows, (o) => o.stage, [...STAGES])
}

export function pieBySegment(rows: Opportunity[]): PieSliceRow[] {
  return bucket(rows, (o) => o.segment, [...SEGMENTS])
}

export function pieByOwner(rows: Opportunity[], personName: (id: string | null) => string): PieSliceRow[] {
  const out = bucket(rows, (o) => (o.ownerId ? personName(o.ownerId) : 'Unassigned'))
  return out.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
}
