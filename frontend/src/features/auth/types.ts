export type UserRole = 'user' | 'resident' | 'admin' | 'technician' | 'guard'

/** Danh sách trường được UserResource cho phép, giữ nguyên snake_case. */
export interface AuthUser {
  id: number
  full_name: string
  email: string | null
  phone: string
  role: UserRole
  status: 'active' | 'locked'
  /** DB-D95: email hiện tại đã xác minh qua liên kết. */
  email_verified: boolean
}

export const roleLabels: Record<UserRole, string> = {
  user: 'Khách đã đăng ký', resident: 'Cư dân', admin: 'Quản trị viên',
  technician: 'Kỹ thuật viên', guard: 'Bảo vệ',
}

export function accountDestination(user: AuthUser) {
  if (user.role === 'admin') return '/admin'
  if (user.role === 'resident') return '/resident'
  if (user.role === 'technician' || user.role === 'guard') return '/staff/profile'
  return '/account/profile'
}

export function profileDestination(user: AuthUser) {
  if (user.role === 'admin') return '/admin/profile'
  if (user.role === 'resident') return '/resident/profile'
  if (user.role === 'technician' || user.role === 'guard') return '/staff/profile'
  return '/account/profile'
}

/** Cùng lối vào lịch hẹn cho menu desktop/mobile; không thay quyền API. */
export function appointmentsDestination(role: UserRole) {
  return role === 'admin' || role === 'guard' ? null : '/account/appointments'
}

/** Không nhận URL ngoài ứng dụng hoặc đưa tài khoản vào vùng sai vai trò. */
export function safeDestination(value: unknown, user: AuthUser): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || (value.includes('\\') || Array.from(value).some(character => character.charCodeAt(0) < 33))) {
    return accountDestination(user)
  }
  const url = new URL(value, window.location.origin)
  if (url.origin !== window.location.origin) return accountDestination(user)
  if (['/account/profile', '/account/appointments'].includes(url.pathname)) return value
  if (user.role === 'admin' && (url.pathname === '/admin' || url.pathname.startsWith('/admin/'))) return value
  if (user.role === 'resident' && (url.pathname === '/resident' || url.pathname.startsWith('/resident/'))) return value
  if (['technician', 'guard'].includes(user.role) && ['/staff/profile', '/staff/notifications'].includes(url.pathname)) return value
  if (user.role === 'technician' && (url.pathname === '/staff/maintenance-requests' || url.pathname.startsWith('/staff/maintenance-requests/'))) return value
  if (user.role === 'guard' && url.pathname === '/staff/appointments') return value
  return accountDestination(user)
}
