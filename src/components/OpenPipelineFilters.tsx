import { useBoard } from '@/lib/board/BoardProvider'
import { distinctOpenInvoiceYears, type OpenPipelineFilters } from '@/lib/board/openPipeline'
import { activePeople } from '@/lib/board/names'
import { uniqueAccountsSorted } from '@/lib/board/owners'
import { fmtInt } from '@/lib/format'

type Props = {
  filters: OpenPipelineFilters
  onChange: (patch: Partial<OpenPipelineFilters>) => void
  matchCount: number
  dealTotal: number
}

export function OpenPipelineFiltersBar({ filters, onChange, matchCount, dealTotal }: Props) {
  const { data } = useBoard()
  if (!data) return null

  const people = activePeople(data)
  const ownerValue = [...people.map((p) => p.id), 'none', 'all'].includes(filters.owner) ? filters.owner : 'all'
  const accounts = uniqueAccountsSorted(data)
  const accountValue = filters.account === 'all' || accounts.includes(filters.account) ? filters.account : 'all'
  const years = distinctOpenInvoiceYears(data)
  const yearValue =
    filters.invoiceYear === 'all' || years.map(String).includes(filters.invoiceYear) ? filters.invoiceYear : 'all'

  return (
    <div className="filters" data-testid="open-pipeline-filters">
      <label>
        Segment
        <select value={filters.seg} onChange={(e) => onChange({ seg: e.target.value as OpenPipelineFilters['seg'] })}>
          <option value="all">All</option>
          <option value="Tech">Tech</option>
          <option value="Agency">Agency</option>
          <option value="Mixed">Mixed</option>
        </select>
      </label>
      <label>
        Owner
        <select value={ownerValue} onChange={(e) => onChange({ owner: e.target.value })}>
          <option value="all">All</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
          <option value="none">Unassigned</option>
        </select>
      </label>
      <label>
        Account
        <select value={accountValue} onChange={(e) => onChange({ account: e.target.value })}>
          <option value="all">All</option>
          {accounts.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </label>
      <label>
        Invoice year
        <select value={yearValue} onChange={(e) => onChange({ invoiceYear: e.target.value })}>
          <option value="all">All</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
      </label>
      <label>
        Search
        <input
          type="search"
          value={filters.q}
          onChange={(e) => onChange({ q: e.target.value })}
          placeholder="Search whole row (account, owners, stage, value…)"
        />
      </label>
      <span className="small muted" data-testid="open-pipeline-filter-count">
        {dealTotal ? `${fmtInt(matchCount)} of ${fmtInt(dealTotal)} open deals match` : ''}
      </span>
    </div>
  )
}
