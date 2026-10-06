import { useMemo, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth/auth'
import { useBoard } from '@/lib/board/BoardProvider'
import { pipelineRows } from '@/lib/board/calculations'
import { filterOpportunityViews, isOverdue } from '@/lib/board/filters'
import { formatDealStageLabel, primaryStageSince, sumInvoiceAmounts } from '@/lib/board/invoices'
import { personName, profileName } from '@/lib/board/names'
import { ownersLabel } from '@/lib/board/owners'
import { downloadCsv, opportunitiesToCsv, pipelineTotalFromViews } from '@/lib/board/pipelineCsv'
import { parsePipelineCsv } from '@/lib/board/pipelineImport'
import { daysSince, fmtDate, fmtFull, fmtInt, fmtMonth } from '@/lib/format'
import { STAGES, stageIndex, type Stage } from '@/lib/stages'
import type { Opportunity } from '@/lib/board/types'

const COLS = [
  { k: 'account', l: 'Account' },
  { k: 'item', l: 'Item' },
  { k: 'segment', l: 'Seg.' },
  { k: 'owner', l: 'Owner' },
  { k: 'stage', l: 'Stage' },
  { k: 'value', l: 'Value (RM)', r: true },
  { k: 'revenueYear', l: 'Year', r: true },
  { k: 'quoteDate', l: 'Quote sent' },
  { k: 'days', l: 'Days in stage', r: true },
  { k: 'invoiceMonth', l: 'Invoice' },
  { k: 'nextStep', l: 'Next step' },
  { k: 'nextDate', l: 'Next date' },
  { k: 'updatedAt', l: 'Updated' },
] as const

type SortKey = (typeof COLS)[number]['k']

function yearLabel(invs: { revenueYear: number }[]): string {
  const yrs = [...new Set(invs.map((i) => i.revenueYear))]
  if (!yrs.length) return '—'
  if (yrs.length === 1) return String(yrs[0])
  return yrs.sort((a, b) => a - b).join(', ')
}

function monthLabel(invs: { invoiceMonth: string | null }[]): string {
  const keys = [...new Set(invs.map((i) => i.invoiceMonth).filter(Boolean) as string[])]
  if (!keys.length) return '—'
  if (keys.length === 1) return fmtMonth(keys[0])
  return `${fmtInt(keys.length)} months`
}

function sortVal(
  o: Opportunity,
  k: SortKey,
  data: ReturnType<typeof useBoard>['data'],
  viewTotal: number | null,
  viewInvoices: Opportunity['invoices'],
) {
  if (!data) return ''
  if (k === 'days') return daysSince(primaryStageSince(o)) ?? -1
  if (k === 'stage') return stageIndex(viewInvoices[0]?.stage ?? 'Lead')
  if (k === 'value') return viewTotal == null ? -1 : Number(viewTotal)
  if (k === 'owner') return ownersLabel(data, o.ownerIds).toLowerCase()
  if (k === 'revenueYear') return yearLabel(viewInvoices)
  if (k === 'invoiceMonth') return monthLabel(viewInvoices)
  const v = o[k as keyof Opportunity]
  return v == null ? '' : String(v).toLowerCase()
}

export function PipelinePage() {
  const board = useBoard()
  const auth = useAuth()
  const canWrite = auth.status?.role === 'admin' || auth.status?.role === 'editor'
  const { data, filters, openEdit, openCreate, importPipelineRows, patchOppStage, setToast } = board
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'account', dir: 1 })
  const fileRef = useRef<HTMLInputElement>(null)
  const [importText, setImportText] = useState<string | null>(null)
  const [importFileName, setImportFileName] = useState('')
  const [importBusy, setImportBusy] = useState(false)
  const [importResults, setImportResults] = useState<string | null>(null)

  const views = useMemo(() => {
    if (!data) return []
    return filterOpportunityViews(data, filters)
  }, [data, filters])

  const viewById = useMemo(() => new Map(views.map((v) => [v.deal.id, v])), [views])

  const rows = useMemo(() => {
    if (!data) return []
    const r = pipelineRows(data, filters)
    const { key, dir } = sort
    return [...r].sort((a, b) => {
      const va = viewById.get(a.id)
      const vb = viewById.get(b.id)
      const x = sortVal(a, key, data, va?.total ?? null, va?.invoices ?? a.invoices)
      const y = sortVal(b, key, data, vb?.total ?? null, vb?.invoices ?? b.invoices)
      return x < y ? -dir : x > y ? dir : 0
    })
  }, [data, filters, sort, viewById])

  const parsedImport = useMemo(() => {
    if (!importText || !data) return null
    return parsePipelineCsv(importText, data.people, data.settings.year)
  }, [importText, data])

  if (!data) {
    return <div className="empty">Loading pipeline…</div>
  }

  const total = pipelineTotalFromViews(views)
  const pn = (id: string | null) => personName(data, id)
  const owners = (o: Opportunity) => ownersLabel(data, o.ownerIds)

  const exportCsv = () => {
    const csv = opportunitiesToCsv(rows, data)
    downloadCsv(`cds-pipeline-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  }

  const onFile = async (file: File | null) => {
    setImportResults(null)
    if (!file) return
    setImportFileName(file.name)
    setImportText(await file.text())
  }

  const clearImport = () => {
    setImportText(null)
    setImportFileName('')
    setImportResults(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const runImport = async () => {
    if (!parsedImport?.rows.length) return
    setImportBusy(true)
    try {
      const res = await importPipelineRows(parsedImport.rows)
      const ok = res.filter((r) => r.ok).length
      const bad = res.filter((r) => !r.ok)
      setImportResults(
        bad.length
          ? `Imported ${ok} deal(s). ${bad.length} failed: ${bad.slice(0, 3).map((b) => `row ${b.lineNumber} (${b.error})`).join('; ')}`
          : `Imported ${ok} deal(s).`,
      )
      clearImport()
    } finally {
      setImportBusy(false)
    }
  }

  return (
    <div className="stack">
      <section className="block">
        <header className="row">
          <div>
            <h2>Pipeline</h2>
            <p className="lead">One row per deal. Open a deal to see each invoice line.</p>
          </div>
          <div className="row gap">
            {canWrite && (
              <button type="button" className="primary" onClick={() => openCreate()} id="add_opp">
                Add opportunity
              </button>
            )}
            <button type="button" className="ghost" onClick={exportCsv}>Export CSV</button>
          </div>
        </header>
        {canWrite && (
          <div className="import-panel">
            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => void onFile(e.target.files?.[0] ?? null)} />
            <button type="button" className="ghost" onClick={() => fileRef.current?.click()}>Import CSV</button>
            {importFileName ? <span className="small muted">{importFileName}</span> : null}
            {parsedImport?.errors.length ? (
              <p className="small danger">{parsedImport.errors.slice(0, 5).map((e) => e.message).join(' ')}</p>
            ) : null}
            {parsedImport?.rows.length ? (
              <>
                <p className="small muted">{fmtInt(parsedImport.rows.length)} deal(s) ready ({parsedImport.rows.reduce((a, r) => a + r.input.invoices.length, 0)} invoice lines).</p>
                <button type="button" className="primary" disabled={importBusy} onClick={() => void runImport()}>Confirm import</button>
              </>
            ) : null}
            {importResults ? <p className="small">{importResults}</p> : null}
          </div>
        )}
        <div className="scroll">
          <table>
            <thead>
              <tr>
                {COLS.map((c) => (
                  <th key={c.k} className={'r' in c && c.r ? 'r' : undefined}>
                    <button type="button" className="thsort" onClick={() => setSort({ key: c.k, dir: sort.key === c.k && sort.dir > 0 ? -1 : 1 })}>
                      {c.l}
                      {sort.key === c.k ? (sort.dir > 0 ? ' ↑' : ' ↓') : ''}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!rows.length ? (
                <tr>
                  <td colSpan={COLS.length}>
                    <div className="empty">
                      {data.opps.length ? 'No opportunities match these filters.' : 'No opportunities yet. Use “Add opportunity” to log the first one.'}
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((o) => {
                  const v = viewById.get(o.id)
                  const invs = v?.invoices ?? o.invoices
                  const stageLabel = formatDealStageLabel(invs)
                  const singleInv = o.invoices.length === 1
                  const d = daysSince(primaryStageSince(o))
                  return (
                    <tr
                      key={o.id}
                      className="click"
                      tabIndex={0}
                      data-testid={`opp-row-${o.id}`}
                      onClick={() => openEdit(o)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') openEdit(o)
                      }}
                    >
                      <td>
                        <b>{o.account}</b>
                        {o.quoteNo ? <div className="small muted mono">{o.quoteNo}</div> : null}
                      </td>
                      <td style={{ minWidth: 200 }}>
                        {o.item}
                        {o.invoices.length > 1 ? <div className="small muted">{fmtInt(o.invoices.length)} invoices</div> : null}
                        {o.notes ? <div className="small muted">{o.notes.length > 110 ? o.notes.slice(0, 110) + '…' : o.notes}</div> : null}
                      </td>
                      <td className="seg">{o.segment || '—'}</td>
                      <td>{owners(o)}</td>
                      <td onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        {canWrite && singleInv ? (
                          <select
                            className="stage-select"
                            aria-label={`Stage for ${o.account}`}
                            value={o.invoices[0].stage}
                            onChange={(e) =>
                              void patchOppStage(o.id, e.target.value as Stage).catch((err: Error) => setToast(err.message))
                            }
                          >
                            {STAGES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="small">{stageLabel}</span>
                        )}
                      </td>
                      <td className="r num">{fmtFull(v?.total ?? sumInvoiceAmounts(invs))}</td>
                      <td className="r num">{yearLabel(invs)}</td>
                      <td className="num">{fmtDate(o.quoteDate)}</td>
                      <td className="r num">{d == null ? '—' : fmtInt(d)}</td>
                      <td className="num">{monthLabel(invs)}</td>
                      <td style={{ minWidth: 180 }}>
                        {o.nextStep || '—'}
                        {o.nextOwnerId ? <div className="small muted">{pn(o.nextOwnerId)}</div> : null}
                      </td>
                      <td className={`num${isOverdue(o) ? ' overdue' : ''}`}>{fmtDate(o.nextDate)}</td>
                      <td className="small muted">
                        {fmtDate(o.updatedAt)}
                        {o.updatedBy ? <div>by {profileName(data, o.updatedBy)}</div> : null}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={5} className="small muted">{fmtInt(rows.length)} deals</td>
                  <td className="r num"><b>{fmtFull(total || null)}</b></td>
                  <td colSpan={COLS.length - 6} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <button type="button" className="sr-only" onClick={() => openCreate()}>Add</button>
      </section>
    </div>
  )
}
