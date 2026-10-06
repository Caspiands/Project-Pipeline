import { describe, expect, it } from 'vitest'
import { filterOpportunities } from './filters'
import { opportunityMatchesKeyword } from './opportunitySearch'
import { mockBoardData } from '@/test/mockBoardData'
import { DEFAULT_FILTERS } from './types'

describe('opportunityMatchesKeyword', () => {
  it('matches owner name and numeric fragments in item', () => {
    const data = {
      ...mockBoardData,
      people: [
        ...mockBoardData.people,
        { id: 'p2', name: 'Engsim', email: '', profileId: null, isActive: true },
      ],
      opps: [
        {
          ...mockBoardData.opps[0],
          id: 'o2',
          item: 'Quote 2680 renewal',
          ownerIds: ['p2'],
          ownerId: 'p2',
        },
      ],
    }
    const o = data.opps[0]
    expect(opportunityMatchesKeyword(data, o, 'engsim')).toBe(true)
    expect(opportunityMatchesKeyword(data, o, '2680')).toBe(true)
  })
})

describe('account filter', () => {
  it('limits pipeline rows to one account', () => {
    const data = {
      ...mockBoardData,
      opps: [
        mockBoardData.opps[0],
        { ...mockBoardData.opps[0], id: 'o2', account: 'Other Co' },
      ],
    }
    const rows = filterOpportunities(
      data,
      { ...DEFAULT_FILTERS, account: 'BBSG' },
      { respectStageFilter: false },
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].account).toBe('BBSG')
  })
})
