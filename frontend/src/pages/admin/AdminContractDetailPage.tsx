import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { AlertTriangle, CheckCircle2, ChevronRight, Circle, ClipboardCheck, Lock, Pencil, Receipt, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import { apiErrorMessage } from '@/lib/apiErrors'
import { businessToday, formatVND, formatDate, formatDateTime } from '@/lib/format'
import { deleteDraftContract, getContract } from '@/features/contracts/api'
import { contractLabel, contractStatusLabels, contractStatusTones, depositStatusText, depositStatusTone, isPastLastDay } from '@/features/contracts/types'
import type { Contract } from '@/features/contracts/types'
import { ContractServicesPanel } from '@/features/contracts/ContractServicesPanel'
import { ContractOccupantsPanel } from '@/features/contracts/ContractOccupantsPanel'
import { ContractTermsPanel } from '@/features/contracts/ContractTermsPanel'
import { ContractLifecycleActions } from '@/features/contracts/ContractLifecycleActions'
import { getInvoices } from '@/features/invoices/api'
import { InvoiceBadge } from '@/features/invoices/InvoiceList'
import type { InvoicePage } from '@/features/invoices/types'
import { useAuth } from '@/features/auth/useAuth'

type TabId = 'info' | 'services' | 'terms' | 'occupants' | 'invoices'
const tabIds: TabId[] = ['info', 'services', 'terms', 'occupants', 'invoices']
const invoiceTypeLabels = { monthly: 'Định kỳ tháng', final: 'Tất toán', adjustment: 'Điều chỉnh' }

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <div className="py-3 flex flex-wrap justify-between gap-2"><dt className="text-slate-500">{label}</dt><dd className="font-semibold text-slate-800 text-right break-words">{children}</dd></div>
}

/** Các điều kiện kích hoạt đọc từ dữ liệu đã lưu; Laravel vẫn kiểm tra lại khi kích hoạt. */
function ActivationChecklist({ contract, onOpenTab }: { contract: Contract; onOpenTab: (tab: TabId) => void }) {
  const serviceCount = (contract.contract_services ?? []).filter(line => line.service.billing_type !== 'metered').length
  const items: { label: string; detail: string; state: 'done' | 'todo' | 'optional'; tab?: TabId }[] = [
    { label: 'Thông tin cơ bản', detail: 'Phòng, người thuê, thời hạn và tiền đã lưu nháp.', state: 'done' },
    { label: 'Dịch vụ định kỳ', detail: serviceCount ? `${serviceCount} dịch vụ đã lưu. Điện, nước được thêm khi kích hoạt.` : 'Chưa chọn (không bắt buộc). Điện, nước được thêm khi kích hoạt.', state: serviceCount ? 'done' : 'optional', tab: 'services' },
    { label: 'Điều khoản phí trước hạn', detail: contract.early_termination_fee_type ? 'Đã lưu điều khoản thỏa thuận.' : 'Chưa lưu — bắt buộc trước khi kích hoạt.', state: contract.early_termination_fee_type ? 'done' : 'todo', tab: 'terms' },
    { label: 'Tiền cọc', detail: contract.deposit_amount === 0 ? 'Hợp đồng không yêu cầu cọc.' : contract.deposit_status === 'held' ? 'Đã xác nhận thực nhận đủ cọc.' : 'Cần xác nhận thực nhận đủ cọc trước khi kích hoạt.', state: contract.deposit_amount === 0 || contract.deposit_status === 'held' ? 'done' : 'todo' },
  ]
  return <section aria-labelledby="activation-checklist" className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 space-y-3">
    <h2 id="activation-checklist" className="flex items-center gap-2 font-bold text-slate-900"><ClipboardCheck className="h-5 w-5 text-sky-600" />Chuẩn bị kích hoạt</h2>
    <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{items.map(item => <li key={item.label} className={`rounded-2xl border p-4 ${item.state === 'todo' ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 bg-slate-50/60'}`}>
      <p className="flex items-center gap-2 text-sm font-bold text-slate-900">{item.state === 'done' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <Circle className={`h-4 w-4 shrink-0 ${item.state === 'todo' ? 'text-amber-500' : 'text-slate-400'}`} />}{item.label}</p>
      <p className="mt-1 text-xs text-slate-600">{item.detail}</p>
      {item.tab && <button type="button" onClick={() => onOpenTab(item.tab as TabId)} className="mt-2 text-xs font-semibold text-sky-700 underline">Mở tab {item.tab === 'services' ? 'Dịch vụ' : 'Điều khoản'}</button>}
    </li>)}</ol>
  </section>
}

