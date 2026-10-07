import {
  computeFunnel,
  computeInvoices,
  computeOwners,
  computeTargetBlock,
  computeTiles,
  type TargetBlockData,
} from '@/lib/board/calculations'
import { pieByOwnerFromViews, pieBySegmentFromViews, pieByStageFromViews } from '@/lib/board/overviewPies'
import { filterOpportunityViews } from '@/lib/board/filters'
import { useBoard } from '@/lib/board/BoardProvider'
import type { RefObject } from 'react'
import { personName } from '@/lib/board/names'
import { useSvgWidth } from '@/lib/board/useSvgWidth'
import { fmtFull, fmtInt, fmtMonth, fmtRM, num } from '@/lib/format'
import { ValuePieChart } from './ValuePieChart'
import { YearOnYearAccounts } from './YearOnYearAccounts'

function TargetChart({ data: t, W, innerRef }: { data: TargetBlockData; W: number; innerRef?: RefObject<HTMLElement> }) {
  const H = 86
  let x = 0
  const bars = t.segs.map((s) => {
    const w = (s.v / t.max) * W
    const rect = (
      <rect key={s.k} x={x} y={18} width={Math.max(0, w)} height={30} fill="var(--accent)" fillOpacity={s.o}>
        <title>{s.k}: {fmtRM(s.v)}</title>
      </rect>
    )
    x += w
    return rect
  })
  const tx = (t.target / t.max) * W
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => (
    <text key={f} x={f * W} y={H - 6} fill="var(--fg-3)" textAnchor={f === 0 ? 'start' : f === 1 ? 'end' : 'middle'} className="t-mono">
      {fmtRM(t.max * f)}
    </text>
  ))
  return (
    <section className="block" ref={innerRef}>
      <h2>{t.year} revenue against the {fmtRM(t.target)} target</h2>
      <p className="lead">
        Company-wide, all segments; filters do not apply here. {t.financeBookedRule} Open rows are {t.year} revenue-year rows not yet invoiced.
      </p>
      <div className="target-head">
        <div className="target-metric">
          <span className="lab">Finance revenue booked</span>
          <span className="big">{fmtRM(t.booked)}</span>
          <p className="small muted target-sub">
            {fmtInt(t.countLoaPo)} LOA/PO · {fmtInt(t.countInvoicedPaid)} Invoiced or Paid
          </p>
        </div>
        <div className="target-metric">
          <span className="lab">Gap to target</span>
          <span className="big">{fmtRM(t.gap)}</span>
        </div>
        <div className="target-metric">
          <span className="lab">LOA / PO in hand</span>
          <span className="big">{fmtRM(t.loa)}</span>
        </div>
        <div className="target-metric">
          <span className="lab">Gap after LOA / PO</span>
          <span className="big">{fmtRM(Math.max(0, t.gap - t.loa))}</span>
        </div>
        <div className="target-metric">
          <span className="lab">All open {t.year} pipeline</span>
          <span className="big">{fmtRM(t.loa + t.verbal + t.quoted + t.early)}</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} role="img" aria-label="Booked revenue and open pipeline against target">
        <rect x={0} y={18} width={W} height={30} fill="var(--surface-2)" />
        {bars}
        <line x1={tx} x2={tx} y1={8} y2={56} stroke="var(--fg)" strokeWidth={2} />
        <text x={tx} y={6} textAnchor={tx > W - 80 ? 'end' : 'middle'} fill="var(--fg)" fontWeight={600}>Target {fmtRM(t.target)}</text>
        {ticks}
      </svg>
      <div className="legend">
        {t.segs.map((s, i) => (
          <span key={s.k}>
            <i style={{ opacity: s.o }} />
            {s.k}{' '}
            <b className="mono">{i === 0 ? fmtRM(t.booked) : fmtRM(s.v)}</b>
          </span>
        ))}
      </div>
    </section>
  )
}

