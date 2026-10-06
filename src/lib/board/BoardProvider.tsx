import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import {
  addPerson,
  addProspects,
  adminManageLogin,
  fetchAuditLog,
  fetchBoardData,
  importOpportunities,
  markReviewDone,
  saveCommitments,
  saveOpportunity,
  saveSettings,
  softDeleteOpportunity,
  updateOpportunityStage,
  updatePerson,
  updateProfile,
  updateProspect,
} from './api'
import { DEFAULT_FILTERS, type BoardData, type BoardFilters, type Opportunity, type OpportunityInput } from './types'

const FILTERS_KEY = 'cdspb.filters'

function loadFilters(): BoardFilters {
  try {
    const raw = localStorage.getItem(FILTERS_KEY)
    if (!raw) return { ...DEFAULT_FILTERS }
    return { ...DEFAULT_FILTERS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_FILTERS }
  }
}

export interface DrawerState {
  mode: 'create' | 'edit'
  opp: OpportunityInput | null
  prospectId?: string | null
}

interface BoardContextValue {
  data: BoardData | undefined
  isLoading: boolean
  error: Error | null
  filters: BoardFilters
  setFilters: (patch: Partial<BoardFilters>) => void
  drawer: DrawerState | null
  openCreate: (prefill?: Partial<OpportunityInput>, prospectId?: string | null) => void
  openEdit: (opp: Opportunity) => void
  closeDrawer: () => void
  saveOpp: (o: OpportunityInput) => Promise<string>
  patchOppStage: (id: string, stage: import('@/lib/stages').Stage) => Promise<void>
  deleteOpp: (id: string) => Promise<void>
  markReview: () => Promise<void>
  saveTargets: (settings: BoardData['settings'], commitments: { personId: string; year: number; amount: number | null }[]) => Promise<void>
  importProspects: (list: Parameters<typeof addProspects>[0]) => Promise<void>
  patchProspect: (id: string, patch: { status?: import('@/lib/stages').ProspectStatus; opportunityId?: string | null }) => Promise<void>
  importPipelineRows: (rows: { lineNumber: number; input: import('./types').OpportunityInput }[]) => Promise<import('./api').OpportunityImportRowResult[]>
  manageLogin: (p: {
    personId?: string | null
    userId?: string | null
    email: string
    password: string
    role: 'admin' | 'editor' | 'viewer'
  }) => Promise<void>
  patchProfile: (id: string, patch: { role?: 'admin' | 'editor' | 'viewer'; isActive?: boolean }) => Promise<void>
  addDealOwner: (p: { name: string; email?: string }) => Promise<void>
  patchPerson: (id: string, patch: { isActive?: boolean; email?: string; name?: string }) => Promise<void>
  auditLog: ReturnType<typeof useQuery<import('./types').AuditEntry[]>>
  toast: string | null
  setToast: (msg: string | null) => void
}

const BoardContext = createContext<BoardContextValue | null>(null)

