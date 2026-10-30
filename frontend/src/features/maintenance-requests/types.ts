export type MaintenancePriority = 'low' | 'normal' | 'high' | 'urgent'
export type MaintenanceStatus = 'pending' | 'in_progress' | 'resolved' | 'rejected'

export interface MaintenancePhoto {
  id: number
  url: string
  mime_type: string
  size_bytes: number
}

export interface MaintenanceRequest {
  id: number
  code: string
  title: string
  description: string
  priority: MaintenancePriority
  status: MaintenanceStatus
  room: { id: number; code: string; building_name: string }
  reporter: { full_name: string; phone?: string } | null
  assignee: { id: number; full_name: string } | null
  admin_note: string | null
  handler_note: string | null
  assigned_at: string | null
  started_at: string | null
  resolved_at: string | null
  created_at: string | null
  photos: MaintenancePhoto[]
}

export interface MaintenancePage {
  data: MaintenanceRequest[]
  links: { first: string | null; last: string | null; prev: string | null; next: string | null }
  meta: { current_page: number; last_page: number; per_page: number; total: number }
}

export interface MaintenanceContext {
  room: { id: number; code: string; building_name: string; address: string }
}

export interface TechnicianOption {
  id: number
  full_name: string
  phone: string
  role: 'technician'
  status: 'active'
}
