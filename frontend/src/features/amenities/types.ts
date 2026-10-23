export interface Amenity {
  id: number
  name: string
  description: string | null
}

export interface AmenityPage {
  data: Amenity[]
  links: { first: string; last: string; prev: string | null; next: string | null }
  meta: { current_page: number; last_page: number; total: number; per_page: number }
}