export function OverviewPageContent() {
  const { data, filters } = useBoard()
  const [targetRef, targetW] = useSvgWidth()
  const [pieRef, pieW] = useSvgWidth()
  const [invoiceRef, invoiceW] = useSvgWidth()

  if (!data) return <div className="empty">Loading overview…</div>

  const target = computeTargetBlock(data, filters)
  const tiles = computeTiles(data, filters)
  const funnel = computeFunnel(data, filters)
  const invoices = computeInvoices(data, filters)
  const owners = computeOwners(data, filters, (id) => personName(data, id))
  const yr = data.settings.year
  const pieViews = filterOpportunityViews(data, filters, { respectLostToggle: false })
  const pieColW = Math.max(240, Math.floor(pieW / 3) - 8)

  const invH = 230
  const y0 = 24
  const base = 190
  const bh = base - y0
  const band = invoiceW / invoices.months.length
  const barW = Math.min(70, band * 0.55)

  return (
    <div className="stack">
      <TargetChart data={target} W={targetW} innerRef={targetRef} />
      <div className="tiles">
        {tiles.map((x) => (
          <div key={x.k} className="tile">
            <div className="k">{x.k}</div>
            <div className="v">{x.v}</div>
            <div className="n">{x.n}</div>
          </div>
        ))}
      </div>
      <section className="block" ref={pieRef}>
        <h2>Value breakdown</h2>
        <p className="lead">Share of value in the filtered pipeline (raw totals, not weighted).</p>
        <div className="grid g3 pies">
          <ValuePieChart title="By stage" rows={pieByStageFromViews(pieViews, filters.year)} width={pieColW} />
          <ValuePieChart title="By segment" rows={pieBySegmentFromViews(pieViews, filters.year)} width={pieColW} />
          <ValuePieChart title="By owner" rows={pieByOwnerFromViews(data, pieViews, filters.year)} width={pieColW} />
        </div>
      </section>
      <YearOnYearAccounts data={data} filters={filters} />
      <section className="block">
        <h2>Where the money sits, by stage</h2>
        <p className="lead">Value and count at each stage for the current filters.</p>
        <div className="stage-funnel" role="img" aria-label="Pipeline value by stage">
          {funnel.rows.map((d) => {
            const pct = funnel.max > 0 ? (d.v / funnel.max) * 100 : 0
            const op = 0.22 + 0.78 * (d.i / (funnel.stages.length - 1))
            return (
              <div className="stage-funnel-row" key={d.s} title={`${d.s}: ${fmtInt(d.c)} opportunities, ${fmtRM(d.v)}`}>
                <span className="stage-funnel-name">{d.s}</span>
                <div className="stage-funnel-bar" aria-hidden>
                  <div
                    className="stage-funnel-fill"
                    style={{ width: `${Math.max(d.v ? 2 : 0, pct)}%`, opacity: op }}
                  />
                </div>
                <div className="stage-funnel-stats">
                  <span className="stage-funnel-amt num">{fmtRM(d.v)}</span>
                  <span className="stage-funnel-count num">
                    {fmtInt(d.c)} {d.c === 1 ? 'deal' : 'deals'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        <p className="small muted stage-funnel-foot">
          Lost: {fmtInt(funnel.lost.length)} {funnel.lost.length === 1 ? 'invoice' : 'invoices'},{' '}
          {fmtRM(funnel.lost.reduce((a, inv) => a + num(inv.amount), 0) || null)}.
        </p>
      </section>
      <section className="block" ref={invoiceRef}>
        <h2>Expected invoices, next six months</h2>
        <p className="lead">By expected invoice month. The lighter part is work for a later revenue year invoiced early, which helps cash but not this year&apos;s number.</p>
        <svg viewBox={`0 0 ${invoiceW} ${invH}`} width={invoiceW} role="img" aria-label="Expected invoices by month">
          <line x1={0} x2={invoiceW} y1={base} y2={base} stroke="var(--line)" />
          {invoices.rows.map((d, i) => {
            const cx = i * band + band / 2
            const ha = (d.a / invoices.max) * bh
            const hb = (d.b / invoices.max) * bh
            return (
              <g key={d.m}>
                <rect x={cx - barW / 2} y={base - ha} width={barW} height={ha} fill="var(--accent)">
                  <title>{fmtMonth(d.m)}: {fmtRM(d.a)} {invoices.yr} revenue</title>
                </rect>
                <rect x={cx - barW / 2} y={base - ha - hb} width={barW} height={hb} fill="var(--accent)" fillOpacity={0.32}>
                  <title>{fmtMonth(d.m)}: {fmtRM(d.b)} later-year work billed early</title>
                </rect>
                <text x={cx} y={base - ha - hb - 7} textAnchor="middle" fill="var(--fg)" className="t-mono">{d.a + d.b ? fmtRM(d.a + d.b) : ''}</text>
                <text x={cx} y={base + 18} textAnchor="middle" fill="var(--fg-2)">{fmtMonth(d.m)}</text>
                <text x={cx} y={base + 34} textAnchor="middle" fill="var(--fg-3)" fontSize={11}>{d.c ? `${fmtInt(d.c)} rows` : ''}</text>
              </g>
            )
          })}
          {invoices.rows.every((d) => !(d.a + d.b)) && (
            <text x={invoiceW / 2} y={base / 2 + 10} textAnchor="middle" fill="var(--fg-2)">No expected invoice months entered for these months yet</text>
          )}
        </svg>
        <div className="legend">
          <span><i />{yr} revenue</span>
          <span><i style={{ opacity: 0.32 }} />Later-year work</span>
        </div>
        <p className="small muted" style={{ margin: '8px 0 0' }}>
          {fmtInt(invoices.none)} open or invoiced {invoices.none === 1 ? 'row has' : 'rows have'} no expected invoice month.
        </p>
      </section>
      <section className="block">
        <h2>By owner</h2>
        <p className="lead">Each person&apos;s committed {yr} number (set under Targets) beside what the board holds for them. Segment, year and search filters apply.</p>
        {owners.length ? (
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Owner</th>
                  <th className="r">Committed {yr}</th>
                  <th className="r">On board for {yr}</th>
                  <th className="r">LOA / won {yr}</th>
                  <th className="r">Open deals</th>
                  <th className="r">Open value</th>
                  <th className="r">Overdue next steps</th>
                  <th className="r">No next step</th>
                </tr>
              </thead>
              <tbody>
                {owners.map((x) => (
                  <tr key={x.n}>
                    <td>{x.n}</td>
                    <td className="r num">{x.com != null ? fmtFull(x.com) : '—'}</td>
                    <td className="r num">{fmtFull(x.tr)}</td>
                    <td className="r num">{fmtFull(x.sec)}</td>
                    <td className="r num">{fmtInt(x.oc)}</td>
                    <td className="r num">{fmtFull(x.ov)}</td>
                    <td className={`r num${x.od ? ' overdue' : ''}`}>{fmtInt(x.od)}</td>
                    <td className="r num">{fmtInt(x.nn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">No opportunities yet.</div>
        )}
      </section>
    </div>
  )
}
