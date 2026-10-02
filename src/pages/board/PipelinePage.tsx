import { Placeholder } from '@/components/Placeholder'

export function PipelinePage() {
  return (
    <Placeholder
      title="Pipeline"
      lead="Every opportunity in one sortable table, with a side drawer to add or edit a row in under a minute."
      phase={4}
      items={[
        'all columns from the prototype with sorting and a footer total',
        'show lost toggle and stage filter',
        'the opportunity drawer with stage history and who changed what',
      ]}
    />
  )
}
