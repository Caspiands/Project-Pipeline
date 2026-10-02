import { describe, expect, it } from 'vitest'
import { daysSince, fmtDate, fmtFull, fmtInt, fmtMonth, fmtRM, num, todayISO } from './format'

describe('fmtRM (money on screen)', () => {
  it('uses full amounts with en-GB grouping and an RM prefix', () => {
    expect(fmtRM(262000)).toBe('RM 262,000')
    expect(fmtRM(1_500_000)).toBe('RM 1,500,000')
    expect(fmtRM(800)).toBe('RM 800')
    expect(fmtRM(0)).toBe('RM 0')
  })
  it('shows a dash when the value is not known', () => {
    expect(fmtRM(null)).toBe('—')
    expect(fmtRM(undefined)).toBe('—')
  })
})

describe('fmtInt (counts)', () => {
  it('groups thousands with en-GB', () => {
    expect(fmtInt(1500)).toBe('1,500')
    expect(fmtInt(42)).toBe('42')
  })
  it('shows a dash when unknown', () => {
    expect(fmtInt(null)).toBe('—')
  })
})

describe('fmtFull (table money)', () => {
  it('uses thousands separators and no currency prefix', () => {
    expect(fmtFull(262000)).toBe('262,000')
    expect(fmtFull('1000000')).toBe('1,000,000')
  })
  it('shows a dash for blank values and never a zero', () => {
    expect(fmtFull(null)).toBe('—')
    expect(fmtFull('')).toBe('—')
  })
})

describe('dates', () => {
  it('formats dates the British way', () => {
    expect(fmtDate('2026-10-07')).toBe('7 Oct 2026')
    expect(fmtDate(null)).toBe('—')
    expect(fmtDate('not a date')).toBe('—')
  })
  it('formats invoice months from either YYYY-MM or a first-of-month date', () => {
    expect(fmtMonth('2026-10')).toBe('Oct 2026')
    expect(fmtMonth('2027-01-01')).toBe('Jan 2027')
    expect(fmtMonth(null)).toBe('—')
  })
  it('counts whole days since a date and returns null when unknown', () => {
    const now = new Date('2026-10-10T12:00:00')
    expect(daysSince('2026-10-07', now)).toBe(3)
    expect(daysSince(null, now)).toBeNull()
    expect(daysSince('', now)).toBeNull()
  })
  it('works out today in Kuala Lumpur time, not the browser time zone', () => {
    // 23:30 UTC on 6 Oct is already 07:30 on 7 Oct in Kuala Lumpur (UTC+8).
    expect(todayISO(new Date('2026-10-06T23:30:00Z'))).toBe('2026-10-07')
    expect(todayISO(new Date('2026-10-06T15:59:00Z'))).toBe('2026-10-06')
  })
})

describe('num', () => {
  it('treats blanks as zero for sums only', () => {
    expect(num(null)).toBe(0)
    expect(num('')).toBe(0)
    expect(num('42')).toBe(42)
    expect(num(7)).toBe(7)
  })
})
