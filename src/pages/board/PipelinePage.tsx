import { useMemo, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth/auth'
import { useBoard } from '@/lib/board/BoardProvider'
import { pipelineRows } from '@/lib/board/calculations'
import { isOverdue } from '@/lib/board/filters'
import { personName, profileName } from '@/lib/board/names'
import { ownersLabel } from '@/lib/board/owners'
import { downloadCsv, opportunitiesToCsv, pipelineTotal } from '@/lib/board/pipelineCsv'
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

function sortVal(o: Opportunity, k: SortKey, data: ReturnType<typeof useBoard>['data']) {
  if (!data) return ''
  if (k === 'days') return daysSince(o.stageSince) ?? -1
  if (k === 'stage') return stageIndex(o.stage)
  if (k === 'value') return o.value == null ? -1 : Number(o.value)
  if (k === 'owner') return ownersLabel(data, o.ownerIds).toLowerCase()
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

  const rows = useMemo(() => {
    if (!data) return []
    const r = pipelineRows(data, filters)
    const { key, dir } = sort
    return [...r].sort((a, b) => {
      const x = sortVal(a, key, data)
      const y = sortVal(b, key, data)
      return x < y ? -dir : x > y ? dir : 0
    })
  }, [data, filters, sort])

  const parsedImport = useMemo(() => {
    if (!importText || !data) return null
    return parsePipelineCsv(importText, data.people, data.settings.year)
  }, [importText, data])

  if (!data) {
    return <div className="empty">Loading pipeline…</div>
  }

  const total = pipelineTotal(rows)
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

  const confirmImport = async () => {
    if (!parsedImport || !parsedImport.rows.length) return
    setImportBusy(true)
    setImportResults(null)
    try {
      const results = await importPipelineRows(parsedImport.rows)
      const failed = results.filter((r) => !r.ok)
      const ok = results.filter((r) => r.ok).length
      if (failed.length) {
        const detail = failed.map((r) => `Row ${r.lineNumber}: ${r.error}`).join('\n')
        setImportResults(`${ok} added, ${failed.length} failed.\n${detail}`)
        setToast(`${ok} opportunities added; ${failed.length} row(s) failed.`)
      } else {
        setImportResults(`Added ${ok} opportunities.`)
        setToast(`Added ${ok} opportunities.`)
        clearImport()
      }
    } catch (e) {
      setImportResults((e as Error).message)
    } finally {
      setImportBusy(false)
    }
  }

  const previewRows = parsedImport?.rows.slice(0, 5) ?? []

  return (
    <div className="stack">
      <section className="block" aria-labelledby="pipeline-import-export">
        <h2 id="pipeline-import-export">Import and export</h2>
        <p className="lead">
          Download the opportunities that match your current filters, edit them in a spreadsheet, or upload a CSV to add new rows.
          Dates in the file use ISO form (YYYY-MM-DD). Owner names must match the deal owners list exactly.
        </p>
        <div className="toolbar" style={{ flexWrap: 'wrap', gap: 12 }}>
          <button type="button" className="primary" onClick={exportCsv}>
            Download filtered CSV ({fmtInt(rows.length)} {rows.length === 1 ? 'row' : 'rows'})
          </button>
          {canWrite && (
            <label className="field" style={{ margin: 0 }}>
              <span className="small">Upload CSV</span>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
        </div>
        {canWrite && importText && parsedImport && (
          <div className="block" style={{ marginTop: 16, padding: 12, border: '1px solid var(--line)' }}>
            <p className="small muted">
              File: <b>{importFileName || 'upload'}</b>
              {parsedImport.skippedBlank ? ` · ${fmtInt(parsedImport.skippedBlank)} blank row(s) skipped` : null}
            </p>
            {parsedImport.errors.length > 0 && (
              <div role="alert" className="small" style={{ color: 'var(--danger)', whiteSpace: 'pre-wrap' }}>
                {parsedImport.errors.map((e) => e.message).join('\n')}
              </div>
            )}
            {parsedImport.rows.length > 0 && (
              <>
                <p>
                  <b>{fmtInt(parsedImport.rows.length)}</b> {parsedImport.rows.length === 1 ? 'row' : 'rows'} ready to import
                  {parsedImport.errors.length ? ' · some rows were skipped because of errors' : ''}.
                </p>
                <div className="scroll">
                  <table className="small">
                    <thead>
                      <tr>
                        <th>Line</th>
                        <th>Account</th>
                        <th>Item</th>
                        <th>Stage</th>
                        <th>Year</th>
                        <th>Owner</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((r) => (
                        <tr key={r.lineNumber}>
                          <td>{fmtInt(r.lineNumber)}</td>
                          <td>{r.input.account}</td>
                          <td>{r.input.item}</td>
                          <td>{r.input.stage}</td>
                          <td>{r.input.revenueYear}</td>
                          <td>{r.input.ownerIds?.length ? ownersLabel(data, r.input.ownerIds) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedImport.rows.length > previewRows.length && (
                  <p className="small muted">Showing the first {fmtInt(previewRows.length)} rows.</p>
                )}
                <div className="row" style={{ marginTop: 12, gap: 8 }}>
                  <button
                    type="button"
                    className="primary"
                    disabled={importBusy || parsedImport.rows.length === 0}
                    onClick={() => void confirmImport()}
                  >
                    {importBusy ? 'Importing…' : `Confirm import of ${fmtInt(parsedImport.rows.length)} rows`}
                  </button>
                  <button type="button" onClick={clearImport} disabled={importBusy}>Cancel</button>
                </div>
              </>
            )}
            {importResults && (
              <pre className="small" style={{ marginTop: 12, whiteSpace: 'pre-wrap' }} role="status">{importResults}</pre>
            )}
          </div>
        )}
      </section>

      <section className="block">
        <div className="toolbar">
          <h2 style={{ margin: 0, flex: 1 }}>Pipeline</h2>
        </div>
        <p className="lead">One row per opportunity. Click a row to open the drawer.</p>
        <div className="scroll">
          <table data-testid="pipeline-table">
            <thead>
              <tr>
                {COLS.map((c) => (
                  <th key={c.k} className={'r' in c && c.r ? 'r' : ''} aria-sort={sort.key === c.k ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none'}>
                    <button
                      type="button"
                      onClick={() =>
                        setSort((s) => (s.key === c.k ? { key: c.k, dir: (s.dir > 0 ? -1 : 1) as 1 | -1 } : { key: c.k, dir: 1 }))
                      }
                    >
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
                  const d = daysSince(o.stageSince)
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
                        {o.notes ? <div className="small muted">{o.notes.length > 110 ? o.notes.slice(0, 110) + '…' : o.notes}</div> : null}
                      </td>
                      <td className="seg">{o.segment || '—'}</td>
                      <td>{owners(o)}</td>
                      <td onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        {canWrite ? (
                          <select
                            className="stage-select"
                            aria-label={`Stage for ${o.account}`}
                            value={o.stage}
                            onChange={(e) =>
                              void patchOppStage(o.id, e.target.value as Stage).catch((err: Error) => setToast(err.message))
                            }
                          >
                            {STAGES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`pill s${stageIndex(o.stage)}${o.stage === 'Lost' ? ' lost' : ''}`}>{o.stage}</span>
                        )}
                      </td>
                      <td className="r num">{fmtFull(o.value)}</td>
                      <td className="r num">{o.revenueYear || '—'}</td>
                      <td className="num">{fmtDate(o.quoteDate)}</td>
                      <td className="r num">{d == null ? '—' : fmtInt(d)}</td>
                      <td className="num">{fmtMonth(o.invoiceMonth)}</td>
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
                  <td colSpan={5} className="small muted">{fmtInt(rows.length)} rows</td>
                  <td className="r num"><b>{fmtFull(total)}</b></td>
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
