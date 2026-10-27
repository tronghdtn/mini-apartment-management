import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { apiErrorMessage, applyApiErrors } from '@/lib/apiErrors'
import { formatDate, formatDateTime, formatVND } from '@/lib/format'
import { activateContract, confirmContractDeposit, getActivationContext, type ActivationContext } from './api'
import { activateContractSchema, type ActivateContractInput } from './schemas'
import type { Contract } from './types'

export function ContractLifecycleActions({ contract, onSaved, onReload, onBusy, onAuthFailure }: { contract: Contract; onSaved: (contract: Contract) => void; onReload: () => void; onBusy: (busy: boolean) => void; onAuthFailure: () => void }) {
  const [mode, setMode] = useState<'deposit' | 'activate' | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [context, setContext] = useState<ActivationContext | null>(null)
  const [contextError, setContextError] = useState('')
  const flight = useRef(false)
  const { register, handleSubmit, setError: setFormError, reset, formState: { errors } } = useForm<ActivateContractInput>({ resolver: zodResolver(activateContractSchema), defaultValues: {
    initial_electricity_reading: '', initial_water_reading: '', meter_gap_reason: '', meter_gap_confirmed: false,
  } })
  useEffect(() => {
    if (mode !== 'activate') return
    const abort = new AbortController()
    getActivationContext(contract.id, abort.signal).then(data => { if (!abort.signal.aborted) setContext(data) })
      .catch(failure => { if (!abort.signal.aborted) { setContextError(apiErrorMessage(failure)); if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure() } })
    return () => abort.abort()
  }, [mode, contract.id, onAuthFailure])
  function open(next: 'deposit' | 'activate') { setMode(next); setError(''); setContextError(''); setContext(null); setConfirmed(false); reset() }
  function close() { if (!flight.current) setMode(null) }
  async function receipt() {
    if (!confirmed || flight.current) return
    flight.current = true; setBusy(true); onBusy(true); setError(''); setMessage('')
    try { const updated = await confirmContractDeposit(contract.id, contract.deposit_amount, contract.lifecycle_revision ?? ''); onSaved(updated); setMode(null); setMessage('Đã xác nhận thực nhận đủ tiền cọc. Khoản này không phải doanh thu tiền thuê.') }
    catch (failure) { setError(apiErrorMessage(failure)); if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure() }
    finally { flight.current = false; setBusy(false); onBusy(false) }
  }
  async function activate(event: FormEvent<HTMLFormElement>) {
    if (flight.current) { event.preventDefault(); return }
    flight.current = true
    try { await handleSubmit(async input => {
      setBusy(true); onBusy(true); setMessage('')
      try { const updated = await activateContract(contract.id, input, contract.lifecycle_revision ?? ''); onSaved(updated); setMode(null); setMessage(`Đã kích hoạt hợp đồng ${updated.contract_number}.`) }
      catch (failure) { applyApiErrors(failure, setFormError, ['initial_electricity_reading', 'initial_water_reading', 'meter_gap_reason', 'meter_gap_confirmed']); if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure() }
      finally { setBusy(false) }
    })(event) } finally { flight.current = false; onBusy(false) }
  }
  return <section className="rounded-3xl border border-sky-200 bg-sky-50 p-5 space-y-3" aria-label="Nhận cọc và kích hoạt">
    <h2 className="font-bold text-slate-900">Tiền cọc và kích hoạt</h2>
    <p className="text-sm text-slate-700">Cọc thỏa thuận: <strong>{formatVND(contract.deposit_amount)}</strong>. {contract.deposit_paid_at ? `Đã thực nhận lúc ${formatDateTime(contract.deposit_paid_at)}.` : contract.deposit_amount === 0 ? 'Hợp đồng không yêu cầu cọc.' : 'Chưa xác nhận thực nhận đủ cọc.'}</p>
    {contract.activated_at && <p className="text-sm text-slate-700">Kích hoạt lúc {formatDateTime(contract.activated_at)}.</p>}
    {contract.status === 'draft' && <><p className="text-sm text-slate-600">Chỉ sử dụng dữ liệu đã lưu. Kiểm tra điều khoản và dịch vụ trước khi kích hoạt.</p><div className="flex flex-wrap gap-2">{contract.deposit_amount > 0 && contract.deposit_status === 'unpaid' && <Button onClick={() => open('deposit')}>Ghi nhận thực nhận cọc</Button>}<Button variant="outline" onClick={() => open('activate')}>Kích hoạt hợp đồng</Button></div></>}
    {message && <p role="status" className="text-sm font-semibold text-teal-800">{message}</p>}
    <Modal isOpen={mode === 'deposit'} onClose={close} title="Xác nhận thực nhận tiền cọc" maxWidth="md"><div className="space-y-4"><p className="text-sm">Phòng {contract.room.code} · {contract.tenant.full_name}</p><p className="text-xl font-bold text-sky-700">{formatVND(contract.deposit_amount)}</p><p className="text-sm text-slate-600">Chỉ xác nhận sau khi đã kiểm tra thực nhận đủ tiền. Không tạo hóa đơn thuê hoặc doanh thu từ khoản cọc này.</p><label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />Tôi xác nhận đã thực nhận đủ số tiền cọc trên.</label>{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}<div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={busy} onClick={close}>Hủy</Button><Button disabled={!confirmed} isLoading={busy} onClick={() => { void receipt() }}>Xác nhận nhận cọc</Button><Button variant="ghost" disabled={busy} onClick={onReload}>Tải lại dữ liệu</Button></div></div></Modal>
    <Modal isOpen={mode === 'activate'} onClose={close} title="Kích hoạt hợp đồng" maxWidth="lg"><form onSubmit={activate} noValidate className="space-y-4" aria-busy={busy}>
      <p className="rounded-xl bg-sky-50 p-4 text-sm text-sky-900">Sinh mã hợp đồng, chuyển phòng sang Đang thuê và tài khoản sang Cư dân, thêm Điện/Nước. Phòng, người thuê, giá, cọc, ngày và điều khoản sẽ được khóa. Không phát sinh hóa đơn trong thao tác này.</p>
      <p className="text-sm">Điều khoản: {contract.early_termination_fee_type === null ? 'Chưa thỏa thuận — cần lưu ở tab Điều khoản' : 'Đã lưu'}. Cọc: {contract.deposit_amount === 0 ? 'Không yêu cầu' : contract.deposit_status === 'held' ? 'Đã thực nhận' : 'Cần xác nhận thực nhận trước'}.</p>
      {contextError ? <p role="alert" className="text-sm text-rose-700">{contextError}</p> : !context ? <p role="status" className="text-sm text-slate-500">Đang tải mốc chỉ số gần nhất…</p> : <fieldset disabled={busy} className="space-y-4"><legend className="text-sm font-bold">Chỉ số đo thực tế khi nhận phòng</legend>
        {(['ELECTRICITY', 'WATER'] as const).map(code => { const name = code === 'ELECTRICITY' ? 'initial_electricity_reading' : 'initial_water_reading'; const label = code === 'ELECTRICITY' ? 'Chỉ số điện đầu (kWh)' : 'Chỉ số nước đầu (m³)'; const baseline = context[code]; return <div key={code}><label className="block text-sm font-semibold">{label}<input inputMode="decimal" {...register(name)} className="mt-1 w-full rounded-xl border border-slate-200 p-3" /></label><p className="mt-1 text-xs text-slate-500">{baseline ? `Mốc gần nhất: ${baseline.current_reading}, ngày ${formatDate(baseline.reading_date)}, ${baseline.kind === 'final' ? 'chốt bàn giao' : 'định kỳ'}.` : 'Chưa có mốc cũ. Nhập chỉ số đo thực tế, không tự điền 0.'}</p>{errors[name] && <p role="alert" className="text-sm text-rose-700">{errors[name]?.message}</p>}</div> })}
        <label className="block text-sm font-semibold">Lý do chênh lệch nếu cao hơn mốc cũ<textarea {...register('meter_gap_reason')} className="mt-1 w-full rounded-xl border border-slate-200 p-3" /></label><label className="flex gap-2 text-sm"><input type="checkbox" {...register('meter_gap_confirmed')} />Tôi xác nhận chênh lệch có lý do nêu trên và không tính cho người thuê.</label>{errors.meter_gap_reason && <p role="alert" className="text-sm text-rose-700">{errors.meter_gap_reason.message}</p>}
      </fieldset>}
      {errors.root && <p role="alert" className="text-sm text-rose-700">{errors.root.message}</p>}{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={close}>Hủy</Button><Button type="submit" disabled={!context || Boolean(contextError)} isLoading={busy}>Xác nhận kích hoạt</Button><Button type="button" variant="ghost" disabled={busy} onClick={onReload}>Tải lại dữ liệu</Button></div>
    </form></Modal>
  </section>
}
