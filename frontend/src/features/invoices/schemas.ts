import { z } from 'zod'
const id = z.number().int().positive('Vui lòng chọn hợp đồng.').max(Number.MAX_SAFE_INTEGER)
const period = z.iso.date({ error: 'Ngày không hợp lệ.' }).refine(value => value >= '1000-01-01' && value.endsWith('-01'), 'Kỳ hóa đơn phải là ngày 01, năm từ 1000 đến 9999.')
export const createInvoiceSchema = z.object({ contract_id: id, period })
export const otherChargeSchema = z.object({ description: z.string().trim().min(1, 'Cần tên khoản thu.').max(255, 'Tối đa 255 ký tự.'),
  amount: z.number({ error: 'Nhập số tiền VND.' }).int('Số tiền phải là số nguyên.').min(1, 'Số tiền phải lớn hơn 0.').max(Number.MAX_SAFE_INTEGER),
  basis: z.string().trim().min(1, 'Cần lý do/căn cứ thu hợp lệ.').max(2000, 'Tối đa 2000 ký tự.') })
export const invoiceReasonSchema = z.object({ reason: z.string().trim().min(1, 'Cần lý do.').max(2000, 'Tối đa 2000 ký tự.') })
export const invoiceFiltersSchema = z.object({ status: z.enum(['', 'draft', 'issued', 'partially_paid', 'paid', 'cancelled']),
  period: z.union([z.literal(''), period]), overdue: z.enum(['', '1']),
  contract_id: z.union([z.literal(''), z.string().regex(/^[1-9]\d*$/).refine(value => Number.isSafeInteger(Number(value)) && Number(value) <= 2147483647)]).optional(),
  page: z.string().regex(/^[1-9]\d*$/).refine(value => Number.isSafeInteger(Number(value)) && Number(value) <= 2147483647) })
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
export type OtherChargeInput = z.infer<typeof otherChargeSchema>
export type InvoiceReasonInput = z.infer<typeof invoiceReasonSchema>
export type InvoiceFilters = z.infer<typeof invoiceFiltersSchema>
