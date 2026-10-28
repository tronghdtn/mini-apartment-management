import { z } from 'zod'

function isFirstDay(value: string): boolean {
  const parts = /^(\d{4})-(0[1-9]|1[0-2])-01$/.exec(value)
  return parts !== null && Number(parts[1]) >= 1000
}
export const utilityPriceSchema = z.object({
  building_id: z.number({ error: 'Vui lòng chọn tòa nhà.' }).int().positive('Vui lòng chọn tòa nhà.').max(Number.MAX_SAFE_INTEGER),
  service_id: z.number({ error: 'Vui lòng chọn dịch vụ.' }).int().positive('Vui lòng chọn dịch vụ.').max(Number.MAX_SAFE_INTEGER),
  unit_price: z.number({ error: 'Vui lòng nhập đơn giá.' }).int('Đơn giá phải là số nguyên đồng VND.')
    .positive('Đơn giá phải lớn hơn 0.').max(Number.MAX_SAFE_INTEGER, 'Đơn giá vượt giới hạn xử lý an toàn.'),
  effective_from: z.string().refine(isFirstDay, 'Kỳ hiệu lực phải là ngày 01 của tháng, năm từ 1000 đến 9999, đúng định dạng năm-tháng-ngày.'),
})
export type UtilityPriceInput = z.infer<typeof utilityPriceSchema>

const filterId = z.string().regex(/^(?:|[1-9]\d*)$/, 'Mã lọc phải là số nguyên dương.').refine(value => !value || Number.isSafeInteger(Number(value)), 'Mã lọc vượt giới hạn.')
export const utilityPriceFiltersSchema = z.object({
  building_id: filterId, service_id: filterId,
  page: z.string().regex(/^[1-9]\d*$/, 'Trang phải là số nguyên dương.').refine(value => Number.isSafeInteger(Number(value)) && Number(value) <= 2147483647, 'Trang vượt giới hạn.'),
}).strict()
