import { useMemo, useRef, useState } from 'react'
import { PipelineTable, sortPipelineRows, type PipelineSortKey } from '@/components/PipelineTable'
import { useAuth } from '@/lib/auth/auth'
import { useBoard } from '@/lib/board/BoardProvider'
import { pipelineRows } from '@/lib/board/calculations'
import { filterOpportunityViews } from '@/lib/board/filters'
import { downloadCsv, opportunitiesToCsv, pipelineTotalFromViews } from '@/lib/board/pipelineCsv'
import { parsePipelineCsv } from '@/lib/board/pipelineImport'
import { fmtInt } from '@/lib/format'

export function PipelinePage() {
  const board = useBoard()
  const auth = useAuth()
  const canWrite = auth.status?.role === 'admin' || auth.status?.role === 'editor'
  const { data, filters, openEdit, openCreate, importPipelineRows, patchOppStage, setToast } = board
  const [sort, setSort] = useState<{ key: PipelineSortKey; dir: 1 | -1 }>({ key: 'account', dir: 1 })
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
    return sortPipelineRows(r, sort, data, viewById)
  }, [data, filters, sort, viewById])

  const parsedImport = useMemo(() => {
    if (!importText || !data) return null
    return parsePipelineCsv(importText, data.people, data.settings.year)
  }, [importText, data])

  if (!data) {
    return <div className="empty">Loading pipeline…</div>
  }

  const total = pipelineTotalFromViews(views)

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
        <PipelineTable
          rows={rows}
          viewById={viewById}
          sort={sort}
          onSort={setSort}
          total={total}
          canWrite={canWrite}
          onRowClick={openEdit}
          onStageChange={patchOppStage}
          setToast={setToast}
          emptyMessage={
            data.opps.length ? 'No opportunities match these filters.' : 'No opportunities yet. Use “Add opportunity” to log the first one.'
          }
        />
        <button type="button" className="sr-only" onClick={() => openCreate()}>Add</button>
      </section>
    </div>
  )
}
