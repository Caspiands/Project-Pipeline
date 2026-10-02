import { AuthLayout } from './AuthLayout'

/** Shown for the moment it takes to ask the database whether this session may see the board. */
export function CheckingScreen({ text = 'Checking your sign-in…' }: { text?: string }) {
  return (
    <AuthLayout>
      <p role="status" style={{ marginTop: 18 }}>
        {text}
      </p>
    </AuthLayout>
  )
}
