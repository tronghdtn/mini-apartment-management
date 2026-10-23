import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { useController, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { apiErrorMessage, applyApiErrors } from '@/lib/apiErrors'
import { getAmenityAssignment, getAmenityOptions, saveAmenityAssignment } from './api'
import { amenityAssignmentSchema } from './schemas'
import type { AmenityAssignmentInput } from './schemas'
import type { AmenityAssignment, AmenityOption, AmenityTargetType, ArchivedVisibility, AssignedAmenity } from './types'

interface AmenityAssignmentPanelProps {
  targetType: AmenityTargetType
  targetId: number
  archivedVisibility: ArchivedVisibility
}
interface LoadedAssignment {
  key: string
  data: AmenityAssignment | null
  options: AmenityOption[]
  error: string
}

function AssignedAmenityList({ title, amenities, archivedVisibility }: {
  title: string
  amenities: AssignedAmenity[]
  archivedVisibility: ArchivedVisibility
}) {
  const visible = archivedVisibility === 'show' ? amenities : amenities.filter(amenity => !amenity.is_archived)
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      {visible.length === 0 ? <p className="text-xs text-slate-500">Không có tiện nghi để hiển thị.</p> : (
        <ul className="flex flex-wrap gap-2">
          {visible.map(amenity => <li key={amenity.id} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 break-words">
            <span>{amenity.name}</span>{amenity.is_archived && <Badge tone="slate">Đã lưu trữ</Badge>}
          </li>)}
        </ul>
      )}
    </section>
  )
}

function AssignmentForm({ targetType, targetId, data, options, archivedVisibility, onSaved, onReload }: AmenityAssignmentPanelProps & {
  data: AmenityAssignment
  options: AmenityOption[]
  onSaved: (data: AmenityAssignment) => void
  onReload: () => void
}) {
  const { control, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<AmenityAssignmentInput>({
    resolver: zodResolver(amenityAssignmentSchema),
    defaultValues: { amenity_ids: data.direct.filter(amenity => !amenity.is_archived).map(amenity => amenity.id) },
  })
  const { field } = useController({ control, name: 'amenity_ids' })
  const [success, setSuccess] = useState('')
  // Cờ lưu trữ trả từ server luôn được tôn trọng, kể cả danh mục lựa chọn vừa cũ đi.
  const archivedIds = new Set([...data.direct, ...data.inherited, ...data.effective].filter(amenity => amenity.is_archived).map(amenity => amenity.id))
  const activeOptions = options.filter(amenity => !archivedIds.has(amenity.id))
  const submit = handleSubmit(async input => {
    setSuccess('')
    try {
      const updated = await saveAmenityAssignment(targetType, targetId, input)
      onSaved(updated)
      reset({ amenity_ids: updated.direct.filter(amenity => !amenity.is_archived).map(amenity => amenity.id) })
      setSuccess('Đã lưu tiện nghi.')
    } catch (failure) {
      applyApiErrors(failure, setError, ['amenity_ids'])
      // FormRequest có thể trả lỗi của từng phần tử, ví dụ amenity_ids.0.
      if (isAxiosError(failure) && failure.response?.status === 422) {
        const validationErrors: unknown = failure.response.data?.errors
        if (validationErrors && typeof validationErrors === 'object') {
          const submittedFields = new Set(input.amenity_ids.map((_, index) => `amenity_ids.${index}`))
          for (const [path, messages] of Object.entries(validationErrors)) {
            if (submittedFields.has(path) && Array.isArray(messages) && typeof messages[0] === 'string') {
              setError('amenity_ids', { type: 'server', message: messages[0] })
              break
            }
          }
        }
      }
    }
  })
  return (
    <div className="space-y-5">
      <AssignedAmenityList title="Tiện nghi gán trực tiếp" amenities={data.direct} archivedVisibility={archivedVisibility} />
      {targetType === 'rooms' && <AssignedAmenityList title="Tiện nghi kế thừa từ tòa nhà" amenities={data.inherited} archivedVisibility={archivedVisibility} />}
      <AssignedAmenityList title={targetType === 'rooms' ? 'Tổng hợp tiện nghi của phòng' : 'Tiện nghi của tòa nhà'} amenities={data.effective} archivedVisibility={archivedVisibility} />
      <form onSubmit={submit} noValidate aria-busy={isSubmitting} className="space-y-4 border-t border-slate-100 pt-5">
        <fieldset disabled={isSubmitting} aria-describedby={`amenity-assignment-${targetType}-${targetId}-error`} className="space-y-3">
          <legend className="text-sm font-bold text-slate-800 mb-2">Chọn tiện nghi gán trực tiếp</legend>
          <p className="text-xs text-slate-500">{targetType === 'rooms' ? 'Các lựa chọn bên dưới dành riêng cho phòng; tiện nghi của tòa được hiển thị riêng phía trên.' : 'Các lựa chọn bên dưới áp dụng cho tòa nhà.'} Chỉ thay đổi tiện nghi đang hoạt động.</p>
          {activeOptions.length === 0 ? <p className="text-xs text-slate-500">Danh mục chưa có tiện nghi hoạt động để chọn.</p> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeOptions.map(amenity => {
                const id = `amenity-assignment-${targetType}-${targetId}-${amenity.id}`
                return <label key={amenity.id} htmlFor={id} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 cursor-pointer">
                  <input id={id} name={field.name} type="checkbox" checked={field.value.includes(amenity.id)} onBlur={field.onBlur}
                    onChange={event => { setSuccess(''); field.onChange(event.target.checked ? [...field.value, amenity.id] : field.value.filter(value => value !== amenity.id)) }}
                    className="accent-sky-600 mt-0.5" />
                  <span className="min-w-0"><span className="block text-sm font-semibold text-slate-700 break-words">{amenity.name}</span>{amenity.description && <span className="block text-xs text-slate-500 mt-1 whitespace-pre-wrap break-words">{amenity.description}</span>}</span>
                </label>
              })}
            </div>
          )}
          <p id={`amenity-assignment-${targetType}-${targetId}-error`} className="text-xs text-rose-600">{errors.amenity_ids?.message}</p>
        </fieldset>
        {errors.root && <p role="alert" className="text-sm text-rose-600">{errors.root.message}</p>}
        {success && <p role="status" className="text-sm text-emerald-700">{success}</p>}
        <div className="flex flex-wrap gap-2"><Button type="submit" isLoading={isSubmitting}>Lưu tiện nghi</Button><Button type="button" variant="outline" disabled={isSubmitting} onClick={onReload}>Tải lại tiện nghi</Button></div>
      </form>
    </div>
  )
}

