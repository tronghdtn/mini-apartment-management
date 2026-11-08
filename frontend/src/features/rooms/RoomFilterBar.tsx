import { useEffect, useState } from 'react'
import {
  Building2,
  Check,
  ChevronDown,
  DollarSign,
  Maximize2,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { publicRoomFiltersSchema } from './schemas'
import type { PublicRoomFilters } from './schemas'
import type { PublicRoomOptions } from './types'
import { roomAreaRanges, roomOccupantRanges, roomPriceRanges } from './ranges'

interface RoomFilterBarProps {
  filters: PublicRoomFilters
  options: PublicRoomOptions | null
  totalResults?: number
  onApply: (filters: PublicRoomFilters) => void
  onReset: () => void
}

const numberFormat = new Intl.NumberFormat('vi-VN')
const sameBound = (left: string, right: string) =>
  left === right || (left !== '' && right !== '' && Number(left) === Number(right))

function hasAdvancedFilters(filters: PublicRoomFilters): boolean {
  return Boolean(
    filters.min_area ||
      filters.max_area ||
      filters.min_occupants ||
      filters.max_occupants ||
      filters.sort ||
      filters.amenity_ids.length > 0,
  )
}

export function RoomFilterBar({
  filters,
  options,
  totalResults,
  onApply,
  onReset,
}: RoomFilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(() => hasAdvancedFilters(filters))
  const [keyword, setKeyword] = useState(filters.q)
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    setKeyword(filters.q)
  }, [filters.q])

  const applyNext = (next: PublicRoomFilters) => {
    const parsed = publicRoomFiltersSchema.safeParse(next)
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? 'Bộ lọc không hợp lệ.')
      return
    }
    setValidationError('')
    onApply(parsed.data)
  }

  // Debounce keyword typing so filtering feels instant like the prototype
  useEffect(() => {
    if (keyword.trim() === filters.q.trim()) return
    const timer = window.setTimeout(() => {
      applyNext({ ...filters, q: keyword })
    }, 350)
    return () => window.clearTimeout(timer)
  }, [keyword, filters])

  const pricePreset = roomPriceRanges.find(
    ([, from, to]) => sameBound(from, filters.min_price) && sameBound(to, filters.max_price),
  )
  const priceCustom = !pricePreset && (filters.min_price || filters.max_price)

  const areaPreset = roomAreaRanges.find(
    ([, from, to]) => sameBound(from, filters.min_area) && sameBound(to, filters.max_area),
  )
  const areaCustom = !areaPreset && (filters.min_area || filters.max_area)

  const occupantPreset = roomOccupantRanges.find(
    ([, from, to]) =>
      sameBound(from, filters.min_occupants) && sameBound(to, filters.max_occupants),
  )
  const occupantCustom = !occupantPreset && (filters.min_occupants || filters.max_occupants)

  const formatCustomRange = (lower: string, upper: string, unit: string) => {
    const f = (v: string) => numberFormat.format(Number(v))
    if (lower && upper) return `${f(lower)}–${f(upper)} ${unit}`
    if (lower) return `Từ ${f(lower)} ${unit}`
    return `Đến ${f(upper)} ${unit}`
  }

  const activeFilterCount =
    (filters.q.trim() ? 1 : 0) +
    (filters.building_id ? 1 : 0) +
    (filters.min_price || filters.max_price ? 1 : 0) +
    (filters.min_area || filters.max_area ? 1 : 0) +
    (filters.min_occupants || filters.max_occupants ? 1 : 0) +
    (filters.sort ? 1 : 0) +
    filters.amenity_ids.length

  const toggleAmenity = (id: string) => {
    const exists = filters.amenity_ids.includes(id)
    const nextIds = exists
      ? filters.amenity_ids.filter((item) => item !== id)
      : [...filters.amenity_ids, id]
    applyNext({ ...filters, q: keyword, amenity_ids: nextIds })
  }

  const allAmenities = [
    ...(options?.amenities ?? []),
    ...filters.amenity_ids
      .filter((id) => !options?.amenities.some((amenity) => String(amenity.id) === id))
      .map((id) => ({ id: Number(id), name: `Tiện nghi #${id}` })),
  ]

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        applyNext({ ...filters, q: keyword })
      }}
      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-4"
    >
      {/* Top Main Filter Bar: Search + Building + Price + More Filters Button */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search Keyword */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="public-room-q"
            type="text"
            aria-label="Tìm theo số phòng, tòa nhà, vị trí"
            placeholder="Tìm theo số phòng, tòa nhà, vị trí..."
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-sm focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition"
          />
          {keyword && (
            <button
              type="button"
              aria-label="Xóa từ khóa"
              onClick={() => {
                setKeyword('')
                applyNext({ ...filters, q: '' })
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Building Select */}
        <div className="relative">
          <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            id="public-room-building"
            aria-label="Tòa nhà"
            value={filters.building_id}
            disabled={!options}
            onChange={(event) =>
              applyNext({ ...filters, q: keyword, building_id: event.target.value })
            }
            className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-sm focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition appearance-none cursor-pointer disabled:opacity-60"
          >
            <option value="">Tất cả các tòa nhà</option>
            {filters.building_id &&
              !options?.buildings.some(
                (building) => String(building.id) === filters.building_id,
              ) && <option value={filters.building_id}>Tòa nhà #{filters.building_id}</option>}
            {options?.buildings.map((building) => (
              <option key={building.id} value={String(building.id)}>
                {building.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Price Range */}
        <div className="relative">
          <DollarSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            id="public-room-min_price"
            aria-label="Mức giá thuê"
            value={pricePreset?.[0] ?? (priceCustom ? 'custom' : '')}
            onChange={(event) => {
              const range = roomPriceRanges.find(([name]) => name === event.target.value)
              applyNext({
                ...filters,
                q: keyword,
                min_price: range?.[1] ?? '',
                max_price: range?.[2] ?? '',
              })
            }}
            className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-sm focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition appearance-none cursor-pointer"
          >
            <option value="">Tất cả mức giá thuê</option>
            {priceCustom && (
              <option value="custom" disabled>
                {formatCustomRange(filters.min_price, filters.max_price, 'đ')}
              </option>
            )}
            {roomPriceRanges.map(([name]) => (
              <option key={name} value={name}>
                {name} / tháng
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Toggle Advanced Filters Button */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={showAdvanced || activeFilterCount > 0 ? 'secondary' : 'outline'}
            size="md"
            className="w-full flex items-center justify-between"
            onClick={() => setShowAdvanced((prev) => !prev)}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <SlidersHorizontal className="w-4 h-4 text-sky-600" />
              Lọc nâng cao
            </span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-xs font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setKeyword('')
                setValidationError('')
                onReset()
              }}
              className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0 cursor-pointer"
              title="Đặt lại bộ lọc"
              aria-label="Đặt lại bộ lọc"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filter Collapse Box */}
      {showAdvanced && (
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Area Filter */}
            <div>
              <label
                htmlFor="public-room-min_area"
                className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
              >
                <Maximize2 className="w-3.5 h-3.5 text-sky-600" />
                Diện tích phòng
              </label>
              <select
                id="public-room-min_area"
                value={areaPreset?.[0] ?? (areaCustom ? 'custom' : '')}
                onChange={(event) => {
                  const range = roomAreaRanges.find(([name]) => name === event.target.value)
                  applyNext({
                    ...filters,
                    q: keyword,
                    min_area: range?.[1] ?? '',
                    max_area: range?.[2] ?? '',
                  })
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-200 outline-none cursor-pointer"
              >
                <option value="">Tất cả diện tích</option>
                {areaCustom && (
                  <option value="custom" disabled>
                    {formatCustomRange(filters.min_area, filters.max_area, 'm²')}
                  </option>
                )}
                {roomAreaRanges.map(([name]) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Capacity Filter */}
            <div>
              <label
                htmlFor="public-room-min_occupants"
                className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5 text-sky-600" />
                Số người ở
              </label>
              <select
                id="public-room-min_occupants"
                value={occupantPreset?.[0] ?? (occupantCustom ? 'custom' : '')}
                onChange={(event) => {
                  const range = roomOccupantRanges.find(([name]) => name === event.target.value)
                  applyNext({
                    ...filters,
                    q: keyword,
                    min_occupants: range?.[1] ?? '',
                    max_occupants: range?.[2] ?? '',
                  })
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-200 outline-none cursor-pointer"
              >
                <option value="">Tất cả số người</option>
                {occupantCustom && (
                  <option value="custom" disabled>
                    {formatCustomRange(filters.min_occupants, filters.max_occupants, 'người')}
                  </option>
                )}
                {roomOccupantRanges.map(([name]) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label
                htmlFor="public-room-sort"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Sắp xếp hiển thị
              </label>
              <select
                id="public-room-sort"
                value={filters.sort}
                onChange={(event) =>
                  applyNext({
                    ...filters,
                    q: keyword,
                    sort: event.target.value as PublicRoomFilters['sort'],
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-200 outline-none cursor-pointer"
              >
                <option value="">Phòng nổi bật ưu tiên</option>
                <option value="price_asc">Giá thuê: Thấp đến cao</option>
                <option value="price_desc">Giá thuê: Cao đến thấp</option>
                <option value="area_desc">Diện tích: Lớn nhất</option>
                <option value="area_asc">Diện tích: Nhỏ đến lớn</option>
              </select>
            </div>
          </div>

          {/* Amenities Multi-select Chips */}
          <div>
            <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Tiện nghi mong muốn
            </span>
            <div className="flex flex-wrap gap-2">
              {allAmenities.map((amenity) => {
                const idStr = String(amenity.id)
                const isSelected = filters.amenity_ids.includes(idStr)
                return (
                  <button
                    key={amenity.id}
                    type="button"
                    disabled={!options}
                    onClick={() => toggleAmenity(idStr)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer disabled:opacity-60 ${
                      isSelected
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {amenity.name}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {validationError && (
        <p role="alert" className="text-xs text-rose-700">
          {validationError}
        </p>
      )}

      {/* Result Status Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
        <span>
          {typeof totalResults === 'number' ? (
            <>
              Tìm thấy <strong className="text-slate-900 font-bold">{totalResults}</strong> phòng trống phù hợp
            </>
          ) : (
            'Đang cập nhật danh sách phòng trống…'
          )}
        </span>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setKeyword('')
              setValidationError('')
              onReset()
            }}
            className="text-sky-600 hover:text-sky-800 font-medium cursor-pointer"
          >
            Xóa tất cả bộ lọc ({activeFilterCount})
          </button>
        )}
      </div>
    </form>
  )
}
