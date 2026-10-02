/** Stage and segment vocabulary, in the order the board uses. Kept identical to the prototype. */
export const STAGES = ['Lead', 'Proposal', 'Quote sent', 'Verbal yes', 'LOA/PO', 'Invoiced', 'Paid', 'Lost'] as const
export type Stage = (typeof STAGES)[number]

/** "Open" = Lead to LOA/PO. */
export const OPEN_STAGES: readonly Stage[] = ['Lead', 'Proposal', 'Quote sent', 'Verbal yes', 'LOA/PO']
/** "Won" = Invoiced or Paid. */
export const WON_STAGES: readonly Stage[] = ['Invoiced', 'Paid']

export const SEGMENTS = ['Tech', 'Agency', 'Mixed'] as const
export type Segment = (typeof SEGMENTS)[number]

export const PROSPECT_STATUSES = [
  { key: 'white', label: 'Not contacted' },
  { key: 'orange', label: 'Needs work' },
  { key: 'yellow', label: 'Interested, budget limited' },
  { key: 'green', label: 'Ready to meet' },
] as const
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number]['key']

export const stageIndex = (s: string): number => STAGES.indexOf(s as Stage)
export const isOpenStage = (s: string): boolean => OPEN_STAGES.includes(s as Stage)
export const isWonStage = (s: string): boolean => WON_STAGES.includes(s as Stage)
