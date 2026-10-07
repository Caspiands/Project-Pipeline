import { describe, expect, it } from 'vitest'
import {
  formatRevenueYearsInput,
  invoiceAmountInRevenueYear,
  parseRevenueYearsInput,
  splitAmountAcrossRevenueYears,
} from './revenueYearAllocation'

describe('revenueYearAllocation', () => {
  it('splits evenly with leftover sen on the first year', () => {
    const parts = splitAmountAcrossRevenueYears(164801.5, 2026, 2027)
    expect(parts[2026]).toBe(82400.75)
    expect(parts[2027]).toBe(82400.75)
    expect((parts[2026] ?? 0) + (parts[2027] ?? 0)).toBe(164801.5)
  })

  it('puts odd sen on the first year', () => {
    const parts = splitAmountAcrossRevenueYears(100.01, 2026, 2027)
    expect(parts[2026]).toBe(50.01)
    expect(parts[2027]).toBe(50)
  })

  it('parses one or two years from text input', () => {
    expect(parseRevenueYearsInput('2026')).toEqual({ revenueYear: 2026, revenueYear2: null })
    expect(parseRevenueYearsInput('2026 and 2027')).toEqual({ revenueYear: 2026, revenueYear2: 2027 })
    expect(parseRevenueYearsInput('2026, 2027')).toEqual({ revenueYear: 2026, revenueYear2: 2027 })
    expect(parseRevenueYearsInput('2026,2027,2028')).toBe('invalid')
  })

  it('formats display label', () => {
    expect(formatRevenueYearsInput(2026, 2027)).toBe('2026 and 2027')
    expect(formatRevenueYearsInput(2026, null)).toBe('2026')
  })

  it('attributes only the matching year share', () => {
    const inv = { amount: 100, revenueYear: 2026, revenueYear2: 2027 }
    expect(invoiceAmountInRevenueYear(inv, 2026)).toBe(50)
    expect(invoiceAmountInRevenueYear(inv, 2027)).toBe(50)
    expect(invoiceAmountInRevenueYear(inv, 2025)).toBeNull()
  })
})
