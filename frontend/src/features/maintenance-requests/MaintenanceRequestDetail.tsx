import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, CheckCircle2, ChevronRight, Clock3, Phone, RefreshCw, UserRound, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatDateTime } from '@/lib/format'
import { assignMaintenanceRequest, getActiveTechnicians, getMaintenanceRequest, rejectMaintenanceRequest, reopenMaintenanceRequest, resolveMaintenanceRequest, startMaintenanceRequest, updateMaintenanceRequest } from './api'
import { maintenanceAssignmentSchema, maintenanceNoteSchema, type MaintenanceAssignmentInput, type MaintenanceNoteInput } from './schemas'
import { maintenancePriorityLabels, maintenancePriorityTones, maintenanceStatusLabels, maintenanceStatusTones } from './labels'
import type { MaintenanceAudience } from './MaintenanceRequestList'
import type { MaintenanceRequest, TechnicianOption } from './types'

const basePath: Record<MaintenanceAudience, string> = { resident: '/resident/requests', admin: '/admin/maintenance-requests', technician: '/staff/maintenance-requests' }

function isAxiosNotFound(failure: unknown): boolean {
  return Boolean(failure && typeof failure === 'object' && 'response' in failure && (failure as { response?: { status?: number } }).response?.status === 404)
}

export function MaintenanceRequestDetail({ audience, requestId }: { audience: MaintenanceAudience; requestId: string | undefined }) {
  const id = Number(requestId)
  const [request, setRequest] = useState<MaintenanceRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [adminError, setAdminError] = useState('')
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([])
  const [techniciansError, setTechniciansError] = useState('')
  const [techniciansRevision, setTechniciansRevision] = useState(0)
  const [noteMode, setNoteMode] = useState<'resolve' | 'reject' | null>(null)
  const [notFound, setNotFound] = useState(false)
  const isAdmin = audience === 'admin'
  const isTechnician = audience === 'technician'
  const canManage = isAdmin && request !== null && ['pending', 'in_progress'].includes(request.status)

  const priorityForm = useForm<{ priority: MaintenanceRequest['priority']; admin_note: string }>({ defaultValues: { priority: 'normal', admin_note: '' } })
  const { reset: resetPriority } = priorityForm
  const assignmentForm = useForm<MaintenanceAssignmentInput>({ resolver: zodResolver(maintenanceAssignmentSchema), defaultValues: { assigned_to: 0, priority: 'normal', admin_note: '' } })
  const { reset: resetAssignment } = assignmentForm
  const resolveForm = useForm<MaintenanceNoteInput>({ resolver: zodResolver(maintenanceNoteSchema), defaultValues: { note: '' } })
  const rejectForm = useForm<MaintenanceNoteInput>({ resolver: zodResolver(maintenanceNoteSchema), defaultValues: { note: '' } })

  useEffect(() => {
    const controller = new AbortController()
    if (!Number.isSafeInteger(id) || id < 1) return () => controller.abort()
    getMaintenanceRequest(id, controller.signal)
      .then(data => { if (!controller.signal.aborted) { setRequest(data); setNotFound(false); resetPriority({ priority: data.priority, admin_note: data.admin_note ?? '' }); resetAssignment({ assigned_to: data.assignee?.id ?? 0, priority: data.priority, admin_note: data.admin_note ?? '' }) } })
      .catch(failure => { if (!controller.signal.aborted) { setRequest(null); setNotFound(isAxiosNotFound(failure)); setError(apiErrorMessage(failure)) } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [id, revision, resetAssignment, resetPriority])

  useEffect(() => {
    if (!isAdmin) return
    const controller = new AbortController()
    getActiveTechnicians(controller.signal).then(data => { if (!controller.signal.aborted) setTechnicians(data) })
      .catch(failure => { if (!controller.signal.aborted) setTechniciansError(apiErrorMessage(failure)) })
    return () => controller.abort()
  }, [isAdmin, techniciansRevision])

  async function perform(action: () => Promise<MaintenanceRequest>, message: string) {
    setBusy(true); setAdminError(''); setNotice('')
    try { const updated = await action(); setRequest(updated); priorityForm.reset({ priority: updated.priority, admin_note: updated.admin_note ?? '' }); assignmentForm.reset({ assigned_to: updated.assignee?.id ?? 0, priority: updated.priority, admin_note: updated.admin_note ?? '' }); setNotice(message); setNoteMode(null) }
    catch (failure) { setAdminError(apiErrorMessage(failure)) }
    finally { setBusy(false) }
  }

  async function saveAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = priorityForm.getValues()
    if (!request) return
    await perform(() => updateMaintenanceRequest(request.id, values), 'Đã lưu mức ưu tiên và ghi chú quản lý.')
  }

  async function assign(values: MaintenanceAssignmentInput) {
    if (!request) return
    await perform(() => assignMaintenanceRequest(request.id, values), 'Đã lưu phân công kỹ thuật viên.')
  }

  async function resolve(values: MaintenanceNoteInput) {
    if (!request) return
    await perform(() => resolveMaintenanceRequest(request.id, values), 'Đã ghi nhận hoàn tất công việc.')
    resolveForm.reset({ note: '' })
  }

  async function reject(values: MaintenanceNoteInput) {
    if (!request) return
    await perform(() => rejectMaintenanceRequest(request.id, values), 'Đã từ chối yêu cầu và lưu căn cứ xử lý.')
    rejectForm.reset({ note: '' })
  }

  if (!Number.isSafeInteger(id) || id < 1) return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6"><h1 className="text-xl font-bold text-slate-900">Mã yêu cầu không hợp lệ</h1><p role="alert" className="text-sm text-rose-700">Vui lòng mở yêu cầu từ danh sách sửa chữa.</p><Link to={basePath[audience]} className="text-sm font-semibold text-sky-700 underline">Về danh sách</Link></section>
  if (loading) return <p role="status" className="py-8 text-sm text-slate-500">Đang tải chi tiết yêu cầu…</p>
  if (error || !request) return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6"><h1 className="text-xl font-bold text-slate-900">{notFound ? 'Không tìm thấy yêu cầu' : 'Chưa tải được yêu cầu'}</h1><p role="alert" className="text-sm text-rose-700">{error}</p><div className="flex flex-wrap gap-3">{!notFound && <Button type="button" variant="outline" onClick={() => { setLoading(true); setRevision(value => value + 1) }}>Thử lại</Button>}<Link to={basePath[audience]} className="self-center text-sm font-semibold text-sky-700 underline">Về danh sách</Link><a href="/login" className="self-center text-sm text-sky-700 underline">Đăng nhập</a></div></section>

  return <div className="space-y-5">
    <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><Link to={basePath[audience]} className="hover:text-slate-900">Yêu cầu sửa chữa</Link><ChevronRight className="h-3.5 w-3.5"/><span className="font-semibold text-slate-900">{request.code}</span></nav>
    {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {adminError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{adminError}</p>}
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-7">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap gap-2"><Badge tone={maintenanceStatusTones[request.status]} dot>{maintenanceStatusLabels[request.status]}</Badge><Badge tone={maintenancePriorityTones[request.priority]}>{maintenancePriorityLabels[request.priority]}</Badge></div><p className="mt-3 font-mono text-xs font-bold text-slate-500">{request.code}</p><h1 className="mt-1 break-words text-2xl font-extrabold text-slate-900">{request.title}</h1><p className="mt-2 text-sm text-slate-600">{request.room.building_name} · Phòng <strong>{request.room.code}</strong></p></div><div className="text-xs text-slate-500">Gửi lúc {formatDateTime(request.created_at ?? '')}</div></div>
      <div className="grid gap-6 pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.7fr)]">
        <div className="space-y-5"><section><h2 className="text-sm font-bold text-slate-900">Mô tả sự cố</h2><p className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">{request.description}</p></section>
          <section><h2 className="text-sm font-bold text-slate-900">Ảnh hiện trường</h2>{request.photos.length ? <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{request.photos.map(photo => <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50"><img src={photo.url} alt={`Ảnh hiện trường ${request.code}`} loading="lazy" className="aspect-square w-full object-cover transition group-hover:scale-[1.02]"/><span className="sr-only">Mở ảnh kích thước đầy đủ</span></a>)}</div> : <p className="mt-2 text-sm text-slate-500">Không có ảnh đính kèm.</p>}</section>
          {request.handler_note && <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><h2 className="flex items-center gap-2 text-sm font-bold text-emerald-900"><CheckCircle2 className="h-4 w-4"/>Ghi chú hoàn tất</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-emerald-900">{request.handler_note}</p></section>}
          {request.admin_note && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><h2 className="text-sm font-bold text-amber-900">Ghi chú Ban quản lý</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-amber-900">{request.admin_note}</p></section>}
        </div>
        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 p-4"><h2 className="text-sm font-bold text-slate-900">Người gửi và phụ trách</h2>{request.reporter && <div className="mt-3 flex items-start gap-2 text-sm text-slate-700"><UserRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"/><div><p>{request.reporter.full_name}</p>{request.reporter.phone && <a href={`tel:${request.reporter.phone}`} className="mt-1 inline-flex items-center gap-1 text-sky-700 hover:underline"><Phone className="h-3.5 w-3.5"/>{request.reporter.phone}</a>}</div></div>}{request.assignee && <p className="mt-3 text-sm text-slate-700"><span className="text-slate-500">Kỹ thuật viên:</span> {request.assignee.full_name}</p>}{!request.assignee && <p className="mt-3 text-sm text-slate-500">Chưa phân công.</p>}</section>
          <section className="rounded-2xl border border-slate-200 p-4"><h2 className="text-sm font-bold text-slate-900">Tiến độ</h2><ol className="mt-3 space-y-3 text-xs text-slate-600"><li className="flex gap-2"><Clock3 className="h-4 w-4 shrink-0 text-sky-600"/><span>Đã gửi · {formatDateTime(request.created_at ?? '')}</span></li>{request.assigned_at && <li className="flex gap-2"><UserRound className="h-4 w-4 shrink-0 text-sky-600"/><span>Đã phân công · {formatDateTime(request.assigned_at)}</span></li>}{request.started_at && <li className="flex gap-2"><Wrench className="h-4 w-4 shrink-0 text-sky-600"/><span>Bắt đầu xử lý · {formatDateTime(request.started_at)}</span></li>}{request.resolved_at && <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600"/><span>Hoàn tất · {formatDateTime(request.resolved_at)}</span></li>}</ol></section>
        </aside>
      </div>
    </section>

    {canManage && <section className="grid gap-4 lg:grid-cols-2">
      <form onSubmit={saveAdmin} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold text-slate-900">Tiếp nhận và cập nhật</h2><div><label className="mb-1 block text-sm font-semibold" htmlFor="maintenance-admin-priority">Mức ưu tiên</label><select id="maintenance-admin-priority" {...priorityForm.register('priority')} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">{Object.entries(maintenancePriorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div><label className="mb-1 block text-sm font-semibold" htmlFor="maintenance-admin-note">Ghi chú quản lý</label><textarea id="maintenance-admin-note" rows={3} {...priorityForm.register('admin_note')} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Lý do điều chỉnh ưu tiên hoặc ghi chú tiếp nhận"/></div><Button type="submit" variant="outline" disabled={busy}>Lưu cập nhật</Button></form>
      <form onSubmit={assignmentForm.handleSubmit(assign)} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold text-slate-900">Phân công kỹ thuật viên</h2>{techniciansError ? <div className="space-y-2"><p role="alert" className="text-sm text-rose-700">{techniciansError}</p><Button type="button" variant="outline" onClick={() => { setTechniciansError(''); setTechniciansRevision(value => value + 1) }}>Tải lại danh sách</Button></div> : technicians.length ? <><div><label className="mb-1 block text-sm font-semibold" htmlFor="maintenance-assignee">Kỹ thuật viên đang hoạt động</label><select id="maintenance-assignee" {...assignmentForm.register('assigned_to', { valueAsNumber: true })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value={0}>Chọn kỹ thuật viên</option>{technicians.map(technician => <option key={technician.id} value={technician.id}>{technician.full_name}</option>)}</select>{assignmentForm.formState.errors.assigned_to && <p role="alert" className="mt-1 text-xs text-rose-700">{assignmentForm.formState.errors.assigned_to.message}</p>}</div><p className="text-xs text-slate-500">Chỉ tài khoản kỹ thuật viên đang hoạt động được phân công.</p><Button type="submit" disabled={busy}>Lưu phân công</Button></> : <p role="status" className="text-sm text-slate-500">Chưa có kỹ thuật viên đang hoạt động.</p>}</form>
      <div className="flex flex-wrap gap-2 lg:col-span-2">{request.status !== 'rejected' && <Button type="button" variant="danger" icon={<AlertTriangle className="h-4 w-4"/>} disabled={busy} onClick={() => setNoteMode('reject')}>Từ chối yêu cầu</Button>}</div>
    </section>}

    {isTechnician && <section className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-5">{request.status === 'pending' && <Button type="button" icon={<Wrench className="h-4 w-4"/>} disabled={busy} onClick={() => void perform(() => startMaintenanceRequest(request.id), 'Đã bắt đầu xử lý yêu cầu.')}>Bắt đầu xử lý</Button>}{request.status === 'in_progress' && <Button type="button" icon={<CheckCircle2 className="h-4 w-4"/>} disabled={busy} onClick={() => setNoteMode('resolve')}>Báo cáo hoàn tất</Button>}{!['pending', 'in_progress'].includes(request.status) && <p className="text-sm text-slate-600">Yêu cầu này không còn thao tác xử lý dành cho kỹ thuật viên.</p>}</section>}
    {isAdmin && request.status === 'resolved' && <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5"><div><h2 className="font-bold text-slate-900">Yêu cầu đã hoàn tất</h2><p className="mt-1 text-sm text-slate-600">Nếu cần xử lý tiếp, mở lại yêu cầu để kỹ thuật viên tiếp tục.</p></div><Button type="button" variant="outline" disabled={busy} onClick={() => void perform(() => reopenMaintenanceRequest(request.id), 'Đã mở lại yêu cầu để tiếp tục xử lý.')}>Mở lại yêu cầu</Button></section>}

    <Modal isOpen={noteMode === 'resolve'} onClose={() => { if (!busy) setNoteMode(null) }} title="Báo cáo hoàn tất công việc" maxWidth="lg"><form onSubmit={resolveForm.handleSubmit(resolve)} className="space-y-4"><p className="text-sm text-slate-600">Ghi rõ phần việc đã thực hiện. Nền tảng hiện lưu ghi chú xử lý; chưa hỗ trợ ảnh nghiệm thu.</p><div><label htmlFor="maintenance-handler-note" className="mb-1 block text-sm font-semibold">Kết quả xử lý <span className="text-rose-600">*</span></label><textarea id="maintenance-handler-note" rows={5} {...resolveForm.register('note')} className="w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="Mô tả việc đã làm và tình trạng sau xử lý."/>{resolveForm.formState.errors.note && <p role="alert" className="mt-1 text-xs text-rose-700">{resolveForm.formState.errors.note.message}</p>}</div>{resolveForm.formState.errors.root && <p role="alert" className="text-sm text-rose-700">{resolveForm.formState.errors.root.message}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setNoteMode(null)}>Hủy</Button><Button type="submit" isLoading={busy}>Xác nhận hoàn tất</Button></div></form></Modal>
    <Modal isOpen={noteMode === 'reject'} onClose={() => { if (!busy) setNoteMode(null) }} title="Từ chối yêu cầu sửa chữa" maxWidth="lg"><form onSubmit={rejectForm.handleSubmit(reject)} className="space-y-4"><p className="text-sm text-slate-600">Cần ghi căn cứ để cư dân hiểu lý do từ chối.</p><div><label htmlFor="maintenance-reject-note" className="mb-1 block text-sm font-semibold">Lý do / căn cứ <span className="text-rose-600">*</span></label><textarea id="maintenance-reject-note" rows={4} {...rejectForm.register('note')} className="w-full rounded-xl border border-slate-200 p-3 text-sm"/>{rejectForm.formState.errors.note && <p role="alert" className="mt-1 text-xs text-rose-700">{rejectForm.formState.errors.note.message}</p>}</div><div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setNoteMode(null)}>Hủy</Button><Button type="submit" variant="danger" isLoading={busy}>Xác nhận từ chối</Button></div></form></Modal>
    <div><Button type="button" variant="ghost" icon={<RefreshCw className="h-4 w-4"/>} onClick={() => { setLoading(true); setRevision(value => value + 1) }}>Tải lại dữ liệu</Button></div>
  </div>
}
