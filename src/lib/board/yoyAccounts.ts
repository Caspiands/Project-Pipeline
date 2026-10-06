import { filterOpportunityViews } from './filters'
import type { BoardData, BoardFilters } from './types'

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

function sliceForYear(data: BoardData, filters: BoardFilters, year: number) {
  return filterOpportunityViews(
    data,
    { ...filters, year: String(year) },
    { respectStageFilter: false, respectLostToggle: false },
  )
}

export function totalRmKnown(amounts: (number | null)[]): number | null {
  const nums = amounts.filter((v): v is number => v != null)
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0)
}

export function computeYoyByAccount(data: BoardData, filters: BoardFilters): YoyTable {
  const byYear = YOY_YEARS.map((y) => sliceForYear(data, filters, y))
  const accounts = new Set<string>()
  for (const list of byYear) {
    for (const v of list) accounts.add(v.deal.account.trim())
  }
  const names = [...accounts].sort((a, b) => a.localeCompare(b, 'en-GB'))

  const rows: YoyAccountRow[] = names.map((account) => {
    const v25 = byYear[0].filter((v) => v.deal.account.trim() === account)
    const v26 = byYear[1].filter((v) => v.deal.account.trim() === account)
    const inv25 = v25.flatMap((v) => v.invoices)
    const inv26 = v26.flatMap((v) => v.invoices)
    const total2025 = totalRmKnown(inv25.map((i) => i.amount))
    const total2026 = totalRmKnown(inv26.map((i) => i.amount))
    const diff = total2025 != null && total2026 != null ? total2026 - total2025 : null
    return {
      account,
      count2025: inv25.length,
      count2026: inv26.length,
      total2025,
      total2026,
      diff,
    }
  })

  const inv25 = byYear[0].flatMap((v) => v.invoices)
  const inv26 = byYear[1].flatMap((v) => v.invoices)
  const t25 = totalRmKnown(inv25.map((i) => i.amount))
  const t26 = totalRmKnown(inv26.map((i) => i.amount))
  const totals: YoyAccountRow = {
    account: 'Total',
    count2025: inv25.length,
    count2026: inv26.length,
    total2025: t25,
    total2026: t26,
    diff: t25 != null && t26 != null ? t26 - t25 : null,
  }

  return { rows, totals }
}
