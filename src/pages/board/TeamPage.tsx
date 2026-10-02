import { Placeholder } from '@/components/Placeholder'

export function TeamPage() {
  return (
    <Placeholder
      title="Team & access"
      lead="Logins, roles and invites, plus the list of deal owners. Admins only."
      phase={8}
      items={[
        'logins with role and active toggle',
        'invite a colleague',
        'deal owners and the show-in-owner-lists toggle',
      ]}
    />
  )
}
