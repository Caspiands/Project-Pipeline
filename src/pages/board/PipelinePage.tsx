import { useMemo, useState } from 'react'
import { useBoard } from '@/lib/board/BoardProvider'
import { pipelineRows } from '@/lib/board/calculations'
import { isOverdue } from '@/lib/board/filters'
import { personName, profileName } from '@/lib/board/names'
import { downloadCsv, opportunitiesToCsv, pipelineTotal } from '@/lib/board/pipelineCsv'
import { daysSince, fmtDate, fmtFull, fmtMonth } from '@/lib/format'
import { stageIndex } from '@/lib/stages'
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
  if (k === 'owner') return personName(data, o.ownerId).toLowerCase()
  const v = o[k as keyof Opportunity]
  return v == null ? '' : String(v).toLowerCase()
}

export function PipelinePage() {
  const board = useBoard()
  const { data, filters, openEdit, openCreate } = board
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'account', dir: 1 })

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

  if (!data) {
    return <div className="empty">Loading pipeline…</div>
  }

  const total = pipelineTotal(rows)
  const pn = (id: string | null) => personName(data, id)

  const exportCsv = () => {
    const csv = opportunitiesToCsv(rows, pn)
    downloadCsv(`cds-pipeline-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  }

  return (
    <section className="block">
      <div className="toolbar">
        <h2 style={{ margin: 0, flex: 1 }}>Pipeline</h2>
        <button type="button" onClick={exportCsv}>Export to CSV</button>
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
                    <td>{pn(o.ownerId)}</td>
                    <td>
                      <span className={`pill s${stageIndex(o.stage)}${o.stage === 'Lost' ? ' lost' : ''}`}>{o.stage}</span>
                    </td>
                    <td className="r num">{fmtFull(o.value)}</td>
                    <td className="r num">{o.revenueYear || '—'}</td>
                    <td className="num">{fmtDate(o.quoteDate)}</td>
                    <td className="r num">{d == null ? '—' : d}</td>
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
                <td colSpan={5} className="small muted">{rows.length} rows</td>
                <td className="r num"><b>{fmtFull(total)}</b></td>
                <td colSpan={COLS.length - 6} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <button type="button" className="sr-only" onClick={() => openCreate()}>Add</button>
    </section>
  )
}
