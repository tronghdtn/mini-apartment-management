import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ChevronRight, Lock, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatVND, formatDate } from '@/lib/format'
import { deleteDraftContract, getContract } from '@/features/contracts/api'
import { contractStatusLabels, depositStatusLabels } from '@/features/contracts/types'
import type { Contract } from '@/features/contracts/types'
import { ContractServicesPanel } from '@/features/contracts/ContractServicesPanel'

export function AdminContractDetailPage() {
  const { contractId } = useParams<{ contractId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [contract, setContract] = useState<Contract | null>(null)
  const [resolvedId, setResolvedId] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const inFlight = useRef(false)
  const [tab, setTab] = useState<'info' | 'services' | 'terms' | 'invoices'>('info')
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
  return <div className="space-y-6">
    <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><Link to="/admin/contracts" className="hover:text-slate-900">Hợp đồng</Link><ChevronRight className="w-3.5 h-3.5" /><span className="font-bold text-slate-900">{contract.contract_number ?? `Bản nháp #${contract.id}`}</span></nav>
    {success && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}
    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="min-w-0"><div className="flex flex-wrap gap-2 items-center mb-2"><span className="font-mono text-xs font-bold px-2 py-1 rounded bg-sky-50 text-sky-700 border border-sky-100">{contract.contract_number ?? `Bản nháp #${contract.id}`}</span><Badge tone={contract.status === 'active' ? 'emerald' : 'slate'}>{contractStatusLabels[contract.status]}</Badge></div><h1 className="text-2xl font-bold text-slate-900 break-words">Hợp Đồng Thuê Phòng {contract.room.code}</h1><p className="text-xs text-slate-500 mt-1">{contract.room.building.name}</p></div>
      {contract.status === 'draft' && <div className="flex flex-wrap gap-2"><Link to={`/admin/contracts/${contract.id}/edit`}><Button variant="outline" icon={<Pencil className="w-4 h-4" />}>Sửa bản nháp</Button></Link><Button variant="danger" icon={<Trash2 className="w-4 h-4" />} onClick={() => { setDeleteError(''); setDeleting(true) }}>Xóa bản nháp</Button></div>}
    </div>
    {contract.status === 'active' && <p className="p-4 bg-slate-100 border border-slate-200 rounded-2xl flex items-start gap-2 text-sm text-slate-600"><Lock className="w-4 h-4 shrink-0 mt-0.5" />Hợp đồng đang hiệu lực: thông tin phòng, người thuê, thời hạn, tiền thuê và cọc chỉ đọc.</p>}
    <Tabs tabs={[{ id: 'info', label: 'Thông tin hợp đồng' }, { id: 'services', label: 'Dịch vụ đăng ký' }, { id: 'terms', label: 'Điều khoản' }, { id: 'invoices', label: 'Lịch sử hóa đơn' }]} activeTab={tab} onChange={setTab} />
    <div hidden={tab !== 'info'}><div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <section className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-4"><h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">Thời hạn và tài chính</h2><dl className="divide-y divide-slate-100 text-sm">
        <div className="py-3 flex flex-wrap justify-between gap-2"><dt className="text-slate-500">Ngày bắt đầu</dt><dd className="font-semibold text-slate-800">{formatDate(contract.start_date)}</dd></div>
        <div className="py-3 flex flex-wrap justify-between gap-2"><dt className="text-slate-500">Ngày cuối được ở</dt><dd className="font-bold text-slate-900">{formatDate(contract.end_date)}</dd></div>
        <div className="py-3 flex flex-wrap justify-between gap-2"><dt className="text-slate-500">Tiền thuê / tháng</dt><dd className="font-bold text-sky-700">{formatVND(contract.monthly_rent)}</dd></div>
        <div className="py-3 flex flex-wrap justify-between gap-2"><dt className="text-slate-500">Tiền cọc</dt><dd className="font-bold text-slate-900">{formatVND(contract.deposit_amount)}</dd></div>
        <div className="py-3 flex flex-wrap justify-between gap-2"><dt className="text-slate-500">Trạng thái cọc</dt><dd><Badge tone={contract.deposit_status === 'held' ? 'sky' : 'slate'}>{depositStatusLabels[contract.deposit_status] ?? contract.deposit_status}</Badge></dd></div>
        <div className="py-3 flex flex-wrap justify-between gap-2"><dt className="text-slate-500">Ngày bàn giao thực tế</dt><dd className="font-semibold">{contract.actual_end_date ? formatDate(contract.actual_end_date) : 'Chưa bàn giao'}</dd></div>
      </dl><p className="text-xs text-slate-500">Ngày cuối được ở tính cả ngày đó; ngày bàn giao thực tế là mốc không tính tiền.</p></section>
      <section className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-4"><h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">Người thuê và ghi chú</h2><dl className="divide-y divide-slate-100 text-sm">
        <div className="py-3"><dt className="text-slate-500">Người đại diện</dt><dd className="font-bold text-slate-900 break-words mt-1">{contract.tenant.full_name}</dd><dd className="text-slate-600 mt-1">{contract.tenant.phone}</dd><dd className="text-slate-600 break-words mt-1">{contract.tenant.email ?? 'Chưa có email'}</dd></div>
        <div className="py-3 flex justify-between gap-2"><dt className="text-slate-500">Số người ở (gồm đại diện)</dt><dd className="font-semibold">{contract.occupant_count}</dd></div>
        <div className="py-3 flex justify-between gap-2"><dt className="text-slate-500">Chỉ số điện đầu (kWh)</dt><dd className="font-mono">{contract.initial_electricity_reading ?? 'Chưa ghi nhận'}</dd></div>
        <div className="py-3 flex justify-between gap-2"><dt className="text-slate-500">Chỉ số nước đầu (m³)</dt><dd className="font-mono">{contract.initial_water_reading ?? 'Chưa ghi nhận'}</dd></div>
        <div className="py-3"><dt className="text-slate-500">Ghi chú</dt><dd className="text-slate-700 whitespace-pre-wrap break-words mt-1">{contract.note || 'Không có ghi chú.'}</dd></div>
      </dl></section>
    </div>
    </div>
    <div hidden={tab !== 'services'}><ContractServicesPanel key={contract.id} contract={contract} onSaved={setContract} onReload={reload} /></div>
    {(tab === 'terms' || tab === 'invoices') && <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center"><h2 className="font-bold text-slate-900">{tab === 'terms' ? 'Điều khoản đã thỏa thuận' : 'Lịch sử hóa đơn'}</h2><p className="mt-2 text-sm text-slate-500">Dữ liệu này chưa được cung cấp qua API tại đây.</p></section>}
    <p className="p-4 bg-sky-50 border border-sky-100 rounded-2xl text-sm text-sky-800">Kích hoạt, thay dịch vụ hợp đồng hiệu lực, điều khoản bồi thường, thanh lý, chỉ số và hóa đơn chưa được tích hợp tại trang này.</p>
    <Modal isOpen={deleting} onClose={closeDelete} title="Xóa hợp đồng nháp" maxWidth="md"><div className="space-y-4"><p className="text-sm text-slate-700">Xóa bản nháp của phòng <strong>{contract.room.code}</strong> và người thuê <strong>{contract.tenant.full_name}</strong>? Chỉ bản nháp chưa có lịch sử liên quan mới được xóa mềm; phòng và tài khoản được giữ nguyên.</p><p className="text-xs text-slate-500">Nếu đã chọn dịch vụ cho bản nháp, hãy gỡ và lưu dịch vụ trước khi xóa.</p>{deleteError && <div role="alert" className="text-sm text-rose-700 space-y-2"><p>{deleteError}</p><Button variant="outline" size="sm" disabled={busy} onClick={reload}>Tải lại dữ liệu</Button></div>}<div className="flex justify-end gap-2 pt-4 border-t border-slate-100"><Button variant="outline" disabled={busy} onClick={closeDelete}>Hủy</Button><Button variant="danger" isLoading={busy} onClick={() => { void confirmDelete() }}>Xác nhận xóa bản nháp</Button></div></div></Modal>
  </div>
}
