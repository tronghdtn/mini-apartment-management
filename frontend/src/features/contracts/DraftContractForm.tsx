import { useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import type { FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check } from 'lucide-react'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/Button'
import { applyApiErrors } from '@/lib/apiErrors'
import { formatVND } from '@/lib/format'
import { saveDraftContract } from './api'
import { draftContractSchema } from './schemas'
import type { DraftContractInput } from './schemas'
import type { Contract, ContractOptions } from './types'

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none disabled:bg-slate-100'
const fields = ['room_id', 'user_id', 'start_date', 'end_date', 'monthly_rent', 'deposit_amount', 'occupant_count', 'note'] as const
const steps = ['Chọn phòng', 'Người thuê', 'Thời hạn & tiền']

interface DraftContractFormProps {
  options: ContractOptions
  contract?: Contract
  roomId?: string | null
  onSaved: (contract: Contract) => void
  onCancel: () => void
  onReload: () => void
}

export function DraftContractForm({ options, contract, roomId, onSaved, onCancel, onReload }: DraftContractFormProps) {
  const initialRoom = options.rooms.find(room => room.id === (contract?.room_id ?? Number(roomId)))
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const inFlight = useRef(false)
  const { register, handleSubmit, setValue, control, trigger, setError, formState: { errors, isSubmitting } } = useForm<DraftContractInput>({
    resolver: zodResolver(draftContractSchema),
    defaultValues: contract ? {
      room_id: contract.room_id, user_id: contract.user_id, start_date: contract.start_date, end_date: contract.end_date,
      monthly_rent: contract.monthly_rent, deposit_amount: contract.deposit_amount,
      occupant_count: contract.occupant_count, note: contract.note ?? '',
    } : {
      room_id: initialRoom?.id, start_date: '', end_date: '', monthly_rent: initialRoom?.base_price,
      deposit_amount: initialRoom?.deposit_amount, occupant_count: 1, note: '',
    },
  })
  const busy = saving || isSubmitting
  const receiptLocked = !!contract && contract.deposit_status !== 'unpaid'
  const roomSelection = useWatch({ control, name: 'room_id' })
  const tenantSelection = useWatch({ control, name: 'user_id' })
  const chosenRoom = options.rooms.find(room => room.id === roomSelection)
  const chosenTenant = options.tenants.find(user => user.id === tenantSelection)
  const selectionUnavailable = (!!contract && (!options.rooms.some(room => room.id === contract.room_id) || !options.tenants.some(user => user.id === contract.user_id)))

  function showInvalidStep(failures: FieldErrors<DraftContractInput>) {
    if (failures.room_id) setStep(0)
    else if (failures.user_id) setStep(1)
    else setStep(2)
  }

  async function next() {
    if (inFlight.current) return
    if (await trigger(step === 0 ? ['room_id'] : ['user_id'])) setStep(value => Math.min(2, value + 1))
  }

  async function submit(input: DraftContractInput) {
    if (inFlight.current) return
    if (!options.rooms.some(room => room.id === input.room_id)) {
      setError('room_id', { message: 'Phòng không còn trong danh sách phòng trống. Vui lòng chọn lại.' }); setStep(0); return
    }
    if (!options.tenants.some(user => user.id === input.user_id)) {
      setError('user_id', { message: 'Tài khoản không còn đủ điều kiện làm người thuê. Vui lòng chọn lại.' }); setStep(1); return
    }
    if (chosenRoom && input.occupant_count > chosenRoom.max_occupants) {
      setError('occupant_count', { message: `Phòng chỉ cho phép tối đa ${chosenRoom.max_occupants} người.` }); setStep(2); return
    }
    inFlight.current = true; setSaving(true)
    try { onSaved(await saveDraftContract(input, contract?.id)) }
    catch (failure) {
      applyApiErrors(failure, setError, fields)
      const serverFields = isAxiosError(failure) && failure.response?.status === 422 ? failure.response.data?.errors : undefined
      if (serverFields && Object.hasOwn(serverFields, 'room_id')) setStep(0)
      else if (serverFields && Object.hasOwn(serverFields, 'user_id')) setStep(1)
      else setStep(2)
    }
    finally { inFlight.current = false; setSaving(false) }
  }

  return <form noValidate aria-busy={busy} onSubmit={event => { void handleSubmit(submit, showInvalidStep)(event) }} className="space-y-6">
    <div className="p-3 bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-2xs">
      <nav aria-label="Các bước lập hợp đồng nháp" className="flex min-w-[420px] justify-between gap-2">
        {steps.map((label, index) => <button key={label} type="button" disabled={busy} aria-current={index === step ? 'step' : undefined}
          onClick={() => setStep(index)} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${step === index ? 'bg-sky-50 text-sky-700' : 'text-slate-500 hover:bg-slate-50'}`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center ${index === step ? 'bg-sky-600 text-white' : 'bg-slate-100'}`}>{index < step ? <Check className="w-3 h-3" /> : index + 1}</span>{label}
        </button>)}
      </nav>
    </div>
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
      {selectionUnavailable && <p className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800">Phòng hoặc người thuê của bản nháp không còn đủ điều kiện. Chọn lại trước khi lưu; dữ liệu cũ chưa bị thay đổi.</p>}
      {receiptLocked && <p className="text-sm text-sky-800">Đã nhận cọc: phòng, người thuê và số cọc được giữ nguyên. Chưa có quy trình hoàn cọc cho nháp tại đây.</p>}
      <fieldset disabled={busy} className="space-y-5">
        <section hidden={step !== 0} className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">Bước 1: Chọn phòng trống</h2>
          <div>
            <label htmlFor="contract-room_id" className="block text-xs font-bold text-slate-700 mb-1">Phòng / Tòa nhà</label>
            <fieldset disabled={receiptLocked}><select id="contract-room_id" {...register('room_id', { valueAsNumber: true, onChange: event => {
              const room = options.rooms.find(item => item.id === Number(event.target.value))
              if (room) { setValue('monthly_rent', room.base_price, { shouldValidate: true }); setValue('deposit_amount', room.deposit_amount, { shouldValidate: true }) }
            } })} aria-invalid={!!errors.room_id} aria-describedby="contract-room_id-error" className={inputClass}>
              <option value="">Chọn phòng</option>
              {contract && !options.rooms.some(room => room.id === contract.room_id) && <option value={contract.room_id} disabled>{contract.room.code} — Không còn đủ điều kiện</option>}
              {options.rooms.map(room => <option key={room.id} value={room.id}>{room.code} — {room.building.name}</option>)}
            </select></fieldset>
            <p id="contract-room_id-error" className="text-xs text-rose-600 mt-1">{errors.room_id?.message}</p>
          </div>
          {options.rooms.length === 0 && <p className="text-sm text-slate-500">Chưa có phòng trống. Tạo hoặc kiểm tra phòng tại khu Quản lý phòng trước khi lập hợp đồng.</p>}
          {chosenRoom && <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-sm space-y-1"><p className="font-bold text-slate-900">{chosenRoom.code} — {chosenRoom.building.name}</p><p>Giá niêm yết: {formatVND(chosenRoom.base_price)} · Cọc: {formatVND(chosenRoom.deposit_amount)}</p><p>Tối đa {chosenRoom.max_occupants} người, gồm cả người đại diện.</p></div>}
        </section>
        <section hidden={step !== 1} className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">Bước 2: Người thuê đại diện</h2>
          <div>
            <label htmlFor="contract-user_id" className="block text-xs font-bold text-slate-700 mb-1">Tài khoản người thuê</label>
            <fieldset disabled={receiptLocked}><select id="contract-user_id" {...register('user_id', { valueAsNumber: true })} aria-invalid={!!errors.user_id} aria-describedby="contract-user_id-error" className={inputClass}>
              <option value="">Chọn tài khoản người thuê</option>
              {contract && !options.tenants.some(user => user.id === contract.user_id) && <option value={contract.user_id} disabled>{contract.tenant.full_name} — Không còn đủ điều kiện</option>}
              {options.tenants.map(user => <option key={user.id} value={user.id}>{user.full_name} — {user.phone}{user.email ? ` — ${user.email}` : ''}</option>)}
            </select></fieldset>
            <p id="contract-user_id-error" className="text-xs text-rose-600 mt-1">{errors.user_id?.message}</p>
          </div>
          <p className="text-xs text-slate-500">Chọn Khách/Cư dân đang hoạt động và chưa có hợp đồng hiệu lực. Lưu nháp không đổi vai trò tài khoản.</p>
          {options.tenants.length === 0 && <p className="text-sm text-slate-500">Chưa có tài khoản người thuê đủ điều kiện.</p>}
          {chosenTenant && <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-sm space-y-1"><p className="font-bold text-slate-900">{chosenTenant.full_name}</p><p>{chosenTenant.phone}</p><p>{chosenTenant.email ?? 'Chưa có email'}</p></div>}
        </section>
        <section hidden={step !== 2} className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">Bước 3: Thời hạn và tiền thuê</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(['start_date', 'end_date'] as const).map(field => <div key={field}>
              <label htmlFor={`contract-${field}`} className="block text-xs font-bold text-slate-700 mb-1">{field === 'start_date' ? 'Ngày bắt đầu' : 'Ngày cuối được ở'}</label>
              <input id={`contract-${field}`} type="date" {...register(field)} aria-invalid={!!errors[field]} aria-describedby={`contract-${field}-error`} className={inputClass} />
              <p id={`contract-${field}-error`} className="text-xs text-rose-600 mt-1">{errors[field]?.message}</p>
            </div>)}
            {(['monthly_rent', 'deposit_amount', 'occupant_count'] as const).map(field => <div key={field}>
              <label htmlFor={`contract-${field}`} className="block text-xs font-bold text-slate-700 mb-1">{{ monthly_rent: 'Tiền thuê / tháng (VND)', deposit_amount: 'Tiền cọc (VND)', occupant_count: 'Số người ở (gồm người đại diện)' }[field]}</label>
              <input id={`contract-${field}`} type="number" readOnly={receiptLocked && field === 'deposit_amount'} min={field === 'occupant_count' ? 1 : 0} step="1" {...register(field, { valueAsNumber: true })} aria-invalid={!!errors[field]} aria-describedby={`contract-${field}-error`} className={inputClass} />
              <p id={`contract-${field}-error`} className="text-xs text-rose-600 mt-1">{errors[field]?.message}</p>
            </div>)}
            <div className="sm:col-span-2"><label htmlFor="contract-note" className="block text-xs font-bold text-slate-700 mb-1">Ghi chú</label><textarea id="contract-note" rows={3} {...register('note')} aria-invalid={!!errors.note} aria-describedby="contract-note-error" className={inputClass} /><p id="contract-note-error" className="text-xs text-rose-600 mt-1">{errors.note?.message}</p></div>
          </div>
          <p className="text-xs text-slate-500">Ngày cuối được ở được tính cả ngày đó. Tiền cọc trong bản nháp chưa có nghĩa đã nhận cọc.</p>
        </section>
      </fieldset>
      {errors.root && <div role="alert" className="text-sm text-rose-700 space-y-2"><p>{errors.root.message}</p><Button type="button" variant="outline" size="sm" disabled={busy} onClick={onReload}>Tải lại dữ liệu</Button></div>}
      <div className="pt-5 border-t border-slate-100 flex flex-wrap justify-between gap-3">
        <div className="flex gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Hủy</Button>{step > 0 && <Button type="button" variant="outline" disabled={busy} onClick={() => setStep(value => value - 1)}>Quay lại</Button>}</div>
        <div className="flex gap-2">{step < 2 && <Button type="button" disabled={busy} onClick={() => { void next() }}>Tiếp tục</Button>}<Button type="submit" variant={step < 2 ? 'outline' : 'primary'} isLoading={busy}>{contract ? 'Lưu thay đổi bản nháp' : 'Lưu bản nháp'}</Button></div>
      </div>
    </div>
  </form>
}
