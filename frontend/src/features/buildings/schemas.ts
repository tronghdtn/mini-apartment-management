import { z } from 'zod'
import { fitsTextColumn } from '../../lib/textLimits.ts'

function coordinateSchema(limit: number, label: string) {
  return z.string().trim().refine(value => value === '' || (/^[+-]?\d+(?:\.\d{1,7})?$/.test(value) && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= limit), `${label} không hợp lệ (tối đa 7 chữ số thập phân).`)
}

export const buildingSchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập tên tòa nhà.').max(150, 'Tên tối đa 150 ký tự.'),
  address: z.string().trim().min(1, 'Vui lòng nhập địa chỉ.').max(500, 'Địa chỉ tối đa 500 ký tự.'),
  total_floors: z.number({ error: 'Vui lòng nhập số tầng.' }).int('Số tầng phải là số nguyên.').min(1, 'Số tầng phải từ 1.').max(65535, 'Số tầng tối đa 65535.'),
  latitude: coordinateSchema(90, 'Vĩ độ'),
  longitude: coordinateSchema(180, 'Kinh độ'),
  description: z.string().trim().refine(fitsTextColumn, 'Mô tả quá dài. Vui lòng rút gọn nội dung.'),
})

export type BuildingInput = z.infer<typeof buildingSchema>
