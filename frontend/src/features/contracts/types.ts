export type ContractStatus = 'draft' | 'active' | 'terminated' | 'expired'

export const contractStatusLabels: Record<ContractStatus, string> = {
  draft: 'Bản nháp', active: 'Đang hiệu lực', terminated: 'Đã thanh lý', expired: 'Hết hạn',
}

export const depositStatusLabels: Record<string, string> = {
  unpaid: 'Chưa nhận', held: 'Đang giữ cọc', settled: 'Đã đối soát', transferred: 'Đã chuyển cọc',
}

export const earlyTerminationFeeLabels = { none: 'Không thu phí trước hạn', fixed: 'Số tiền cố định', rent_multiple: 'Hệ số nhân tiền thuê tháng' } as const

type StatusTone = 'emerald' | 'sky' | 'amber' | 'slate'
export const contractStatusTones: Record<ContractStatus, StatusTone> = { draft: 'amber', active: 'emerald', terminated: 'slate', expired: 'slate' }
export const depositStatusTone = (status: string): StatusTone => ({ held: 'sky', settled: 'emerald' } as Record<string, StatusTone>)[status] ?? 'slate'
/** Hợp đồng cọc 0đ không có khoản phải nhận; tránh hiện "Chưa nhận" gây hiểu nhầm. */
export const depositStatusText = (contract: Pick<Contract, 'deposit_amount' | 'deposit_status'>) =>
  contract.deposit_amount === 0 && contract.deposit_status === 'unpaid' ? 'Không yêu cầu cọc' : depositStatusLabels[contract.deposit_status] ?? contract.deposit_status

/** Mã hiển thị: hợp đồng chỉ có mã sau khi kích hoạt. */
export const contractLabel = (contract: Pick<Contract, 'id' | 'contract_number'>) => contract.contract_number ?? `Bản nháp #${contract.id}`

/** Hợp đồng vẫn hiệu lực sau ngày cuối được ở (chưa bàn giao). Chỉ để cảnh báo, không đổi trạng thái hay tiền. */
export const isPastLastDay = (contract: Pick<Contract, 'status' | 'end_date'>, today: string) => contract.status === 'active' && contract.end_date < today

export interface Contract {
  id: number
  lifecycle_revision: string | null
  contract_number: string | null
  room_id: number
  user_id: number
  status: ContractStatus
  start_date: string
  end_date: string
  actual_end_date: string | null
  monthly_rent: number
  deposit_amount: number
  deposit_status: string
  deposit_paid_at: string | null
  activated_at: string | null
  early_termination_fee_type: 'none' | 'fixed' | 'rent_multiple' | null
  early_termination_fee_amount: number | null
  early_termination_fee_multiplier: string | null
  early_termination_waiver_conditions: { code: string; description: string }[] | null
  inspection_result: 'no_damage' | 'damaged' | null
  inspected_by: number | null
  inspected_at: string | null
  inspection_note: string | null
  inspection_photos?: { id: number; url: string; mime_type: string; size_bytes: number }[]
  meter_gap_reason: string | null
  meter_gap_confirmed_by: number | null
  occupant_count: number
  initial_electricity_reading: string | null
  initial_water_reading: string | null
  note: string | null
  created_at: string | null
  updated_at: string | null
  contract_services?: ContractServiceLine[]
  room: { id: number; code: string; status: string; max_occupants: number; building: { id: number; name: string } }
  tenant: { id: number; full_name: string; phone: string; email: string | null; role: string; status: string }
}

export type ContractBillingType = 'per_room' | 'per_person' | 'per_unit' | 'metered'
export interface ContractServiceOption {
  id: number; code: string; name: string; billing_type: ContractBillingType
  unit: string | null; price: number | null; status: 'active' | 'inactive'
}
export interface ContractServiceLine {
  id: number; service_id: number; quantity: string; unit_price: number | null
  start_date: string; end_date: string | null
  service: Omit<ContractServiceOption, 'id' | 'price'>
}

export interface ContractPage {
  data: Contract[]
  meta: { current_page: number; last_page: number; total: number; per_page: number }
}

export interface ContractRoomOption {
  id: number
  code: string
  status: string
  base_price: number
  deposit_amount: number
  max_occupants: number
  building: { id: number; name: string }
}

export interface ContractTenantOption {
  id: number
  full_name: string
  phone: string
  email: string | null
  role: string
  status: string
  has_active_contract: boolean
}

export interface ContractOptions { rooms: ContractRoomOption[]; tenants: ContractTenantOption[] }
