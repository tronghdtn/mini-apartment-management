import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { isAxiosError } from 'axios'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { apiErrorMessage, applyApiErrors } from '@/lib/apiErrors'
import { createMaintenanceRequest, getMaintenanceContext } from './api'
import { maintenanceCreateSchema, type MaintenanceCreateInput } from './schemas'
import type { MaintenanceContext, MaintenanceRequest } from './types'

export function MaintenanceRequestForm({ onCreated, onCancel }: { onCreated: (request: MaintenanceRequest) => void; onCancel: () => void }) {
  const [context, setContext] = useState<MaintenanceContext | null>(null)
  const [contextLoading, setContextLoading] = useState(true)
  const [contextError, setContextError] = useState('')
  const [saving, setSaving] = useState(false)
  const { control, register, handleSubmit, setError, formState: { errors } } = useForm<MaintenanceCreateInput>({
    resolver: zodResolver(maintenanceCreateSchema), defaultValues: { priority: 'normal', title: '', description: '' },
  })
  const photos = useWatch({ control, name: 'photos' })

  useEffect(() => {
    const controller = new AbortController()
    getMaintenanceContext(controller.signal)
      .then(data => { if (!controller.signal.aborted) setContext(data) })
      .catch(failure => {
        if (controller.signal.aborted) return
        setContextError(isAxiosError(failure) && failure.response?.status === 403
          ? 'Cần tài khoản cư dân đang hoạt động và hợp đồng thuê còn hiệu lực để gửi yêu cầu.'
          : apiErrorMessage(failure))
      })
      .finally(() => { if (!controller.signal.aborted) setContextLoading(false) })
    return () => controller.abort()
  }, [])

  async function submit(input: MaintenanceCreateInput) {
    setSaving(true)
    try {
      onCreated(await createMaintenanceRequest(input))
    } catch (failure) {
      applyApiErrors(failure, setError, ['title', 'description', 'priority', 'photos'])
    } finally {
      setSaving(false)
    }
  }

  if (contextLoading) return <p role="status" className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Đang kiểm tra hợp đồng và phòng đang thuê…</p>
  if (contextError || !context) return <section className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><h2 className="font-bold">Chưa thể gửi yêu cầu</h2><p role="alert">{contextError || 'Tài khoản chưa có hợp đồng đang hiệu lực.'}</p><p>Chức năng gửi yêu cầu chỉ dành cho cư dân đang thuê phòng.</p><Link className="font-semibold text-sky-800 underline" to="/resident/requests">Về yêu cầu sửa chữa</Link></section>

  return <form onSubmit={handleSubmit(submit)} noValidate aria-busy={saving} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
    <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4" aria-label="Phòng gửi yêu cầu">
      <h2 className="text-sm font-bold text-slate-900">Phòng gửi yêu cầu</h2><p className="mt-1 text-sm text-slate-700">{context.room.building_name} · Phòng <strong>{context.room.code}</strong></p><p className="mt-1 text-xs text-slate-500">Phòng được lấy từ hợp đồng đang hiệu lực, không thể chọn thay phòng khác.</p>
    </section>
    <div><label htmlFor="maintenance-title" className="mb-1 block text-sm font-semibold text-slate-800">Tiêu đề sự cố <span className="text-rose-600">*</span></label><input id="maintenance-title" maxLength={150} autoComplete="off" {...register('title')} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm" placeholder="Ví dụ: Vòi nước trong phòng bị rò" />{errors.title && <p role="alert" className="mt-1 text-xs text-rose-700">{errors.title.message}</p>}</div>
    <div><label htmlFor="maintenance-description" className="mb-1 block text-sm font-semibold text-slate-800">Mô tả chi tiết <span className="text-rose-600">*</span></label><textarea id="maintenance-description" rows={5} {...register('description')} className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm" placeholder="Mô tả vị trí, dấu hiệu và thời điểm bắt đầu sự cố." />{errors.description && <p role="alert" className="mt-1 text-xs text-rose-700">{errors.description.message}</p>}</div>
    <div><label htmlFor="maintenance-priority" className="mb-1 block text-sm font-semibold text-slate-800">Mức độ ưu tiên <span className="text-rose-600">*</span></label><select id="maintenance-priority" {...register('priority')} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm sm:max-w-sm"><option value="low">Thấp</option><option value="normal">Bình thường</option><option value="high">Cao</option><option value="urgent">Khẩn cấp</option></select><p className="mt-1 text-xs text-slate-500">Ban quản lý sẽ kiểm tra mức ưu tiên và có thể điều chỉnh khi tiếp nhận.</p>{errors.priority && <p role="alert" className="mt-1 text-xs text-rose-700">{errors.priority.message}</p>}</div>
    <div><label htmlFor="maintenance-photos" className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-800"><ImagePlus className="h-4 w-4 text-sky-600" />Ảnh hiện trạng (không bắt buộc)</label><input id="maintenance-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple {...register('photos')} className="block w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-sky-800"/><p className="mt-1 text-xs text-slate-500">Tối đa 5 ảnh JPG, PNG hoặc WebP; mỗi ảnh tối đa 5 MB. Chỉ người có quyền xem yêu cầu mới tải ảnh được.</p>{photos && photos.length > 0 && <p className="mt-2 text-xs text-slate-600">Đã chọn: {Array.from(photos).map(file => file.name).join(', ')}</p>}{errors.photos && <p role="alert" className="mt-1 text-xs text-rose-700">{errors.photos.message}</p>}</div>
    {errors.root?.message && <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{errors.root.message}</p>}
    <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="outline" disabled={saving} onClick={onCancel}>Hủy</Button><Button type="submit" isLoading={saving}>Gửi yêu cầu</Button></div>
  </form>
}
