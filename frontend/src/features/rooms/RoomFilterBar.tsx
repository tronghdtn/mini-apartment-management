import React, { useState } from 'react'
import {
  Search,
  SlidersHorizontal,
  X,
  Building2,
  DollarSign,
  Maximize2,
  Users,
  Check,
  ChevronDown,
} from 'lucide-react'
import type { FilterState } from '@/mocks/types'
import { buildings, availableAmenitiesList } from '@/mocks/data'
import { Button } from '@/components/ui/Button'

interface RoomFilterBarProps {
  filters: FilterState
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>
  onReset: () => void
  totalResults: number
}

export const RoomFilterBar: React.FC<RoomFilterBarProps> = ({
  filters,
  setFilters,
  onReset,
  totalResults,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleAmenityToggle = (amenity: string) => {
    setFilters((prev) => {
      const exists = prev.amenities.includes(amenity)
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter((a) => a !== amenity)
          : [...prev.amenities, amenity],
      }
    })
  }

  const activeFilterCount =
    (filters.keyword ? 1 : 0) +
    (filters.buildingId !== 'all' ? 1 : 0) +
    (filters.priceRange !== 'all' ? 1 : 0) +
    (filters.areaRange !== 'all' ? 1 : 0) +
    (filters.capacity !== 'all' ? 1 : 0) +
    filters.amenities.length

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-4">
      {/* Top Main Filter Bar: Search + Building + Price + More Filters Button */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search Keyword */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo mã phòng, tòa nhà, vị trí..."
            value={filters.keyword}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, keyword: e.target.value }))
            }
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-sm focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition"
          />
          {filters.keyword && (
            <button
              onClick={() => setFilters((prev) => ({ ...prev, keyword: '' }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Building Select */}
        <div className="relative">
          <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={filters.buildingId}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, buildingId: e.target.value }))
            }
            className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-sm focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition appearance-none cursor-pointer"
          >
            <option value="all">Tất cả các tòa nhà</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id.toString()}>
                {b.name} ({b.district})
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Price Range */}
        <div className="relative">
          <DollarSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={filters.priceRange}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, priceRange: e.target.value }))
            }
            className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-sm focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition appearance-none cursor-pointer"
          >
            <option value="all">Tất cả mức giá thuê</option>
            <option value="under-3.5m">Dưới 3.5 triệu / tháng</option>
            <option value="3.5m-4.5m">3.5 - 4.5 triệu / tháng</option>
            <option value="above-4.5m">Trên 4.5 triệu / tháng</option>
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
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <span className="flex items-center gap-2 text-xs font-semibold">
              <SlidersHorizontal className="w-4 h-4 text-sky-600" />
              Lọc nâng cao
            </span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-[11px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {activeFilterCount > 0 && (
            <button
              onClick={onReset}
              className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
              title="Đặt lại bộ lọc"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filter Collapse Box */}
      {showAdvanced && (
        <div className="pt-4 border-t border-slate-100 space-y-4 animate-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Area Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-sky-600" />
                Diện tích phòng
              </label>
              <select
                value={filters.areaRange}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, areaRange: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-200 outline-none"
              >
                <option value="all">Tất cả diện tích</option>
                <option value="under-25">Dưới 25 m²</option>
                <option value="25-32">Từ 25 - 32 m²</option>
                <option value="above-32">Trên 32 m²</option>
              </select>
            </div>

            {/* Capacity Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-sky-600" />
                Số người ở
              </label>
              <select
                value={filters.capacity}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, capacity: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-200 outline-none"
              >
                <option value="all">Tất cả số người</option>
                <option value="1">1 người ở (Phòng đơn)</option>
                <option value="2">2 người ở (Cặp đôi/bạn bè)</option>
                <option value="3+">3 người trở lên (Rộng rãi)</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Sắp xếp hiển thị
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    sortBy: e.target.value as FilterState['sortBy'],
                  }))
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-200 outline-none"
              >
                <option value="featured">Phòng nổi bật ưu tiên</option>
                <option value="price-asc">Giá thuê: Thấp đến cao</option>
                <option value="price-desc">Giá thuê: Cao đến thấp</option>
                <option value="area-desc">Diện tích: Lớn nhất</option>
              </select>
            </div>
          </div>

          {/* Amenities Multi-select Chips */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Tiện nghi mong muốn
            </label>
            <div className="flex flex-wrap gap-2">
              {availableAmenitiesList.map((amenity) => {
                const isSelected = filters.amenities.includes(amenity)
                return (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => handleAmenityToggle(amenity)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {amenity}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Result Status Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
        <span>
          Tìm thấy <strong className="text-slate-900 font-bold">{totalResults}</strong> phòng trống phù hợp
        </span>
        {activeFilterCount > 0 && (
          <button
            onClick={onReset}
            className="text-sky-600 hover:text-sky-800 font-medium cursor-pointer"
          >
            Xóa tất cả bộ lọc ({activeFilterCount})
          </button>
        )}
      </div>
    </div>
  )
}
