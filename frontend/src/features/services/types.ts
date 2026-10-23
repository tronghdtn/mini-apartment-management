export type BillingType = 'per_room' | 'per_person' | 'per_unit' | 'metered'
export const billingTypeLabels: Record<BillingType, string> = {
  per_room: 'Theo phòng', per_person: 'Theo người', per_unit: 'Theo số lượng', metered: 'Theo chỉ số',
}
export interface Service {
  id: number
  code: string
  name: string
  billing_type: BillingType
  unit: string | null
  price: number | null
  status: 'active' | 'inactive'
  description: string | null
}
export interface ServicePage {
  data: Service[]
  links: { first: string; last: string; prev: string | null; next: string | null }
  meta: { current_page: number; last_page: number; total: number; per_page: number }
}