export function BoardProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [filters, setFiltersState] = useState<BoardFilters>(loadFilters)
  const [drawer, setDrawer] = useState<DrawerState | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const setFilters = useCallback((patch: Partial<BoardFilters>) => {
    setFiltersState((prev) => {
      const next = { ...prev, ...patch }
      localStorage.setItem(FILTERS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const { data, isLoading, error } = useQuery({
    queryKey: ['board'],
    queryFn: fetchBoardData,
    staleTime: 5_000,
  })

  const auditLog = useQuery({
    queryKey: ['audit'],
    queryFn: () => fetchAuditLog(),
    enabled: false,
  })

  useEffect(() => {
    const channel = supabase.channel('pipeline-board')
    const bump = () => {
      void qc.invalidateQueries({ queryKey: ['board'] })
      void qc.invalidateQueries({ queryKey: ['audit'] })
    }
    ;['opportunities', 'opportunity_owners', 'prospects', 'settings', 'commitments', 'people', 'reviews', 'stage_history', 'profiles', 'audit_log'].forEach(
      (tb) => channel.on('postgres_changes', { event: '*', schema: 'public', table: tb }, bump),
    )
    channel.subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [qc])

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['board'] })

  const saveOppMut = useMutation({
    mutationFn: async (o: OpportunityInput) => {
      const id = await saveOpportunity(o)
      if (drawer?.prospectId) await updateProspect(drawer.prospectId, { opportunityId: id })
      return id
    },
    onSuccess: () => {
      invalidate()
      setDrawer(null)
      setToast('Saved.')
    },
    onError: (e: Error) => setToast(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: softDeleteOpportunity,
    onSuccess: () => {
      invalidate()
      setDrawer(null)
      setToast('Removed from the board.')
    },
    onError: (e: Error) => setToast(e.message),
  })

  const openCreate = useCallback((prefill?: Partial<OpportunityInput>, prospectId?: string | null) => {
    const year = data?.settings.year ?? 2026
    setDrawer({
      mode: 'create',
      prospectId: prospectId ?? null,
      opp: {
        account: '',
        item: '',
        segment: 'Mixed',
        ownerId: null,
        ownerIds: [],
        stage: 'Lead',
        value: null,
        revenueYear: year,
        quoteNo: '',
        quoteDate: null,
        loaDate: null,
        invoiceMonth: null,
        startDate: null,
        probability: null,
        nextStep: '',
        nextOwnerId: null,
        nextDate: null,
        link: '',
        notes: '',
        ...prefill,
      },
    })
  }, [data?.settings.year])

  const openEdit = useCallback((opp: Opportunity) => {
    setDrawer({ mode: 'edit', opp: { ...opp }, prospectId: null })
  }, [])

  const closeDrawer = useCallback(() => setDrawer(null), [])

  const manageLogin = useCallback(
    async (p: {
      personId?: string | null
      userId?: string | null
      email: string
      password: string
      role: 'admin' | 'editor' | 'viewer'
    }) => {
      await adminManageLogin(p)
      invalidate()
      setToast('Login saved.')
    },
    [],
  )

  const value = useMemo<BoardContextValue>(
    () => ({
      data,
      isLoading,
      error: error as Error | null,
      filters,
      setFilters,
      drawer,
      openCreate,
      openEdit,
      closeDrawer,
      saveOpp: (o) => saveOppMut.mutateAsync(o),
      patchOppStage: async (id, stage) => {
        await updateOpportunityStage(id, stage)
        invalidate()
      },
      deleteOpp: (id) => deleteMut.mutateAsync(id),
      markReview: async () => {
        await markReviewDone()
        invalidate()
        setToast('Review marked done.')
      },
      saveTargets: async (settings, commitments) => {
        await saveSettings(settings)
        await saveCommitments(commitments)
        invalidate()
        setToast('Targets saved.')
      },
      importProspects: async (list) => {
        await addProspects(list)
        invalidate()
        setToast(`Imported ${list.length} prospects.`)
      },
      patchProspect: async (id, patch) => {
        await updateProspect(id, patch as { status?: import('@/lib/stages').ProspectStatus; opportunityId?: string | null })
        invalidate()
      },
      importPipelineRows: async (rows) => {
        const results = await importOpportunities(rows)
        invalidate()
        return results
      },
      manageLogin,
      patchProfile: async (id, patch) => {
        await updateProfile(id, patch)
        invalidate()
      },
      addDealOwner: async (p) => {
        await addPerson(p)
        invalidate()
        setToast('Deal owner added.')
      },
      patchPerson: async (id, patch) => {
        await updatePerson(id, patch)
        invalidate()
      },
      auditLog,
      toast,
      setToast,
    }),
    [data, isLoading, error, filters, setFilters, drawer, openCreate, openEdit, closeDrawer, saveOppMut, deleteMut, auditLog, toast, manageLogin],
  )

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>
}

export function useBoard() {
  const ctx = useContext(BoardContext)
  if (!ctx) throw new Error('useBoard must be used within BoardProvider')
  return ctx
}
