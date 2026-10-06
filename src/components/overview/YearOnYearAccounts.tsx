import { computeYoyByAccount, type YoyAccountRow } from '@/lib/board/yoyAccounts'
import { useSvgWidth } from '@/lib/board/useSvgWidth'
import type { BoardData, BoardFilters } from '@/lib/board/types'
import { fmtInt, fmtRM } from '@/lib/format'

function YoYBars({ rows, width }: { rows: YoyAccountRow[]; width: number }) {
  const shown = rows.filter((r) => r.count2025 || r.count2026)
  if (!shown.length) return null
  const max = Math.max(
    1,
    ...shown.flatMap((r) => [r.total2025 ?? 0, r.total2026 ?? 0]),
  )
  const rowH = 28
  const labelW = Math.min(140, width * 0.32)
  const barArea = width - labelW - 16
  const barW = Math.max(8, (barArea - 12) / 2)
  const h = shown.length * rowH + 8
  let y = 4
  return (
    <svg viewBox={`0 0 ${width} ${h}`} width={width} role="img" aria-label="2025 and 2026 value by account">
      {shown.map((r) => {
        const rowY = y
        y += rowH
        const w25 = r.total2025 != null ? (r.total2025 / max) * barW : 0
        const w26 = r.total2026 != null ? (r.total2026 / max) * barW : 0
        return (
          <g key={r.account}>
            <text x={0} y={rowY + 16} fill="var(--fg)" fontSize={12}>
              {r.account.length > 18 ? r.account.slice(0, 17) + '…' : r.account}
            </text>
            <rect x={labelW} y={rowY + 4} width={barW} height={10} fill="var(--surface-2)" />
            <rect x={labelW} y={rowY + 4} width={w25} height={10} fill="var(--accent)" fillOpacity={0.45}>
              <title>{`2025: ${fmtRM(r.total2025)}`}</title>
            </rect>
            <rect x={labelW + barW + 8} y={rowY + 4} width={barW} height={10} fill="var(--surface-2)" />
            <rect x={labelW + barW + 8} y={rowY + 4} width={w26} height={10} fill="var(--accent)">
              <title>{`2026: ${fmtRM(r.total2026)}`}</title>
            </rect>
          </g>
        )
      })}
    </svg>
  )
}

export function YearOnYearAccounts({ data, filters }: { data: BoardData; filters: BoardFilters }) {
  const [ref, w] = useSvgWidth()
  const { rows, totals } = computeYoyByAccount(data, filters)
  const hasRows = rows.some((r) => r.count2025 || r.count2026)

  return (
    <section className="block" ref={ref}>
      <h2>Year on year by account</h2>
      <p className="lead">
        Revenue-year 2025 and 2026 side by side. Segment, owner, account, and search follow the filters above; invoice and quote filters apply within each year. The revenue-year filter does not apply here.
      </p>
      {!hasRows ? (
        <p className="small muted">Nothing to compare for these filters.</p>
      ) : (
        <>
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Account</th>
                  <th className="r">2025 deals</th>
                  <th className="r">2025 RM</th>
                  <th className="r">2026 deals</th>
                  <th className="r">2026 RM</th>
                  <th className="r">Change (2026 − 2025)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) =>
                  r.count2025 || r.count2026 ? (
                    <tr key={r.account}>
                      <td>{r.account}</td>
                      <td className="r num">{fmtInt(r.count2025)}</td>
                      <td className="r num">{fmtRM(r.total2025)}</td>
                      <td className="r num">{fmtInt(r.count2026)}</td>
                      <td className="r num">{fmtRM(r.total2026)}</td>
                      <td className="r num">{r.diff != null ? fmtRM(r.diff) : '—'}</td>
                    </tr>
                  ) : null,
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td><b>{totals.account}</b></td>
                  <td className="r num"><b>{fmtInt(totals.count2025)}</b></td>
                  <td className="r num"><b>{fmtRM(totals.total2025)}</b></td>
                  <td className="r num"><b>{fmtInt(totals.count2026)}</b></td>
                  <td className="r num"><b>{fmtRM(totals.total2026)}</b></td>
                  <td className="r num"><b>{totals.diff != null ? fmtRM(totals.diff) : '—'}</b></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="small muted" style={{ marginTop: 12 }}>Paired bars: 2025 (lighter) and 2026 (solid), by account.</p>
          <YoYBars rows={rows} width={w} />
        </>
      )}
    </section>
  )
}
