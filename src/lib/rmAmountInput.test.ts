import { describe, expect, it } from 'vitest'
import { parseRmAmountInput } from './rmAmountInput'

describe('parseRmAmountInput', () => {
  it('accepts blank and sen to two decimals', () => {
    expect(parseRmAmountInput('')).toBe(null)
    expect(parseRmAmountInput('164801.50')).toBe(164801.5)
    expect(parseRmAmountInput('18600')).toBe(18600)
  })

  it('rejects more than two decimal places', () => {
    expect(parseRmAmountInput('1.234')).toBe('invalid')
  })
})