function ContractInvoicesTab({ contract, visible }: { contract: Contract; visible: boolean }) {
  const [page, setPage] = useState(1)
  const [retry, setRetry] = useState(0)
  const key = `${contract.id}:${page}:${retry}`
  const [result, setResult] = useState<{ key: string; data?: InvoicePage; error?: string }>()
  const loaded = result?.key === key
  const listLink = `/admin/invoices?contract_id=${contract.id}`
  useEffect(() => {
    if (!visible || loaded || contract.status === 'draft') return
    const requestKey = `${contract.id}:${page}:${retry}`
    const controller = new AbortController()
    getInvoices({ status: '', period: '', overdue: '', contract_id: String(contract.id), page: String(page) }, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult({ key: requestKey, data }) })
      .catch(failure => { if (!controller.signal.aborted) setResult({ key: requestKey, error: apiErrorMessage(failure) }) })
    return () => controller.abort()
  }, [visible, loaded, contract.id, contract.status, page, retry])
  if (contract.status === 'draft') return <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center"><Receipt className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-sm text-slate-600">Bản nháp chưa phát sinh hóa đơn. Hóa đơn tháng được lập tại trang Hóa đơn sau khi kích hoạt.</p></section>
  const current = loaded ? result : undefined
  return <section aria-label="Hóa đơn của hợp đồng" className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="font-bold text-slate-900">Hóa đơn của hợp đồng</h2><p className="mt-1 text-xs text-slate-500">Số tiền do Backend tính; thanh toán đang chờ xác nhận chưa trừ vào công nợ.</p></div>
      <Link to={listLink} className="text-sm font-semibold text-sky-700 underline">{contract.status === 'active' ? 'Lập hoặc quản lý tại trang Hóa đơn' : 'Mở tại trang Hóa đơn'}</Link></header>
    {!current ? <p role="status" className="p-6 text-sm text-slate-500">Đang tải hóa đơn…</p>
      : current.error ? <div role="alert" className="p-5 space-y-3 text-sm text-rose-700"><p>{current.error}</p><Button variant="outline" size="sm" onClick={() => setRetry(value => value + 1)}>Thử lại</Button></div>
      : current.data && (current.data.data.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Chưa có hóa đơn nào phát sinh từ hợp đồng này.</p> : <>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Hóa đơn', 'Loại', 'Kỳ', 'Tổng tiền', 'Đã thanh toán', 'Còn nợ', 'Trạng thái'].map(label => <th key={label} className="whitespace-nowrap px-5 py-3">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{current.data.data.map(invoice => <tr key={invoice.id}>
            <td className="whitespace-nowrap px-5 py-3"><Link to={`/admin/invoices/${invoice.id}`} className="font-mono font-semibold text-sky-700 hover:underline">{invoice.invoice_number ?? `Nháp #${invoice.id}`}</Link></td>
            <td className="px-5 py-3">{invoiceTypeLabels[invoice.type]}</td>
            <td className="whitespace-nowrap px-5 py-3">{formatDate(invoice.period).slice(3)}</td>
            <td className="whitespace-nowrap px-5 py-3 font-semibold">{formatVND(invoice.total_amount)}</td>
            <td className="whitespace-nowrap px-5 py-3 text-emerald-700">{formatVND(invoice.paid_amount)}</td>
            <td className="whitespace-nowrap px-5 py-3 font-semibold text-rose-700">{formatVND(invoice.outstanding_amount)}</td>
            <td className="px-5 py-3"><InvoiceBadge invoice={invoice} /></td>
          </tr>)}</tbody></table></div>
        {current.data.meta.last_page > 1 && <nav aria-label="Phân trang hóa đơn" className="flex items-center justify-between gap-3 border-t border-slate-100 p-4 text-xs text-slate-500"><span>Trang {current.data.meta.current_page}/{current.data.meta.last_page} · {current.data.meta.total} hóa đơn</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trang trước</Button><Button variant="outline" size="sm" disabled={page >= current.data.meta.last_page} onClick={() => setPage(page + 1)}>Trang sau</Button></div></nav>}
      </>)}
  </section>
}

