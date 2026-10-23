export interface Building {
  id: number
  name: string
  address: string
  total_floors: number
  latitude: string | null
  longitude: string | null
  description: string | null
  status: 'active' | 'inactive'
}

export interface BuildingPage {
  data: Building[]
  links: { first: string; last: string; prev: string | null; next: string | null }
  meta: { current_page: number; last_page: number; total: number; per_page: number }
}
