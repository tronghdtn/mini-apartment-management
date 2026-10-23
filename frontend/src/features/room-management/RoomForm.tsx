import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { applyApiErrors } from '@/lib/apiErrors'
import { roomSchema } from './schemas'
import type { RoomInput } from './schemas'
import type { BuildingOption, Room } from './types'
import { saveRoom } from './api'

interface RoomFormProps {
  room?: Room
  buildings: BuildingOption[]
  onSaved: (room: Room) => void
  onCancel: () => void
  onBusyChange: (busy: boolean) => void
}

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none'

export function RoomForm({ room, buildings, onSaved, onCancel, onBusyChange }: RoomFormProps) {
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<RoomInput>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      building_id: room?.building_id ?? 0, code: room?.code ?? '', floor_number: room?.floor_number ?? 1,
      area: room?.area ?? '', base_price: room?.base_price ?? 0, deposit_amount: room?.deposit_amount ?? 0,
      max_occupants: room?.max_occupants ?? 1, is_public: room?.is_public ?? false,
      description: room?.description ?? '',
    },
  })
  const fields = [
    { name: 'code', label: 'Mã phòng', type: 'text' },
    { name: 'floor_number', label: 'Tầng', type: 'number' },
    { name: 'area', label: 'Diện tích (m²)', type: 'text' },
    { name: 'base_price', label: 'Giá thuê niêm yết (VND/tháng)', type: 'number' },
    { name: 'deposit_amount', label: 'Tiền cọc niêm yết (VND)', type: 'number' },
    { name: 'max_occupants', label: 'Sức chứa tối đa (người)', type: 'number' },
  ] as const
  const submit = handleSubmit(async input => {
    const building = buildings.find(item => item.id === input.building_id)
    if (building && input.floor_number > building.total_floors) {
      setError('floor_number', { message: `Tầng không được vượt quá ${building.total_floors} tầng của tòa nhà.` })
      return
    }
    onBusyChange(true)
    try { onSaved(await saveRoom(input, room?.id)) }
    catch (error) { applyApiErrors(error, setError, ['building_id', 'code', 'floor_number', 'area', 'base_price', 'deposit_amount', 'max_occupants', 'is_public', 'description']) }
    finally { onBusyChange(false) }
  })
  return (
    <form onSubmit={submit} noValidate className="space-y-4" aria-busy={isSubmitting}>
      <fieldset disabled={isSubmitting} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="room-building_id" className="block text-xs font-bold text-slate-700 mb-1">Tòa nhà</label>
          {room ? <>
            <input type="hidden" {...register('building_id', { valueAsNumber: true })} />
            <input id="room-building_id" value={room.building.name} readOnly className={`${inputClass} bg-slate-50`} />
            <p className="text-xs text-slate-500 mt-1">Chưa hỗ trợ chuyển phòng sang tòa nhà khác.</p>
          </> : <select id="room-building_id" {...register('building_id', { valueAsNumber: true })} aria-invalid={!!errors.building_id} aria-describedby="room-building_id-error" className={inputClass}>
            <option value="0">Chọn tòa nhà</option>
            {buildings.map(building => <option key={building.id} value={building.id}>{building.name}</option>)}
          </select>}
          <p id="room-building_id-error" className="text-xs text-rose-600 mt-1">{errors.building_id?.message}</p>
        </div>
        {fields.map(field => (
          <div key={field.name}>
            <label htmlFor={`room-${field.name}`} className="block text-xs font-bold text-slate-700 mb-1">{field.label}</label>
            <input id={`room-${field.name}`} type={field.type} {...register(field.name, field.type === 'number' ? { valueAsNumber: true } : {})}
              aria-invalid={!!errors[field.name]} aria-describedby={`room-${field.name}-error`} className={inputClass} />
            <p id={`room-${field.name}-error`} className="text-xs text-rose-600 mt-1">{errors[field.name]?.message}</p>
          </div>
        ))}
        <div className="sm:col-span-2">
          <label htmlFor="room-is_public" className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input id="room-is_public" type="checkbox" {...register('is_public')} className="accent-sky-600" />Đánh dấu công khai
          </label>
          <p className="text-xs text-slate-500 mt-1">Trang phòng công khai chưa nối API thật; thay đổi này được lưu trong dữ liệu phòng.</p>
          <p className="text-xs text-rose-600 mt-1">{errors.is_public?.message}</p>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="room-description" className="block text-xs font-bold text-slate-700 mb-1">Mô tả (tùy chọn)</label>
          <textarea id="room-description" rows={2} {...register('description')} aria-invalid={!!errors.description} aria-describedby="room-description-error" className={inputClass} />
          <p id="room-description-error" className="text-xs text-rose-600 mt-1">{errors.description?.message}</p>
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
