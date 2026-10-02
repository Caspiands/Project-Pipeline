import type { Notice } from '@/lib/auth/auth'

/** The coloured message strip used on the sign-in screens. */
export function AuthMessage({ notice, style }: { notice: Notice | null; style?: React.CSSProperties }) {
  if (!notice) return null
  return (
    <div className={`msg ${notice.kind}`} role={notice.kind === 'err' ? 'alert' : 'status'} style={style}>
      {notice.text}
    </div>
  )
}
