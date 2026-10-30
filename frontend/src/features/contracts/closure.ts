import { z } from 'zod'
import { fitsTextColumn } from '../../lib/textLimits.ts'

export const closurePreviewSchema = z.object({
  actual_end_date: z.iso.date({ error: 'Vui lòng nhập ngày bàn giao hợp lệ.' }).refine(value => value >= '1000-01-01', 'Ngày ngoài phạm vi lưu trữ.'),
  closure_note: z.string().trim().refine(fitsTextColumn, 'Ghi chú vượt giới hạn lưu trữ.'),
})
export type ClosurePreviewInput = z.infer<typeof closurePreviewSchema>
const meterValueSchema = z.string().trim().regex(/^\d{1,8}(?:\.\d{1,2})?$/, 'Chỉ số gồm tối đa 8 chữ số và 2 số thập phân.')
export const finalMeterPreviewSchema = closurePreviewSchema.extend({
  electricity_reading: meterValueSchema,
  water_reading: meterValueSchema,
}).strict()
export type FinalMeterPreviewInput = z.infer<typeof finalMeterPreviewSchema>
export interface ClosurePreview {
  contract_id: number
  contract_revision: string
  actual_end_date: string
  planned_handover_date: string
  closure_reason: 'same_day' | 'early_termination' | 'on_time' | 'overdue_return'
  early_termination_fee: number
  is_preview: true
}
export interface FinalMeterPreview extends ClosurePreview {
  period: string
  meter_amount: number
  readings: { service_code: 'ELECTRICITY' | 'WATER'; service_name: string; unit: string; period: string; reading_date: string;
    previous_reading: string; current_reading: string; consumption: string; unit_price: number; amount: number }[]
}
export const closureReasonLabels: Record<ClosurePreview['closure_reason'], string> = {
  same_day: 'Nhận và trả cùng ngày', early_termination: 'Bàn giao trước hạn', on_time: 'Bàn giao đúng hạn', overdue_return: 'Bàn giao quá hạn',
}
