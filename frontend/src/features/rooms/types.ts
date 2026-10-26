export interface PublicRoom {
  id: number
  code: string
  floor_number: number
  area: string
  base_price: number
  deposit_amount: number
  max_occupants: number
  description: string | null
  building: { id: number; name: string; address: string; latitude: string | null; longitude: string | null }
  amenities: { id: number; name: string; description: string | null }[]
}

export interface PublicRoomPage {
  data: PublicRoom[]
  meta: { current_page: number; last_page: number; total: number }
}

export interface PublicRoomOptions {
  buildings: { id: number; name: string }[]
  amenities: { id: number; name: string }[]
}
