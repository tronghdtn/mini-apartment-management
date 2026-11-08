import { useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import type { FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Calendar, Check, DoorOpen, UserCheck } from 'lucide-react'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/Button'
import { applyApiErrors } from '@/lib/apiErrors'
import { businessToday, formatDate, formatVND } from '@/lib/format'
import { saveContractTerms, saveDraftContract } from './api'
import { draftContractSchema } from './schemas'
import type { DraftContractInput } from './schemas'
import type { Contract, ContractOptions } from './types'

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none disabled:bg-slate-100 transition'
const fields = ['room_id', 'user_id', 'start_date', 'end_date', 'monthly_rent', 'deposit_amount', 'occupant_count', 'note'] as const
const steps = ['Chọn phòng', 'Người thuê', 'Thời hạn & tiền']

function addMonthsMinusOneDay(isoDate: string, months: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!match) return ''
  const d = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1 + months, Number(match[3]) - 1))
  return d.toISOString().slice(0, 10)
}

interface DraftContractFormProps {
  options: ContractOptions
  contract?: Contract
  roomId?: string | null
  userId?: string | null
  onSaved: (contract: Contract) => void
  onCancel: () => void
  onReload: () => void
}

export function DraftContractForm({ options, contract, roomId, userId, onSaved, onCancel, onReload }: DraftContractFormProps) {
  const initialRoom = options.rooms.find(room => room.id === (contract?.room_id ?? Number(roomId)))
  const initialTenant = options.tenants.find(user => user.id === (contract?.user_id ?? Number(userId)))
  const defaultStart = businessToday()
  const defaultEnd = addMonthsMinusOneDay(defaultStart, 12)

  // Nếu đã chọn phòng từ liên kết mà chưa chọn người thuê -> mở luôn bước 2; nếu đã có cả hai -> mở bước 3
  const initialStep = !contract && initialRoom && initialTenant ? 2 : !contract && initialRoom ? 1 : 0
  const [step, setStep] = useState(initialStep)
  const [saving, setSaving] = useState(false)
  const inFlight = useRef(false)

  const { register, handleSubmit, setValue, control, setError, formState: { errors, isSubmitting } } = useForm<DraftContractInput>({
    resolver: zodResolver(draftContractSchema),
    defaultValues: contract ? {
      room_id: contract.room_id,
      user_id: contract.user_id,
      start_date: contract.start_date,
      end_date: contract.end_date,
      monthly_rent: contract.monthly_rent,
      deposit_amount: contract.deposit_amount,
      occupant_count: contract.occupant_count,
      note: contract.note ?? '',
    } : {
      room_id: initialRoom?.id,
      user_id: initialTenant?.id,
      start_date: defaultStart,
      end_date: defaultEnd,
      monthly_rent: initialRoom?.base_price,
      deposit_amount: initialRoom?.deposit_amount,
      occupant_count: 1,
      note: '',
    },
  })

  const busy = saving || isSubmitting
  const receiptLocked = !!contract && contract.deposit_status !== 'unpaid'
  const roomSelection = useWatch({ control, name: 'room_id' })
  const tenantSelection = useWatch({ control, name: 'user_id' })
  const chosenRoom = options.rooms.find(room => room.id === roomSelection)
  const chosenTenant = options.tenants.find(user => user.id === tenantSelection)
  const [startDate, endDate, rent, deposit, occupants] = useWatch({
    control,
    name: ['start_date', 'end_date', 'monthly_rent', 'deposit_amount', 'occupant_count'],
  })
  const money = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? formatVND(value) : 'Chưa nhập'
  const selectionUnavailable = (!!contract && (!options.rooms.some(room => room.id === contract.room_id) || !options.tenants.some(user => user.id === contract.user_id)))

  function showInvalidStep(failures: FieldErrors<DraftContractInput>) {
    if (failures.room_id) setStep(0)
    else if (failures.user_id) setStep(1)
    else setStep(2)
  }

  function applyDurationMonths(months: number) {
    const base = startDate || businessToday()
    if (!startDate) setValue('start_date', base, { shouldValidate: true })
    const computedEnd = addMonthsMinusOneDay(base, months)
    if (computedEnd) setValue('end_date', computedEnd, { shouldValidate: true })
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
    try {
      let saved = await saveDraftContract(input, contract?.id)
      if (!contract && saved.early_termination_fee_type === null) {
        try {
          saved = await saveContractTerms(saved.id, {
            early_termination_fee_type: 'none',
            early_termination_fee_amount: null,
            early_termination_fee_multiplier: null,
            early_termination_waiver_conditions: [],
          })
        } catch {
          // Keep draft even if terms save is skipped
        }
      }
      onSaved(saved)
    }
    catch (failure) {
      applyApiErrors(failure, setError, fields)
      const serverFields = isAxiosError(failure) && failure.response?.status === 422 ? failure.response.data?.errors : undefined
      if (serverFields && Object.hasOwn(serverFields, 'room_id')) setStep(0)
      else if (serverFields && Object.hasOwn(serverFields, 'user_id')) setStep(1)
      else setStep(2)
    }
    finally { inFlight.current = false; setSaving(false) }
  }

  return (
    <form noValidate aria-busy={busy} onSubmit={event => { void handleSubmit(submit, showInvalidStep)(event) }} className="space-y-6">
      {(initialTenant || initialRoom) && !contract && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs sm:text-sm text-emerald-900 flex flex-wrap items-center gap-3">
          {initialTenant && (
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              Đã chọn sẵn người thuê: <strong>{initialTenant.full_name} ({initialTenant.phone})</strong>
            </span>
          )}
          {initialRoom && (
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <DoorOpen className="w-4 h-4 text-emerald-600 shrink-0" />
              Đã chọn sẵn phòng: <strong>Phòng {initialRoom.code} ({initialRoom.building.name})</strong>
            </span>
          )}
        </div>
      )}

      <div className="p-3 bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-2xs">
        <nav aria-label="Các bước lập hợp đồng nháp" className="flex min-w-[420px] justify-between gap-2">
          {steps.map((label, index) => (
            <button
              key={label}
              type="button"
              disabled={busy}
              aria-current={index === step ? 'step' : undefined}
              onClick={() => setStep(index)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                step === index ? 'bg-sky-50 text-sky-700 border border-sky-200/80' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center ${index === step ? 'bg-sky-600 text-white' : index < step ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>
                {index < step ? <Check className="w-3 h-3" /> : index + 1}
              </span>
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] items-start">
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 shadow-xs space-y-5 min-w-0">
          {selectionUnavailable && (
            <p className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800">
              Phòng hoặc người thuê của bản nháp không còn đủ điều kiện. Chọn lại trước khi lưu; dữ liệu cũ chưa bị thay đổi.
            </p>
          )}
          {receiptLocked && (
            <p className="text-sm text-sky-800">
              Đã nhận cọc: phòng, người thuê và số cọc được giữ nguyên. Chưa có quy trình hoàn cọc cho nháp tại đây.
            </p>
          )}

          <fieldset disabled={busy} className="space-y-6 divide-y divide-slate-100">
            <section className="space-y-4">
              <h2 className="text-base font-bold text-slate-900">1. Chọn phòng trống</h2>
              <div>
                <label htmlFor="contract-room_id" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phòng / Tòa nhà <span className="text-rose-500">*</span>
                </label>
                <fieldset disabled={receiptLocked}>
                  <select
                    id="contract-room_id"
                    {...register('room_id', {
                      valueAsNumber: true,
                      onChange: event => {
                        const room = options.rooms.find(item => item.id === Number(event.target.value))
                        if (room) {
                          setValue('monthly_rent', room.base_price, { shouldValidate: true })
                          setValue('deposit_amount', room.deposit_amount, { shouldValidate: true })
                        }
                      },
                    })}
                    aria-invalid={!!errors.room_id}
                    aria-describedby="contract-room_id-error"
                    className={inputClass}
                  >
                    <option value="">-- Chọn phòng trống --</option>
                    {contract && !options.rooms.some(room => room.id === contract.room_id) && (
                      <option value={contract.room_id} disabled>{contract.room.code} — Không còn đủ điều kiện</option>
                    )}
                    {options.rooms.map(room => (
                      <option key={room.id} value={room.id}>
                        Phòng {room.code} — {room.building.name} ({formatVND(room.base_price)}/tháng)
                      </option>
                    ))}
                  </select>
                </fieldset>
                <p id="contract-room_id-error" className="text-xs text-rose-600 mt-1">{errors.room_id?.message}</p>
              </div>
              {options.rooms.length === 0 && (
                <p className="text-sm text-slate-500">Chưa có phòng trống. Tạo hoặc kiểm tra phòng tại khu Quản lý phòng trước khi lập hợp đồng.</p>
              )}
              {chosenRoom && (
                <div className="rounded-2xl bg-sky-50/60 border border-sky-100 p-4 text-sm space-y-1">
                  <p className="font-bold text-slate-900">Phòng {chosenRoom.code} — {chosenRoom.building.name}</p>
                  <p className="text-slate-700">Giá niêm yết: <strong className="text-sky-700">{formatVND(chosenRoom.base_price)}</strong> · Tiền cọc: <strong>{formatVND(chosenRoom.deposit_amount)}</strong></p>
                  <p className="text-xs text-slate-500">Sức chứa tối đa {chosenRoom.max_occupants} người, gồm cả người đại diện.</p>
                </div>
              )}
            </section>

            <section className="space-y-4 pt-5">
              <h2 className="text-base font-bold text-slate-900">2. Chọn khách hàng / người thuê đại diện</h2>
              <div>
                <label htmlFor="contract-user_id" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tài khoản người thuê <span className="text-rose-500">*</span>
                </label>
                <fieldset disabled={receiptLocked}>
                  <select
                    id="contract-user_id"
                    {...register('user_id', { valueAsNumber: true })}
                    aria-invalid={!!errors.user_id}
                    aria-describedby="contract-user_id-error"
                    className={inputClass}
                  >
                    <option value="">-- Chọn tài khoản khách hàng / cư dân --</option>
                    {contract && !options.tenants.some(user => user.id === contract.user_id) && (
                      <option value={contract.user_id} disabled>{contract.tenant.full_name} — Không còn đủ điều kiện</option>
                    )}
                    {options.tenants.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} — {user.phone}{user.email ? ` — ${user.email}` : ''}
                      </option>
                    ))}
                  </select>
                </fieldset>
                <p id="contract-user_id-error" className="text-xs text-rose-600 mt-1">{errors.user_id?.message}</p>
              </div>
              <p className="text-xs text-slate-500">
                Danh sách bao gồm mọi tài khoản <strong>Khách đã đăng ký</strong> và <strong>Cư dân</strong> đang hoạt động, chưa có hợp đồng hiệu lực. Khi kích hoạt hợp đồng, tài khoản Khách sẽ tự động chuyển sang vai trò Cư dân.
              </p>
              {options.tenants.length === 0 && <p className="text-sm text-slate-500">Chưa có tài khoản người thuê đủ điều kiện.</p>}
              {chosenTenant && (
                <div className="rounded-2xl bg-emerald-50/60 border border-emerald-100 p-4 text-sm space-y-1">
                  <p className="font-bold text-slate-900">{chosenTenant.full_name}</p>
                  <p className="text-slate-700">SĐT: {chosenTenant.phone} · Email: {chosenTenant.email ?? 'Chưa có email'}</p>
                </div>
              )}
            </section>

            <section className="space-y-4 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-slate-900">3. Thời hạn và tiền thuê</h2>
                <div className="flex items-center gap-1.5 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-sky-600" />
                  <span className="text-slate-500">Chọn nhanh kỳ hạn:</span>
                  {[6, 12, 24].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => applyDurationMonths(m)}
                      className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold border border-sky-200/80 transition cursor-pointer"
                    >
                      {m} tháng
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(['start_date', 'end_date'] as const).map(field => (
                  <div key={field}>
                    <label htmlFor={`contract-${field}`} className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      {field === 'start_date' ? 'Ngày bắt đầu ở *' : 'Ngày cuối được ở *'}
                    </label>
                    <input
                      id={`contract-${field}`}
                      type="date"
                      {...register(field)}
                      aria-invalid={!!errors[field]}
                      aria-describedby={`contract-${field}-error`}
                      className={inputClass}
                    />
                    <p id={`contract-${field}-error`} className="text-xs text-rose-600 mt-1">{errors[field]?.message}</p>
                  </div>
                ))}
                {(['monthly_rent', 'deposit_amount', 'occupant_count'] as const).map(field => (
                  <div key={field}>
                    <label htmlFor={`contract-${field}`} className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      {{
                        monthly_rent: 'Tiền thuê / tháng (VND) *',
                        deposit_amount: 'Tiền cọc (VND) *',
                        occupant_count: 'Số người ở (gồm người đại diện) *',
                      }[field]}
                    </label>
                    <input
                      id={`contract-${field}`}
                      type="number"
                      readOnly={receiptLocked && field === 'deposit_amount'}
                      min={field === 'occupant_count' ? 1 : 0}
                      step={field === 'occupant_count' ? '1' : '100000'}
                      placeholder={field === 'occupant_count' ? 'VD: 2' : 'VD: 4500000'}
                      {...register(field, { valueAsNumber: true })}
                      aria-invalid={!!errors[field]}
                      aria-describedby={`contract-${field}-error`}
                      className={inputClass}
                    />
                    <p id={`contract-${field}-error`} className="text-xs text-rose-600 mt-1">{errors[field]?.message}</p>
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <label htmlFor="contract-note" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Ghi chú hợp đồng (tùy chọn)
                  </label>
                  <textarea
                    id="contract-note"
                    rows={3}
                    placeholder="VD: Bàn giao 02 thẻ từ thang máy, chìa khóa phòng, điều khiển điều hòa..."
                    {...register('note')}
                    aria-invalid={!!errors.note}
                    aria-describedby="contract-note-error"
                    className={inputClass}
                  />
                  <p id="contract-note-error" className="text-xs text-rose-600 mt-1">{errors.note?.message}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Ngày cuối được ở tính cả ngày đó. Sau khi bấm <strong>Lưu bản nháp</strong>, hệ thống sẽ chuyển sang trang chi tiết hợp đồng để bạn xác nhận tiền cọc và bấm <strong>Kích hoạt hợp đồng</strong>.
              </p>
            </section>
          </fieldset>

          {errors.root && (
            <div role="alert" className="text-sm text-rose-700 space-y-2">
              <p>{errors.root.message}</p>
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onReload}>Tải lại dữ liệu</Button>
            </div>
          )}

          <div className="pt-5 border-t border-slate-100 flex flex-wrap justify-between gap-3">
            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Hủy</Button>
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" isLoading={busy}>
                {contract ? 'Lưu thay đổi bản nháp' : 'Tạo hợp đồng & Chuyển sang kích hoạt'}
              </Button>
            </div>
          </div>
        </div>

        <aside aria-label="Tóm tắt bản nháp" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs lg:sticky lg:top-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Tóm tắt bản nháp</h2>
          <dl className="mt-3 divide-y divide-slate-100 text-sm">
            <div className="py-2">
              <dt className="text-xs text-slate-500">Phòng</dt>
              <dd className="font-semibold text-slate-900 break-words">
                {chosenRoom ? `${chosenRoom.code} — ${chosenRoom.building.name}` : contract && contract.room_id === roomSelection ? `${contract.room.code} — ${contract.room.building.name}` : 'Chưa chọn'}
              </dd>
            </div>
            <div className="py-2">
              <dt className="text-xs text-slate-500">Người thuê đại diện</dt>
              <dd className="font-semibold text-slate-900 break-words">
                {chosenTenant?.full_name ?? (contract && contract.user_id === tenantSelection ? contract.tenant.full_name : 'Chưa chọn')}
              </dd>
            </div>
            <div className="py-2">
              <dt className="text-xs text-slate-500">Thời hạn (ngày cuối ở)</dt>
              <dd className="text-slate-800">{startDate ? formatDate(startDate) : '—'} → {endDate ? formatDate(endDate) : '—'}</dd>
            </div>
            <div className="py-2 flex justify-between gap-2">
              <dt className="text-xs text-slate-500">Tiền thuê / tháng</dt>
              <dd className="font-bold text-sky-700 text-right">{money(rent)}</dd>
            </div>
            <div className="py-2 flex justify-between gap-2">
              <dt className="text-xs text-slate-500">Tiền cọc</dt>
              <dd className="font-semibold text-right">{money(deposit)}</dd>
            </div>
            <div className="py-2 flex justify-between gap-2">
              <dt className="text-xs text-slate-500">Số người ở</dt>
              <dd className="font-semibold">{typeof occupants === 'number' && Number.isInteger(occupants) ? occupants : '—'}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            Khi hợp đồng được kích hoạt ở bước kế tiếp, khách thuê sẽ chính thức trở thành <strong>Cư dân</strong> của tòa nhà.
          </p>
        </aside>
      </div>
    </form>
  )
}
