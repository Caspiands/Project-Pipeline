import { Placeholder } from '@/components/Placeholder'

export function OverviewPage() {
  return (
    <Placeholder
      title="Overview"
      lead="Company-wide revenue against target, the six headline tiles, value by stage, expected invoices for the next six months and the by-owner table."
      phase={5}
      items={[
        'booked revenue, gap to target and LOA/PO in hand',
        'open pipeline, verbal yes without LOA, invoiced not paid, overdue next steps',
        'value and count by stage',
        'expected invoices by month',
        'each owner against their committed number',
      ]}
    />
  )
}
