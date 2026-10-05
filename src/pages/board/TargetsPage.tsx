import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth'
import { useBoard } from '@/lib/board/BoardProvider'
import { computeFinanceBooked, FINANCE_BOOKED_RULE } from '@/lib/board/financeBooked'
import { activePeople } from '@/lib/board/names'
import { fmtFull, fmtInt, fmtRM } from '@/lib/format'

export function TargetsPage() {
  const { data, saveTargets } = useBoard()
  const auth = useAuth()
  const isAdmin = auth.status?.role === 'admin'
  const [year, setYear] = useState(2026)
  const [target, setTarget] = useState('')
  const [com, setCom] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!data) return
    setYear(data.settings.year)
    setTarget(data.settings.target ? String(data.settings.target) : '')
    const m: Record<string, string> = {}
    for (const p of activePeople(data)) {
      const c = data.commitments.find((x) => x.personId === p.id && x.year === data.settings.year)
      m[p.id] = c ? String(c.amount) : ''
    }
    setCom(m)
  }, [data])

  if (!data) return <div className="empty">Loading targets…</div>

  const people = activePeople(data)
  const booked = computeFinanceBooked(data, year)

  const onSaveSettings = async () => {
    await saveTargets(
      {
        year,
        target: target === '' ? 0 : Number(target),
        financeRevenue: data.settings.financeRevenue,
        financeAsOf: data.settings.financeAsOf,
      },
      people.map((p) => ({
        personId: p.id,
        year,
        amount: com[p.id] === '' || com[p.id] == null ? null : Number(com[p.id]),
      })),
    )
  }

  return (
    <div className="stack">
      <section className="block">
        <h2>Company targets</h2>
        <p className="lead">Annual target for the overview target block. Finance revenue booked is calculated from the pipeline.</p>
        <div className="kv" id="setForm">
          <div className="field"><span>Target year</span><input type="number" disabled={!isAdmin} value={year} onChange={(e) => setYear(Number(e.target.value))} id="st_year" /></div>
          <div className="field"><span>Annual target (RM)</span><input type="number" min={0} step={1000} disabled={!isAdmin} value={target} onChange={(e) => setTarget(e.target.value)} id="st_target" /></div>
        </div>
        <div className="block" style={{ marginTop: 16, padding: 12, border: '1px solid var(--line)' }}>
          <p className="small" style={{ margin: '0 0 10px' }}>{FINANCE_BOOKED_RULE}</p>
          <p className="big" style={{ margin: '0 0 6px' }}>{fmtRM(booked.total)}</p>
          <p className="small muted">
            {fmtInt(booked.countLoaPo)} LOA/PO {booked.countLoaPo === 1 ? 'row' : 'rows'} ·{' '}
            {fmtInt(booked.countInvoicedPaid)} Invoiced or Paid {booked.countInvoicedPaid === 1 ? 'row' : 'rows'}
          </p>
        </div>
        {isAdmin && <button type="button" className="primary" id="st_save" style={{ marginTop: 12 }} onClick={() => void onSaveSettings()}>Save company figures</button>}
      </section>
      <section className="block">
        <h2>Commitments by person</h2>
        <p className="lead" id="comLead">Each person&apos;s committed revenue for {year}. Leave blank if they have no number.</p>
        <div className="scroll">
          <table id="comTable">
            <thead><tr><th>Person</th><th className="r">Committed {year} (RM)</th></tr></thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td className="r">
                    {isAdmin ? (
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        style={{ width: 160, textAlign: 'right' }}
                        aria-label={`Commitment for ${p.name}`}
                        value={com[p.id] ?? ''}
                        onChange={(e) => setCom({ ...com, [p.id]: e.target.value })}
                      />
                    ) : (
                      <span className="num">{com[p.id] ? fmtFull(Number(com[p.id])) : '—'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isAdmin && <button type="button" className="primary" id="com_save" style={{ marginTop: 12 }} onClick={() => void onSaveSettings()}>Save commitments</button>}
      </section>
    </div>
  )
}
