export type ResidentContractStatus = 'active' | 'terminated' | 'expired'
export interface ResidentContract {
  id: number
  contract_number: string | null
  status: ResidentContractStatus
  start_date: string
  end_date: string
  planned_handover_date: string
  actual_end_date: string | null
  monthly_rent: number
  deposit_amount: number
  deposit_status: 'unpaid' | 'held' | 'settled' | 'transferred'
  room: { code: string; building_name: string; address: string }
}
export interface ResidentContractDetail extends ResidentContract {
  occupant_count: number
  occupants: { full_name: string; relationship: string | null }[]
  initial_electricity_reading: string | null
  initial_water_reading: string | null
  early_termination_fee_type: 'none' | 'fixed' | 'rent_multiple' | null
  early_termination_fee_amount: number | null
  early_termination_fee_multiplier: string | null
  early_termination_waiver_conditions: { code: string; description: string }[]
  deposit_paid_at: string | null
  deposit_settled_at: string | null
  deposit_deducted_amount: number
  deposit_refund_amount: number
  closure_reason: string | null
  inspection_result: string | null
  inspected_at: string | null
  inspection_note: string | null
  inspection_photos?: { id: number; url: string; mime_type: string; size_bytes: number }[]
  final_invoice_id: number | null
  contract_services: { id: number; name: string; billing_type: string; unit: string | null; quantity: string; unit_price: number | null; start_date: string; end_date: string | null }[]
}
export interface ResidentContractPage {
  data: ResidentContract[]
  meta: { current_page: number; last_page: number; total: number }
}
export const residentContractStatusLabels: Record<ResidentContractStatus, string> = { active: 'Đang hiệu lực', terminated: 'Đã thanh lý', expired: 'Đã kết thúc' }
export const depositStatusLabels: Record<ResidentContract['deposit_status'], string> = { unpaid: 'Chưa nhận cọc', held: 'Đang giữ cọc', settled: 'Đã đối soát', transferred: 'Đã chuyển cọc' }
