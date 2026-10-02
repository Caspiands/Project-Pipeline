import { useEffect } from 'react'
import { useBoard } from '@/lib/board/BoardProvider'

export function Toast() {
  const { toast, setToast } = useBoard()
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(t)
  }, [toast, setToast])
  if (!toast) return null
  return (
    <div className="toast" role="status">
      {toast}
    </div>
  )
}
