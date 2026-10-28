import { z } from 'zod'
const amount = z.number({ error: 'Nhập số tiền VND.' }).int('Số tiền phải là số nguyên VND.').min(1, 'Số tiền phải lớn hơn 0.').max(Number.MAX_SAFE_INTEGER, 'Số tiền vượt giới hạn.')
const received = z.boolean().refine(value => value, 'Cần xác nhận đã thực nhận đúng số tiền.')
export const paymentProofSchema = z.object({ amount, proof: z.instanceof(File).optional()
  .refine(file => !!file, 'Cần một ảnh minh chứng.')
  .refine(file => !file || ['image/jpeg', 'image/png', 'image/webp'].includes(file.type), 'Chọn ảnh JPG, PNG hoặc WebP.')
  .refine(file => !file || (file.size > 0 && file.size <= 5 * 1024 * 1024), 'Ảnh phải lớn hơn 0 và tối đa 5 MB.') })
export const directPaymentSchema = z.object({ amount, method: z.enum(['cash', 'bank_transfer']), confirmed_received: received })
export const confirmPaymentSchema = z.object({ confirmed_received: received })
export const rejectPaymentSchema = z.object({ reject_reason: z.string().trim().min(1, 'Cần lý do từ chối.').max(2000, 'Lý do tối đa 2000 ký tự.') })
const id = z.string().regex(/^[1-9]\d*$/, 'Mã không hợp lệ.').refine(value => Number.isSafeInteger(Number(value)), 'Mã quá lớn.')
export const paymentFiltersSchema = z.object({ status: z.enum(['', 'pending', 'confirmed', 'rejected']), method: z.enum(['', 'cash', 'bank_transfer', 'deposit']), page: id.refine(value => Number(value) <= 2147483647, 'Trang quá lớn.'), invoice_id: z.union([z.literal(''), id]) })
export type PaymentProofInput = z.infer<typeof paymentProofSchema>
export type DirectPaymentInput = z.infer<typeof directPaymentSchema>
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>
export type RejectPaymentInput = z.infer<typeof rejectPaymentSchema>
export type PaymentFilters = z.infer<typeof paymentFiltersSchema>
