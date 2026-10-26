import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { publicRoomFiltersSchema } from './schemas'
import type { PublicRoomFilters } from './schemas'
import type { PublicRoomOptions } from './types'

interface RoomFilterBarProps {
  filters: PublicRoomFilters
  options: PublicRoomOptions | null
  onApply: (filters: PublicRoomFilters) => void
  onReset: () => void
}

const numericFields = [
  ['min_price', 'Giá từ (đồng)'], ['max_price', 'Giá đến (đồng)'],
  ['min_area', 'Diện tích từ (m²)'], ['max_area', 'Diện tích đến (m²)'],
  ['min_occupants', 'Sức chứa từ (người)'], ['max_occupants', 'Sức chứa đến (người)'],
] as const

export function RoomFilterBar({ filters, options, onApply, onReset }: RoomFilterBarProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<PublicRoomFilters>({
    resolver: zodResolver(publicRoomFiltersSchema), defaultValues: filters,
  })
  const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm focus:outline-sky-500'
  return <form noValidate onSubmit={handleSubmit(onApply)} className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <div>
        <label htmlFor="public-room-q" className="block text-sm font-semibold mb-1">Tìm phòng</label>
        <input id="public-room-q" {...register('q')} placeholder="Mã phòng, tòa nhà, địa chỉ…" className={inputClass} aria-invalid={!!errors.q} />
        {errors.q && <p role="alert" className="text-xs text-rose-700 mt-1">
          {errors.q.message}
        </p>}
      </div>
      <div>
        <label htmlFor="public-room-building" className="block text-sm font-semibold mb-1">Tòa nhà</label>
        <select id="public-room-building" {...register('building_id')} disabled={!options} className={inputClass}>
          <option value="">Tất cả tòa nhà</option>
          {filters.building_id && !options?.buildings.some(building => String(building.id) === filters.building_id) && <option value={filters.building_id}>Tòa nhà #{filters.building_id}
          </option>}{options?.buildings.map(building => <option key={building.id} value={building.id}>
            {building.name}
          </option>)}
        </select>
        {errors.building_id && <p role="alert" className="text-xs text-rose-700">
          {errors.building_id.message}
        </p>}
      </div>
      <div>
        <label htmlFor="public-room-sort" className="block text-sm font-semibold mb-1">Sắp xếp</label>
        <select id="public-room-sort" {...register('sort')} className={inputClass}>
          <option value="">Mặc định</option>
          <option value="price_asc">Giá tăng dần</option>
          <option value="price_desc">Giá giảm dần</option>
          <option value="area_asc">Diện tích tăng dần</option>
          <option value="area_desc">Diện tích giảm dần</option>
        </select>
        {errors.sort && <p role="alert" className="text-xs text-rose-700">
          {errors.sort.message}
        </p>}
      </div>
    </div>
    <details open={numericFields.some(([key]) => !!filters[key]) || filters.amenity_ids.length > 0 || numericFields.some(([key]) => !!errors[key])}>
      <summary className="cursor-pointer text-sm font-semibold text-sky-700 py-2">Giá, diện tích, sức chứa và tiện nghi</summary>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
        {numericFields.map(([key, label]) => <div key={key}>
          <label htmlFor={`public-room-${key}`} className="block text-sm font-semibold mb-1">
            {label}
          </label>
          <input id={`public-room-${key}`} inputMode={key.includes('area') ? 'decimal' : 'numeric'} {...register(key)} className={inputClass} aria-invalid={!!errors[key]} />
          {errors[key] && <p role="alert" className="text-xs text-rose-700 mt-1">
            {errors[key]?.message}
          </p>}
        </div>)}
      </div>
      <fieldset className="mt-4" disabled={!options}>
        <legend className="text-sm font-semibold mb-2">Có đủ các tiện nghi đã chọn</legend>
        <div className="flex flex-wrap gap-3">
          {[...(options?.amenities ?? []), ...filters.amenity_ids.filter(id => !options?.amenities.some(amenity => String(amenity.id) === id)).map(id => ({ id: Number(id), name: `Tiện nghi #${id}` }))].map(amenity => <label key={amenity.id} className="flex items-center gap-2 text-sm py-1">
            <input type="checkbox" value={String(amenity.id)} {...register('amenity_ids')} className="accent-sky-600 w-4 h-4" />
            {amenity.name}
          </label>)}
        </div>
        {errors.amenity_ids && <p role="alert" className="text-xs text-rose-700 mt-1">
          {errors.amenity_ids.message}
        </p>}
      </fieldset>
    </details>
    <div className="flex flex-wrap gap-3">
      <Button type="submit">Áp dụng bộ lọc</Button>
      <Button type="button" variant="outline" onClick={onReset}>Xóa bộ lọc</Button>
    </div>
  </form>
}
