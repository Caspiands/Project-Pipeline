import { SEGMENTS, STAGES, type Segment, type Stage } from '@/lib/stages'
import { parseOwnerCellToIds } from './owners'
import type { OpportunityInput } from './types'
import { splitLine } from './prospectImport'
import { PIPELINE_CSV_HEADERS, headerIndexMap } from './pipelineCsv'

export interface ParsedPipelineImport {
  rows: { lineNumber: number; input: OpportunityInput }[]
  errors: { lineNumber: number; message: string }[]
  skippedBlank: number
}

function normHeader(h: string): string {
  return h.toLowerCase().replace(/\s+/g, ' ').trim()
}

function cell(row: string[], idx: Record<string, number | undefined>, key: string): string {
  const i = idx[key]
  if (i == null) return ''
  return (row[i] ?? '').trim()
}

function parseIsoDate(raw: string, label: string, lineNumber: number): { value: string | null; error?: string } {
  const s = raw.trim()
  if (!s) return { value: null }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return { value: null, error: `Row ${lineNumber}: ${label} must be YYYY-MM-DD or blank.` }
  }
  return { value: s }
}

function parseInvoiceMonth(raw: string, lineNumber: number): { value: string | null; error?: string } {
  const s = raw.trim()
  if (!s) return { value: null }
  const m = s.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/)
  if (!m) {
    return { value: null, error: `Row ${lineNumber}: Expected invoice month must be YYYY-MM or YYYY-MM-DD.` }
  }
  return { value: `${m[1]}-${m[2]}` }
}

function resolveOwner(
  name: string,
  people: { id: string; name: string }[],
  label: string,
  lineNumber: number,
): { id: string | null; error?: string } {
  const parsed = parseOwnerCellToIds(name, people, label, lineNumber)
  if (parsed.error) return { id: null, error: parsed.error }
  return { id: parsed.ids[0] ?? null }
}

function parseValue(raw: string, lineNumber: number): { value: number | null; error?: string } {
  const s = raw.trim()
  if (!s) return { value: null }
  const n = Number(s.replace(/,/g, ''))
  if (!Number.isFinite(n)) {
    return { value: null, error: `Row ${lineNumber}: Value (RM) is not a number.` }
  }
  return { value: n }
}

function parseProbability(raw: string, lineNumber: number): { value: number | null; error?: string } {
  const s = raw.trim()
  if (!s) return { value: null }
  const n = Number(s)
  if (!Number.isInteger(n) || n < 0 || n > 100) {
    return { value: null, error: `Row ${lineNumber}: Probability (%) must be a whole number from 0 to 100 or blank.` }
  }
  return { value: n }
}

