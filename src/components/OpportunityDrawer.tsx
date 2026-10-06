import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth/auth'
import { useBoard } from '@/lib/board/BoardProvider'
import { activePeople, profileName } from '@/lib/board/names'
import { dominantOwnerIdsForAccount, uniqueAccountsSorted } from '@/lib/board/owners'
import { sumInvoiceAmounts } from '@/lib/board/invoices'
import { RmAmountInput } from '@/components/RmAmountInput'
import { fmtDate, fmtRM, fmtRMCents } from '@/lib/format'
import { SEGMENTS, STAGES } from '@/lib/stages'
import type { Opportunity, OpportunityInput, OpportunityInvoiceInput } from '@/lib/board/types'

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
      const opp = drawer.opp
      const ownerIds = opp.ownerIds ?? (opp.ownerId ? [opp.ownerId] : [])
      setForm({ ...opp, ownerIds })
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

  const accountOptions = useMemo(() => (data ? uniqueAccountsSorted(data) : []), [data])

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

  const toggleOwner = (personId: string, on: boolean) => {
    setForm((f) => {
      if (!f) return f
      const cur = f.ownerIds ?? []
      const next = on ? [...cur, personId] : cur.filter((id) => id !== personId)
      const sorted = [...next].sort((a, b) => {
        const na = people.find((p) => p.id === a)?.name ?? ''
        const nb = people.find((p) => p.id === b)?.name ?? ''
        return na.localeCompare(nb, 'en-GB')
      })
      return { ...f, ownerIds: sorted, ownerId: sorted[0] ?? null }
    })
  }

  const onAccountChange = (account: string) => {
    set('account', account)
    const trimmed = account.trim()
    if (trimmed && accountOptions.includes(trimmed)) {
      const ids = dominantOwnerIdsForAccount(data, trimmed)
      if (ids.length) {
        setForm((f) => (f ? { ...f, account, ownerIds: ids, ownerId: ids[0] ?? null } : f))
      }
    }
  }

  const setInvoice = (index: number, patch: Partial<OpportunityInvoiceInput> & { stage?: OpportunityInvoiceInput['stage'] }) => {
    setForm((f) => {
      if (!f) return f
      const invoices = [...f.invoices]
      invoices[index] = { ...invoices[index], ...patch }
      return { ...f, invoices }
    })
  }

  const addInvoice = () => {
    const year = data.settings.year
    setForm((f) =>
      f
        ? {
            ...f,
            invoices: [
              ...f.invoices,
              { amount: null, revenueYear: year, invoiceMonth: null, stage: 'Invoiced', sortOrder: f.invoices.length },
            ],
          }
        : f,
    )
  }

  const removeInvoice = (index: number) => {
    setForm((f) => {
      if (!f || f.invoices.length <= 1) return f
      const invoices = f.invoices.filter((_, i) => i !== index).map((inv, i) => ({ ...inv, sortOrder: i }))
      return { ...f, invoices }
    })
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canWrite) return
    if (!form.account.trim() || !form.item.trim()) {
      board.setToast('Account and item are required')
      return
    }
    if (!form.invoices.length) {
      board.setToast('Add at least one invoice line')
      return
    }
    if (form.link && !/^https?:\/\//i.test(form.link)) {
      board.setToast('Links must start with https://')
      return
    }
    setSaving(true)
    try {
      const ownerIds = form.ownerIds ?? []
      await saveOpp({ ...form, ownerIds, ownerId: ownerIds[0] ?? null })
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
  const selectedOwners = new Set(form.ownerIds ?? [])
  const dealTotal = sumInvoiceAmounts(form.invoices)

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
            <input
              list="board-account-list"
              value={form.account}
              disabled={!canWrite}
              onChange={(e) => onAccountChange(e.target.value)}
              id="o_account"
              required
              autoComplete="off"
            />
            <datalist id="board-account-list">
              {accountOptions.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
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
          <div className="field full">
            <span>Owner(s)</span>
            <div className="owner-picks" role="group" aria-label="Deal owners">
              {people.map((p) => (
                <label key={p.id} className="owner-pick">
                  <input
                    type="checkbox"
                    disabled={!canWrite}
                    checked={selectedOwners.has(p.id)}
                    onChange={(e) => toggleOwner(p.id, e.target.checked)}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
          <div className="field full invoice-block">
            <div className="invoice-block-head">
              <span>Invoices</span>
              <span className="small muted">Deal total: {fmtRMCents(dealTotal)}</span>
            </div>
            <div className="invoice-lines">
              {form.invoices.map((inv, idx) => (
                <div className="invoice-line" key={inv.id ?? `new-${idx}`}>
                  <div className="field">
                    <span>Amount (RM)</span>
                    <RmAmountInput
                      disabled={!canWrite}
                      value={inv.amount}
                      onChange={(amount) => setInvoice(idx, { amount })}
                    />
                  </div>
                  <div className="field">
                    <span>Revenue year</span>
                    <input
                      type="number"
                      disabled={!canWrite}
                      value={inv.revenueYear}
                      onChange={(e) => setInvoice(idx, { revenueYear: Number(e.target.value) })}
                    />
                  </div>
                  <div className="field">
                    <span>Invoice month</span>
                    <input
                      type="month"
                      disabled={!canWrite}
                      value={inv.invoiceMonth || ''}
                      onChange={(e) => setInvoice(idx, { invoiceMonth: e.target.value || null })}
                    />
                  </div>
                  <div className="field">
                    <span>Stage</span>
                    <select
                      disabled={!canWrite}
                      value={inv.stage}
                      onChange={(e) => setInvoice(idx, { stage: e.target.value as OpportunityInvoiceInput['stage'] })}
                    >
                      {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {canWrite && form.invoices.length > 1 ? (
                    <button type="button" className="ghost invoice-remove" onClick={() => removeInvoice(idx)}>Remove</button>
                  ) : null}
                </div>
              ))}
            </div>
            {canWrite ? (
              <button type="button" className="ghost" onClick={addInvoice}>Add invoice line</button>
            ) : null}
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
