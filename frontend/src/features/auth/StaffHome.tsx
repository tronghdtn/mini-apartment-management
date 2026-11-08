import { Navigate } from 'react-router'
import { useAuth } from './useAuth'
import { accountDestination } from './types'

/** Trang gốc /staff: đưa nhân viên tới màn làm việc chính theo vai trò. */
export function StaffHome() {
  const { user } = useAuth()
  return <Navigate to={user ? accountDestination(user) : '/login'} replace />
}
