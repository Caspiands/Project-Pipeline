import { personName } from './names'
import { ownersLabel } from './owners'
import type { BoardData, Opportunity, OpportunityInvoice } from './types'

export const PIPELINE_CSV_HEADERS: { key: string; label: string; patterns: RegExp[] }[] = [
  { key: 'account', label: 'Account', patterns: [/^account$/] },
  { key: 'item', label: 'Item', patterns: [/^item/, /opportunity/] },
  { key: 'segment', label: 'Segment', patterns: [/^segment/, /^seg\.?$/] },
  { key: 'owner', label: 'Owner', patterns: [/^owner$/] },
  { key: 'stage', label: 'Stage', patterns: [/^stage$/] },
  { key: 'value', label: 'Value (RM)', patterns: [/^value/] },
  { key: 'revenueYear', label: 'Revenue year', patterns: [/revenue\s*year/, /^year$/] },
  { key: 'quoteNo', label: 'Quote no', patterns: [/quote\s*no/, /quote\s*number/] },
  { key: 'quoteDate', label: 'Quote sent', patterns: [/quote\s*sent/, /quote\s*date/] },
  { key: 'loaDate', label: 'LOA / PO date', patterns: [/loa/, /po\s*date/] },
  {
    key: 'invoiceMonth',
    label: 'Expected invoice month',
    patterns: [/invoice\s*month/, /expected\s*invoice/],
  },
  { key: 'startDate', label: 'Delivery start', patterns: [/delivery\s*start/, /expected\s*delivery/] },
  { key: 'probability', label: 'Probability (%)', patterns: [/probab/] },
  { key: 'nextStep', label: 'Next step', patterns: [/^next\s*step$/] },
  { key: 'nextOwner', label: 'Next step owner', patterns: [/next[\s-]*step\s*owner/, /next[\s-]*owner/] },
  { key: 'nextDate', label: 'Next step date', patterns: [/next\s*step\s*date/, /next\s*date/] },
  { key: 'link', label: 'Link (https://)', patterns: [/^link/] },
  { key: 'notes', label: 'Notes', patterns: [/^notes?$/] },
]

export function headerIndexMap(headerCells: string[]): Record<string, number | undefined> {
  const idx: Record<string, number | undefined> = {}
  headerCells.forEach((raw, i) => {
    const h = raw.toLowerCase().replace(/\s+/g, ' ').trim()
    for (const col of PIPELINE_CSV_HEADERS) {
      if (idx[col.key] != null) continue
      if (col.patterns.some((p) => p.test(h))) idx[col.key] = i
    }
  })
  return idx
}

function isoDateOnly(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = String(iso).match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : ''
}

function isoInvoiceMonth(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = String(iso).match(/^(\d{4})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}-01` : ''
}

const esc = (v: string) => {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`
  return v
}

function rowForInvoice(o: Opportunity, inv: OpportunityInvoice, data: BoardData): string[] {
  return [
    o.account,
    o.item,
    o.segment,
    o.ownerIds.length ? ownersLabel(data, o.ownerIds) : '',
    inv.stage,
    inv.amount == null ? '' : String(inv.amount),
    String(inv.revenueYear),
    o.quoteNo,
    isoDateOnly(o.quoteDate),
    isoDateOnly(o.loaDate),
    isoInvoiceMonth(inv.invoiceMonth),
    isoDateOnly(o.startDate),
    o.probability == null ? '' : String(o.probability),
    o.nextStep,
    o.nextOwnerId ? personName(data, o.nextOwnerId) : '',
    isoDateOnly(o.nextDate),
    o.link,
    o.notes,
  ]
}

export function opportunitiesToCsv(rows: Opportunity[], data: BoardData): string {
  const headers = PIPELINE_CSV_HEADERS.map((h) => h.label)
  const lines = [headers.join(',')]
  for (const o of rows) {
    for (const inv of o.invoices) {
      lines.push(rowForInvoice(o, inv, data).map((x) => esc(String(x))).join(','))
    }
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

export function pipelineTotalFromViews(views: { total: number | null }[]): number {
  const nums = views.map((v) => v.total).filter((v): v is number => v != null)
  if (!nums.length) return 0
  return nums.reduce((a, b) => a + b, 0)
}
