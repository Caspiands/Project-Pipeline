import { Placeholder } from '@/components/Placeholder'

export function TargetsPage() {
  return (
    <Placeholder
      title="Company target"
      lead="Target year, annual target, the finance-reported revenue to date and each person's committed number. Only admins can change these."
      phase={8}
      items={['target year, annual target, finance figure and as-of date', 'committed revenue by person']}
    />
  )
}
