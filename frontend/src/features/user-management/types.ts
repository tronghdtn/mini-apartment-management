export type ManagedUserRole = 'user' | 'resident' | 'admin' | 'technician' | 'guard'
export type ManagedUserStatus = 'active' | 'locked'

export const managedUserRoleLabels: Record<ManagedUserRole, string> = {
  user: 'Khách đã đăng ký', resident: 'Cư dân', admin: 'Quản trị viên',
  technician: 'Kỹ thuật viên', guard: 'Bảo vệ',
}

export interface ActiveUserContract {
  id: number
  room: { id: number; code: string; building: { id: number; name: string } }
}

export interface UserSummary {
  id: number
  full_name: string
  email: string | null
  phone: string
  role: ManagedUserRole
  status: ManagedUserStatus
  created_at: string | null
  has_active_contract: boolean
  active_contract: ActiveUserContract | null
}

export interface UserDetail extends UserSummary {
  id_number: string | null
  date_of_birth: string | null
  gender: string | null
  permanent_address: string | null
}

export interface UserPage {
  data: UserSummary[]
  links: { first: string; last: string; prev: string | null; next: string | null }
  meta: { current_page: number; last_page: number; total: number; per_page: number }
}

/** Hiển thị nguyên giá trị lạ thay vì suy diễn thành một giới tính khác. */
export function managedUserGenderLabel(value: string | null): string {
  if (value === null) return 'Chưa cập nhật'
  const labels = new Map([['male', 'Nam'], ['female', 'Nữ'], ['other', 'Khác']])
  return labels.get(value) ?? value
}
