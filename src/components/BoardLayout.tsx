import { Outlet } from 'react-router-dom'
import { BoardProvider } from '@/lib/board/BoardProvider'
import { OpportunityDrawer } from './OpportunityDrawer'
import { Toast } from './Toast'
import { IdleTimeoutGuard } from './IdleTimeoutGuard'

export function BoardLayout() {
  return (
    <BoardProvider>
      <IdleTimeoutGuard />
      <Outlet />
      <OpportunityDrawer />
      <Toast />
    </BoardProvider>
  )
}
