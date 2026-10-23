export type RoomStatus = 'available' | 'occupied' | 'maintenance' | 'inactive'

export const roomStatusLabels: Record<RoomStatus, string> = {
  available: 'Còn trống', occupied: 'Đang thuê', maintenance: 'Bảo trì', inactive: 'Ngừng dùng',
}

export interface Room {
  id: number
  building_id: number
  building: { id: number; name: string }
  code: string
  floor_number: number
  area: string
  base_price: number
  deposit_amount: number
  max_occupants: number
  status: RoomStatus
  is_public: boolean
  description: string | null
}

export interface RoomPage {
  data: Room[]
  links: { first: string; last: string; prev: string | null; next: string | null }
  meta: { current_page: number; last_page: number; total: number; per_page: number }
}

export interface BuildingOption { id: number; name: string; total_floors: number }
export interface RoomFilters { building_id: string; status: string; q: string }
