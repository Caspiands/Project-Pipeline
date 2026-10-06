import { useLocation } from 'react-router-dom'
import { useBoard } from '@/lib/board/BoardProvider'
import {
  distinctInvoiceMonths,
  distinctQuarters,
  distinctQuoteMonths,
  quarterLabel,
} from '@/lib/board/dateFilters'
import { filterOpportunities } from '@/lib/board/filters'
import { activePeople } from '@/lib/board/names'
import { uniqueAccountsSorted } from '@/lib/board/owners'
import { fmtInt, fmtMonth } from '@/lib/format'
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

  const accounts = uniqueAccountsSorted(data)
  const accountValue = filters.account === 'all' || accounts.includes(filters.account) ? filters.account : 'all'
  const years = [...new Set(data.opps.flatMap((o) => o.invoices.map((i) => String(i.revenueYear))))].sort()
  const invoiceMonths = distinctInvoiceMonths(data.opps)
  const invoiceQuarters = distinctQuarters(invoiceMonths)
  const quoteMonths = distinctQuoteMonths(data.opps)
  const quoteQuarters = distinctQuarters(quoteMonths)

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
        Account
        <select value={accountValue} onChange={(e) => setFilters({ account: e.target.value })}>
          <option value="all">All</option>
          {accounts.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
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
          placeholder="Search whole row (account, owners, stage, value…)"
        />
      </label>
      <label>
        Invoice month
        <select value={filters.invoiceMonth} onChange={(e) => setFilters({ invoiceMonth: e.target.value })}>
          <option value="all">Any</option>
          {invoiceMonths.map((m) => (
            <option key={m} value={m}>{fmtMonth(m)}</option>
          ))}
        </select>
      </label>
      <label>
        Invoice quarter
        <select value={filters.invoiceQuarter} onChange={(e) => setFilters({ invoiceQuarter: e.target.value })}>
          <option value="all">Any</option>
          {invoiceQuarters.map((q) => (
            <option key={q} value={q}>{quarterLabel(q)}</option>
          ))}
        </select>
      </label>
      <label>
        Quote from
        <input type="date" value={filters.quoteFrom} onChange={(e) => setFilters({ quoteFrom: e.target.value })} />
      </label>
      <label>
        Quote to
        <input type="date" value={filters.quoteTo} onChange={(e) => setFilters({ quoteTo: e.target.value })} />
      </label>
      <label>
        Quote month
        <select value={filters.quoteMonth} onChange={(e) => setFilters({ quoteMonth: e.target.value })}>
          <option value="all">Any</option>
          {quoteMonths.map((m) => (
            <option key={m} value={m}>{fmtMonth(m)}</option>
          ))}
        </select>
      </label>
      <label>
        Quote quarter
        <select value={filters.quoteQuarter} onChange={(e) => setFilters({ quoteQuarter: e.target.value })}>
          <option value="all">Any</option>
          {quoteQuarters.map((q) => (
            <option key={q} value={q}>{quarterLabel(q)}</option>
          ))}
        </select>
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
