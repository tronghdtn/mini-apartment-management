import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Globe, ImagePlus, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { applyApiErrors } from '@/lib/apiErrors'
import { getAmenityAssignment, getAmenityOptions, saveAmenityAssignment } from '@/features/amenity-assignment/api'
import type { AmenityOption } from '@/features/amenity-assignment/types'
import { uploadRoomPhotos } from '@/features/room-photos/api'
import { roomSchema } from './schemas'
import type { RoomInput } from './schemas'
import type { BuildingOption, Room } from './types'
import { saveRoom } from './api'

interface RoomFormProps {
  room?: Room
  buildings: BuildingOption[]
  defaultBuildingId?: number
  onSaved: (room: Room) => void
  onCancel: () => void
  onBusyChange: (busy: boolean) => void
}

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition'

export function RoomForm({ room, buildings, defaultBuildingId, onSaved, onCancel, onBusyChange }: RoomFormProps) {
  const [amenities, setAmenities] = useState<AmenityOption[]>([])
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<number[]>([])
  const [amenitiesLoaded, setAmenitiesLoaded] = useState(false)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [photoError, setPhotoError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, setValue, control, setError, formState: { errors, isSubmitting } } = useForm<RoomInput>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      building_id: room?.building_id ?? defaultBuildingId ?? (buildings.length === 1 ? buildings[0].id : 0),
      code: room?.code ?? '',
      floor_number: room?.floor_number ?? 1,
      area: room?.area ?? '',
      base_price: room?.base_price ?? 4500000,
      deposit_amount: room?.deposit_amount ?? 4500000,
      max_occupants: room?.max_occupants ?? 2,
      is_public: room?.is_public ?? true,
      description: room?.description ?? '',
    },
  })

  const watchedBasePrice = useWatch({ control, name: 'base_price' })

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      getAmenityOptions(controller.signal).catch(() => [] as AmenityOption[]),
      room?.id ? getAmenityAssignment('rooms', room.id, controller.signal).catch(() => null) : Promise.resolve(null),
    ]).then(([options, assigned]) => {
      if (controller.signal.aborted) return
      setAmenities(options)
      if (assigned) {
        setSelectedAmenityIds(assigned.direct.filter(a => !a.is_archived).map(a => a.id))
      }
      setAmenitiesLoaded(true)
    })
    return () => controller.abort()
  }, [room?.id])

  useEffect(() => {
    const urls = photoFiles.map(file => URL.createObjectURL(file))
    setPhotoPreviews(urls)
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [photoFiles])

  const handleSelectPhotos = (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return
    setPhotoError('')
    const incoming = Array.from(filesList)
    const valid = incoming.filter(f => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) && f.size <= 5 * 1024 * 1024)
    if (valid.length < incoming.length) {
      setPhotoError('Một số tệp không đúng định dạng (JPG/PNG/WebP) hoặc vượt quá 5MB đã được bỏ qua.')
    }
    setPhotoFiles(prev => [...prev, ...valid].slice(0, 20))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeQueuedPhoto = (idx: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const toggleAmenity = (id: number) => {
    setSelectedAmenityIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])
  }

  const submit = handleSubmit(async input => {
    const building = buildings.find(item => item.id === input.building_id)
    if (building && input.floor_number > building.total_floors) {
      setError('floor_number', { message: `Tầng không được vượt quá ${building.total_floors} tầng của tòa nhà.` })
      return
    }
    onBusyChange(true)
    try {
      const saved = await saveRoom(input, room?.id)
      if (amenitiesLoaded && (selectedAmenityIds.length > 0 || room?.id)) {
        try {
          await saveAmenityAssignment('rooms', saved.id, { amenity_ids: selectedAmenityIds })
        } catch {
          // Giữ phòng đã lưu nếu gán tiện nghi phụ gặp lỗi
        }
      }
      if (photoFiles.length > 0) {
        try {
          await uploadRoomPhotos(saved.id, { photos: photoFiles })
        } catch {
          // Giữ phòng đã lưu nếu tải ảnh gặp lỗi
        }
      }
      onSaved(saved)
    } catch (error) {
      applyApiErrors(error, setError, ['building_id', 'code', 'floor_number', 'area', 'base_price', 'deposit_amount', 'max_occupants', 'is_public', 'description'])
    } finally {
      onBusyChange(false)
    }
  })

  return (
    <form onSubmit={submit} noValidate className="space-y-4" aria-busy={isSubmitting}>
      <fieldset disabled={isSubmitting} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="room-building_id" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Tòa nhà <span className="text-rose-500">*</span>
          </label>
          {room ? (
            <>
              <input type="hidden" {...register('building_id', { valueAsNumber: true })} />
              <input id="room-building_id" value={room.building.name} readOnly className={`${inputClass} bg-slate-50 font-semibold`} />
              <p className="text-[11px] text-slate-500 mt-1">Tòa nhà của phòng được cố định để bảo toàn lịch sử hợp đồng và chỉ số điện nước.</p>
            </>
          ) : (
            <select
              id="room-building_id"
              {...register('building_id', { valueAsNumber: true })}
              aria-invalid={!!errors.building_id}
              aria-describedby="room-building_id-error"
              className={inputClass}
            >
              <option value="0">-- Chọn tòa nhà --</option>
              {buildings.map(building => (
                <option key={building.id} value={building.id}>
                  {building.name} ({building.total_floors} tầng)
                </option>
              ))}
            </select>
          )}
          {errors.building_id && <p id="room-building_id-error" className="text-xs text-rose-600 mt-1">{errors.building_id.message}</p>}
        </div>

        <div>
          <label htmlFor="room-code" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Mã phòng <span className="text-rose-500">*</span>
          </label>
          <input
            id="room-code"
            type="text"
            placeholder="VD: A-101, P.202, B-305..."
            {...register('code')}
            aria-invalid={!!errors.code}
            aria-describedby="room-code-error"
            className={inputClass}
          />
          {errors.code && <p id="room-code-error" className="text-xs text-rose-600 mt-1">{errors.code.message}</p>}
        </div>

        <div>
          <label htmlFor="room-floor_number" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Tầng <span className="text-rose-500">*</span>
          </label>
          <input
            id="room-floor_number"
            type="number"
            min={1}
            placeholder="VD: 1"
            {...register('floor_number', { valueAsNumber: true })}
            aria-invalid={!!errors.floor_number}
            aria-describedby="room-floor_number-error"
            className={inputClass}
          />
          {errors.floor_number && <p id="room-floor_number-error" className="text-xs text-rose-600 mt-1">{errors.floor_number.message}</p>}
        </div>

        <div>
          <label htmlFor="room-area" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Diện tích (m²) <span className="text-rose-500">*</span>
          </label>
          <input
            id="room-area"
            type="text"
            placeholder="VD: 28 hoặc 32.5"
            {...register('area')}
            aria-invalid={!!errors.area}
            aria-describedby="room-area-error"
            className={inputClass}
          />
          {errors.area && <p id="room-area-error" className="text-xs text-rose-600 mt-1">{errors.area.message}</p>}
        </div>

        <div>
          <label htmlFor="room-max_occupants" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Sức chứa tối đa (người) <span className="text-rose-500">*</span>
          </label>
          <input
            id="room-max_occupants"
            type="number"
            min={1}
            placeholder="VD: 2"
            {...register('max_occupants', { valueAsNumber: true })}
            aria-invalid={!!errors.max_occupants}
            aria-describedby="room-max_occupants-error"
            className={inputClass}
          />
          {errors.max_occupants && <p id="room-max_occupants-error" className="text-xs text-rose-600 mt-1">{errors.max_occupants.message}</p>}
        </div>

        <div>
          <label htmlFor="room-base_price" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Giá thuê niêm yết (VND/tháng) <span className="text-rose-500">*</span>
          </label>
          <input
            id="room-base_price"
            type="number"
            min={0}
            step={100000}
            placeholder="VD: 4500000"
            {...register('base_price', { valueAsNumber: true })}
            aria-invalid={!!errors.base_price}
            aria-describedby="room-base_price-error"
            className={inputClass}
          />
          {errors.base_price && <p id="room-base_price-error" className="text-xs text-rose-600 mt-1">{errors.base_price.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label htmlFor="room-deposit_amount" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Tiền cọc niêm yết (VND) <span className="text-rose-500">*</span>
            </label>
            {typeof watchedBasePrice === 'number' && watchedBasePrice > 0 && (
              <button
                type="button"
                onClick={() => setValue('deposit_amount', watchedBasePrice, { shouldValidate: true })}
                className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 underline cursor-pointer"
              >
                = 1 tháng thuê
              </button>
            )}
          </div>
          <input
            id="room-deposit_amount"
            type="number"
            min={0}
            step={100000}
            placeholder="VD: 4500000"
            {...register('deposit_amount', { valueAsNumber: true })}
            aria-invalid={!!errors.deposit_amount}
            aria-describedby="room-deposit_amount-error"
            className={inputClass}
          />
          {errors.deposit_amount && <p id="room-deposit_amount-error" className="text-xs text-rose-600 mt-1">{errors.deposit_amount.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="room-description" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Tiêu đề giới thiệu & Mô tả chi tiết phòng
          </label>
          <textarea
            id="room-description"
            rows={2}
            placeholder="VD: Studio ban công thoáng mát — Trang bị sẵn điều hòa Inverter, bình nóng lạnh, giường tủ gỗ, bàn làm việc và kệ bếp riêng..."
            {...register('description')}
            aria-invalid={!!errors.description}
            aria-describedby="room-description-error"
            className={inputClass}
          />
          <p className="text-[11px] text-slate-500 mt-1">Mẹo: Dùng dấu “—” ở câu đầu tiên để làm tiêu đề nổi bật trên thẻ phòng ở Trang chủ.</p>
          {errors.description && <p id="room-description-error" className="text-xs text-rose-600 mt-1">{errors.description.message}</p>}
        </div>

        {/* Amenities Selection */}
        {amenities.length > 0 && (
          <div className="sm:col-span-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                Tiện nghi trang bị trong phòng ({selectedAmenityIds.length} đã chọn)
              </span>
              <span className="text-[11px] text-slate-400">Hiển thị trên trang chi tiết phòng</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1">
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

        {/* Photo Upload Picker */}
        <div className="sm:col-span-2 pt-2 border-t border-slate-100 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <ImagePlus className="w-3.5 h-3.5 text-sky-600" />
              {room ? 'Thêm ảnh mới vào thư viện phòng (tùy chọn)' : 'Ảnh thực tế của phòng (hiển thị trên Trang chủ)'}
            </span>
            <span className="text-[11px] text-slate-400">JPG, PNG, WebP · Tối đa 5MB/ảnh</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={e => handleSelectPhotos(e.target.files)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-dashed border-sky-300 bg-sky-50/50 hover:bg-sky-50 text-xs font-semibold text-sky-700 transition cursor-pointer"
            >
              <ImagePlus className="w-4 h-4" />
              <span>Chọn ảnh từ máy tính ({photoFiles.length}/20)</span>
            </button>
            {photoFiles.length > 0 && (
              <span className="text-xs text-emerald-700 font-medium">
                Ảnh đầu tiên sẽ được đặt làm ảnh bìa hiển thị ngoài Trang chủ.
              </span>
            )}
          </div>

          {photoError && <p className="text-xs text-amber-700">{photoError}</p>}

          {photoPreviews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 pt-1">
              {photoPreviews.map((url, idx) => (
                <div key={url} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                  <img src={url} alt={`Ảnh chọn ${idx + 1}`} className="w-full h-full object-cover" />
                  {idx === 0 && !room && (
                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-sky-600 text-white text-[10px] font-bold">
                      Ảnh bìa
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeQueuedPhoto(idx)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-slate-900/75 text-white hover:bg-rose-600 transition cursor-pointer"
                    title="Bỏ ảnh này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Public visibility checkbox */}
        <div className="sm:col-span-2">
          <label
            htmlFor="room-is_public"
            className="flex items-start gap-3 p-3.5 rounded-xl border border-sky-200/80 bg-sky-50/50 cursor-pointer hover:bg-sky-50 transition"
          >
            <input
              id="room-is_public"
              type="checkbox"
              {...register('is_public')}
              className="accent-sky-600 mt-0.5 w-4 h-4 rounded"
            />
            <div className="min-w-0">
              <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                <Globe className="w-4 h-4 text-sky-600" />
                Hiển thị công khai trên Trang chủ & Tìm phòng trống
              </span>
              <span className="block text-xs text-slate-600 mt-0.5">
                Khi bật, khách truy cập sẽ thấy phòng này ngay trên cổng thông tin công khai (nếu phòng đang ở trạng thái Còn trống và tòa nhà đang hoạt động).
              </span>
            </div>
          </label>
          {errors.is_public && <p className="text-xs text-rose-600 mt-1">{errors.is_public.message}</p>}
        </div>
      </fieldset>

      {errors.root && <p role="alert" className="text-sm text-rose-600">{errors.root.message}</p>}

      <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>Hủy</Button>
        <Button type="submit" isLoading={isSubmitting}>Lưu phòng</Button>
      </div>
    </form>
  )
}
