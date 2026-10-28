import { useRef, useState, type FormEvent } from 'react'
import { useFieldArray, useForm, useWatch, type Path } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/Button'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatDate, formatVND } from '@/lib/format'
import { getMeterContext, saveMeterReadings } from './api'
import { meterContextSchema, meterFormSchema, type MeterFormInput } from './schemas'
import type { MeterContext, MeterOptions, MeterReading } from './types'

interface Props { options: MeterOptions; batch?: boolean; buildingId?: number; onSaved: (readings: MeterReading[]) => void; onCancel?: () => void; onBusyChange: (busy: boolean) => void; onAuthFailure: () => void }
const inputClass = 'mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'

export function MeterReadingForm({ options, batch = false, buildingId = 0, onSaved, onCancel, onBusyChange, onAuthFailure }: Props) {
  const inFlight = useRef(false)
  const [contextBusy, setContextBusy] = useState(false)
  const [context, setContext] = useState<{ key: string; data?: MeterContext; error?: string }>()
  const { control, register, handleSubmit, getValues, setError, formState: { errors, isSubmitting } } = useForm<MeterFormInput>({ resolver: zodResolver(meterFormSchema), defaultValues: { building_id: buildingId, service_id: 0, period: '', reading_date: '', rows: [{ room_id: 0, current_reading: '' }] } })
  const { fields, append, remove, replace } = useFieldArray({ control, name: 'rows' })
  const values = useWatch({ control })
  const rooms = options.rooms.filter(room => room.building_id === values.building_id)
  const busy = isSubmitting || contextBusy
  const keyFor = (index: number) => JSON.stringify([values.rows?.[index]?.room_id, values.service_id, values.period, values.reading_date])

  async function baseline(index: number) {
    if (inFlight.current) return
    const value = getValues()
    const input = meterContextSchema.safeParse({ room_id: value.rows[index].room_id, service_id: value.service_id, period: value.period, reading_date: value.reading_date })
    if (!input.success) {
      input.error.issues.forEach(issue => setError((issue.path[0] === 'room_id' ? `rows.${index}.room_id` : String(issue.path[0])) as Path<MeterFormInput>, { message: issue.message }))
      return
    }
    const key = keyFor(index)
    inFlight.current = true; setContextBusy(true); onBusyChange(true)
    try { setContext({ key, data: await getMeterContext(input.data) }) }
    catch (failure) {
      let message = apiErrorMessage(failure)
      if (isAxiosError(failure) && failure.response?.status === 422) {
        const fields: unknown = failure.response.data?.errors
        if (fields && typeof fields === 'object') {
          const detail = Object.entries(fields).find(([field, messages]) => ['period', 'service_id', 'room_id', 'reading_date', 'readings'].includes(field) && Array.isArray(messages) && typeof messages[0] === 'string')
          if (detail) message = (detail[1] as string[])[0]
        }
      }
      setContext({ key, error: message })
      if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure()
    }
    finally { inFlight.current = false; setContextBusy(false); onBusyChange(false) }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    if (inFlight.current) { event.preventDefault(); return }
    inFlight.current = true; onBusyChange(true)
    try { await handleSubmit(async input => {
      const invalidRoom = input.rows.findIndex(row => !options.rooms.some(room => room.id === row.room_id && room.building_id === input.building_id))
      if (invalidRoom >= 0) { setError(`rows.${invalidRoom}.room_id`, { message: 'Phòng không thuộc tòa đang chọn.' }); return }
      try { onSaved(await saveMeterReadings({ readings: input.rows.map(row => ({ ...row, service_id: input.service_id, period: input.period, reading_date: input.reading_date })) })) }
      catch (failure) {
        if (isAxiosError(failure) && failure.response?.status === 422) {
          const fields: unknown = failure.response.data?.errors
          if (fields && typeof fields === 'object') Object.entries(fields).forEach(([field, messages]) => {
            if (!Array.isArray(messages) || typeof messages[0] !== 'string') return
            const match = /^readings\.(\d+)\.(room_id|current_reading|service_id|period|reading_date)$/.exec(field)
            if (match) setError((['room_id', 'current_reading'].includes(match[2]) ? `rows.${match[1]}.${match[2]}` : match[2]) as Path<MeterFormInput>, { message: messages[0] })
          })
        }
        setError('root', { message: apiErrorMessage(failure) })
        if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure()
      }
    })(event) } finally { inFlight.current = false; onBusyChange(false) }
  }
  return <form onSubmit={submit} noValidate className="space-y-4" aria-busy={busy}>
    <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-800">Nhập số đo thực tế; kỳ tiêu thụ do bạn chọn. Hệ thống kiểm tra lại mốc, hợp đồng và giá khi lưu. Lỗi một dòng sẽ hủy toàn bộ lượt nhập.</p>
    <fieldset disabled={busy} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-bold text-slate-700">Tòa nhà<select {...register('building_id', { valueAsNumber: true, onChange: () => { replace([{ room_id: 0, current_reading: '' }]); setContext(undefined) } })} className={inputClass}><option value="0">Chọn tòa nhà</option>{options.buildings.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><span className="text-rose-600">{errors.building_id?.message}</span></label>
        <label className="text-xs font-bold text-slate-700">Dịch vụ<select {...register('service_id', { valueAsNumber: true })} className={inputClass}><option value="0">Chọn Điện/Nước</option>{options.services.map(item => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}</select><span className="text-rose-600">{errors.service_id?.message}</span></label>
        <label className="text-xs font-bold text-slate-700">Kỳ tiêu thụ (ngày 01)<input type="date" {...register('period')} className={inputClass} /><span className="text-rose-600">{errors.period?.message}</span></label>
        <label className="text-xs font-bold text-slate-700">Ngày ghi thực tế<input type="date" {...register('reading_date')} className={inputClass} /><span className="text-rose-600">{errors.reading_date?.message}</span></label>
      </div>
      {fields.map((field, index) => <section key={field.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-700">Phòng dòng {index + 1}<select {...register(`rows.${index}.room_id`, { valueAsNumber: true })} className={inputClass}><option value="0">Chọn phòng</option>{rooms.map(room => <option key={room.id} value={room.id}>{room.code}</option>)}</select><span className="text-rose-600">{errors.rows?.[index]?.room_id?.message}</span></label>
          <label className="text-xs font-bold text-slate-700">Chỉ số mới dòng {index + 1}<input type="text" inputMode="decimal" {...register(`rows.${index}.current_reading`)} placeholder="Ví dụ: 112.35" className={inputClass} /><span className="text-rose-600">{errors.rows?.[index]?.current_reading?.message}</span></label></div>
        <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => void baseline(index)}>Xem mốc dòng {index + 1}</Button>{batch && fields.length > 1 && <Button type="button" variant="ghost" onClick={() => remove(index)}>Bỏ dòng {index + 1}</Button>}</div>
        {context?.key === keyFor(index) && (context.error ? <p role="alert" className="text-sm text-rose-700">{context.error}</p> : context.data && <p className="text-sm text-sky-800">Mốc trước: {context.data.previous_reading} · {formatDate(context.data.baseline_date)} · Đơn giá tham khảo: {formatVND(context.data.unit_price)} · {context.data.contract_id ? `Hợp đồng #${context.data.contract_id}` : 'Phòng trống'}</p>)}
      </section>)}
      {batch && <Button type="button" variant="outline" disabled={fields.length >= 100 || !rooms.length} onClick={() => append({ room_id: 0, current_reading: '' })}>Thêm dòng nhập</Button>}
      {errors.rows?.message && <p role="alert" className="text-sm text-rose-600">{errors.rows.message}</p>}
    </fieldset>
    {errors.root && <p role="alert" className="text-sm text-rose-600">{errors.root.message}</p>}
    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">{onCancel && <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Hủy</Button>}<Button type="submit" disabled={busy} isLoading={isSubmitting}>Lưu chỉ số chính thức</Button></div>
  </form>
}
