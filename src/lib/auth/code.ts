/** Keeps only digits and at most six of them, so pasted codes like "123 456" work. */
export function normaliseCode(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 6)
}
