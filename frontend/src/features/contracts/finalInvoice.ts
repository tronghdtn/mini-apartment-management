import { z } from 'zod'
import { fitsTextColumn } from '../../lib/textLimits.ts'
import { finalMeterPreviewSchema, type FinalMeterPreviewInput } from './closure.ts'

const privatePhotoSchema = z.custom<File>(value => typeof File !== 'undefined'
  && value instanceof File && value.size <= 5 * 1024 * 1024
  && ['image/jpeg', 'image/png', 'image/webp'].includes(value.type), 'Ảnh phải là JPG, PNG hoặc WebP và không vượt quá 5 MB.')

const damageSchema = z.object({
  description: z.string().trim().min(1, 'Vui lòng nhập tên hạng mục.').max(255),
  reason: z.string().trim().min(1, 'Vui lòng nhập lý do.').max(2000).refine(fitsTextColumn, 'Lý do vượt giới hạn lưu trữ.'),
  basis: z.string().trim().min(1, 'Vui lòng nhập căn cứ.').max(2000).refine(fitsTextColumn, 'Căn cứ vượt giới hạn lưu trữ.'),
  amount: z.number().int().safe().positive('Số tiền phải lớn hơn 0 VND.').max(9007199254740991),
  photos: z.array(privatePhotoSchema).min(1, 'Mỗi hạng mục cần ít nhất một ảnh.').max(5),
}).strict()

export const finalInvoiceInputSchema = z.object({
  damages: z.array(damageSchema).max(10),
  waiver_code: z.string().max(50),
  waiver_note: z.string().trim().max(2000, 'Căn cứ miễn phí tối đa 2000 ký tự.').refine(fitsTextColumn, 'Căn cứ miễn phí vượt giới hạn lưu trữ.'),
  waiver_evidence: z.array(privatePhotoSchema).max(5),
}).superRefine((value, context) => {
  if (value.waiver_code && (!value.waiver_note || value.waiver_evidence.length === 0)) {
    context.addIssue({ code: 'custom', path: ['waiver_note'], message: 'Khi miễn phí cần ghi căn cứ và tải ít nhất một ảnh.' })
  }
  if (!value.waiver_code && (value.waiver_note || value.waiver_evidence.length > 0)) {
    context.addIssue({ code: 'custom', path: ['waiver_code'], message: 'Chọn điều kiện miễn đã thỏa thuận trong hợp đồng.' })
  }
}).strict()

export type FinalInvoiceInput = z.infer<typeof finalInvoiceInputSchema>

export interface FinalInvoiceDraft {
  contract_closure_note?: string | null
  id: number
  type: 'final'
  status: 'draft' | 'issued' | 'partially_paid' | 'paid' | 'cancelled'
  total_amount: number
  paid_amount: number
  revision: string | null
  items?: { id: number; item_type: string; description: string; amount: number; basis: string | null; evidence_urls: string[] }[]
}

export function buildFinalInvoiceFormData(closure: FinalMeterPreviewInput, input: FinalInvoiceInput, expectedRevision: string): FormData {
  const valid = finalInvoiceInputSchema.parse(input)
  const validClosure = finalMeterPreviewSchema.parse(closure)
  z.string().regex(/^[a-f0-9]{64}$/).parse(expectedRevision)
  const body = new FormData()
  body.append('actual_end_date', validClosure.actual_end_date)
  body.append('closure_note', validClosure.closure_note)
  body.append('expected_revision', expectedRevision)
  body.append('electricity_reading', validClosure.electricity_reading)
  body.append('water_reading', validClosure.water_reading)
  valid.damages.forEach((damage, index) => {
    body.append('damages[' + index + '][description]', damage.description)
    body.append('damages[' + index + '][reason]', damage.reason)
    body.append('damages[' + index + '][basis]', damage.basis)
    body.append('damages[' + index + '][amount]', String(damage.amount))
    damage.photos.forEach(photo => body.append('damage_photos[' + index + '][]', photo))
  })
  if (valid.waiver_code) {
    body.append('waiver_code', valid.waiver_code)
    body.append('waiver_note', valid.waiver_note)
    valid.waiver_evidence.forEach(photo => body.append('waiver_evidence[]', photo))
  }

  return body
}
