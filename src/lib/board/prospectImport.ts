import type { ProspectStatus } from '@/lib/stages'

export function splitLine(line: string, d: string): string[] {
  if (d === '\t') return line.split('\t').map((s) => s.trim())
  const out: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (q) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (c === '"') q = false
      else cur += c
    } else if (c === '"') q = true
    else if (c === ',') {
      out.push(cur.trim())
      cur = ''
    } else cur += c
  }
  out.push(cur.trim())
  return out
}

export function normStatus(s: string): ProspectStatus {
  s = String(s || '').toLowerCase()
  if (/green|ready|positive/.test(s)) return 'green'
  if (/yellow|budget|interest/.test(s)) return 'yellow'
  if (/orange|work/.test(s)) return 'orange'
  return 'white'
}

export interface ParsedProspectRow {
  company: string
  contactName: string
  designation: string
  phone: string
  email: string
  status: ProspectStatus
  source: string
  ownerId: string | null
}

export function parseProspectPaste(txt: string, defaultSource: string, ownerId: string | null): ParsedProspectRow[] {
  const lines = txt.split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return []
  const d = lines[0].includes('\t') ? '\t' : ','
  let rows = lines.map((l) => splitLine(l, d))
  let idx: Record<string, number | undefined> = { company: 0, contact: 1, designation: 2, phone: 3, email: 4, status: 5, source: 6 }
  const h = rows[0].map((x) => x.toLowerCase())
  if (h.some((x) => /company|organi[sz]ation|firm/.test(x))) {
    idx = {}
    h.forEach((x, i) => {
      if (/company|organi[sz]ation|firm/.test(x) && idx.company == null) idx.company = i
      else if (/designation|title|position|role/.test(x)) idx.designation = i
      else if (/contact|name|pic/.test(x) && idx.contact == null) idx.contact = i
      else if (/phone|mobile|tel/.test(x)) idx.phone = i
      else if (/mail/.test(x)) idx.email = i
      else if (/status|colou?r|stage/.test(x)) idx.status = i
      else if (/source/.test(x)) idx.source = i
    })
    rows = rows.slice(1)
  }
  const g = (r: string[], k: string) => (idx[k] == null ? '' : r[idx[k]!] || '')
  return rows
    .filter((r) => g(r, 'company'))
    .map((r) => ({
      company: g(r, 'company'),
      contactName: g(r, 'contact'),
      designation: g(r, 'designation'),
      phone: g(r, 'phone'),
      email: g(r, 'email'),
      status: normStatus(g(r, 'status')),
      source: g(r, 'source') || defaultSource,
      ownerId,
    }))
}
