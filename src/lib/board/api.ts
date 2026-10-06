import { supabase } from '@/lib/supabase'
import { assembleBoardData, mapAudit, unmapOpp, unmapPros } from './mappers'
import type { Stage } from '@/lib/stages'
import type { AuditEntry, BoardData, CompanySettings, OpportunityInput, Prospect } from './types'

export interface OpportunityImportRowResult {
  lineNumber: number
  ok: boolean
  error?: string
}

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  if (res.data == null) throw new Error('No data returned')
  return res.data
}

export async function fetchBoardData(): Promise<BoardData> {
  const [people, profiles, settings, commitments, opps, oppOwners, prospects, reviews, history] = await Promise.all([
    supabase.from('people').select('*').order('name'),
    supabase.from('profiles').select('id,email,full_name,role,is_active').order('email'),
    supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
    supabase.from('commitments').select('*'),
    supabase.from('opportunities').select('*').is('deleted_at', null),
    supabase.from('opportunity_owners').select('opportunity_id,person_id'),
    supabase.from('prospects').select('*'),
    supabase.from('reviews').select('*').order('reviewed_at', { ascending: false }).limit(20),
    supabase.from('stage_history').select('*').order('changed_at', { ascending: false }).limit(1000),
  ])
  ;[people, profiles, settings, commitments, opps, oppOwners, prospects, reviews, history].forEach((r) => {
    if (r.error) throw new Error(r.error.message)
  })
  return assembleBoardData({
    people: people.data ?? [],
    profiles: profiles.data ?? [],
    settings: settings.data,
    commitments: commitments.data ?? [],
    opps: opps.data ?? [],
    oppOwners: oppOwners.data ?? [],
    prospects: prospects.data ?? [],
    reviews: reviews.data ?? [],
    history: history.data ?? [],
  })
}

async function syncOpportunityOwners(opportunityId: string, ownerIds: string[]): Promise<void> {
  const { error: delErr } = await supabase.from('opportunity_owners').delete().eq('opportunity_id', opportunityId)
  if (delErr) throw new Error(delErr.message)
  const unique = [...new Set(ownerIds.filter(Boolean))]
  if (!unique.length) return
  const { error: insErr } = await supabase.from('opportunity_owners').insert(
    unique.map((person_id) => ({ opportunity_id: opportunityId, person_id })),
  )
  if (insErr) throw new Error(insErr.message)
}

export async function fetchAuditLog(limit = 500): Promise<AuditEntry[]> {
  const { data, error } = await supabase.from('audit_log').select('*').order('at', { ascending: false }).limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapAudit)
}

export async function importOpportunities(
  rows: { lineNumber: number; input: OpportunityInput }[],
): Promise<OpportunityImportRowResult[]> {
  const results: OpportunityImportRowResult[] = []
  for (const row of rows) {
    try {
      await saveOpportunity(row.input)
      results.push({ lineNumber: row.lineNumber, ok: true })
    } catch (e) {
      results.push({ lineNumber: row.lineNumber, ok: false, error: (e as Error).message })
    }
  }
  return results
}

export async function updateOpportunityStage(id: string, stage: Stage): Promise<void> {
  const { error } = await supabase.from('opportunities').update({ stage }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function saveOpportunity(o: OpportunityInput): Promise<string> {
  const ownerIds = o.ownerIds ?? (o.ownerId ? [o.ownerId] : [])
  const row = unmapOpp({ ...o, ownerIds })
  let id: string
  if (o.id) {
    must(await supabase.from('opportunities').update(row).eq('id', o.id).select('id').single())
    id = o.id
  } else {
    const ins = must(await supabase.from('opportunities').insert(row).select('id').single()) as { id: string }
    id = ins.id
  }
  await syncOpportunityOwners(id, ownerIds)
  return id
}

export async function softDeleteOpportunity(id: string): Promise<void> {
  must(await supabase.from('opportunities').update({ deleted_at: new Date().toISOString() }).eq('id', id).select('id').single())
}

export async function addProspects(list: Partial<Prospect>[]): Promise<void> {
  for (let i = 0; i < list.length; i += 200) {
    const chunk = list.slice(i, i + 200).map((p) => unmapPros({ company: p.company!, ...p }))
    const { error } = await supabase.from('prospects').insert(chunk)
    if (error) throw new Error(error.message)
  }
}

export async function updateProspect(id: string, patch: { status?: Prospect['status']; opportunityId?: string | null }): Promise<void> {
  const row: { status?: Prospect['status']; opportunity_id?: string | null } = {}
  if ('status' in patch) row.status = patch.status
  if ('opportunityId' in patch) row.opportunity_id = patch.opportunityId
  const { error } = await supabase.from('prospects').update(row).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function saveSettings(s: Pick<CompanySettings, 'year' | 'target'>): Promise<void> {
  const { error } = await supabase
    .from('settings')
    .update({
      target_year: s.year,
      annual_target: s.target,
    })
    .eq('id', 1)
  if (error) throw new Error(error.message)
}

export async function saveCommitments(list: { personId: string; year: number; amount: number | null }[]): Promise<void> {
  const up = list.filter((c) => c.amount != null).map((c) => ({ person_id: c.personId, year: c.year, amount: c.amount! }))
  const del = list.filter((c) => c.amount == null)
  if (up.length) {
    const { error } = await supabase.from('commitments').upsert(up)
    if (error) throw new Error(error.message)
  }
  for (const c of del) {
    const { error } = await supabase.from('commitments').delete().eq('person_id', c.personId).eq('year', c.year)
    if (error) throw new Error(error.message)
  }
}

export async function markReviewDone(): Promise<void> {
  const { error } = await supabase.from('reviews').insert({})
  if (error) throw new Error(error.message)
}

export async function addPerson(p: { name: string; email?: string }): Promise<void> {
  const { error } = await supabase.from('people').insert({ name: p.name, email: p.email || null })
  if (error) throw new Error(error.message)
}

export async function updatePerson(
  id: string,
  patch: { isActive?: boolean; email?: string; name?: string },
): Promise<void> {
  const row: { is_active?: boolean; email?: string | null; name?: string } = {}
  if ('isActive' in patch) row.is_active = patch.isActive
  if ('email' in patch) row.email = patch.email?.trim() ? patch.email.trim() : null
  if ('name' in patch) row.name = patch.name?.trim() ?? ''
  const { error } = await supabase.from('people').update(row).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function adminManageLogin(p: {
  personId?: string | null
  userId?: string | null
  email: string
  password: string
  role: 'admin' | 'editor' | 'viewer'
}): Promise<void> {
  const { error } = await supabase.rpc('admin_manage_login', {
    p_person_id: p.personId ?? undefined,
    p_user_id: p.userId ?? undefined,
    p_email: p.email.trim(),
    p_password: p.password,
    p_role: p.role,
  })
  if (error) throw new Error(error.message)
}

export async function updateProfile(id: string, patch: { role?: 'admin' | 'editor' | 'viewer'; isActive?: boolean }): Promise<void> {
  const row: { role?: 'admin' | 'editor' | 'viewer'; is_active?: boolean } = {}
  if ('role' in patch) row.role = patch.role
  if ('isActive' in patch) row.is_active = patch.isActive
  const { error } = await supabase.from('profiles').update(row).eq('id', id)
  if (error) throw new Error(error.message)
}
