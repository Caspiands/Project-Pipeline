import { useLocation } from 'react-router-dom'
import { useBoard } from '@/lib/board/BoardProvider'
import { filterOpportunities } from '@/lib/board/filters'
import { activePeople } from '@/lib/board/names'
import { fmtInt } from '@/lib/format'
import { STAGES } from '@/lib/stages'

const HIDE_ON = ['/targets', '/prospects', '/team', '/audit']

export function FilterBar() {
  const { pathname } = useLocation()
  const { data, filters, setFilters } = useBoard()
  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null
  if (!data) return null

  const people = activePeople(data)
  const matchCount = filterOpportunities(data, filters, { respectStageFilter: false }).length
  const ownerValue = [...people.map((p) => p.id), 'none', 'all'].includes(filters.owner) ? filters.owner : 'all'

  const years = [...new Set(data.opps.map((o) => String(o.revenueYear)))].sort()

  return (
    <div className="filters" data-testid="filter-bar">
      <label>
        Segment
        <select value={filters.seg} onChange={(e) => setFilters({ seg: e.target.value as typeof filters.seg })}>
          <option value="all">All</option>
          <option value="Tech">Tech</option>
          <option value="Agency">Agency</option>
          <option value="Mixed">Mixed</option>
        </select>
      </label>
      <label>
        Owner
        <select value={ownerValue} onChange={(e) => setFilters({ owner: e.target.value })}>
          <option value="all">All</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
          <option value="none">Unassigned</option>
        </select>
      </label>
      <label>
        Revenue year
        <select value={filters.year} onChange={(e) => setFilters({ year: e.target.value })}>
          <option value="all">All</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </label>
      <label>
        Search
        <input
          type="search"
          value={filters.q}
          onChange={(e) => setFilters({ q: e.target.value })}
          placeholder="Account, item, quote, notes"
        />
      </label>
      {pathname.startsWith('/pipeline') && (
        <>
          <label>
            <input type="checkbox" checked={filters.lost} onChange={(e) => setFilters({ lost: e.target.checked })} />
            Show lost
          </label>
          <label>
            Stage
            <select value={filters.stage} onChange={(e) => setFilters({ stage: e.target.value as typeof filters.stage })}>
              <option value="all">All</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </>
      )}
      <span className="small muted" data-testid="filter-count">
        {data.opps.length ? `${fmtInt(matchCount)} of ${fmtInt(data.opps.length)} opportunities match` : ''}
      </span>
    </div>
  )
}
