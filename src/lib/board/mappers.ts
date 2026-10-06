import type { Database } from '@/lib/database.types'
import { num } from '@/lib/format'
import type { Segment, Stage } from '@/lib/stages'
import { sortOwnerIds } from './owners'
import type {
  AuditEntry,
  BoardData,
  Opportunity,
  OpportunityInput,
  OpportunityInvoice,
  Prospect,
  StageHistoryEntry,
} from './types'

type OppRow = Database['public']['Tables']['opportunities']['Row']
type InvRow = Database['public']['Tables']['opportunity_invoices']['Row']
type ProsRow = Database['public']['Tables']['prospects']['Row']
type AuditRow = Database['public']['Tables']['audit_log']['Row']

export function mapInvoice(r: InvRow): OpportunityInvoice {
  return {
    id: r.id,
    amount: r.amount == null ? null : Number(r.amount),
    revenueYear: r.revenue_year,
    invoiceMonth: r.invoice_month ? String(r.invoice_month).slice(0, 7) : null,
    stage: r.stage as Stage,
    stageSince: r.stage_since,
    sortOrder: r.sort_order,
  }
}

export function mapOpp(r: OppRow, ownerIds: string[] = [], invoices: OpportunityInvoice[] = []): Opportunity {
  const ids = ownerIds.length ? ownerIds : r.owner_id ? [r.owner_id] : []
  const sortedInv = [...invoices].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
  return {
    id: r.id,
    account: r.account,
    item: r.item,
    segment: r.segment as Segment,
    ownerId: r.owner_id || null,
    ownerIds: ids,
    invoices: sortedInv,
    quoteNo: r.quote_no || '',
    quoteDate: r.quote_date,
    loaDate: r.loa_date,
    startDate: r.start_date,
    probability: r.probability,
    nextStep: r.next_step || '',
    nextOwnerId: r.next_owner_id || null,
    nextDate: r.next_date,
    link: r.link || '',
    notes: r.notes || '',
    createdAt: r.created_at,
    createdBy: r.created_by,
    updatedAt: r.updated_at,
    updatedBy: r.updated_by,
  }
}

export function unmapOpp(o: OpportunityInput) {
  const primary = o.ownerIds?.[0] ?? o.ownerId ?? null
  return {
    account: o.account,
    item: o.item,
    segment: o.segment,
    owner_id: primary,
    quote_no: o.quoteNo || null,
    quote_date: o.quoteDate || null,
    loa_date: o.loaDate || null,
    start_date: o.startDate || null,
    probability: o.probability,
    next_step: o.nextStep || null,
    next_owner_id: o.nextOwnerId || null,
    next_date: o.nextDate || null,
    link: o.link || null,
    notes: o.notes || null,
  }
}

export function unmapInvoice(inv: OpportunityInvoice, opportunityId: string, sortOrder: number) {
  return {
    opportunity_id: opportunityId,
    amount: inv.amount,
    revenue_year: inv.revenueYear,
    invoice_month: inv.invoiceMonth ? inv.invoiceMonth + '-01' : null,
    stage: inv.stage,
    sort_order: sortOrder,
  }
}

export function mapPros(r: ProsRow): Prospect {
  return {
    id: r.id,
    company: r.company,
    contactName: r.contact_name || '',
    designation: r.designation || '',
    phone: r.phone || '',
    email: r.email || '',
    status: r.status,
    ownerId: r.owner_id || null,
    source: r.source || '',
    notes: r.notes || '',
    opportunityId: r.opportunity_id || null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export function unmapPros(p: Partial<Prospect> & { company: string }) {
  return {
    company: p.company,
    contact_name: p.contactName || null,
    designation: p.designation || null,
    phone: p.phone || null,
    email: p.email || null,
    status: p.status || 'white',
    owner_id: p.ownerId || null,
    source: p.source || null,
    notes: p.notes || null,
  }
}

export function mapAudit(r: AuditRow): AuditEntry {
  return {
    id: r.id,
    tableName: r.table_name,
    rowId: r.row_id,
    action: r.action,
    oldData: r.old_data,
    newData: r.new_data,
    actor: r.actor,
    at: r.at,
  }
}

export function assembleBoardData(raw: {
  people: Database['public']['Tables']['people']['Row'][]
  profiles: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'email' | 'full_name' | 'role' | 'is_active'>[]
  settings: Database['public']['Tables']['settings']['Row'] | null
  commitments: Database['public']['Tables']['commitments']['Row'][]
  opps: OppRow[]
  invoices: InvRow[]
  prospects: ProsRow[]
  reviews: Database['public']['Tables']['reviews']['Row'][]
  history: Database['public']['Tables']['stage_history']['Row'][]
  oppOwners?: { opportunity_id: string; person_id: string }[]
}): BoardData {
  const ownerMap = new Map<string, string[]>()
  for (const row of raw.oppOwners ?? []) {
    const list = ownerMap.get(row.opportunity_id) ?? []
    list.push(row.person_id)
    ownerMap.set(row.opportunity_id, list)
  }
  const invMap = new Map<string, OpportunityInvoice[]>()
  for (const row of raw.invoices) {
    const list = invMap.get(row.opportunity_id) ?? []
    list.push(mapInvoice(row))
    invMap.set(row.opportunity_id, list)
  }
  const people = raw.people.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email || '',
    profileId: r.profile_id,
    isActive: r.is_active,
  }))
  const sortStub: BoardData = {
    people,
    profiles: [],
    settings: { year: 2026, target: 0, financeRevenue: 0, financeAsOf: '' },
    commitments: [],
    opps: [],
    prospects: [],
    reviews: [],
    history: [],
  }
  const s = raw.settings
  return {
    people,
    profiles: raw.profiles.map((r) => ({
      id: r.id,
      email: r.email,
      fullName: r.full_name || '',
      role: r.role,
      isActive: r.is_active,
    })),
    settings: {
      year: s?.target_year || 2026,
      target: num(s?.annual_target),
      financeRevenue: num(s?.finance_revenue),
      financeAsOf: s?.finance_as_of || '',
    },
    commitments: raw.commitments.map((r) => ({ personId: r.person_id, year: r.year, amount: num(r.amount) })),
    opps: raw.opps.map((r) => {
      const ids = sortOwnerIds(ownerMap.get(r.id) ?? [], sortStub)
      return mapOpp(r, ids, invMap.get(r.id) ?? [])
    }),
    prospects: raw.prospects.map(mapPros),
    reviews: raw.reviews.map((r) => ({ id: r.id, at: r.reviewed_at, by: r.reviewed_by, notes: r.notes })),
    history: raw.history.map(
      (r): StageHistoryEntry => ({
        oppId: r.opportunity_id,
        from: r.from_stage as Stage | null,
        to: r.to_stage as Stage,
        at: r.changed_at,
        by: r.changed_by,
      }),
    ),
  }
}
