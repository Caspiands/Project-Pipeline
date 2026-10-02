import { fmtDate, fmtMonth, num } from '@/lib/format'
import { daysSince } from '@/lib/format'
import type { Opportunity } from './types'

export function opportunitiesToCsv(rows: Opportunity[], personName: (id: string | null) => string): string {
  const headers = [
    'Account',
    'Item',
    'Segment',
    'Owner',
    'Stage',
    'Value',
    'Revenue year',
    'Quote no',
    'Quote date',
    'Days in stage',
    'Invoice month',
    'Next step',
    'Next date',
    'Updated',
  ]
  const esc = (v: string) => {
    if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`
    return v
  }
  const lines = [headers.join(',')]
  for (const o of rows) {
    const d = daysSince(o.stageSince)
    lines.push(
      [
        o.account,
        o.item,
        o.segment,
        personName(o.ownerId),
        o.stage,
        o.value == null ? '' : String(o.value),
        String(o.revenueYear),
        o.quoteNo,
        fmtDate(o.quoteDate),
        d == null ? '' : String(d),
        fmtMonth(o.invoiceMonth),
        o.nextStep,
        fmtDate(o.nextDate),
        fmtDate(o.updatedAt),
      ]
        .map((x) => esc(String(x === '—' ? '' : x)))
        .join(','),
    )
  }
  return lines.join('\n')
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function pipelineTotal(rows: Opportunity[]): number {
  return rows.reduce((a, o) => a + num(o.value), 0)
}
