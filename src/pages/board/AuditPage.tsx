import { Fragment, useEffect, useMemo, useState } from 'react'
import { useBoard } from '@/lib/board/BoardProvider'
import { profileName } from '@/lib/board/names'
import { fmtDate, fmtTime } from '@/lib/format'

export function AuditPage() {
  const { data, auditLog } = useBoard()
  const [tableFilter, setTableFilter] = useState('all')
  const [personFilter, setPersonFilter] = useState('all')
  const [openId, setOpenId] = useState<number | null>(null)

  useEffect(() => {
    void auditLog.refetch()
  }, [auditLog])

  const rows = useMemo(() => {
    const list = auditLog.data ?? []
    return list.filter((r) => {
      if (tableFilter !== 'all' && r.tableName !== tableFilter) return false
      if (personFilter !== 'all' && r.actor !== personFilter) return false
      return true
    })
  }, [auditLog.data, tableFilter, personFilter])

  if (!data) return <div className="empty">Loading audit log…</div>

  const tables = [...new Set((auditLog.data ?? []).map((r) => r.tableName))].sort()
  const actors = [...new Set((auditLog.data ?? []).map((r) => r.actor).filter(Boolean))] as string[]

  return (
    <section className="block">
      <h2>Audit log</h2>
      <p className="lead">Database changes, newest first. Admins only.</p>
      <div className="toolbar">
        <label>
          Table
          <select value={tableFilter} onChange={(e) => setTableFilter(e.target.value)}>
            <option value="all">All</option>
            {tables.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label>
          Person
          <select value={personFilter} onChange={(e) => setPersonFilter(e.target.value)}>
            <option value="all">All</option>
            {actors.map((a) => <option key={a} value={a}>{profileName(data, a)}</option>)}
          </select>
        </label>
      </div>
      <div className="scroll">
        <table data-testid="audit-table">
          <thead>
            <tr><th>When</th><th>Table</th><th>Action</th><th>Row</th><th>Who</th><th /></tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((r) => (
              <Fragment key={r.id}>
                <tr>
                  <td className="small">{fmtDate(r.at)} {fmtTime(r.at)}</td>
                  <td>{r.tableName}</td>
                  <td>{r.action}</td>
                  <td className="small mono">{r.rowId || '—'}</td>
                  <td>{profileName(data, r.actor)}</td>
                  <td><button type="button" className="ghost" onClick={() => setOpenId(openId === r.id ? null : r.id)}>{openId === r.id ? 'Hide' : 'Details'}</button></td>
                </tr>
                {openId === r.id && (
                  <tr key={`${r.id}-detail`}>
                    <td colSpan={6}>
                      <pre className="small mono" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                        {JSON.stringify({ before: r.oldData, after: r.newData }, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            )) : (
              <tr><td colSpan={6}><div className="empty">No audit entries yet.</div></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