export function parsePipelineCsv(
  text: string,
  people: { id: string; name: string }[],
  defaultRevenueYear: number,
): ParsedPipelineImport {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0)
  const out: ParsedPipelineImport = { rows: [], errors: [], skippedBlank: 0 }
  if (!lines.length) return out

  const delim = lines[0].includes('\t') ? '\t' : ','
  const headerCells = splitLine(lines[0], delim).map(normHeader)
  const idx = headerIndexMap(headerCells)
  const missing = PIPELINE_CSV_HEADERS.filter((h) => idx[h.key] == null).map((h) => h.label)
  if (missing.length) {
    out.errors.push({
      lineNumber: 1,
      message: `Missing column(s): ${missing.join(', ')}. Use the downloaded CSV header row.`,
    })
    return out
  }

  for (let li = 1; li < lines.length; li++) {
    const lineNumber = li + 1
    const row = splitLine(lines[li], delim)
    const account = cell(row, idx, 'account')
    const item = cell(row, idx, 'item')
    if (!account && !item && row.every((c) => !c.trim())) {
      out.skippedBlank++
      continue
    }

    const rowErrors: string[] = []
    if (!account) rowErrors.push(`Row ${lineNumber}: Account is required.`)
    if (!item) rowErrors.push(`Row ${lineNumber}: Item is required.`)

    const segmentRaw = cell(row, idx, 'segment')
    if (!segmentRaw) rowErrors.push(`Row ${lineNumber}: Segment is required.`)
    else if (!SEGMENTS.includes(segmentRaw as Segment)) {
      rowErrors.push(`Row ${lineNumber}: Segment must be one of ${SEGMENTS.join(', ')}.`)
    }

    const stageRaw = cell(row, idx, 'stage')
    if (!stageRaw) rowErrors.push(`Row ${lineNumber}: Stage is required.`)
    else if (!STAGES.includes(stageRaw as Stage)) {
      rowErrors.push(`Row ${lineNumber}: Stage must be one of ${STAGES.join(', ')}.`)
    }

    const yearRaw = cell(row, idx, 'revenueYear')
    let revenueYear = defaultRevenueYear
    if (!yearRaw) rowErrors.push(`Row ${lineNumber}: Revenue year is required.`)
    else {
      revenueYear = Number(yearRaw)
      if (!Number.isInteger(revenueYear) || revenueYear < 2020 || revenueYear > 2100) {
        rowErrors.push(`Row ${lineNumber}: Revenue year must be a whole year between 2020 and 2100.`)
      }
    }

    const valueParsed = parseValue(cell(row, idx, 'value'), lineNumber)
    if (valueParsed.error) rowErrors.push(valueParsed.error)

    const quoteDate = parseIsoDate(cell(row, idx, 'quoteDate'), 'Quote sent', lineNumber)
    if (quoteDate.error) rowErrors.push(quoteDate.error)
    const loaDate = parseIsoDate(cell(row, idx, 'loaDate'), 'LOA / PO date', lineNumber)
    if (loaDate.error) rowErrors.push(loaDate.error)
    const startDate = parseIsoDate(cell(row, idx, 'startDate'), 'Delivery start', lineNumber)
    if (startDate.error) rowErrors.push(startDate.error)
    const nextDate = parseIsoDate(cell(row, idx, 'nextDate'), 'Next step date', lineNumber)
    if (nextDate.error) rowErrors.push(nextDate.error)
    const invoiceMonth = parseInvoiceMonth(cell(row, idx, 'invoiceMonth'), lineNumber)
    if (invoiceMonth.error) rowErrors.push(invoiceMonth.error)

    const prob = parseProbability(cell(row, idx, 'probability'), lineNumber)
    if (prob.error) rowErrors.push(prob.error)

    const ownerParsed = parseOwnerCellToIds(cell(row, idx, 'owner'), people, 'owner', lineNumber)
    if (ownerParsed.error) rowErrors.push(ownerParsed.error)
    const nextOwner = resolveOwner(cell(row, idx, 'nextOwner'), people, 'next step owner', lineNumber)
    if (nextOwner.error) rowErrors.push(nextOwner.error)

    const link = cell(row, idx, 'link')
    if (link && !/^https?:\/\//i.test(link)) {
      rowErrors.push(`Row ${lineNumber}: Link must start with https:// or be blank.`)
    }

    if (rowErrors.length) {
      out.errors.push(...rowErrors.map((message) => ({ lineNumber, message })))
      continue
    }

    out.rows.push({
      lineNumber,
      input: {
        account,
        item,
        segment: segmentRaw as Segment,
        ownerIds: ownerParsed.ids,
        ownerId: ownerParsed.ids[0] ?? null,
        stage: stageRaw as Stage,
        value: valueParsed.value,
        revenueYear,
        quoteNo: cell(row, idx, 'quoteNo'),
        quoteDate: quoteDate.value,
        loaDate: loaDate.value,
        invoiceMonth: invoiceMonth.value,
        startDate: startDate.value,
        probability: prob.value,
        nextStep: cell(row, idx, 'nextStep'),
        nextOwnerId: nextOwner.id,
        nextDate: nextDate.value,
        link,
        notes: cell(row, idx, 'notes'),
      },
    })
  }

  return out
}
