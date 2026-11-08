import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, ChevronDown, ChevronUp, MapPin, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { applyApiErrors } from '@/lib/apiErrors'
import { getAmenityAssignment, getAmenityOptions, saveAmenityAssignment } from '@/features/amenity-assignment/api'
import type { AmenityOption } from '@/features/amenity-assignment/types'
import { buildingSchema } from './schemas'
import type { BuildingInput } from './schemas'
import type { Building } from './types'
import { saveBuilding } from './api'

interface BuildingFormProps {
  building?: Building
  onSaved: (building: Building) => void
  onCancel: () => void
  onBusyChange: (busy: boolean) => void
}

export function BuildingForm({ building, onSaved, onCancel, onBusyChange }: BuildingFormProps) {
  const [showCoords, setShowCoords] = useState(Boolean(building?.latitude || building?.longitude))
  const [amenities, setAmenities] = useState<AmenityOption[]>([])
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<number[]>([])
  const [amenitiesLoaded, setAmenitiesLoaded] = useState(false)

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<BuildingInput>({
    resolver: zodResolver(buildingSchema),
    defaultValues: {
      name: building?.name ?? '',
      address: building?.address ?? '',
      total_floors: building?.total_floors ?? 5,
      latitude: building?.latitude ?? '',
      longitude: building?.longitude ?? '',
      description: building?.description ?? '',
    },
  })

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      getAmenityOptions(controller.signal).catch(() => [] as AmenityOption[]),
      building?.id ? getAmenityAssignment('buildings', building.id, controller.signal).catch(() => null) : Promise.resolve(null),
    ]).then(([options, assigned]) => {
      if (controller.signal.aborted) return
      setAmenities(options)
      if (assigned) {
        setSelectedAmenityIds(assigned.direct.filter(a => !a.is_archived).map(a => a.id))
      }
      setAmenitiesLoaded(true)
    })
    return () => controller.abort()
  }, [building?.id])

  const toggleAmenity = (id: number) => {
    setSelectedAmenityIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])
  }

  const submit = handleSubmit(async input => {
    onBusyChange(true)
    try {
      const saved = await saveBuilding(input, building?.id)
      if (amenitiesLoaded && (selectedAmenityIds.length > 0 || building?.id)) {
        try {
          await saveAmenityAssignment('buildings', saved.id, { amenity_ids: selectedAmenityIds })
        } catch {
          // Vẫn giữ kết quả tạo/sửa tòa nhà nếu gán tiện nghi phụ gặp lỗi
        }
      }
      onSaved(saved)
    } catch (error) {
      applyApiErrors(error, setError, ['name', 'address', 'total_floors', 'latitude', 'longitude', 'description'])
    } finally {
      onBusyChange(false)
    }
  })

  const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition'

  return (
    <form onSubmit={submit} noValidate className="space-y-4" aria-busy={isSubmitting}>
      <fieldset disabled={isSubmitting} className="space-y-4">
        <div>
          <label htmlFor="building-name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Tên tòa nhà <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="building-name"
              type="text"
              placeholder="VD: Chung cư Mini Green House - Cầu Giấy"
              {...register('name')}
              aria-invalid={!!errors.name}
              aria-describedby="building-name-error"
              className={`${inputClass} pl-10`}
            />
          </div>
          {errors.name && <p id="building-name-error" className="text-xs text-rose-600 mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="building-address" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Địa chỉ chi tiết <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="building-address"
              type="text"
              placeholder="Số nhà, ngõ, đường, phường, quận/huyện, thành phố..."
              {...register('address')}
              aria-invalid={!!errors.address}
              aria-describedby="building-address-error"
              className={`${inputClass} pl-10`}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Bản đồ Google Maps ở trang công khai sẽ tự động định vị theo địa chỉ này.</p>
          {errors.address && <p id="building-address-error" className="text-xs text-rose-600 mt-1">{errors.address.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <div>
            <label htmlFor="building-total_floors" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Số tầng <span className="text-rose-500">*</span>
            </label>
            <input
              id="building-total_floors"
              type="number"
              min={1}
              max={60}
              placeholder="VD: 5"
              {...register('total_floors', { valueAsNumber: true })}
              aria-invalid={!!errors.total_floors}
              aria-describedby="building-total_floors-error"
              className={inputClass}
            />
            {errors.total_floors && <p id="building-total_floors-error" className="text-xs text-rose-600 mt-1">{errors.total_floors.message}</p>}
          </div>

          <div className="sm:pt-6">
            <button
              type="button"
              onClick={() => setShowCoords(v => !v)}
              className="w-full inline-flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              <span>Tọa độ GPS nâng cao (tùy chọn)</span>
              {showCoords ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>
          </div>
        </div>

        {showCoords && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div>
              <label htmlFor="building-latitude" className="block text-xs font-bold text-slate-700 mb-1">Vĩ độ (Latitude)</label>
              <input
                id="building-latitude"
                type="text"
                placeholder="VD: 21.0362380"
                {...register('latitude')}
                aria-invalid={!!errors.latitude}
                aria-describedby="building-latitude-error"
                className={inputClass}
              />
              {errors.latitude && <p id="building-latitude-error" className="text-xs text-rose-600 mt-1">{errors.latitude.message}</p>}
            </div>
            <div>
              <label htmlFor="building-longitude" className="block text-xs font-bold text-slate-700 mb-1">Kinh độ (Longitude)</label>
              <input
                id="building-longitude"
                type="text"
                placeholder="VD: 105.7905830"
                {...register('longitude')}
                aria-invalid={!!errors.longitude}
                aria-describedby="building-longitude-error"
                className={inputClass}
              />
              {errors.longitude && <p id="building-longitude-error" className="text-xs text-rose-600 mt-1">{errors.longitude.message}</p>}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="building-description" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Mô tả & giới thiệu tòa nhà (tùy chọn)
          </label>
          <textarea
            id="building-description"
            rows={3}
            placeholder="VD: Tòa nhà mặt ngõ rộng ô tô đỗ cửa, khóa vân tay 24/7, thang máy tốc độ cao, hầm để xe miễn phí, khu giặt sấy sân thượng..."
            {...register('description')}
            aria-invalid={!!errors.description}
            aria-describedby="building-description-error"
            className={inputClass}
          />
          {errors.description && <p id="building-description-error" className="text-xs text-rose-600 mt-1">{errors.description.message}</p>}
        </div>

        {amenities.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                Tiện nghi chung của tòa nhà ({selectedAmenityIds.length} đã chọn)
              </span>
              <span className="text-[11px] text-slate-400">Tự động kế thừa cho mọi phòng trong tòa</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
              {amenities.map(amenity => {
                const checked = selectedAmenityIds.includes(amenity.id)
                return (
                  <label
                    key={amenity.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium cursor-pointer transition select-none ${
                      checked ? 'border-sky-500 bg-sky-50/80 text-sky-900 font-semibold' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAmenity(amenity.id)}
                      className="accent-sky-600 rounded"
                    />
                    <span className="truncate">{amenity.name}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}
      </fieldset>

      {errors.root && <p role="alert" className="text-sm text-rose-600">{errors.root.message}</p>}

      <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>Hủy</Button>
        <Button type="submit" isLoading={isSubmitting}>Lưu tòa nhà</Button>
      </div>
    </form>
  )
}
