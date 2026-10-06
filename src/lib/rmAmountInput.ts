/** Allowed while typing: non-negative, up to two decimal places. */
export const RM_AMOUNT_INPUT_RE = /^\d*\.?\d{0,2}$/

export function parseRmAmountInput(raw: string): number | null | 'invalid' {
  const v = raw.trim().replace(/,/g, '')
  if (!v) return null
  if (!RM_AMOUNT_INPUT_RE.test(v) || v === '.') return 'invalid'
  const n = Number(v)
  if (Number.isNaN(n) || n < 0) return 'invalid'
  return n
}

export function formatRmAmountInput(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return ''
  return String(n)
}
