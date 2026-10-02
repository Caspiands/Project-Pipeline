import { describe, expect, it } from 'vitest'
import { normStatus, parseProspectPaste } from './prospectImport'

describe('prospectImport', () => {
  it('maps colour words to status keys', () => {
    expect(normStatus('Ready to meet')).toBe('green')
    expect(normStatus('budget limited')).toBe('yellow')
  })

  it('parses a header row', () => {
    const rows = parseProspectPaste('Company,Contact,Status\nAcme,Jane,green', 'SSM', null)
    expect(rows).toHaveLength(1)
    expect(rows[0].company).toBe('Acme')
    expect(rows[0].status).toBe('green')
  })
})
