import type { MaintenancePriority, MaintenanceStatus } from './types'

export const maintenanceStatusLabels: Record<MaintenanceStatus, string> = {
  pending: 'Chờ tiếp nhận',
  in_progress: 'Đang xử lý',
  resolved: 'Đã hoàn tất',
  rejected: 'Từ chối',
}

export const maintenanceStatusTones: Record<MaintenanceStatus, 'amber' | 'sky' | 'emerald' | 'rose'> = {
  pending: 'amber', in_progress: 'sky', resolved: 'emerald', rejected: 'rose',
}

export const maintenancePriorityLabels: Record<MaintenancePriority, string> = {
  low: 'Thấp', normal: 'Bình thường', high: 'Cao', urgent: 'Khẩn cấp',
}

export const maintenancePriorityTones: Record<MaintenancePriority, 'slate' | 'sky' | 'amber' | 'rose'> = {
  low: 'slate', normal: 'sky', high: 'amber', urgent: 'rose',
}
