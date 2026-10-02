import { Placeholder } from '@/components/Placeholder'

export function ProspectsPage() {
  return (
    <Placeholder
      title="Prospects not yet in the pipeline"
      lead="Companies we have contact details for but no opportunity yet, such as the SSM convention list."
      phase={7}
      items={['status bar and counts', 'the prospect table sorted green → yellow → orange → white', 'paste from spreadsheet', 'move to pipeline']}
    />
  )
}
