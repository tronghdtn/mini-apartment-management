export type UserRole = 'user' | 'resident' | 'admin' | 'technician' | 'guard'

/** Danh sách trường được UserResource cho phép, giữ nguyên snake_case. */
export interface AuthUser {
  id: number
  full_name: string
  email: string | null
  phone: string
  role: UserRole
  status: 'active' | 'locked'
}

export const roleLabels: Record<UserRole, string> = {
  user: 'Khách đã đăng ký', resident: 'Cư dân', admin: 'Quản trị viên',
  technician: 'Kỹ thuật viên', guard: 'Bảo vệ',
}

export function accountDestination(user: AuthUser) {
  return user.role === 'admin' ? '/admin' : '/account/profile'
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
  return accountDestination(user)
}
