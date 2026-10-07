import { useMemo, useState } from 'react'
import { OpenPipelineFiltersBar } from '@/components/OpenPipelineFilters'
import { OpenPipelineYearBlocks } from '@/components/OpenPipelineYearBlocks'
import { PipelineTable, sortPipelineRows, type PipelineSortKey } from '@/components/PipelineTable'
import { useAuth } from '@/lib/auth/auth'
import { useBoard } from '@/lib/board/BoardProvider'
import { sumInvoiceAmounts } from '@/lib/board/invoices'
import {
  computeOpenPipelineSummary,
  computeOpenPipelineViews,
  computeOpenPipelineYearBlocks,
  DEFAULT_OPEN_PIPELINE_FILTERS,
  distinctOpenInvoiceYears,
  type OpenPipelineFilters,
} from '@/lib/board/openPipeline'
import { fmtInt, fmtRM } from '@/lib/format'

export function OpenPipelinePage() {
  const board = useBoard()
  const auth = useAuth()
  const canWrite = auth.status?.role === 'admin' || auth.status?.role === 'editor'
  const { data, openEdit, patchOppStage, setToast } = board
  const [narrow, setNarrow] = useState<OpenPipelineFilters>(DEFAULT_OPEN_PIPELINE_FILTERS)
  const [sort, setSort] = useState<{ key: PipelineSortKey; dir: 1 | -1 }>({ key: 'account', dir: 1 })

  const narrowWithoutYear = useMemo(
    () => ({ ...narrow, invoiceYear: 'all' as const }),
    [narrow],
  )

  const allOpenViews = useMemo(() => {
    if (!data) return []
    return computeOpenPipelineViews(data, DEFAULT_OPEN_PIPELINE_FILTERS)
  }, [data])

  const viewsForYearBlocks = useMemo(() => {
    if (!data) return []
    return computeOpenPipelineViews(data, narrowWithoutYear)
  }, [data, narrowWithoutYear])

  const views = useMemo(() => {
    if (!data) return []
    return computeOpenPipelineViews(data, narrow)
  }, [data, narrow])

  const viewById = useMemo(() => new Map(views.map((v) => [v.deal.id, v])), [views])

  const rows = useMemo(() => {
    if (!data) return []
    const deals = views.map((v) => v.deal)
    return sortPipelineRows(deals, sort, data, viewById, true)
  }, [data, views, sort, viewById])

  const summary = useMemo(() => computeOpenPipelineSummary(views, narrow.invoiceYear), [views, narrow.invoiceYear])
  const total = useMemo(() => {
    const nums = views.map((v) => v.total).filter((v): v is number => v != null)
    if (!nums.length) return null
    return nums.reduce((a, b) => a + b, 0)
  }, [views])

  const yearBlocks = useMemo(() => {
    if (!data) return []
    const years =
      narrow.invoiceYear === 'all'
        ? distinctOpenInvoiceYears(data)
        : [Number(narrow.invoiceYear)]
    return computeOpenPipelineYearBlocks(viewsForYearBlocks, years)
  }, [data, narrow.invoiceYear, viewsForYearBlocks])

  const dealDenominator = useMemo(() => viewsForYearBlocks.length, [viewsForYearBlocks])

  if (!data) {
    return <div className="empty">Loading open pipeline…</div>
  }

  const setNarrowPatch = (patch: Partial<OpenPipelineFilters>) => setNarrow((f) => ({ ...f, ...patch }))

  return (
    <div className="stack">
      <OpenPipelineFiltersBar
        filters={narrow}
        onChange={setNarrowPatch}
        matchCount={summary.dealCount}
        dealTotal={dealDenominator}
      />
      <section className="block">
        <header className="row">
          <div>
            <h2>Open pipeline</h2>
            <p className="lead">
              Deals with open invoice lines (Lead through LOA/PO). Invoice year uses the expected invoice month, or
              revenue year when the month is blank.
            </p>
          </div>
        </header>
        {narrow.invoiceYear === 'all' && (
          <div className="tiles" style={{ marginBottom: 16 }}>
            <div className="tile">
              <div className="k">Total open pipeline</div>
              <div className="v">{fmtRM(summary.totalRm)}</div>
              <div className="n">
                {fmtInt(summary.invoiceCount)} open {summary.invoiceCount === 1 ? 'invoice' : 'invoices'} ·{' '}
                {fmtInt(summary.dealCount)} {summary.dealCount === 1 ? 'deal' : 'deals'}
              </div>
            </div>
            {summary.byStage
              .filter((s) => s.count > 0)
              .map((s) => (
                <div className="tile" key={s.stage}>
                  <div className="k">{s.stage}</div>
                  <div className="v">{fmtRM(s.total)}</div>
                  <div className="n">{fmtInt(s.count)} {s.count === 1 ? 'invoice' : 'invoices'}</div>
                </div>
              ))}
          </div>
        )}
        <OpenPipelineYearBlocks blocks={yearBlocks} />
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
          stageDaysFromViewInvoices
          emptyMessage={allOpenViews.length ? 'No open deals match these filters.' : 'No open pipeline right now.'}
        />
      </section>
    </div>
  )
}
