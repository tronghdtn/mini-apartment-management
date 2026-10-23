import { z } from 'zod'

function isFirstDay(value: string): boolean {
  const parts = /^(\d{4})-(0[1-9]|1[0-2])-01$/.exec(value)
  return parts !== null && Number(parts[1]) >= 1000
}
export const utilityPriceSchema = z.object({
  service_id: z.number({ error: 'Vui lòng chọn dịch vụ.' }).int().positive('Vui lòng chọn dịch vụ.').max(Number.MAX_SAFE_INTEGER),
  unit_price: z.number({ error: 'Vui lòng nhập đơn giá.' }).int('Đơn giá phải là số nguyên đồng VND.')
    .positive('Đơn giá phải lớn hơn 0.').max(Number.MAX_SAFE_INTEGER, 'Đơn giá vượt giới hạn xử lý an toàn.'),
  effective_from: z.string().refine(isFirstDay, 'Kỳ hiệu lực phải là ngày 01 của tháng, năm từ 1000 đến 9999, đúng định dạng năm-tháng-ngày.'),
})
export type UtilityPriceInput = z.infer<typeof utilityPriceSchema>
