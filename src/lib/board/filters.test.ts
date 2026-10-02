import { describe, expect, it } from 'vitest'
import { filterOpportunities, isOverdue } from './filters'
import { mockBoardData } from '@/test/mockBoardData'
import { DEFAULT_FILTERS } from './types'

describe('filterOpportunities', () => {
  it('hides lost rows unless show lost is on', () => {
    const data = {
      ...mockBoardData,
      opps: [...mockBoardData.opps, { ...mockBoardData.opps[0], id: 'o2', stage: 'Lost' as const }],
    }
    const hidden = filterOpportunities(data, DEFAULT_FILTERS, { respectStageFilter: false })
    expect(hidden).toHaveLength(1)
    const shown = filterOpportunities(data, { ...DEFAULT_FILTERS, lost: true }, { respectStageFilter: false })
    expect(shown).toHaveLength(2)
  })

  it('marks overdue open rows before today in KL', () => {
    const o = { ...mockBoardData.opps[0], nextDate: '2020-01-01' }
    expect(isOverdue(o, '2026-10-02')).toBe(true)
  })
})
