import { describe, expect, it } from 'vitest'
import { parseOwnerCell, parseOwnerCellToIds, opportunityMatchesOwner } from './owners'
import type { Opportunity } from './types'

describe('owners', () => {
  it('parses comma-separated owners and sorts alphabetically', () => {
    expect(parseOwnerCell('Engsim, Bhargava')).toEqual(['Bharg', 'Engsim'])
    expect(parseOwnerCell('Bhargava, Engsim')).toEqual(['Bharg', 'Engsim'])
  })

  it('resolves Bhargava alias to Bharg person', () => {
    const people = [
      { id: 'e', name: 'Engsim' },
      { id: 'b', name: 'Bharg' },
    ]
    const r = parseOwnerCellToIds('Engsim, Bhargava', people, 'owner', 2)
    expect(r.error).toBeUndefined()
    expect(r.ids).toEqual(['b', 'e'])
  })

  it('matches owner filter when person is any co-owner', () => {
    const o: Opportunity = {
      id: '1',
      account: 'A',
      item: 'B',
      segment: 'Tech',
      ownerId: 'b',
      ownerIds: ['b', 'e'],
      stage: 'Lead',
      value: null,
      revenueYear: 2026,
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
      stageSince: null,
      createdAt: '',
      createdBy: null,
      updatedAt: '',
      updatedBy: null,
    }
    expect(opportunityMatchesOwner(o, 'e')).toBe(true)
    expect(opportunityMatchesOwner(o, 'b')).toBe(true)
    expect(opportunityMatchesOwner(o, 'none')).toBe(false)
  })
})
