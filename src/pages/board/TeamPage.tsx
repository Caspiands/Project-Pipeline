import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth/auth'
import { useBoard } from '@/lib/board/BoardProvider'
import type { Person, Profile } from '@/lib/board/types'

function roleLabel(r: Profile['role']) {
  return r[0].toUpperCase() + r.slice(1)
}

function passwordsMatch(a: string, b: string, min = 10): string | null {
  if (a.length < min) return `Password must be at least ${min} characters.`
  if (a !== b) return 'Passwords do not match.'
  return null
}

function SetPasswordForm({
  email,
  role,
  personId,
  userId,
  onSave,
}: {
  email: string
  role: Profile['role']
  personId?: string | null
  userId?: string | null
  onSave: (p: {
    personId?: string | null
    userId?: string | null
    email: string
    password: string
    role: Profile['role']
  }) => Promise<void>
}) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [roleChoice, setRoleChoice] = useState(role)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const isCreate = !userId

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const v = passwordsMatch(pw, pw2)
    if (v) {
      setErr(v)
      return
    }
    setErr('')
    setBusy(true)
    try {
      await onSave({
        personId: personId ?? null,
        userId: userId ?? null,
        email,
        password: pw,
        role: isCreate ? roleChoice : role,
      })
      setPw('')
      setPw2('')
    } catch (ex) {
      setErr((ex as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="stack tight" onSubmit={(e) => void submit(e)} style={{ marginTop: 8, maxWidth: 420 }}>
      {isCreate && (
        <div className="field">
          <span>Role</span>
          <select value={roleChoice} onChange={(e) => setRoleChoice(e.target.value as Profile['role'])} aria-label="Role for new login">
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
      )}
      <div className="field">
        <span>New password</span>
        <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
      </div>
      <div className="field">
        <span>Confirm password</span>
        <input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
      </div>
      <button type="submit" className="primary" disabled={busy}>
        {isCreate ? 'Create login' : 'Set new password'}
      </button>
      {err && <p className="small" role="alert">{err}</p>}
    </form>
  )
}

function OwnerRow({
  person,
  linkedRole,
  onPatch,
  onManageLogin,
}: {
  person: Person
  linkedRole?: Profile['role']
  onPatch: (id: string, patch: { name?: string; email?: string; isActive?: boolean }) => Promise<void>
  onManageLogin: (p: {
    personId?: string | null
    userId?: string | null
    email: string
    password: string
    role: Profile['role']
  }) => Promise<void>
}) {
  const [name, setName] = useState(person.name)
  const [email, setEmail] = useState(person.email ?? '')
  const [ownerErr, setOwnerErr] = useState('')
  const [showLogin, setShowLogin] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const linkedProfile = person.profileId

  const saveOwner = async () => {
    setOwnerErr('')
    if (!name.trim()) {
      setOwnerErr('Name is required.')
      return
    }
    try {
      await onPatch(person.id, { name: name.trim(), email: email.trim() })
    } catch (e) {
      setOwnerErr((e as Error).message)
    }
  }

  return (
    <tr>
      <td>
        <input aria-label={`Name for ${person.name}`} value={name} onChange={(e) => setName(e.target.value)} />
      </td>
      <td>
        <input
          type="email"
          aria-label={`Email for ${person.name}`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Optional until they need a login"
        />
      </td>
      <td className="small">
        {linkedProfile ? (
          <span>Linked</span>
        ) : (
          <>
            <span className="muted">No login</span>
            {!showLogin ? (
              <button type="button" className="linkbtn" style={{ marginLeft: 8 }} onClick={() => setShowLogin(true)}>
                Create login…
              </button>
            ) : null}
          </>
        )}
        {showLogin && !linkedProfile && (
          <SetPasswordForm
            email={email.trim() || person.email || ''}
            role="viewer"
            personId={person.id}
            onSave={async (p) => {
              if (!p.email) throw new Error('Enter an email for this person before creating a login.')
              await onManageLogin(p)
              setShowLogin(false)
            }}
          />
        )}
        {linkedProfile && !showPw && (
          <button type="button" className="linkbtn" style={{ marginLeft: 8 }} onClick={() => setShowPw(true)}>
            Set password…
          </button>
        )}
        {linkedProfile && showPw && (
          <SetPasswordForm
            email={email.trim() || person.email || ''}
            role={linkedRole ?? 'viewer'}
            personId={person.id}
            userId={linkedProfile}
            onSave={async (p) => {
              await onManageLogin(p)
              setShowPw(false)
            }}
          />
        )}
      </td>
      <td>
        <label className="small" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={person.isActive}
            onChange={(e) => void onPatch(person.id, { isActive: e.target.checked })}
          />
          Show in owner lists
        </label>
        <button type="button" style={{ marginTop: 6 }} onClick={() => void saveOwner()}>Save owner details</button>
        {ownerErr && <p className="small" role="alert">{ownerErr}</p>}
      </td>
    </tr>
  )
}

export function TeamPage() {
  const { data, manageLogin, patchProfile, patchPerson, addDealOwner, setToast } = useBoard()
  const auth = useAuth()
  const userId = auth.session?.user.id
  const isAdmin = auth.status?.role === 'admin'
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [profilePw, setProfilePw] = useState<Record<string, { open: boolean }>>({})

  if (!isAdmin) return <Navigate to="/overview" replace />
  if (!data) return <div className="empty">Loading team…</div>

  const addOwner = async () => {
    if (!ownerName.trim()) return
    await addDealOwner({ name: ownerName.trim(), email: ownerEmail.trim() || undefined })
    setOwnerName('')
    setOwnerEmail('')
  }

  const toggleProfilePw = (id: string) => {
    setProfilePw((prev) => ({ ...prev, [id]: { open: !prev[id]?.open } }))
  }

  return (
    <div className="stack">
      <p className="small"><Link to="/audit">Audit log</Link></p>
      <section className="block">
        <h2>Logins</h2>
        <p className="lead">Who can sign in and what they can change. Set passwords here; deal owners can be linked from the table below.</p>
        <div className="scroll">
          <table id="loginTable">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Access</th>
                <th>Password</th>
              </tr>
            </thead>
            <tbody>
              {data.profiles.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.fullName || '—'}
                    {p.id === userId ? <> <span className="small muted">(you)</span></> : null}
                  </td>
                  <td>{p.email}</td>
                  <td>
                    <select
                      aria-label={`Role for ${p.email}`}
                      value={p.role}
                      onChange={(e) =>
                        void patchProfile(p.id, { role: e.target.value as typeof p.role }).catch((err: Error) => setToast(err.message))
                      }
                    >
                      {(['admin', 'editor', 'viewer'] as const).map((r) => (
                        <option key={r} value={r}>{roleLabel(r)}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <label className="small" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={p.isActive}
                        onChange={(e) =>
                          void patchProfile(p.id, { isActive: e.target.checked }).catch((err: Error) => setToast(err.message))
                        }
                      />
                      Active
                    </label>
                  </td>
                  <td>
                    {!profilePw[p.id]?.open ? (
                      <button type="button" className="linkbtn" onClick={() => toggleProfilePw(p.id)}>Set password…</button>
                    ) : (
                      <SetPasswordForm
                        email={p.email}
                        role={p.role}
                        userId={p.id}
                        onSave={manageLogin}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="block">
        <h2>Deal owners</h2>
        <p className="lead">People who can own opportunities. Edit names and emails, then create a login when you are ready.</p>
        <div className="scroll">
          <table id="peopleTable">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Login</th>
                <th>Owner list</th>
              </tr>
            </thead>
            <tbody>
              {data.people.map((p) => (
                <OwnerRow
                  key={p.id}
                  person={p}
                  linkedRole={p.profileId ? data.profiles.find((x) => x.id === p.profileId)?.role : undefined}
                  onPatch={patchPerson}
                  onManageLogin={manageLogin}
                />
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
