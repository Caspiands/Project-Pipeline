import { describe, expect, it } from 'vitest'
import { opportunitiesToCsv } from './pipelineCsv'
import { parsePipelineCsv } from './pipelineImport'
import type { BoardData, Opportunity } from './types'

const boardData = (opps: Opportunity[]): BoardData => ({
  people: [{ id: 'p1', name: 'Hafsham', email: '', profileId: null, isActive: true }],
  profiles: [],
  settings: { year: 2026, target: 0, financeRevenue: 0, financeAsOf: '' },
  commitments: [],
  opps,
  prospects: [],
  reviews: [],
  history: [],
})

describe('pipelineImport', () => {
  it('round-trips export headers and ISO dates', () => {
    const opp: Opportunity = {
      id: '1',
      account: 'Acme',
      item: 'Widget',
      segment: 'Tech',
      ownerId: 'p1',
      ownerIds: ['p1'],
      invoices: [
        {
          id: 'i1',
          amount: null,
          revenueYear: 2025,
          invoiceMonth: '2025-06',
          stage: 'Lead',
          stageSince: null,
          sortOrder: 0,
        },
      ],
      quoteNo: 'Q-1',
      quoteDate: '2025-03-15',
      loaDate: null,
      startDate: '2025-07-01',
      probability: 40,
      nextStep: 'Call',
      nextOwnerId: null,
      nextDate: '2025-03-20',
      link: 'https://example.com',
      notes: 'Note',
      createdAt: '',
      createdBy: null,
      updatedAt: '',
      updatedBy: null,
    }
    const csv = opportunitiesToCsv([opp], boardData([opp]))
    const parsed = parsePipelineCsv(csv, boardData([opp]).people, 2026)
    expect(parsed.errors).toHaveLength(0)
    expect(parsed.rows).toHaveLength(1)
    expect(parsed.rows[0].input.invoices[0].amount).toBeNull()
    expect(parsed.rows[0].input.quoteDate).toBe('2025-03-15')
    expect(parsed.rows[0].input.invoices[0].invoiceMonth).toBe('2025-06')
  })

  it('rejects an unknown owner name', () => {
    const header = 'Account,Item,Segment,Owner,Stage,Value (RM),Revenue year,Quote no,Quote sent,LOA / PO date,Expected invoice month,Delivery start,Probability (%),Next step,Next step owner,Next step date,Link (https://),Notes'
    const parsed = parsePipelineCsv(
      `${header}\nCo,Thing,Tech,Nobody,Lead,,2025,,,,,,,,,,`,
      boardData([]).people,
      2026,
    )
    expect(parsed.rows).toHaveLength(0)
    expect(parsed.errors.some((e) => /Unknown owner/i.test(e.message))).toBe(true)
  })

  it('groups rows with the same account and item into one deal', () => {
    const header = 'Account,Item,Segment,Owner,Stage,Value (RM),Revenue year,Quote no,Quote sent,LOA / PO date,Expected invoice month,Delivery start,Probability (%),Next step,Next step owner,Next step date,Link (https://),Notes'
    const parsed = parsePipelineCsv(
      `${header}\nAcme,Widget,Tech,Hafsham,Invoiced,100,2025,,,,2025-01,,,,,,,\nAcme,Widget,Tech,Hafsham,Invoiced,200,2025,,,,2025-02,,,,,,,`,
      boardData([]).people,
      2026,
    )
    expect(parsed.errors).toHaveLength(0)
    expect(parsed.rows).toHaveLength(1)
    expect(parsed.rows[0].input.invoices).toHaveLength(2)
  })
})
