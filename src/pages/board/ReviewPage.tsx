import { useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth/auth'
import { useBoard } from '@/lib/board/BoardProvider'
import { lastReviewAt } from '@/lib/board/calculations'
import { filterOpportunities, isOverdue } from '@/lib/board/filters'
import { ownersLabel } from '@/lib/board/owners'
import { profileName } from '@/lib/board/names'
import { TECH_BOARD_URL } from '@/lib/board/types'
import { daysSince, fmtDate, fmtInt, fmtRM, todayISO } from '@/lib/format'
import { isOpenStage, isWonStage } from '@/lib/stages'
import type { Opportunity } from '@/lib/board/types'

export function ReviewPage() {
  const { data, filters, openEdit, markReview } = useBoard()
  const auth = useAuth()
  const canWrite = auth.status?.role === 'admin' || auth.status?.role === 'editor'
  const [busy, setBusy] = useState(false)

  const lists = useMemo(() => {
    if (!data) return null
    const lr = lastReviewAt(data)
    const r = filterOpportunities(data, filters, { respectStageFilter: false })
    const ids = new Set(r.map((o) => o.id))
    const after = (iso: string) => lr && iso && iso > lr
    const added = r.filter((o) => after(o.createdAt))
    const moved = data.history
      .filter((h) => h.from && after(h.at) && ids.has(h.oppId))
      .map((h) => ({ o: r.find((x) => x.id === h.oppId)!, e: h }))
      .filter((m) => m.o)
      .sort((a, b) => (a.e.at < b.e.at ? 1 : -1))
    const stale = r.filter((o) => isOpenStage(o.stage) && lr && (!o.updatedAt || o.updatedAt <= lr))
    const od = r.filter((o) => isOverdue(o)).sort((a, b) => (a.nextDate! < b.nextDate! ? -1 : 1))
    const t = todayISO()
    const lim = new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10)
    const soon = r
      .filter((o) => (o.stage === 'LOA/PO' || o.stage === 'Verbal yes' || isWonStage(o.stage)) && o.startDate && o.startDate >= t && o.startDate <= lim)
      .sort((a, b) => (a.startDate! < b.startDate! ? -1 : 1))
    const noStart = r.filter((o) => (o.stage === 'LOA/PO' || o.stage === 'Verbal yes') && !o.startDate)
    return { lr, od, moved, added, stale, soon, noStart, lim }
  }, [data, filters])

  if (!data || !lists) return <div className="empty">Loading review…</div>

  const item = (o: Opportunity, extra?: React.ReactNode) => (
    <li key={o.id}>
      <span className="what">
        <button type="button" className="linkbtn" onClick={() => openEdit(o)}>{o.account}</button> · {o.item}
      </span>
      <span className="meta">{ownersLabel(data, o.ownerIds)} · {fmtRM(o.value)}{extra ? <> · {extra}</> : null}</span>
    </li>
  )
  const list = (arr: Opportunity[], fn: (o: Opportunity) => React.ReactNode, msg: string) =>
    arr.length ? <ul className="list">{arr.map(fn)}</ul> : <div className="empty">{msg}</div>

  return (
    <div className="stack">
      <section className="block">
        <div className="toolbar">
          <div style={{ flex: 1, minWidth: 240 }}>
            <h2>Pipeline review</h2>
            <p className="lead" style={{ margin: 0 }}>
              Everything that changed since the last team review{lists.lr ? <> on <b>{fmtDate(lists.lr)}</b></> : ''}. Work through these lists in the meeting, then mark the review done.
            </p>
          </div>
          {canWrite && (
            <button
              type="button"
              className="primary"
              disabled={busy}
              onClick={() => {
                setBusy(true)
                void markReview().finally(() => setBusy(false))
              }}
            >
              Mark review done now
            </button>
          )}
        </div>
      </section>
      <div className="grid g2">
        <section className="block">
          <h2>Overdue next steps ({fmtInt(lists.od.length)})</h2>
          <p className="lead">Open rows past their next-step date, oldest first.</p>
          {list(
            lists.od,
            (o) => item(o, <><span className="overdue">{fmtInt(daysSince(o.nextDate))} days overdue</span> · {o.nextStep || ''}</>),
            'Nothing overdue.',
          )}
        </section>
        <section className="block">
          <h2>Moved stage since the review ({fmtInt(lists.moved.length)})</h2>
          <p className="lead">Every stage change, logged by the database.</p>
          {lists.moved.length ? (
            <ul className="list">
              {lists.moved.map((m) =>
                item(
                  m.o,
                  <>
                    {m.e.from} → {m.e.to} on {fmtDate(m.e.at)}
                    {m.e.by ? ` by ${profileName(data, m.e.by)}` : ''}
                  </>,
                ),
              )}
            </ul>
          ) : (
            <div className="empty">No stage changes since the last review.</div>
          )}
        </section>
        <section className="block">
          <h2>Added since the review ({fmtInt(lists.added.length)})</h2>
          <p className="lead">New opportunities logged after the last review.</p>
          {list(lists.added, (o) => item(o, `${o.stage} · added ${fmtDate(o.createdAt)}`), 'Nothing new has been added.')}
        </section>
        <section className="block">
          <h2>Open and not updated since the review ({fmtInt(lists.stale.length)})</h2>
          <p className="lead">Open rows no one has touched since the last review.</p>
          {list(lists.stale, (o) => item(o, `${o.stage} · last updated ${fmtDate(o.updatedAt)}`), 'Every open row has been updated.')}
        </section>
        <section className="block">
          <h2>Starting in the next 60 days ({fmtInt(lists.soon.length)})</h2>
          <p className="lead">
            Verbal yes, LOA or won work with a delivery start date before {fmtDate(lists.lim)}. Delivery plans live on the{' '}
            <a href={TECH_BOARD_URL} target="_blank" rel="noopener noreferrer">CDS Tech Projects Board</a>.
          </p>
          {list(lists.soon, (o) => item(o, `starts ${fmtDate(o.startDate)}`), 'No dated starts in the next 60 days.')}
        </section>
        <section className="block">
          <h2>Verbal yes or LOA with no start date ({fmtInt(lists.noStart.length)})</h2>
          <p className="lead">Delivery cannot plan resources for these until a start date is set.</p>
          {list(lists.noStart, (o) => item(o, o.stage), 'Every confirmed row has a start date.')}
        </section>
      </div>
    </div>
  )
}
