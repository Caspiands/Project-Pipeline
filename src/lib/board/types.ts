import type { ProspectStatus, Segment, Stage } from '@/lib/stages'

export interface Person {
  id: string
  name: string
  email: string
  profileId: string | null
  isActive: boolean
}

export interface Profile {
  id: string
  email: string
  fullName: string
  role: 'admin' | 'editor' | 'viewer'
  isActive: boolean
}

export interface CompanySettings {
  year: number
  target: number
  financeRevenue: number
  financeAsOf: string
}

export interface Commitment {
  personId: string
  year: number
  amount: number
}

export interface OpportunityInvoice {
  id: string
  amount: number | null
  revenueYear: number
  invoiceMonth: string | null
  stage: Stage
  stageSince: string | null
  sortOrder: number
}

export type OpportunityInvoiceInput = Omit<OpportunityInvoice, 'id' | 'stageSince'> & {
  id?: string | null
}

export interface Opportunity {
  id: string
  account: string
  item: string
  segment: Segment
  ownerId: string | null
  ownerIds: string[]
  invoices: OpportunityInvoice[]
  quoteNo: string
  quoteDate: string | null
  loaDate: string | null
  startDate: string | null
  probability: number | null
  nextStep: string
  nextOwnerId: string | null
  nextDate: string | null
  link: string
  notes: string
  createdAt: string
  createdBy: string | null
  updatedAt: string
  updatedBy: string | null
}

export type OpportunityInput = Omit<
  Opportunity,
  'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'ownerId' | 'invoices'
> & {
  id?: string | null
  ownerId?: string | null
  invoices: OpportunityInvoiceInput[]
}

export interface Prospect {
  id: string
  company: string
  contactName: string
  designation: string
  phone: string
  email: string
  status: ProspectStatus
  ownerId: string | null
  source: string
  notes: string
  opportunityId: string | null
  createdAt: string
  updatedAt: string
}

export interface Review {
  id: string
  at: string
  by: string | null
  notes: string | null
}

export interface StageHistoryEntry {
  oppId: string
  from: Stage | null
  to: Stage
  at: string
  by: string | null
}

export interface AuditEntry {
  id: number
  tableName: string
  rowId: string | null
  action: string
  oldData: unknown
  newData: unknown
  actor: string | null
  at: string
}

export interface BoardData {
  people: Person[]
  profiles: Profile[]
  settings: CompanySettings
  commitments: Commitment[]
  opps: Opportunity[]
  prospects: Prospect[]
  reviews: Review[]
  history: StageHistoryEntry[]
}

export interface BoardFilters {
  seg: 'all' | Segment
  owner: 'all' | 'none' | string
  account: 'all' | string
  year: 'all' | string
  q: string
  lost: boolean
  stage: 'all' | Stage
  pstatus: 'all' | ProspectStatus
  invoiceMonth: 'all' | string
  invoiceQuarter: 'all' | string
  quoteFrom: string
  quoteTo: string
  quoteMonth: 'all' | string
  quoteQuarter: 'all' | string
}

export const DEFAULT_FILTERS: BoardFilters = {
  seg: 'all',
  owner: 'all',
  account: 'all',
  year: 'all',
  q: '',
  lost: false,
  stage: 'all',
  pstatus: 'all',
  invoiceMonth: 'all',
  invoiceQuarter: 'all',
  quoteFrom: '',
  quoteTo: '',
  quoteMonth: 'all',
  quoteQuarter: 'all',
}

export const TECH_BOARD_URL = 'https://claude.ai/artifact/WM8QSCNFVFuy5P88C7D5Bv'
