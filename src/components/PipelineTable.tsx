import { useBoard } from '@/lib/board/BoardProvider'
import { isOverdue } from '@/lib/board/filters'
import { formatDealStageLabel, primaryStageSince, primaryStageSinceInvoices, sumInvoiceAmounts } from '@/lib/board/invoices'
import type { FilteredDealView } from '@/lib/board/invoices'
import { personName, profileName } from '@/lib/board/names'
import { ownersLabel } from '@/lib/board/owners'
import type { Opportunity } from '@/lib/board/types'
import { daysSince, fmtDate, fmtFull, fmtInt, fmtMonth } from '@/lib/format'
import { STAGES, stageIndex, type Stage } from '@/lib/stages'

export const PIPELINE_TABLE_COLS = [
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

export type PipelineSortKey = (typeof PIPELINE_TABLE_COLS)[number]['k']

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
  k: PipelineSortKey,
  data: NonNullable<ReturnType<typeof useBoard>['data']>,
  viewTotal: number | null,
  viewInvoices: Opportunity['invoices'],
  stageDaysFromView: boolean,
) {
  if (k === 'days') {
    const since = stageDaysFromView ? primaryStageSinceInvoices(viewInvoices) : primaryStageSince(o)
    return daysSince(since) ?? -1
  }
  if (k === 'stage') return stageIndex(viewInvoices[0]?.stage ?? 'Lead')
  if (k === 'value') return viewTotal == null ? -1 : Number(viewTotal)
  if (k === 'owner') return ownersLabel(data, o.ownerIds).toLowerCase()
  if (k === 'revenueYear') return yearLabel(viewInvoices)
  if (k === 'invoiceMonth') return monthLabel(viewInvoices)
  const v = o[k as keyof Opportunity]
  return v == null ? '' : String(v).toLowerCase()
}

export type PipelineTableProps = {
  rows: Opportunity[]
  viewById: Map<string, FilteredDealView>
  sort: { key: PipelineSortKey; dir: 1 | -1 }
  onSort: (sort: { key: PipelineSortKey; dir: 1 | -1 }) => void
  total: number | null
  canWrite: boolean
  onRowClick: (o: Opportunity) => void
  onStageChange: (id: string, stage: Stage) => Promise<void>
  setToast: (msg: string | null) => void
  emptyMessage: string
  /** When true, “days in stage” uses the invoice slice shown on the row (open pipeline). */
  stageDaysFromViewInvoices?: boolean
}

export function PipelineTable({
  rows,
  viewById,
  sort,
  onSort,
  total,
  canWrite,
  onRowClick,
  onStageChange,
  setToast,
  emptyMessage,
  stageDaysFromViewInvoices = false,
}: PipelineTableProps) {
  const { data } = useBoard()
  if (!data) return null

  const pn = (id: string | null) => personName(data, id)
  const owners = (o: Opportunity) => ownersLabel(data, o.ownerIds)

  return (
    <div className="scroll">
      <table>
        <thead>
          <tr>
            {PIPELINE_TABLE_COLS.map((c) => (
              <th key={c.k} className={'r' in c && c.r ? 'r' : undefined}>
                <button
                  type="button"
                  className="thsort"
                  onClick={() => onSort({ key: c.k, dir: sort.key === c.k && sort.dir > 0 ? -1 : 1 })}
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
              <td colSpan={PIPELINE_TABLE_COLS.length}>
                <div className="empty">{emptyMessage}</div>
              </td>
            </tr>
          ) : (
            rows.map((o) => {
              const v = viewById.get(o.id)
              const invs = v?.invoices ?? o.invoices
              const stageLabel = formatDealStageLabel(invs)
              const singleInv = o.invoices.length === 1
              const since = stageDaysFromViewInvoices ? primaryStageSinceInvoices(invs) : primaryStageSince(o)
              const d = daysSince(since)
              return (
                <tr
                  key={o.id}
                  className="click"
                  tabIndex={0}
                  data-testid={`opp-row-${o.id}`}
                  onClick={() => onRowClick(o)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onRowClick(o)
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
                          void onStageChange(o.id, e.target.value as Stage).catch((err: Error) => setToast(err.message))
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
              <td colSpan={PIPELINE_TABLE_COLS.length - 6} />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

export function sortPipelineRows(
  rows: Opportunity[],
  sort: { key: PipelineSortKey; dir: 1 | -1 },
  data: NonNullable<ReturnType<typeof useBoard>['data']>,
  viewById: Map<string, FilteredDealView>,
  stageDaysFromViewInvoices = false,
): Opportunity[] {
  const { key, dir } = sort
  return [...rows].sort((a, b) => {
    const va = viewById.get(a.id)
    const vb = viewById.get(b.id)
    const x = sortVal(a, key, data, va?.total ?? null, va?.invoices ?? a.invoices, stageDaysFromViewInvoices)
    const y = sortVal(b, key, data, vb?.total ?? null, vb?.invoices ?? b.invoices, stageDaysFromViewInvoices)
    return x < y ? -dir : x > y ? dir : 0
  })
}
