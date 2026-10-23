import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { applyApiErrors } from '@/lib/apiErrors'
import { amenitySchema } from './schemas'
import type { AmenityInput } from './schemas'
import type { Amenity } from './types'
import { saveAmenity } from './api'

interface AmenityFormProps {
  amenity?: Amenity
  onSaved: (amenity: Amenity) => void
  onCancel: () => void
  onBusyChange: (busy: boolean) => void
}

export function AmenityForm({ amenity, onSaved, onCancel, onBusyChange }: AmenityFormProps) {
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<AmenityInput>({
    resolver: zodResolver(amenitySchema), defaultValues: { name: amenity?.name ?? '', description: amenity?.description ?? '' },
  })
  const submit = handleSubmit(async input => {
    onBusyChange(true)
    try { onSaved(await saveAmenity(input, amenity?.id)) }
    catch (error) { applyApiErrors(error, setError, ['name', 'description']) }
    finally { onBusyChange(false) }
  })
  return <form onSubmit={submit} noValidate className="space-y-4" aria-busy={isSubmitting}>
    <fieldset disabled={isSubmitting} className="space-y-4">
      <div>
        <label htmlFor="amenity-name" className="block text-xs font-bold text-slate-700 mb-1">Tên tiện nghi</label>
        <input id="amenity-name" {...register('name')} aria-invalid={!!errors.name} aria-describedby="amenity-name-error" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none" />
        <p id="amenity-name-error" className="text-xs text-rose-600 mt-1">{errors.name?.message}</p>
      </div>
      <div>
        <label htmlFor="amenity-description" className="block text-xs font-bold text-slate-700 mb-1">Mô tả (tùy chọn)</label>
        <textarea id="amenity-description" rows={3} {...register('description')} aria-invalid={!!errors.description} aria-describedby="amenity-description-error" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none" />
        <p id="amenity-description-error" className="text-xs text-rose-600 mt-1">{errors.description?.message}</p>
      </div>
    </fieldset>
    {errors.root && <p role="alert" className="text-sm text-rose-600">{errors.root.message}</p>}
    <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
      <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>Hủy</Button>
      <Button type="submit" isLoading={isSubmitting}>Lưu tiện nghi</Button>
    </div>
  </form>
}
