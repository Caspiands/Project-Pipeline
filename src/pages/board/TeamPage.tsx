import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth/auth'
import { useBoard } from '@/lib/board/BoardProvider'

export function TeamPage() {
  const { data, inviteUser, patchProfile, patchPerson, addDealOwner } = useBoard()
  const auth = useAuth()
  const userId = auth.session?.user.id
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('editor')
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [msg, setMsg] = useState('')

  if (!data) return <div className="empty">Loading team…</div>

  const sendInvite = async () => {
    setMsg('')
    try {
      await inviteUser({ email: inviteEmail.trim(), fullName: inviteName.trim(), role: inviteRole })
      setInviteEmail('')
      setInviteName('')
      setMsg('Invite sent.')
    } catch (e) {
      setMsg((e as Error).message)
    }
  }

  const addOwner = async () => {
    if (!ownerName.trim()) return
    await addDealOwner({ name: ownerName.trim(), email: ownerEmail.trim() || undefined })
    setOwnerName('')
    setOwnerEmail('')
  }

  return (
    <div className="stack">
      <p className="small"><Link to="/audit">Audit log</Link></p>
      <section className="block">
        <h2>Logins</h2>
        <p className="lead">Who can sign in and what they can change.</p>
        <div className="scroll">
          <table id="loginTable">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Access</th></tr></thead>
            <tbody>
              {data.profiles.map((p) => (
                <tr key={p.id}>
                  <td>{p.fullName || '—'}{p.id === userId ? <> <span className="small muted">(you)</span></> : null}</td>
                  <td>{p.email}</td>
                  <td>
                    <select
                      aria-label={`Role for ${p.email}`}
                      value={p.role}
                      onChange={(e) => void patchProfile(p.id, { role: e.target.value as typeof p.role })}
                    >
                      {(['admin', 'editor', 'viewer'] as const).map((r) => (
                        <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <label className="small" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={p.isActive}
                        onChange={(e) => void patchProfile(p.id, { isActive: e.target.checked })}
                      />
                      Active
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="block">
        <h2>Invite someone</h2>
        <div className="kv">
          <div className="field"><span>Full name</span><input value={inviteName} onChange={(e) => setInviteName(e.target.value)} /></div>
          <div className="field"><span>Email</span><input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} /></div>
          <div className="field"><span>Role</span>
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}>
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        </div>
        <button type="button" className="primary" onClick={() => void sendInvite()}>Send invite</button>
        {msg && <p className="small muted">{msg}</p>}
      </section>
      <section className="block">
        <h2>Deal owners</h2>
        <p className="lead">People who can own opportunities, whether or not they have a login.</p>
        <div className="scroll">
          <table id="peopleTable">
            <thead><tr><th>Name</th><th>Email</th><th>Login</th><th>Owner list</th></tr></thead>
            <tbody>
              {data.people.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.email || '—'}</td>
                  <td className="small">{p.profileId ? 'Linked' : <span className="muted">No login</span>}</td>
                  <td>
                    <label className="small" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input type="checkbox" checked={p.isActive} onChange={(e) => void patchPerson(p.id, { isActive: e.target.checked })} />
                      Show in owner lists
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 style={{ marginTop: 16 }}>Add deal owner</h3>
        <div className="kv">
          <div className="field"><span>Name</span><input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} /></div>
          <div className="field"><span>Email (optional)</span><input value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} /></div>
        </div>
        <button type="button" onClick={() => void addOwner()}>Add owner</button>
      </section>
    </div>
  )
}
