import { fmtInt, fmtRM } from '@/lib/format'
import type { PieSliceRow } from '@/lib/board/overviewPies'

const SLICE_FILL = [
  'var(--accent)',
  'color-mix(in srgb, var(--accent) 72%, var(--fg))',
  'color-mix(in srgb, var(--accent) 48%, var(--surface-2))',
  'color-mix(in srgb, var(--accent) 32%, var(--surface-2))',
  'var(--fg-3)',
  'var(--line)',
]

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const x0 = cx + r * Math.cos(a0)
  const y0 = cy + r * Math.sin(a0)
  const x1 = cx + r * Math.cos(a1)
  const y1 = cy + r * Math.sin(a1)
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`
}

export function ValuePieChart({ title, rows, width }: { title: string; rows: PieSliceRow[]; width: number }) {
  const count = rows.reduce((a, r) => a + r.count, 0)
  if (!count) {
    return (
      <section className="block pie-block">
        <h3>{title}</h3>
        <p className="small muted">Nothing to chart</p>
      </section>
    )
  }

  const total = rows.reduce((a, r) => a + r.value, 0)
  const size = Math.min(Math.max(200, width), 320)
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.38
  let angle = -Math.PI / 2
  const slices =
    total > 0
      ? rows
          .filter((row) => row.value > 0)
          .map((row, i) => {
            const frac = row.value / total
            const a0 = angle
            const a1 = angle + frac * Math.PI * 2
            angle = a1
            return {
              row,
              d: arcPath(cx, cy, r, a0, a1),
              fill: SLICE_FILL[i % SLICE_FILL.length],
            }
          })
      : []

  return (
    <section className="block pie-block">
      <h3>{title}</h3>
      {slices.length ? (
        <svg viewBox={`0 0 ${size} ${size}`} width={size} role="img" aria-label={title}>
          {slices.map(({ row, d, fill }) => (
            <path key={row.label} d={d} fill={fill} stroke="var(--bg)" strokeWidth={1.5}>
              <title>{`${row.label}: ${fmtRM(row.value)} (${fmtInt(row.count)})`}</title>
            </path>
          ))}
        </svg>
      ) : (
        <p className="small muted">No values to show in the chart; see the table below.</p>
      )}
      <div className="scroll">
        <table className="small">
          <thead>
            <tr>
              <th>Name</th>
              <th className="r">Value</th>
              <th className="r">Count</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td className="r num">{fmtRM(row.value)}</td>
                <td className="r num">{fmtInt(row.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
