import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { CheckCircle2, Droplets, Sparkles, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { apiErrorMessage, applyApiErrors } from '@/lib/apiErrors'
import { formatDate, formatDateTime, formatVND } from '@/lib/format'
import {
  activateContract,
  confirmContractDeposit,
  getActivationContext,
  saveContractTerms,
  type ActivationContext,
} from './api'
import { activateContractSchema, type ActivateContractInput } from './schemas'
import type { Contract } from './types'

const inputClass =
  'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition'

export function ContractLifecycleActions({
  contract,
  onSaved,
  onReload,
  onBusy,
  onAuthFailure,
}: {
  contract: Contract
  onSaved: (contract: Contract) => void
  onReload: () => void
  onBusy: (busy: boolean) => void
  onAuthFailure: () => void
}) {
  const [mode, setMode] = useState<'deposit' | 'activate' | null>(null)
  const [confirmed, setConfirmed] = useState(true)
  const [autoDepositConfirmed, setAutoDepositConfirmed] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [context, setContext] = useState<ActivationContext | null>(null)
  const [contextError, setContextError] = useState('')
  const flight = useRef(false)

  const {
    register,
    handleSubmit,
    setValue,
    setError: setFormError,
    reset,
    formState: { errors },
  } = useForm<ActivateContractInput>({
    resolver: zodResolver(activateContractSchema),
    defaultValues: {
      initial_electricity_reading: '',
      initial_water_reading: '',
      meter_gap_reason: '',
      meter_gap_confirmed: false,
    },
  })

  useEffect(() => {
    if (mode !== 'activate') return
    const abort = new AbortController()
    getActivationContext(contract.id, abort.signal)
      .then((data) => {
        if (!abort.signal.aborted) {
          setContext(data)
          // Tự động điền sẵn mốc chỉ số gần nhất (hoặc 0 nếu phòng mới chưa có mốc cũ) để Admin không phải nhập tay
          const elecDefault = data.ELECTRICITY?.current_reading ?? '0'
          const waterDefault = data.WATER?.current_reading ?? '0'
          setValue('initial_electricity_reading', String(elecDefault), { shouldValidate: true })
          setValue('initial_water_reading', String(waterDefault), { shouldValidate: true })
        }
      })
      .catch((failure) => {
        if (!abort.signal.aborted) {
          setContextError(apiErrorMessage(failure))
          if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure()
        }
      })
    return () => abort.abort()
  }, [mode, contract.id, onAuthFailure, setValue])

  function open(next: 'deposit' | 'activate') {
    setMode(next)
    setError('')
    setContextError('')
    setContext(null)
    setConfirmed(true)
    setAutoDepositConfirmed(true)
    reset({
      initial_electricity_reading: '',
      initial_water_reading: '',
      meter_gap_reason: '',
      meter_gap_confirmed: false,
    })
  }

  function close() {
    if (!flight.current) setMode(null)
  }

  async function receipt() {
    if (!confirmed || flight.current) return
    flight.current = true
    setBusy(true)
    onBusy(true)
    setError('')
    setMessage('')
    try {
      const updated = await confirmContractDeposit(
        contract.id,
        contract.deposit_amount,
        contract.lifecycle_revision ?? '',
      )
      onSaved(updated)
      setMode(null)
      setMessage('Đã xác nhận thực nhận đủ tiền cọc.')
    } catch (failure) {
      setError(apiErrorMessage(failure))
      if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure()
    } finally {
      flight.current = false
      setBusy(false)
      onBusy(false)
    }
  }

  async function activate(event: FormEvent<HTMLFormElement>) {
    if (flight.current) {
      event.preventDefault()
      return
    }
    flight.current = true
    try {
      await handleSubmit(async (input) => {
        setBusy(true)
        onBusy(true)
        setError('')
        setMessage('')
        try {
          let latestContract = contract

          // 1. Nếu bản nháp chưa lưu điều khoản trước hạn -> tự động khởi tạo mặc định "Không thu phí trước hạn"
          if (latestContract.early_termination_fee_type === null) {
            latestContract = await saveContractTerms(latestContract.id, {
              early_termination_fee_type: 'none',
              early_termination_fee_amount: null,
              early_termination_fee_multiplier: null,
              early_termination_waiver_conditions: [],
            })
            onSaved(latestContract)
          }

          // 2. Nếu bản nháp có tiền cọc > 0 mà chưa xác nhận nhận cọc -> tự động xác nhận nhận cọc nếu Admin đã tích chọn
          if (latestContract.deposit_amount > 0 && latestContract.deposit_status === 'unpaid') {
            if (!autoDepositConfirmed) {
              setError('Vui lòng tích xác nhận đã thu đủ tiền cọc trước khi kích hoạt hợp đồng.')
              return
            }
            latestContract = await confirmContractDeposit(
              latestContract.id,
              latestContract.deposit_amount,
              latestContract.lifecycle_revision ?? '',
            )
            onSaved(latestContract)
          }

          // 3. Kích hoạt hợp đồng chính thức
          const updated = await activateContract(
            latestContract.id,
            input,
            latestContract.lifecycle_revision ?? '',
          )
          onSaved(updated)
          setMode(null)
          setMessage(
            `Đã kích hoạt hợp đồng ${updated.contract_number}! Phòng ${updated.room.code} đã chuyển sang Đang thuê và khách thuê đã trở thành Cư dân.`,
          )
        } catch (failure) {
          applyApiErrors(failure, setFormError, [
            'initial_electricity_reading',
            'initial_water_reading',
            'meter_gap_reason',
            'meter_gap_confirmed',
          ])
          setError(apiErrorMessage(failure))
          if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure()
        } finally {
          setBusy(false)
        }
      })(event)
    } finally {
      flight.current = false
      onBusy(false)
    }
  }

  return (
    <section
      className="rounded-3xl border border-sky-200 bg-gradient-to-r from-sky-50 via-teal-50/50 to-white p-5 sm:p-6 space-y-3 shadow-2xs"
      aria-label="Nhận cọc và kích hoạt"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-sky-600" />
            {contract.status === 'draft' ? 'Sẵn sàng kích hoạt hợp đồng & bàn giao phòng' : 'Trạng thái tiền cọc & kích hoạt'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-700">
            Tiền cọc thỏa thuận: <strong className="text-slate-900">{formatVND(contract.deposit_amount)}</strong> ·{' '}
            {contract.deposit_paid_at ? (
              <span className="text-emerald-700 font-semibold">Đã thực nhận lúc {formatDateTime(contract.deposit_paid_at)}</span>
            ) : contract.deposit_amount === 0 ? (
              'Hợp đồng không yêu cầu cọc'
            ) : (
              <span className="text-amber-700 font-semibold">Chưa thu cọc (sẽ tự động xác nhận khi bấm Kích hoạt)</span>
            )}
          </p>
          {contract.activated_at && (
            <p className="text-xs text-emerald-700 font-semibold">
              Đã kích hoạt chính thức lúc {formatDateTime(contract.activated_at)}.
            </p>
          )}
        </div>

        {contract.status === 'draft' && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {contract.deposit_amount > 0 && contract.deposit_status === 'unpaid' && (
              <Button variant="outline" onClick={() => open('deposit')}>
                Chỉ xác nhận nhận cọc
              </Button>
            )}
            <Button
              onClick={() => open('activate')}
              icon={<CheckCircle2 className="w-4 h-4" />}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
            >
              Kích hoạt hợp đồng ngay
            </Button>
          </div>
        )}
      </div>

      {message && (
        <p role="status" className="rounded-xl bg-emerald-100/80 border border-emerald-200 px-3.5 py-2.5 text-sm font-semibold text-emerald-900">
          {message}
        </p>
      )}

      <Modal isOpen={mode === 'deposit'} onClose={close} title="Xác nhận thực nhận tiền cọc" maxWidth="md">
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            Phòng <strong>{contract.room.code}</strong> · Người thuê <strong>{contract.tenant.full_name}</strong>
          </p>
          <p className="text-2xl font-extrabold text-sky-700">{formatVND(contract.deposit_amount)}</p>
          <p className="text-xs text-slate-500">
            Khoản tiền cọc này được ghi nhận vào hợp đồng để đối soát khi thanh lý, không tính vào doanh thu tiền thuê hàng tháng.
          </p>
          <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={busy}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="w-4 h-4 accent-sky-600"
            />
            Tôi xác nhận đã thực nhận đủ số tiền cọc trên.
          </label>
          {error && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-2 text-sm text-rose-700">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => {
                  close()
                  onReload()
                }}
                className="text-xs font-bold underline cursor-pointer"
              >
                Tải lại hợp đồng
              </button>
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" disabled={busy} onClick={close}>
              Hủy
            </Button>
            <Button disabled={!confirmed} isLoading={busy} onClick={() => void receipt()}>
              Xác nhận nhận cọc
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={mode === 'activate'} onClose={close} title="Kích hoạt hợp đồng & Giao phòng (1 bước)" maxWidth="lg">
        <form onSubmit={activate} noValidate className="space-y-4" aria-busy={busy}>
          <div className="rounded-2xl bg-sky-50 border border-sky-100 p-4 text-xs sm:text-sm text-sky-900 space-y-1">
            <p className="font-bold">Thao tác này sẽ tự động thực hiện trọn gói:</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>
                Cấp mã hợp đồng chính thức, chuyển phòng <strong>{contract.room.code}</strong> sang trạng thái <strong>Đang thuê</strong>.
              </li>
              <li>
                Nâng cấp tài khoản <strong>{contract.tenant.full_name}</strong> lên vai trò <strong>Cư dân</strong>.
              </li>
              {contract.early_termination_fee_type === null && (
                <li>Tự động áp dụng điều khoản mặc định: <strong>Không thu phí chấm dứt trước hạn</strong>.</li>
              )}
            </ul>
          </div>

          {contract.deposit_amount > 0 && contract.deposit_status === 'unpaid' && (
            <label className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-sm text-emerald-950 cursor-pointer">
              <input
                type="checkbox"
                checked={autoDepositConfirmed}
                disabled={busy}
                onChange={(e) => setAutoDepositConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-emerald-600"
              />
              <span>
                Đồng thời xác nhận đã thu đủ tiền cọc <strong>{formatVND(contract.deposit_amount)}</strong> của khách thuê.
              </span>
            </label>
          )}

          {contextError ? (
            <p role="alert" className="text-sm text-rose-700">
              {contextError}
            </p>
          ) : !context ? (
            <p role="status" className="text-sm text-slate-500">
              Đang tải mốc chỉ số điện nước gần nhất của phòng…
            </p>
          ) : (
            <fieldset disabled={busy} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <legend className="text-sm font-bold text-slate-900">Chỉ số công tơ bàn giao đầu kỳ</legend>
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setValue('initial_electricity_reading', String(context.ELECTRICITY?.current_reading ?? '0'), { shouldValidate: true })
                      setValue('initial_water_reading', String(context.WATER?.current_reading ?? '0'), { shouldValidate: true })
                    }}
                    className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold border border-sky-200 cursor-pointer"
                  >
                    Điền theo mốc cũ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setValue('initial_electricity_reading', '0', { shouldValidate: true })
                      setValue('initial_water_reading', '0', { shouldValidate: true })
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                  >
                    Đặt = 0
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(['ELECTRICITY', 'WATER'] as const).map((code) => {
                  const name = code === 'ELECTRICITY' ? 'initial_electricity_reading' : 'initial_water_reading'
                  const label = code === 'ELECTRICITY' ? 'Chỉ số điện đầu (kWh)' : 'Chỉ số nước đầu (m³)'
                  const baseline = context[code]
                  return (
                    <div key={code}>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        <span className="inline-flex items-center gap-1.5">
                          {code === 'ELECTRICITY' ? (
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                          ) : (
                            <Droplets className="w-3.5 h-3.5 text-sky-600" />
                          )}
                          {label}
                        </span>
                        <input
                          inputMode="decimal"
                          placeholder={code === 'ELECTRICITY' ? 'VD: 0 hoặc 1250' : 'VD: 0 hoặc 45'}
                          {...register(name)}
                          className={inputClass}
                        />
                      </label>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {baseline
                          ? `Mốc gần nhất: ${baseline.current_reading} (ngày ${formatDate(baseline.reading_date)})`
                          : 'Phòng chưa có mốc cũ — đã điền sẵn 0.'}
                      </p>
                      {errors[name] && (
                        <p role="alert" className="text-xs text-rose-700 mt-1">
                          {errors[name]?.message}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>

              {(context.ELECTRICITY || context.WATER) && (
                <details className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs">
                  <summary className="font-semibold text-slate-700 cursor-pointer">
                    Tùy chọn: Giải trình nếu chỉ số đầu cao hơn mốc bàn giao cũ
                  </summary>
                  <div className="mt-3 space-y-3">
                    <label className="block text-xs font-bold text-slate-700">
                      Lý do chênh lệch chỉ số
                      <textarea
                        rows={2}
                        placeholder="VD: Điện nước chạy thử vệ sinh phòng trong thời gian trống..."
                        {...register('meter_gap_reason')}
                        className={inputClass}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input type="checkbox" {...register('meter_gap_confirmed')} className="accent-sky-600" />
                      Tôi xác nhận phần chênh lệch này không tính cho cư dân mới.
                    </label>
                    {errors.meter_gap_reason && (
                      <p role="alert" className="text-xs text-rose-700">
                        {errors.meter_gap_reason.message}
                      </p>
                    )}
                  </div>
                </details>
              )}
            </fieldset>
          )}

          {errors.root && (
            <p role="alert" className="text-sm text-rose-700">
              {errors.root.message}
            </p>
          )}
          {error && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-2 text-sm text-rose-700">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => {
                  close()
                  onReload()
                }}
                className="text-xs font-bold underline cursor-pointer"
              >
                Tải lại hợp đồng
              </button>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" disabled={busy} onClick={close}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={!context || Boolean(contextError)}
              isLoading={busy}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Xác nhận kích hoạt hợp đồng
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  )
}
