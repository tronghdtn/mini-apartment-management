import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { applyApiErrors } from '@/lib/apiErrors'
import { createService, updateService } from './api'
import { serviceSchema, serviceUpdateSchema } from './schemas'
import type { ServiceInput, ServiceUpdateInput } from './schemas'
import { billingTypeLabels } from './types'
import type { Service } from './types'

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none'
interface FormProps { onSaved: (service: Service) => void; onCancel: () => void; onBusyChange: (busy: boolean) => void }

export function ServiceCreateForm({ onSaved, onCancel, onBusyChange }: FormProps) {
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<ServiceInput>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { code: '', name: '', billing_type: 'per_room', unit: '', price: 0, description: '' },
  })
  const submit = handleSubmit(async input => {
    onBusyChange(true)
    try { onSaved(await createService(input)) }
    catch (failure) { applyApiErrors(failure, setError, ['code', 'name', 'billing_type', 'unit', 'price', 'description']) }
    finally { onBusyChange(false) }
  })
  return (
    <form onSubmit={submit} noValidate aria-busy={isSubmitting} className="space-y-4">
      <fieldset disabled={isSubmitting} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="service-name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tên dịch vụ</label>
          <input id="service-name" placeholder="VD: Internet Wifi tốc độ cao, Gửi xe máy, Vệ sinh..." {...register('name')} aria-invalid={!!errors.name} aria-describedby="service-name-error" className={inputClass} />
          <p id="service-name-error" className="text-xs text-rose-600 mt-1">{errors.name?.message}</p>
        </div>
        <div>
          <label htmlFor="service-code" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mã dịch vụ</label>
          <input id="service-code" placeholder="VD: WIFI, PARKING, CLEANING" {...register('code')} aria-invalid={!!errors.code} aria-describedby="service-code-error" className={`${inputClass} uppercase`} />
          <p id="service-code-error" className="text-xs text-rose-600 mt-1">{errors.code?.message}</p>
        </div>
        <div>
          <label htmlFor="service-billing_type" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Cách tính phí</label>
          <select id="service-billing_type" {...register('billing_type')} aria-invalid={!!errors.billing_type} aria-describedby="service-billing_type-error" className={inputClass}>
            <option value="per_room">Theo phòng / tháng</option><option value="per_person">Theo người / tháng</option><option value="per_unit">Theo số lượng</option>
          </select>
          <p id="service-billing_type-error" className="text-xs text-rose-600 mt-1">{errors.billing_type?.message}</p>
        </div>
        <div>
          <label htmlFor="service-price" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Đơn giá niêm yết (VND)</label>
          <input id="service-price" type="number" placeholder="VD: 100000" {...register('price', { valueAsNumber: true })} aria-invalid={!!errors.price} aria-describedby="service-price-error" className={inputClass} />
          <p id="service-price-error" className="text-xs text-rose-600 mt-1">{errors.price?.message}</p>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="service-unit" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Đơn vị tính (tùy chọn)</label>
          <input id="service-unit" placeholder="VD: phòng/tháng, người/tháng, xe/tháng..." {...register('unit')} aria-invalid={!!errors.unit} aria-describedby="service-unit-error" className={inputClass} />
          <p id="service-unit-error" className="text-xs text-rose-600 mt-1">{errors.unit?.message}</p>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="service-description" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mô tả (tùy chọn)</label>
          <textarea id="service-description" rows={2} placeholder="VD: Áp dụng cố định hàng tháng theo hợp đồng..." {...register('description')} aria-invalid={!!errors.description} aria-describedby="service-description-error" className={inputClass} />
          <p id="service-description-error" className="text-xs text-rose-600 mt-1">{errors.description?.message}</p>
        </div>
      </fieldset>
      {errors.root && <p role="alert" className="text-sm text-rose-600">{errors.root.message}</p>}
      <div className="pt-4 border-t border-slate-100 flex justify-end gap-2"><Button variant="outline" type="button" disabled={isSubmitting} onClick={onCancel}>Hủy</Button><Button type="submit" isLoading={isSubmitting}>Lưu dịch vụ</Button></div>
    </form>
  )
}

export function ServiceEditForm({ service, onSaved, onCancel, onBusyChange }: FormProps & { service: Service }) {
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<ServiceUpdateInput>({
    resolver: zodResolver(serviceUpdateSchema),
    defaultValues: { name: service.name, price: service.price, description: service.description ?? '' },
  })
  const submit = handleSubmit(async input => {
    if (service.billing_type !== 'metered' && input.price === null) {
      setError('price', { message: 'Vui lòng nhập đơn giá.' })
      return
    }
    onBusyChange(true)
    try { onSaved(await updateService(service, input)) }
    catch (failure) { applyApiErrors(failure, setError, ['name', 'price', 'description']) }
    finally { onBusyChange(false) }
  })
  return (
    <form onSubmit={submit} noValidate aria-busy={isSubmitting} className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 text-xs">
        <div><dt className="text-slate-500">Mã dịch vụ</dt><dd className="mt-1 font-bold break-words">{service.code}</dd></div>
        <div><dt className="text-slate-500">Cách tính phí</dt><dd className="mt-1 font-semibold">{billingTypeLabels[service.billing_type]}</dd></div>
        <div><dt className="text-slate-500">Đơn vị</dt><dd className="mt-1">{service.unit || 'Chưa khai báo'}</dd></div>
        <div><dt className="text-slate-500">Trạng thái</dt><dd className="mt-1">{service.status === 'active' ? 'Hoạt động' : 'Ngừng hoạt động'}</dd></div>
      </dl>
      <fieldset disabled={isSubmitting} className="space-y-4">
        <div>
          <label htmlFor="service-name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tên dịch vụ</label>
          <input id="service-name" placeholder="VD: Internet Wifi tốc độ cao..." {...register('name')} aria-invalid={!!errors.name} aria-describedby="service-name-error" className={inputClass} />
          <p id="service-name-error" className="text-xs text-rose-600 mt-1">{errors.name?.message}</p>
        </div>
        {service.billing_type !== 'metered' ? <div>
          <label htmlFor="service-price" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Đơn giá niêm yết (VND)</label>
          <input id="service-price" type="number" placeholder="VD: 100000" {...register('price', { valueAsNumber: true })} aria-invalid={!!errors.price} aria-describedby="service-price-error" className={inputClass} />
          <p id="service-price-error" className="text-xs text-rose-600 mt-1">{errors.price?.message}</p>
        </div> : <p className="text-xs text-sky-800 bg-sky-50 rounded-xl p-3">Giá theo chỉ số được quản lý tại Bảng giá điện nước; không sửa tại đây.</p>}
        <div>
          <label htmlFor="service-description" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mô tả (tùy chọn)</label>
          <textarea id="service-description" rows={2} placeholder="VD: Áp dụng cố định hàng tháng theo hợp đồng..." {...register('description')} aria-invalid={!!errors.description} aria-describedby="service-description-error" className={inputClass} />
          <p id="service-description-error" className="text-xs text-rose-600 mt-1">{errors.description?.message}</p>
        </div>
      </fieldset>
      {errors.root && <p role="alert" className="text-sm text-rose-600">{errors.root.message}</p>}
      <div className="pt-4 border-t border-slate-100 flex justify-end gap-2"><Button variant="outline" type="button" disabled={isSubmitting} onClick={onCancel}>Hủy</Button><Button type="submit" isLoading={isSubmitting}>Lưu dịch vụ</Button></div>
    </form>
  )
}