export function AdminContractDetailPage() {
  const { refresh } = useAuth()
  const { contractId } = useParams<{ contractId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [contract, setContract] = useState<Contract | null>(null)
  const [resolvedId, setResolvedId] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [writing, setWriting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const inFlight = useRef(false)
  const requestedTab = params.get('tab') as TabId | null
  const tab: TabId = requestedTab && tabIds.includes(requestedTab) ? requestedTab : 'info'
  const setTab = (next: TabId) => setParams(next === 'info' ? {} : { tab: next }, { replace: true, state: location.state })
  useEffect(() => {
    const controller = new AbortController()
    getContract(contractId ?? '', controller.signal)
      .then(data => { if (!controller.signal.aborted) { setContract(data); setError(''); setResolvedId(contractId) } })
      .catch(failure => { if (!controller.signal.aborted) { setContract(null); setError(apiErrorMessage(failure)); setResolvedId(contractId) } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [contractId, revision])
  function closeDelete() { if (!inFlight.current) { setDeleting(false); setDeleteError('') } }
  async function confirmDelete() {
    if (!contract || inFlight.current) return
    inFlight.current = true; setBusy(true); setDeleteError('')
    try { await deleteDraftContract(contract.id); navigate('/admin/contracts', { replace: true }) }
    catch (failure) { setDeleteError(apiErrorMessage(failure)) }
    finally { inFlight.current = false; setBusy(false) }
  }
  function reload() { setDeleting(false); setLoading(true); setRevision(value => value + 1) }
  if (loading || resolvedId !== contractId) return <p role="status" className="text-sm text-slate-500 py-6">Đang tải chi tiết hợp đồng…</p>
  if (error || !contract) return <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4"><h1 className="text-xl font-bold text-slate-900">Chưa tải được hợp đồng</h1><p role="alert" className="text-sm text-rose-700">{error}</p><div className="flex flex-wrap gap-3 items-center"><Button variant="outline" onClick={reload}>Thử lại</Button><Link to="/admin/contracts" className="text-sm text-sky-700 underline">Về danh sách hợp đồng</Link><a href="/login" className="text-sm text-sky-700 underline">Đăng nhập</a></div></div>
  const success = typeof location.state?.success === 'string' ? location.state.success : ''
  const overdue = isPastLastDay(contract, businessToday())
  const handoverLink = `/admin/contracts/${contract.id}/terminate`
  return <fieldset disabled={writing} className="space-y-6 min-w-0">
    <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><Link to="/admin/contracts" className="hover:text-slate-900">Hợp đồng</Link><ChevronRight className="w-3.5 h-3.5" /><span className="font-bold text-slate-900">{contractLabel(contract)}</span></nav>
    {success && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}
    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="min-w-0"><div className="flex flex-wrap gap-2 items-center mb-2"><span className="font-mono text-xs font-bold px-2 py-1 rounded bg-sky-50 text-sky-700 border border-sky-100">{contractLabel(contract)}</span><Badge tone={contractStatusTones[contract.status]} dot>{contractStatusLabels[contract.status]}</Badge>{overdue && <Badge tone="amber">Đã qua ngày cuối được ở</Badge>}</div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 break-words">Hợp Đồng Thuê Phòng {contract.room.code}</h1>
        <p className="text-xs text-slate-500 mt-1">{contract.room.building.name} · Người thuê đại diện: <strong className="text-slate-800">{contract.tenant.full_name}</strong> ({contract.tenant.phone})</p></div>
      <div className="flex flex-wrap gap-2 shrink-0">
        {contract.status === 'draft' && <><Link to={`/admin/contracts/${contract.id}/edit`}><Button variant="outline" icon={<Pencil className="w-4 h-4" />}>Sửa bản nháp</Button></Link><Button variant="danger" disabled={contract.deposit_status !== 'unpaid'} title={contract.deposit_status !== 'unpaid' ? 'Bản nháp đã nhận cọc không thể xóa' : undefined} icon={<Trash2 className="w-4 h-4" />} onClick={() => { setDeleteError(''); setDeleting(true) }}>Xóa bản nháp</Button></>}
        {contract.status === 'active' && <>{!contract.actual_end_date && <Button variant="outline" onClick={() => setTab('services')}>Thay đổi dịch vụ</Button>}<Link to={`/admin/invoices?contract_id=${contract.id}`}><Button variant="outline" icon={<Receipt className="w-4 h-4" />}>Hóa đơn</Button></Link><Link to={handoverLink}><Button variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50">Bàn giao và thanh lý</Button></Link></>}
        {contract.status === 'terminated' && <Link to={handoverLink}><Button variant="outline">Xem kết quả thanh lý</Button></Link>}
      </div>
    </div>
    {contract.status === 'active' && <p className="p-4 bg-slate-100 border border-slate-200 rounded-2xl flex items-start gap-2 text-sm text-slate-600"><Lock className="w-4 h-4 shrink-0 mt-0.5" />Hợp đồng đang hiệu lực: phòng, người thuê, thời hạn, tiền thuê, cọc và điều khoản chỉ đọc; dịch vụ định kỳ chỉ thay đổi từ kỳ tiếp theo.</p>}
    {overdue && <p className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2 text-sm text-amber-900"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />Đã qua ngày cuối được ở nhưng chưa bàn giao. Hợp đồng vẫn hiệu lực và tiếp tục tính tiền sử dụng thực tế cho đến ngày bàn giao.</p>}
    {contract.status === 'draft' && <ActivationChecklist contract={contract} onOpenTab={setTab} />}
    <ContractLifecycleActions key={`actions-${contract.id}`} contract={contract} onSaved={setContract} onReload={reload} onBusy={setWriting} onAuthFailure={refresh} />
    <Tabs tabs={[{ id: 'info', label: 'Thông tin hợp đồng' }, { id: 'services', label: 'Dịch vụ đăng ký' }, { id: 'terms', label: 'Điều khoản' }, { id: 'occupants', label: 'Người ở cùng' }, { id: 'invoices', label: 'Hóa đơn' }]} activeTab={tab} onChange={setTab} />
    <div hidden={tab !== 'info'}><div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <section className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 space-y-4"><h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">Thời hạn và tài chính</h2><dl className="divide-y divide-slate-100 text-sm">
        <Row label="Ngày bắt đầu">{formatDate(contract.start_date)}</Row>
        <Row label="Ngày cuối được ở">{formatDate(contract.end_date)}</Row>
        <Row label="Tiền thuê / tháng"><span className="text-sky-700">{formatVND(contract.monthly_rent)}</span></Row>
        <Row label="Tiền cọc">{formatVND(contract.deposit_amount)}</Row>
        <Row label="Trạng thái cọc"><Badge tone={depositStatusTone(contract.deposit_status)}>{depositStatusText(contract)}</Badge></Row>
        <Row label="Ngày bàn giao thực tế">{contract.actual_end_date ? formatDate(contract.actual_end_date) : 'Chưa bàn giao'}</Row>
      </dl><p className="text-xs text-slate-500">Ngày cuối được ở tính cả ngày đó; ngày bàn giao thực tế là mốc không tính tiền.</p></section>
      <section className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 space-y-4"><h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">Người thuê và chỉ số giao nhận</h2><dl className="divide-y divide-slate-100 text-sm">
        <div className="py-3"><dt className="text-slate-500">Người đại diện</dt><dd className="mt-1"><Link to={`/admin/users/${contract.tenant.id}`} className="font-bold text-slate-900 break-words hover:text-sky-700 hover:underline">{contract.tenant.full_name}</Link></dd><dd className="text-slate-600 mt-1">{contract.tenant.phone}</dd><dd className="text-slate-600 break-words mt-1">{contract.tenant.email ?? 'Chưa có email'}</dd></div>
        <Row label="Số người ở (gồm đại diện)">{contract.occupant_count}</Row>
        <Row label="Chỉ số điện đầu (kWh)"><span className="font-mono">{contract.initial_electricity_reading ?? 'Ghi khi kích hoạt'}</span></Row>
        <Row label="Chỉ số nước đầu (m³)"><span className="font-mono">{contract.initial_water_reading ?? 'Ghi khi kích hoạt'}</span></Row>
        <div className="py-3"><dt className="text-slate-500">Ghi chú</dt><dd className="text-slate-700 whitespace-pre-wrap break-words mt-1">{contract.note || 'Không có ghi chú.'}</dd></div>
      </dl></section>
      {contract.inspection_result && <section className="md:col-span-2 bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 space-y-2"><h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">Kiểm tra tài sản khi bàn giao</h2>
        <p className="text-sm font-semibold text-slate-800">{contract.inspection_result === 'damaged' ? 'Có hư hỏng' : 'Không có hư hỏng'}{contract.inspected_at && <span className="font-normal text-slate-500"> · Ghi nhận {formatDateTime(contract.inspected_at)}</span>}</p>
        {contract.inspection_note && <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{contract.inspection_note}</p>}
        <Link to={handoverLink} className="inline-block text-sm font-semibold text-sky-700 underline">{contract.status === 'terminated' ? 'Xem kết quả thanh lý và đối soát cọc' : 'Tiếp tục bàn giao'}</Link></section>}
    </div>
    </div>
    <div hidden={tab !== 'services'}><ContractServicesPanel key={contract.id} contract={contract} onSaved={setContract} onReload={reload} onBusy={setWriting} /></div>
    <div hidden={tab !== 'occupants'}><ContractOccupantsPanel key={contract.id} contract={contract} visible={tab === 'occupants'} onChanged={() => setRevision(value => value + 1)} onBusy={setWriting} onAuthFailure={refresh} /></div>
    <div hidden={tab !== 'terms'}><ContractTermsPanel key={contract.id} contract={contract} onSaved={setContract} onReload={reload} onBusy={setWriting} onAuthFailure={refresh} /></div>
    <div hidden={tab !== 'invoices'}><ContractInvoicesTab key={contract.id} contract={contract} visible={tab === 'invoices'} /></div>
    <Modal isOpen={deleting} onClose={closeDelete} title="Xóa hợp đồng nháp" maxWidth="md"><div className="space-y-4"><p className="text-sm text-slate-700">Xóa bản nháp của phòng <strong>{contract.room.code}</strong> và người thuê <strong>{contract.tenant.full_name}</strong>? Chỉ bản nháp chưa có lịch sử liên quan mới được xóa mềm; phòng và tài khoản được giữ nguyên.</p><p className="text-xs text-slate-500">Nếu đã có dịch vụ hoặc hồ sơ người ở cùng, hãy gỡ các dữ liệu đó trước khi xóa bản nháp.</p>{deleteError && <div role="alert" className="text-sm text-rose-700 space-y-2"><p>{deleteError}</p><Button variant="outline" size="sm" disabled={busy} onClick={reload}>Tải lại dữ liệu</Button></div>}<div className="flex justify-end gap-2 pt-4 border-t border-slate-100"><Button variant="outline" disabled={busy} onClick={closeDelete}>Hủy</Button><Button variant="danger" isLoading={busy} onClick={() => { void confirmDelete() }}>Xác nhận xóa bản nháp</Button></div></div></Modal>
  </fieldset>
}
