import { useRef, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { isAxiosError } from 'axios'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { applyApiErrors } from '@/lib/apiErrors'
import { createUtilityPrice } from './api'
import { utilityPriceSchema } from './schemas'
import type { UtilityPriceInput } from './schemas'
import type { MeteredService, UtilityPrice, UtilityBuilding } from './types'

interface UtilityPriceFormProps {
  services: MeteredService[]
  buildings: UtilityBuilding[]
  buildingId?: number
  onAuthFailure: () => void
  onSaved: (price: UtilityPrice) => void
  onCancel: () => void
  onBusyChange: (busy: boolean) => void
}
const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none'

export function UtilityPriceForm({ services, buildings, buildingId = 0, onSaved, onCancel, onBusyChange, onAuthFailure }: UtilityPriceFormProps) {
  const inFlight = useRef(false)
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<UtilityPriceInput>({
    resolver: zodResolver(utilityPriceSchema), defaultValues: { building_id: buildingId, service_id: 0, unit_price: 0, effective_from: '' },
  })
  async function submit(event: FormEvent<HTMLFormElement>) {
    if (inFlight.current) { event.preventDefault(); return }
    inFlight.current = true
    onBusyChange(true)
    try { await handleSubmit(async input => {
      try { onSaved(await createUtilityPrice(input)) }
      catch (failure) { applyApiErrors(failure, setError, ['building_id', 'service_id', 'unit_price', 'effective_from']); if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure() }
    })(event) } finally { inFlight.current = false; onBusyChange(false) }
  }
  return (
    <form onSubmit={submit} noValidate aria-busy={isSubmitting} className="space-y-4">
      <fieldset disabled={isSubmitting} className="space-y-4">
        <div><label htmlFor="utility-price-building_id" className="block text-xs font-bold text-slate-700 mb-1">Tòa nhà áp dụng</label><select id="utility-price-building_id" {...register('building_id', { valueAsNumber: true })} aria-invalid={!!errors.building_id} className={inputClass}><option value="0">Chọn tòa nhà</option>{buildings.map(building => <option key={building.id} value={building.id}>{building.name}</option>)}</select><p role={errors.building_id ? 'alert' : undefined} className="text-xs text-rose-600 mt-1">{errors.building_id?.message}</p></div>
        <div>
          <label htmlFor="utility-price-service_id" className="block text-xs font-bold text-slate-700 mb-1">Dịch vụ áp dụng</label>
          <select id="utility-price-service_id" {...register('service_id', { valueAsNumber: true })} aria-invalid={!!errors.service_id} aria-describedby="utility-price-service_id-error" className={inputClass}>
            <option value="0">Chọn dịch vụ theo chỉ số</option>
            {services.map(service => <option key={service.id} value={service.id}>{service.name}{service.unit ? ` (${service.unit})` : ''}</option>)}
          </select>
          <p id="utility-price-service_id-error" className="text-xs text-rose-600 mt-1">{errors.service_id?.message}</p>
        </div>
        <div>
          <label htmlFor="utility-price-unit_price" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Đơn giá mới (VND)</label>
          <input id="utility-price-unit_price" type="number" placeholder="VD: 3500 (Điện) hoặc 25000 (Nước)" {...register('unit_price', { valueAsNumber: true })} aria-invalid={!!errors.unit_price} aria-describedby="utility-price-unit_price-error" className={inputClass} />
          <p id="utility-price-unit_price-error" className="text-xs text-rose-600 mt-1">{errors.unit_price?.message}</p>
        </div>
        <div>
          <label htmlFor="utility-price-effective_from" className="block text-xs font-bold text-slate-700 mb-1">Kỳ hiệu lực (ngày 01 của tháng)</label>
          <input id="utility-price-effective_from" type="date" {...register('effective_from')} aria-invalid={!!errors.effective_from} aria-describedby="utility-price-effective_from-error" className={inputClass} />
          <p id="utility-price-effective_from-error" className="text-xs text-rose-600 mt-1">{errors.effective_from?.message}</p>
        </div>
      </fieldset>
      {errors.root && <p role="alert" className="text-sm text-rose-600">{errors.root.message}</p>}
      <div className="pt-4 border-t border-slate-100 flex justify-end gap-2"><Button variant="outline" type="button" disabled={isSubmitting} onClick={onCancel}>Hủy</Button><Button type="submit" isLoading={isSubmitting}>Lưu mức giá</Button></div>
    </form>
  )
}
