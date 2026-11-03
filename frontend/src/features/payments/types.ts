export type PaymentStatus = 'pending' | 'confirmed' | 'rejected'
export interface Payment {
  id: number; invoice_id: number; amount: number; method: 'cash' | 'bank_transfer' | 'deposit'; status: PaymentStatus
  receipt_number: string | null; created_at: string; reviewed_at: string | null; reviewed_by: number | null; reject_reason: string | null
  revision: string | null; has_proof: boolean
  invoice: { id: number; invoice_number: string | null; contract_id: number; room_code: string; building_name: string; tenant_name: string; status: string; total_amount: number; paid_amount: number; outstanding_amount: number }
}
export interface PaymentPage { data: Payment[]; meta: {current_page: number; last_page: number; total: number} }
export const paymentStatusLabels: Record<PaymentStatus, string> = { pending: 'Chờ đối soát', confirmed: 'Đã xác nhận', rejected: 'Đã từ chối' }
export const paymentMethodLabels = { cash: 'Tiền mặt', bank_transfer: 'Chuyển khoản', deposit: 'Khấu trừ cọc' }
/** DB-D94: ngân hàng/số tiền là null khi hóa đơn không còn nợ hoặc chưa cấu hình tài khoản nhận. */
export interface PaymentInstructions { payable: boolean; configured: boolean; bank_name: string | null; account_number: string | null; account_holder: string | null; amount: number | null; transfer_content: string | null }
