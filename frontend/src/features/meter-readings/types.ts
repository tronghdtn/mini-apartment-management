export interface MeterReading {
  id: number
  room_id: number
  room: { id: number; code: string; building_id: number; building_name: string }
  contract_id: number | null
  invoice_id: number | null
  service_id: number
  service: { id: number; code: string; name: string; unit: string | null }
  kind: 'periodic' | 'final'
  period: string
  reading_date: string
  previous_reading: string
  current_reading: string
  consumption: string
  unit_price: number
  amount: number
}
export interface MeterReadingPage { data: MeterReading[]; meta: { current_page: number; last_page: number; total: number; per_page: number }; links: { first: string; last: string; prev: string | null; next: string | null } }
export interface MeterContext { room_id: number; service_id: number; contract_id: number | null; period: string; reading_date: string; previous_reading: string; baseline_date: string; unit_price: number }
export interface MeterOptions {
  rooms: { id: number; code: string; building_id: number }[]
  buildings: { id: number; name: string }[]
  services: { id: number; code: string; name: string; unit: string | null }[]
}
