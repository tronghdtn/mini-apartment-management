export interface MeteredService { id: number; code: string; name: string; unit: string | null }
export interface UtilityBuilding { id: number; name: string }
export interface UtilityPrice {
  id: number
  building_id: number
  building: UtilityBuilding
  service_id: number
  service: MeteredService
  unit_price: number
  effective_from: string
}
export interface UtilityPricePage {
  data: UtilityPrice[]
  links: { first: string; last: string; prev: string | null; next: string | null }
  meta: { current_page: number; last_page: number; total: number; per_page: number }
}
