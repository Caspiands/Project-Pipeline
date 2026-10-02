import { Placeholder } from '@/components/Placeholder'

export function ReviewPage() {
  return (
    <Placeholder
      title="Pipeline review"
      lead="Everything that changed since the last team review, in six lists to work through in the meeting."
      phase={6}
      items={[
        'overdue next steps',
        'moved stage since the review',
        'added since the review',
        'open and not updated',
        'starting in the next 60 days',
        'verbal yes or LOA with no start date',
      ]}
    />
  )
}
