import type { OpenPipelineYearBlock } from '@/lib/board/openPipeline'
import { fmtInt, fmtRM } from '@/lib/format'

type Props = {
  blocks: OpenPipelineYearBlock[]
}

export function OpenPipelineYearBlocks({ blocks }: Props) {
  const visible = blocks.filter((b) => b.summary.invoiceCount > 0)
  if (!visible.length) return null

  return (
    <div className="stack" style={{ gap: 16, marginBottom: 16 }}>
      {visible.map(({ year, summary }) => (
        <section key={year} className="block" style={{ padding: 12 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '1.05rem' }}>{year}</h3>
          <div className="tiles">
            <div className="tile">
              <div className="k">Open pipeline {year}</div>
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
        </section>
      ))}
    </div>
  )
}
