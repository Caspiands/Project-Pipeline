import { filterOpportunities } from './filters'
import type { BoardData, BoardFilters, Opportunity } from './types'

const YOY_YEARS = [2025, 2026] as const

export interface YoyAccountRow {
  account: string
  count2025: number
  count2026: number
  total2025: number | null
  total2026: number | null
  diff: number | null
}

export interface YoyTable {
  rows: YoyAccountRow[]
  totals: YoyAccountRow
}

function sliceForYear(data: BoardData, filters: BoardFilters, year: number): Opportunity[] {
  return filterOpportunities(
    data,
    { ...filters, year: String(year) },
    { respectStageFilter: false, respectLostToggle: false },
  )
}

/** Sum RM for rows that have a value; null when there is nothing to add (no rows or every value blank). */
export function totalRmKnown(opps: Opportunity[]): number | null {
  const nums = opps.map((o) => o.value).filter((v): v is number => v != null)
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0)
}

export function computeYoyByAccount(data: BoardData, filters: BoardFilters): YoyTable {
  const byYear = YOY_YEARS.map((y) => sliceForYear(data, filters, y))
  const accounts = new Set<string>()
  for (const list of byYear) {
    for (const o of list) accounts.add(o.account.trim())
  }
  const names = [...accounts].sort((a, b) => a.localeCompare(b, 'en-GB'))

  const rows: YoyAccountRow[] = names.map((account) => {
    const o25 = byYear[0].filter((o) => o.account.trim() === account)
    const o26 = byYear[1].filter((o) => o.account.trim() === account)
    const total2025 = totalRmKnown(o25)
    const total2026 = totalRmKnown(o26)
    const diff =
      total2025 != null && total2026 != null ? total2026 - total2025 : null
    return {
      account,
      count2025: o25.length,
      count2026: o26.length,
      total2025,
      total2026,
      diff,
    }
  })

  const all25 = byYear[0]
  const all26 = byYear[1]
  const t25 = totalRmKnown(all25)
  const t26 = totalRmKnown(all26)
  const totals: YoyAccountRow = {
    account: 'Total',
    count2025: all25.length,
    count2026: all26.length,
    total2025: t25,
    total2026: t26,
    diff: t25 != null && t26 != null ? t26 - t25 : null,
  }

  return { rows, totals }
}
