import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { applyApiErrors } from '@/lib/apiErrors'
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
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<BuildingInput>({
    resolver: zodResolver(buildingSchema),
    defaultValues: { name: building?.name ?? '', address: building?.address ?? '', total_floors: building?.total_floors ?? 1,
      latitude: building?.latitude ?? '', longitude: building?.longitude ?? '', description: building?.description ?? '' },
  })
  const fields = [
    { name: 'name', label: 'Tên tòa nhà', type: 'text' },
    { name: 'address', label: 'Địa chỉ', type: 'text' },
    { name: 'total_floors', label: 'Số tầng', type: 'number' },
    { name: 'latitude', label: 'Vĩ độ (tùy chọn)', type: 'text' },
    { name: 'longitude', label: 'Kinh độ (tùy chọn)', type: 'text' },
  ] as const
  const submit = handleSubmit(async input => {
    onBusyChange(true)
    try { onSaved(await saveBuilding(input, building?.id)) }
    catch (error) { applyApiErrors(error, setError, ['name', 'address', 'total_floors', 'latitude', 'longitude', 'description']) }
    finally { onBusyChange(false) }
  })
  return <form onSubmit={submit} noValidate className="space-y-4" aria-busy={isSubmitting}>
    <fieldset disabled={isSubmitting} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {fields.map(field => <div key={field.name} className={field.name === 'name' || field.name === 'address' ? 'sm:col-span-2' : ''}>
        <label htmlFor={`building-${field.name}`} className="block text-xs font-bold text-slate-700 mb-1">{field.label}</label>
        <input id={`building-${field.name}`} type={field.type} {...register(field.name, field.name === 'total_floors' ? { valueAsNumber: true } : {})}
          aria-invalid={!!errors[field.name]} aria-describedby={`building-${field.name}-error`}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none" />
        <p id={`building-${field.name}-error`} className="text-xs text-rose-600 mt-1">{errors[field.name]?.message}</p>
      </div>)}
      <div className="sm:col-span-2">
        <label htmlFor="building-description" className="block text-xs font-bold text-slate-700 mb-1">Mô tả (tùy chọn)</label>
        <textarea id="building-description" rows={3} {...register('description')} aria-invalid={!!errors.description} aria-describedby="building-description-error" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none" />
        <p id="building-description-error" className="text-xs text-rose-600 mt-1">{errors.description?.message}</p>
      </div>
    </fieldset>
    {errors.root && <p role="alert" className="text-sm text-rose-600">{errors.root.message}</p>}
    <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
      <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>Hủy</Button>
      <Button type="submit" isLoading={isSubmitting}>Lưu tòa nhà</Button>
    </div>
  </form>
}