export function AmenityAssignmentPanel({ targetType, targetId, archivedVisibility }: AmenityAssignmentPanelProps) {
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<LoadedAssignment | null>(null)
  const requestKey = `${targetType}:${targetId}:${revision}`
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getAmenityAssignment(targetType, targetId, controller.signal), getAmenityOptions(controller.signal)])
      .then(([data, options]) => { if (!controller.signal.aborted) setResult({ key: requestKey, data, options, error: '' }) })
      .catch(failure => { if (!controller.signal.aborted) setResult({ key: requestKey, data: null, options: [], error: apiErrorMessage(failure) }) })
    return () => controller.abort()
  }, [targetType, targetId, requestKey])
  return (
    <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-5">
      <h2 className="font-bold text-base text-slate-900">{targetType === 'rooms' ? 'Tiện nghi phòng và tòa nhà' : 'Tiện nghi cấp tòa nhà'}</h2>
      {!result || result.key !== requestKey ? <p role="status" className="text-sm text-slate-500">Đang tải tiện nghi…</p> : result.error || !result.data ? (
        <div role="alert" className="space-y-3"><p className="text-sm text-rose-700">{result.error}</p><div className="flex items-center gap-3"><Button variant="outline" onClick={() => setRevision(value => value + 1)}>Tải lại tiện nghi</Button><a href="/login" className="text-sm text-sky-700 underline">Đăng nhập</a></div></div>
      ) : <AssignmentForm key={requestKey} targetType={targetType} targetId={targetId} archivedVisibility={archivedVisibility} data={result.data} options={result.options}
        onSaved={data => setResult(current => current?.key === requestKey ? { ...current, data } : current)} onReload={() => setRevision(value => value + 1)} />}
    </section>
  )
}
