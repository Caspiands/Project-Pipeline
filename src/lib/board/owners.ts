import type { BoardData, Opportunity } from './types'

/** Spreadsheet / legacy labels → people.name on the board. */
export const OWNER_NAME_ALIASES: Record<string, string> = {
  bhargava: 'Bharg',
}

export function normaliseOwnerLabel(name: string): string {
  const t = name.trim()
  if (!t) return t
  const alias = OWNER_NAME_ALIASES[t.toLowerCase()]
  return alias ?? t
}

export function parseOwnerCell(raw: string | null | undefined): string[] {
  if (!raw) return []
  const s = String(raw).trim()
  if (!s || /^unassigned$/i.test(s) || s.toUpperCase() === 'NA') return []
  const parts = s.split(',').map((x) => normaliseOwnerLabel(x)).filter(Boolean)
  const seen = new Set<string>()
  const out: string[] = []
  for (const p of parts) {
    const k = p.toLowerCase()
    if (!seen.has(k)) {
      seen.add(k)
      out.push(p)
    }
  }
  return out.sort((a, b) => a.localeCompare(b, 'en-GB'))
}

export function sortOwnerIds(ids: string[], data: BoardData): string[] {
  const name = (id: string) => data.people.find((p) => p.id === id)?.name ?? ''
  return [...ids].sort((a, b) => name(a).localeCompare(name(b), 'en-GB'))
}

export function ownersLabel(data: BoardData, ids: string[] | null | undefined): string {
  if (!ids?.length) return '—'
  return sortOwnerIds(ids, data)
    .map((id) => data.people.find((p) => p.id === id)?.name ?? '—')
    .join(', ')
}

export function ownerIdsKey(ids: string[]): string {
  return [...ids].sort().join('|')
}

/** Most common owner set on this account (by deal count). */
export function dominantOwnerIdsForAccount(data: BoardData, account: string): string[] {
  const opps = data.opps.filter((o) => o.account === account)
  const counts = new Map<string, number>()
  for (const o of opps) {
    const key = ownerIdsKey(o.ownerIds)
    if (!key) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  let bestKey = ''
  let best = 0
  for (const [k, n] of counts) {
    if (n > best) {
      best = n
      bestKey = k
    }
  }
  return bestKey ? bestKey.split('|') : []
}

export function opportunityMatchesOwner(o: Opportunity, ownerFilter: string): boolean {
  if (ownerFilter === 'none') return o.ownerIds.length === 0
  return o.ownerIds.includes(ownerFilter)
}

export function resolveOwnerLabelsToIds(
  labels: string[],
  people: { id: string; name: string }[],
  label: string,
  lineNumber: number,
): { ids: string[]; error?: string } {
  const ids: string[] = []
  for (const name of labels) {
    const hit = people.find((p) => p.name.toLowerCase() === name.toLowerCase())
    if (!hit) return { ids: [], error: `Row ${lineNumber}: Unknown ${label} “${name}”.` }
    if (!ids.includes(hit.id)) ids.push(hit.id)
  }
  const name = (id: string) => people.find((p) => p.id === id)?.name ?? ''
  ids.sort((a, b) => name(a).localeCompare(name(b), 'en-GB'))
  return { ids }
}

export function parseOwnerCellToIds(
  raw: string | null | undefined,
  people: { id: string; name: string }[],
  label: string,
  lineNumber: number,
): { ids: string[]; error?: string } {
  const labels = parseOwnerCell(raw)
  if (!labels.length) return { ids: [] }
  return resolveOwnerLabelsToIds(labels, people, label, lineNumber)
}

export function uniqueAccountsSorted(data: BoardData): string[] {
  const set = new Set<string>()
  for (const o of data.opps) {
    const a = o.account.trim()
    if (a) set.add(a)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'en-GB'))
}
