import { z } from 'zod'

const integer = (max: bigint, allowZero = false) => z.string().refine(value => value === '' ||
  (/^(0|[1-9]\d*)$/.test(value) && BigInt(value) >= (allowZero ? 0n : 1n) && BigInt(value) <= max),
  `Nhập số nguyên ${allowZero ? 'không âm' : 'dương'} không vượt quá ${max}.`)
const area = z.string().refine(value => value === '' || /^\d{1,6}(?:\.\d{1,2})?$/.test(value),
  'Diện tích tối đa 999999.99 m² và 2 chữ số thập phân.')
const areaUnits = (value: string) => {
  const [whole, fraction = ''] = value.split('.')
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))
}

export const emptyRoomFilters: PublicRoomFilters = {
  q: '', building_id: '', min_price: '', max_price: '', min_area: '', max_area: '',
  min_occupants: '', max_occupants: '', amenity_ids: [] as string[], sort: '',
}

export const publicRoomFiltersSchema = z.strictObject({
  q: z.string().trim().refine(value => [...value].length <= 191, 'Từ khóa tối đa 191 ký tự.'),
  building_id: integer(9007199254740991n),
  min_price: integer(9007199254740991n, true), max_price: integer(9007199254740991n, true),
  min_area: area, max_area: area,
  min_occupants: integer(65535n), max_occupants: integer(65535n),
  amenity_ids: z.array(integer(9007199254740991n).refine(value => value !== '', 'Tiện nghi không hợp lệ.'))
    .refine(values => new Set(values).size === values.length, 'Không chọn trùng tiện nghi.'),
  sort: z.enum(['', 'price_asc', 'price_desc', 'area_asc', 'area_desc'], { error: 'Cách sắp xếp không hợp lệ.' }),
}).superRefine((filters, context) => {
  for (const kind of ['price', 'area', 'occupants'] as const) {
    const min = filters[`min_${kind}`]
    const max = filters[`max_${kind}`]
    const valid = kind === 'area' ? /^\d{1,6}(?:\.\d{1,2})?$/ : /^\d+$/
    if (min && max && valid.test(min) && valid.test(max)) {
      const units = kind === 'area' ? areaUnits : BigInt
      if (units(max) < units(min)) context.addIssue({ code: 'custom', path: [`max_${kind}`], message: 'Giới hạn lớn nhất phải từ giới hạn nhỏ nhất trở lên.' })
    }
  }
})

export type PublicRoomFilters = z.infer<typeof publicRoomFiltersSchema>

/** URL is the source of applied filters, including browser Back/Forward. */
export function readRoomSearch(params: URLSearchParams) {
  const filters = { ...emptyRoomFilters, amenity_ids: params.getAll('amenity_ids[]') }
  for (const key of Object.keys(emptyRoomFilters)) {
    if (key !== 'amenity_ids') Object.assign(filters, { [key]: params.get(key) ?? '' })
  }
  // Preserve previously published search links; only canonical names reach the API.
  filters.building_id = params.get('building_id') ?? params.get('buildingId') ?? ''
  filters.q = params.get('q') ?? params.get('keyword') ?? ''
  const rawPage = params.get('page') ?? '1'
  const validPage = /^\d+$/.test(rawPage) && BigInt(rawPage) >= 1n && BigInt(rawPage) <= 2147483647n
  const allowed = new Set([...Object.keys(emptyRoomFilters).filter(key => key !== 'amenity_ids'), 'amenity_ids[]', 'page', 'buildingId', 'keyword'])
  const unknown = [...params.keys()].some(key => !allowed.has(key))
  const duplicate = [...allowed].some(key => key !== 'amenity_ids[]' && params.getAll(key).length > 1)
    || (params.has('building_id') && params.has('buildingId')) || (params.has('q') && params.has('keyword'))
  const result = publicRoomFiltersSchema.safeParse(filters)
  return { filters, page: validPage ? Number(rawPage) : 1,
    error: !validPage ? 'Số trang không hợp lệ.' : unknown || duplicate ? 'Đường dẫn chứa tham số lọc không hợp lệ. Vui lòng xóa bộ lọc.' : !result.success ? result.error.issues[0].message : '' }
}

export function roomSearch(filters: PublicRoomFilters, page = 1): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value)) value.forEach(id => params.append('amenity_ids[]', id))
    else if (value !== '') params.set(key, value)
  }
  if (page > 1) params.set('page', String(page))
  return params
}
