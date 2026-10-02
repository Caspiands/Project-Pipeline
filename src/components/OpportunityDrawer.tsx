import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth/auth'
import { useBoard } from '@/lib/board/BoardProvider'
import { activePeople, profileName } from '@/lib/board/names'
import { fmtDate } from '@/lib/format'
import { SEGMENTS, STAGES } from '@/lib/stages'
import type { Opportunity, OpportunityInput } from '@/lib/board/types'

export function OpportunityDrawer() {
  const board = useBoard()
  const auth = useAuth()
  const role = auth.status?.role
  const canWrite = role === 'admin' || role === 'editor'
  const { drawer, closeDrawer, data, saveOpp, deleteOpp } = board
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<(OpportunityInput & Partial<Pick<Opportunity, 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>>) | null>(null)

  useEffect(() => {
    if (drawer?.opp) {
      setForm({ ...drawer.opp })
      setConfirmDelete(false)
    } else {
      setForm(null)
    }
  }, [drawer])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawer) closeDrawer()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawer, closeDrawer])

  const hist = useMemo(() => {
    if (!data || !form?.id) return []
    return data.history.filter((h) => h.oppId === form.id).sort((a, b) => (a.at < b.at ? -1 : 1))
  }, [data, form?.id])

  if (!drawer || !form || !data) return null

  const people = activePeople(data)
  const ownerOpts = (
    <>
      {people.map((p) => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
      <option value="">Unassigned</option>
    </>
  )

  const set = <K extends keyof OpportunityInput>(k: K, v: OpportunityInput[K]) => setForm((f) => (f ? { ...f, [k]: v } : f))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canWrite) return
    if (!form.account.trim() || !form.item.trim()) {
      board.setToast('Account and item are required')
      return
    }
    if (form.link && !/^https?:\/\//i.test(form.link)) {
      board.setToast('Links must start with https://')
      return
    }
    setSaving(true)
    try {
      await saveOpp(form)
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async () => {
    if (!form.id || !confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setSaving(true)
    try {
      await deleteOpp(form.id)
    } finally {
      setSaving(false)
    }
  }

  const title = drawer.mode === 'edit' ? `${form.account} · ${form.item}` : 'New opportunity'

  return (
    <>
      <div className="scrim" onClick={closeDrawer} aria-hidden />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <header>
          <h3 id="drawer-title">{title}</h3>
          <button type="button" className="ghost" onClick={closeDrawer}>Close</button>
        </header>
        <form id="oppForm" onSubmit={(e) => void onSubmit(e)}>
          <div className="field full">
            <span>Account</span>
            <input value={form.account} disabled={!canWrite} onChange={(e) => set('account', e.target.value)} id="o_account" required />
          </div>
          <div className="field full">
            <span>Item / opportunity</span>
            <input value={form.item} disabled={!canWrite} onChange={(e) => set('item', e.target.value)} required />
          </div>
          <div className="field">
            <span>Segment</span>
            <select value={form.segment} disabled={!canWrite} onChange={(e) => set('segment', e.target.value as OpportunityInput['segment'])}>
              {SEGMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <span>Owner</span>
            <select value={form.ownerId || ''} disabled={!canWrite} onChange={(e) => set('ownerId', e.target.value || null)}>
              {ownerOpts}
            </select>
          </div>
          <div className="field">
            <span>Stage</span>
            <select value={form.stage} disabled={!canWrite} onChange={(e) => set('stage', e.target.value as OpportunityInput['stage'])}>
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <span>Value (RM)</span>
            <input type="number" min={0} step={1000} disabled={!canWrite} value={form.value ?? ''} onChange={(e) => set('value', e.target.value === '' ? null : Number(e.target.value))} />
          </div>
          <div className="field">
            <span>Revenue year</span>
            <input type="number" disabled={!canWrite} value={form.revenueYear} onChange={(e) => set('revenueYear', Number(e.target.value))} />
          </div>
          <div className="field">
            <span>Quote no</span>
            <input value={form.quoteNo} disabled={!canWrite} onChange={(e) => set('quoteNo', e.target.value)} />
          </div>
          <div className="field">
            <span>Quote sent</span>
            <input type="date" disabled={!canWrite} value={form.quoteDate || ''} onChange={(e) => set('quoteDate', e.target.value || null)} />
          </div>
          <div className="field">
            <span>LOA / PO date</span>
            <input type="date" disabled={!canWrite} value={form.loaDate || ''} onChange={(e) => set('loaDate', e.target.value || null)} />
          </div>
          <div className="field">
            <span>Expected invoice month</span>
            <input type="month" disabled={!canWrite} value={form.invoiceMonth || ''} onChange={(e) => set('invoiceMonth', e.target.value || null)} />
          </div>
          <div className="field">
            <span>Delivery start</span>
            <input type="date" disabled={!canWrite} value={form.startDate || ''} onChange={(e) => set('startDate', e.target.value || null)} />
          </div>
          <div className="field">
            <span>Probability (%)</span>
            <input type="number" min={0} max={100} disabled={!canWrite} value={form.probability ?? ''} onChange={(e) => set('probability', e.target.value === '' ? null : Number(e.target.value))} />
          </div>
          <div className="field full">
            <span>Next step</span>
            <input value={form.nextStep} disabled={!canWrite} onChange={(e) => set('nextStep', e.target.value)} />
          </div>
          <div className="field">
            <span>Next step owner</span>
            <select value={form.nextOwnerId || ''} disabled={!canWrite} onChange={(e) => set('nextOwnerId', e.target.value || null)}>
              {ownerOpts}
            </select>
          </div>
          <div className="field">
            <span>Next step date</span>
            <input type="date" disabled={!canWrite} value={form.nextDate || ''} onChange={(e) => set('nextDate', e.target.value || null)} />
          </div>
          <div className="field full">
            <span>Link (https://)</span>
            <input value={form.link} disabled={!canWrite} onChange={(e) => set('link', e.target.value)} />
          </div>
          <div className="field full">
            <span>Notes</span>
            <textarea value={form.notes} disabled={!canWrite} onChange={(e) => set('notes', e.target.value)} />
          </div>
          {drawer.mode === 'edit' && (
            <div className="full small muted" id="o_meta">
              <div>
                Created {fmtDate(form.createdAt)}{form.createdBy ? ` by ${profileName(data, form.createdBy)}` : ''} · last updated{' '}
                {fmtDate(form.updatedAt)}{form.updatedBy ? ` by ${profileName(data, form.updatedBy)}` : ''}
                {form.link ? (
                  <>
                    {' '}
                    ·{' '}
                    <a href={form.link} target="_blank" rel="noopener noreferrer">open link</a>
                  </>
                ) : null}
              </div>
              {hist.length ? (
                <div style={{ marginTop: 6 }}>
                  Stage history: {hist.map((h) => `${h.to} (${fmtDate(h.at)})`).join(' → ')}
                </div>
              ) : null}
            </div>
          )}
        </form>
        <footer>
          {canWrite && (
            <>
              <button type="submit" form="oppForm" className="primary" disabled={saving} id="o_save">
                Save
              </button>
              {drawer.mode === 'edit' && form.id && (
                <button type="button" className="danger" disabled={saving} onClick={() => void onDelete()} id="o_delete">
                  {confirmDelete ? 'Confirm remove' : 'Remove from board'}
                </button>
              )}
            </>
          )}
        </footer>
      </aside>
    </>
  )
}
