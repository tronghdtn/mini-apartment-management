import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { apiErrorMessage, applyApiErrors } from '@/lib/apiErrors'
import { getContractOccupants, saveContractOccupant, removeContractOccupant } from './api'
import { contractOccupantInputSchema, type ContractOccupantInput, type ContractOccupant, type ContractOccupants } from './occupants'
import type { Contract } from './types'

export function ContractOccupantsPanel({ contract, visible, onChanged, onBusy, onAuthFailure }: {
  contract: Contract; visible: boolean; onChanged: () => void; onBusy: (busy: boolean) => void; onAuthFailure: () => void
}) {
  const [attempt, setAttempt] = useState(0)
  const key = `${contract.id}:${contract.lifecycle_revision}:${attempt}`
  const [result, setResult] = useState<{ key: string; data?: ContractOccupants; error?: string }>()
  const [editing, setEditing] = useState<ContractOccupant | null>()
  const [removing, setRemoving] = useState<ContractOccupant>()
  const [dialogRevision, setDialogRevision] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const [notice, setNotice] = useState('')
  const inFlight = useRef(false)
  const form = useForm<ContractOccupantInput>({ resolver: zodResolver(contractOccupantInputSchema),
    defaultValues: { full_name: '', phone: '', relationship: '' } })
  const current = result?.key === key ? result : undefined
  const data = current?.data
  const canEdit = data?.can_edit && contract.status === 'draft'

  useEffect(() => {
    if (!visible) return
    const abort = new AbortController()
    getContractOccupants(contract.id, abort.signal)
      .then(data => { if (!abort.signal.aborted) setResult({ key, data }) })
      .catch(error => {
        if (abort.signal.aborted) return
        setResult({ key, error: apiErrorMessage(error) })
        if (isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) onAuthFailure()
      })
    return () => abort.abort()
  }, [contract.id, visible, key, onAuthFailure])

  function reload() {
    if (inFlight.current) return
    setEditing(undefined); setRemoving(undefined); setFailure(''); setAttempt(value => value + 1)
    onChanged()
  }
  function beginEdit(row: ContractOccupant | null) {
    if (!data || !canEdit || inFlight.current) return
    form.reset({ full_name: row?.full_name ?? '', phone: row?.phone ?? '', relationship: row?.relationship ?? '' })
    setDialogRevision(data.revision); setFailure(''); setNotice(''); setEditing(row)
  }
  function showFailure(error: unknown) {
    let message = apiErrorMessage(error)
    if (isAxiosError(error) && (!error.response || error.response.status >= 500)) {
      message += ' Kết quả lưu chưa xác định; đóng form và tải lại danh sách trước khi gửi lại.'
    }
    setFailure(message)
    if (isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) onAuthFailure()
  }
  async function submit(input: ContractOccupantInput) {
    if (editing === undefined || !canEdit || inFlight.current) return
    inFlight.current = true; setBusy(true); onBusy(true); setFailure(''); setNotice('')
    try {
      const saved = await saveContractOccupant(contract.id, input, dialogRevision, editing?.id)
      setResult({ key, data: saved }); setEditing(undefined); setNotice('Đã lưu hồ sơ người ở cùng.')
      onChanged()
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 422) applyApiErrors(error, form.setError, ['full_name', 'phone', 'relationship'])
      showFailure(error)
    } finally { inFlight.current = false; setBusy(false); onBusy(false) }
  }
  async function confirmRemove() {
    if (!removing || !canEdit || inFlight.current) return
    inFlight.current = true; setBusy(true); onBusy(true); setFailure(''); setNotice('')
    try {
      await removeContractOccupant(contract.id, removing.id, dialogRevision)
      setRemoving(undefined); setAttempt(value => value + 1); setNotice('Đã gỡ hồ sơ khỏi bản nháp.')
      onChanged()
    } catch (error) { showFailure(error) }
    finally { inFlight.current = false; setBusy(false); onBusy(false) }
  }
  function closeEditor() { if (!inFlight.current) setEditing(undefined) }
  function closeRemoval() { if (!inFlight.current) setRemoving(undefined) }

  return <section aria-label="Người ở cùng" className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold text-slate-900">Người ở cùng</h2>
      <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={busy} onClick={reload}>Tải lại danh sách</Button>
        {canEdit && <Button size="sm" disabled={busy || !data || data.registered_count >= data.max_occupants} onClick={() => beginEdit(null)}>Thêm người ở cùng</Button>}</div></header>
    <p className="text-sm text-slate-500">Danh sách không gồm người thuê đại diện. Thêm/gỡ hồ sơ không tự đổi số người khai báo hoặc phí dịch vụ.</p>
    {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
    {failure && editing === undefined && !removing && <p role="alert" className="text-sm text-rose-700">{failure}</p>}
    {!current ? <p role="status">Đang tải người ở cùng…</p> : current.error ? <div role="alert" className="space-y-2 text-sm text-rose-700"><p>{current.error}</p><Button variant="outline" onClick={reload}>Thử lại danh sách</Button></div> : data && <>
      <dl className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
        <div><dt className="text-slate-500">Số người khai báo</dt><dd className="font-bold">{data.occupant_count} người</dd></div>
        <div><dt className="text-slate-500">Có hồ sơ (gồm đại diện)</dt><dd className="font-bold">{data.registered_count} người</dd></div>
        <div><dt className="text-slate-500">Sức chứa phòng</dt><dd className="font-bold">{data.max_occupants} người</dd></div>
      </dl>
      {data.has_count_mismatch && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Số người có hồ sơ chưa khớp số khai báo. Vui lòng kiểm tra danh sách; hệ thống giữ nguyên số người và các khoản phí đã lưu.</p>}
      {!canEdit && <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-600">Hợp đồng không còn là bản nháp. Danh sách chỉ được xem, không chỉnh sửa lịch sử.</p>}
      {data.occupants.length === 0 ? <p className="py-5 text-sm text-slate-500">Chưa có hồ sơ người ở cùng.</p> : <ul className="space-y-3">{data.occupants.map(row => <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
        <div className="min-w-0 flex-1 break-words"><p className="font-semibold text-slate-900">{row.full_name}</p><p className="mt-1 text-sm text-slate-500">{row.phone ?? 'Chưa có số điện thoại'} · {row.relationship ?? 'Chưa ghi quan hệ'}</p></div>
        {canEdit && <div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => beginEdit(row)}>Sửa hồ sơ</Button>
          <Button size="sm" variant="danger" disabled={busy} onClick={() => { setDialogRevision(data.revision); setFailure(''); setRemoving(row) }}>Gỡ hồ sơ</Button></div>}
      </li>)}</ul>}
    </>}
    <Modal isOpen={editing !== undefined && !!canEdit} onClose={closeEditor} title={editing ? 'Sửa người ở cùng' : 'Thêm người ở cùng'} maxWidth="md">
      <form noValidate onSubmit={event => { void form.handleSubmit(submit)(event) }} className="space-y-4">
        <label className="block text-sm font-semibold">Họ tên<input placeholder="VD: Nguyễn Văn An" {...form.register('full_name')} disabled={busy} className="mt-1 block w-full rounded-xl border border-slate-300 p-2.5 font-normal placeholder:text-slate-400" /><span className="text-xs text-rose-700">{form.formState.errors.full_name?.message}</span></label>
        <label className="block text-sm font-semibold">Số điện thoại (tùy chọn)<input placeholder="VD: 0912345678" {...form.register('phone')} disabled={busy} className="mt-1 block w-full rounded-xl border border-slate-300 p-2.5 font-normal placeholder:text-slate-400" /><span className="text-xs text-rose-700">{form.formState.errors.phone?.message}</span></label>
        <label className="block text-sm font-semibold">Quan hệ với người đại diện (tùy chọn)<input placeholder="VD: Vợ/Chồng, Anh/Em, Bạn cùng phòng..." {...form.register('relationship')} disabled={busy} className="mt-1 block w-full rounded-xl border border-slate-300 p-2.5 font-normal placeholder:text-slate-400" /><span className="text-xs text-rose-700">{form.formState.errors.relationship?.message}</span></label>
        {failure && <div role="alert" className="space-y-2 text-sm text-rose-700"><p>{failure}</p><Button variant="outline" disabled={busy} onClick={reload}>Đóng và tải lại danh sách</Button></div>}
        <div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={closeEditor}>Hủy</Button><Button type="submit" isLoading={busy}>Lưu hồ sơ</Button></div>
      </form>
    </Modal>
    <Modal isOpen={!!removing && !!canEdit} onClose={closeRemoval} title="Gỡ người ở cùng" maxWidth="md">
      <p className="break-words text-sm">Gỡ hồ sơ {removing?.full_name} khỏi bản nháp? Số người khai báo và phí dịch vụ giữ nguyên.</p>
      {failure && <div role="alert" className="mt-3 space-y-2 text-sm text-rose-700"><p>{failure}</p><Button variant="outline" disabled={busy} onClick={reload}>Đóng và tải lại danh sách</Button></div>}
      <div className="mt-5 flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={closeRemoval}>Hủy</Button><Button variant="danger" isLoading={busy} onClick={() => { void confirmRemove() }}>Xác nhận gỡ</Button></div>
    </Modal>
  </section>
}
