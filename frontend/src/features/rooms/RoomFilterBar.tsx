import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { publicRoomFiltersSchema } from './schemas'
import type { PublicRoomFilters } from './schemas'
import type { PublicRoomOptions } from './types'
import { roomAreaRanges, roomOccupantRanges, roomPriceRanges } from './ranges'

interface RoomFilterBarProps {
  filters: PublicRoomFilters
  options: PublicRoomOptions | null
  onApply: (filters: PublicRoomFilters) => void
  onReset: () => void
}

const rangeFields = [
  { label: 'Ngân sách mỗi tháng', unit: 'đ', min: 'min_price', max: 'max_price', ranges: roomPriceRanges },
  { label: 'Diện tích', unit: 'm²', min: 'min_area', max: 'max_area', ranges: roomAreaRanges },
  { label: 'Sức chứa tối đa', unit: 'người', min: 'min_occupants', max: 'max_occupants', ranges: roomOccupantRanges },
] as const
const numberFormat = new Intl.NumberFormat('vi-VN')
const sameBound = (left: string, right: string) => left === right || (left !== '' && right !== '' && Number(left) === Number(right))

export function RoomFilterBar({ filters, options, onApply, onReset }: RoomFilterBarProps) {
  const { register, control, setValue, handleSubmit, formState: { errors } } = useForm<PublicRoomFilters>({
    resolver: zodResolver(publicRoomFiltersSchema), defaultValues: filters,
  })
  const values = useWatch({ control })
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
        <Controller control={control} name="building_id" render={({ field }) => <select id="public-room-building" {...field} disabled={!options} className={inputClass}>
          <option value="">Tất cả tòa nhà</option>
          {filters.building_id && !options?.buildings.some(building => String(building.id) === filters.building_id) && <option value={filters.building_id}>Tòa nhà #{filters.building_id}
          </option>}{options?.buildings.map(building => <option key={building.id} value={building.id}>
            {building.name}
          </option>)}
        </select>} />
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {rangeFields.map(({ label, unit, min, max, ranges }) => {
        const lower = values[min] ?? ''
        const upper = values[max] ?? ''
        const preset = ranges.find(([, from, to]) => sameBound(from, lower) && sameBound(to, upper))
        const custom = !preset && (lower || upper)
        const format = (value: string) => numberFormat.format(Number(value))
        const customLabel = lower && upper ? `${format(lower)}–${format(upper)}` : lower ? `Từ ${format(lower)}` : `Đến ${format(upper)}`
        const error = errors[min] ?? errors[max]
        return <div key={min}>
          <label htmlFor={`public-room-${min}`} className="block text-sm font-semibold mb-1">{label}</label>
          <select id={`public-room-${min}`} value={preset?.[0] ?? (custom ? 'custom' : '')} className={inputClass}
            aria-invalid={!!error}
            onChange={event => {
              const range = ranges.find(([name]) => name === event.target.value)
              setValue(min, range?.[1] ?? '')
              setValue(max, range?.[2] ?? '', { shouldValidate: true })
            }}>
            <option value="">Tất cả</option>
            {custom && <option value="custom" disabled>{customLabel} {unit} (từ liên kết)</option>}
            {ranges.map(([name]) => <option key={name} value={name}>{name}</option>)}
          </select>
          {error && <p role="alert" className="text-xs text-rose-700 mt-1">{error.message}</p>}
        </div>
      })}
    </div>
    <details open={filters.amenity_ids.length > 0 || !!errors.amenity_ids}>
      <summary className="cursor-pointer text-sm font-semibold text-sky-700 py-2">Chọn tiện nghi</summary>
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
