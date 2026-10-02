import { useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth/auth'
import { useBoard } from '@/lib/board/BoardProvider'
import { prospectSortKey } from '@/lib/board/filters'
import { activePeople, personName } from '@/lib/board/names'
import { parseProspectPaste } from '@/lib/board/prospectImport'
import { useSvgWidth } from '@/lib/board/useSvgWidth'
import { fmtInt } from '@/lib/format'
import { PROSPECT_STATUSES } from '@/lib/stages'

export function ProspectsPage() {
  const { data, filters, setFilters, patchProspect, importProspects, openCreate } = useBoard()
  const auth = useAuth()
  const canWrite = auth.status?.role === 'admin' || auth.status?.role === 'editor'
  const [headRef, W] = useSvgWidth()
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importSource, setImportSource] = useState('SSM convention list')
  const [importOwner, setImportOwner] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [addForm, setAddForm] = useState({
    company: '',
    contactName: '',
    designation: '',
    phone: '',
    email: '',
    status: 'white' as const,
    ownerId: '',
    source: '',
    notes: '',
  })

  const rows = useMemo(() => {
    if (!data) return []
    let r = data.prospects.slice()
    if (filters.pstatus !== 'all') r = r.filter((p) => p.status === filters.pstatus)
    return r.sort((a, b) => prospectSortKey(a.status) - prospectSortKey(b.status) || a.company.localeCompare(b.company))
  }, [data, filters.pstatus])

  if (!data) return <div className="empty">Loading prospects…</div>

  const ps = data.prospects
  const counts = PROSPECT_STATUSES.map((s) => ({ s, c: ps.filter((p) => p.status === s.key).length }))
  const moved = ps.filter((p) => p.opportunityId).length
  const people = activePeople(data)
  const defaultOwner = importOwner || people.find((p) => p.name === 'Hafsham')?.id || people[0]?.id || ''

  let x = 0
  const total = ps.length || 1

  const doImport = async () => {
    const items = parseProspectPaste(importText, importSource, defaultOwner || null)
    if (!items.length) {
      setImportMsg('No rows with a company name were found.')
      return
    }
    setImportMsg(`Importing ${items.length}…`)
    try {
      await importProspects(items)
      setImportText('')
      setImportMsg(`Imported ${items.length} prospects.`)
    } catch (e) {
      setImportMsg('Import stopped: ' + (e as Error).message)
    }
  }

  const addOne = async () => {
    if (!addForm.company.trim()) return
    await importProspects([
      {
        company: addForm.company.trim(),
        contactName: addForm.contactName,
        designation: addForm.designation,
        phone: addForm.phone,
        email: addForm.email,
        status: addForm.status,
        ownerId: addForm.ownerId || null,
        source: addForm.source,
        notes: addForm.notes,
      },
    ])
    setAddForm({ company: '', contactName: '', designation: '', phone: '', email: '', status: 'white', ownerId: '', source: '', notes: '' })
    setShowAdd(false)
  }

  return (
    <div className="stack">
      <section className="block" ref={headRef}>
        <h2>Prospects not yet in the pipeline</h2>
        <p className="lead">Companies we have contact details for but no opportunity yet, such as the SSM convention list. A prospect moves to the pipeline once a meeting is booked.</p>
        {ps.length ? (
          <svg viewBox={`0 0 ${W} 22`} width={W} role="img" aria-label="Prospects by status">
            {counts.map(({ s, c }) => {
              const w = (c / total) * W
              const rect = <rect key={s.key} x={x} y={0} width={w} height={22} fill={`var(--p-${s.key})`} stroke="var(--line)"><title>{s.label}: {c}</title></rect>
              x += w
              return rect
            })}
          </svg>
        ) : null}
        <div className="legend">
          {counts.map(({ s, c }) => (
            <span key={s.key}><b className={`dot ${s.key}`} />{s.label} <b className="mono">{fmtInt(c)}</b></span>
          ))}
          <span>Moved to pipeline <b className="mono">{fmtInt(moved)}</b></span>
          <span>Total <b className="mono">{fmtInt(ps.length)}</b></span>
        </div>
        <div className="toolbar" style={{ marginTop: 12 }}>
          <label>
            Status filter
            <select value={filters.pstatus} onChange={(e) => setFilters({ pstatus: e.target.value as typeof filters.pstatus })}>
              <option value="all">All</option>
              {PROSPECT_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
          {canWrite && (
            <>
              <button type="button" onClick={() => setShowAdd((v) => !v)}>Add prospect</button>
              <button type="button" onClick={() => setShowImport((v) => !v)}>Paste from spreadsheet</button>
            </>
          )}
        </div>
      </section>

      {canWrite && showAdd && (
        <section className="block">
          <h2>Add one prospect</h2>
          <div className="kv">
            <div className="field"><span>Company</span><input value={addForm.company} onChange={(e) => setAddForm({ ...addForm, company: e.target.value })} /></div>
            <div className="field"><span>Contact</span><input value={addForm.contactName} onChange={(e) => setAddForm({ ...addForm, contactName: e.target.value })} /></div>
            <div className="field"><span>Status</span>
              <select value={addForm.status} onChange={(e) => setAddForm({ ...addForm, status: e.target.value as typeof addForm.status })}>
                {PROSPECT_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div className="field"><span>Owner</span>
              <select value={addForm.ownerId} onChange={(e) => setAddForm({ ...addForm, ownerId: e.target.value })}>
                <option value="">Unassigned</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <button type="button" className="primary" onClick={() => void addOne()}>Save prospect</button>
        </section>
      )}

      {canWrite && showImport && (
        <section className="block">
          <h2>Paste from spreadsheet</h2>
          <p className="lead">Tab- or comma-separated rows. Headers are detected automatically.</p>
          <div className="kv">
            <div className="field"><span>Default source</span><input value={importSource} onChange={(e) => setImportSource(e.target.value)} /></div>
            <div className="field"><span>Default owner</span>
              <select value={defaultOwner} onChange={(e) => setImportOwner(e.target.value)}>
                {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                <option value="">Unassigned</option>
              </select>
            </div>
          </div>
          <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste rows here" />
          <p className="small muted">{importMsg}</p>
          <button type="button" className="primary" onClick={() => void doImport()}>Import</button>
        </section>
      )}

      <section className="block">
        <div className="scroll">
          <table data-testid="prospects-table">
            <thead>
              <tr>
                <th>Company</th><th>Contact</th><th>Designation</th><th>Phone</th><th>Email</th><th>Status</th><th>Owner</th><th>Source</th><th />
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((p) => (
                <tr key={p.id}>
                  <td><b>{p.company}</b></td>
                  <td>{p.contactName || '—'}</td>
                  <td>{p.designation || '—'}</td>
                  <td className="small num">{p.phone || '—'}</td>
                  <td className="small">{p.email || '—'}</td>
                  <td>
                    {canWrite ? (
                      <select
                        aria-label={`Status for ${p.company}`}
                        value={p.status}
                        onChange={(e) => void patchProspect(p.id, { status: e.target.value as typeof p.status })}
                      >
                        {PROSPECT_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    ) : (
                      <><span className={`dot ${p.status}`} /> {(PROSPECT_STATUSES.find((s) => s.key === p.status)?.label) || p.status}</>
                    )}
                  </td>
                  <td>{personName(data, p.ownerId)}</td>
                  <td className="small muted">{p.source || '—'}</td>
                  <td>
                    {p.opportunityId ? (
                      <span className="small muted">In pipeline</span>
                    ) : canWrite ? (
                      <button
                        type="button"
                        onClick={() =>
                          openCreate(
                            {
                              account: p.company,
                              item: 'New opportunity',
                              ownerId: p.ownerId,
                              segment: 'Mixed',
                            },
                            p.id,
                          )
                        }
                      >
                        Move to pipeline
                      </button>
                    ) : null}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={9}><div className="empty">{ps.length ? 'No prospects with this status.' : 'No prospects yet. Paste the SSM convention list from its spreadsheet to load it.'}</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
