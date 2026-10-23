import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Plus, Search } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { apiErrorMessage, applyApiErrors } from '@/lib/apiErrors'
import { formatVND, formatDate } from '@/lib/format'
import { getContracts } from '@/features/contracts/api'
import { contractFiltersSchema } from '@/features/contracts/schemas'
import type { ContractFilters } from '@/features/contracts/schemas'
import { contractStatusLabels, depositStatusLabels } from '@/features/contracts/types'
import type { ContractPage } from '@/features/contracts/types'

const emptyFilters: ContractFilters = { status: '', building_id: '', room_id: '', user_id: '', q: '' }

export function AdminContractsPage() {
  const [filters, setFilters] = useState<ContractFilters>(emptyFilters)
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<ContractPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const { register, handleSubmit, reset, setError: setFieldError, formState: { errors } } = useForm<ContractFilters>({ resolver: zodResolver(contractFiltersSchema), defaultValues: emptyFilters })
  useEffect(() => {
    const controller = new AbortController()
    getContracts(page, filters, controller.signal)
      .then(data => { if (!controller.signal.aborted) { setResult(data); setError('') } })
      .catch(failure => { if (!controller.signal.aborted) { setResult(null); setError(apiErrorMessage(failure)); applyApiErrors(failure, setFieldError, ['q', 'status']) } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [page, filters, revision, setFieldError])
  const reload = () => { setLoading(true); setRevision(value => value + 1) }
  const changePage = (value: number) => { setPage(value); setLoading(true) }
  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
      <div><h1 className="text-2xl font-bold text-slate-900">Quản Lý Hợp Đồng Thuê</h1><p className="text-xs text-slate-500 mt-1">Danh sách hợp đồng từ hệ thống. Lập, sửa và xóa bản nháp; hợp đồng hiệu lực và đã thanh lý chỉ đọc.</p></div>
      <Link to="/admin/contracts/new"><Button icon={<Plus className="w-4 h-4" />}>Lập hợp đồng mới</Button></Link>
    </div>
    <form noValidate onSubmit={event => { void handleSubmit(input => { setFilters(input); setPage(1); setLoading(true) })(event) }} className="p-4 bg-white rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-[1fr_200px_auto] gap-3 items-end">
      <div><label htmlFor="contract-q" className="block text-xs font-semibold text-slate-600 mb-1">Tìm hợp đồng</label><div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input id="contract-q" {...register('q')} placeholder="Mã hợp đồng, tên người thuê, phòng…" aria-invalid={!!errors.q} aria-describedby="contract-q-error" className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm" /></div><p id="contract-q-error" className="text-xs text-rose-600 mt-1">{errors.q?.message}</p></div>
      <div><label htmlFor="contract-status" className="block text-xs font-semibold text-slate-600 mb-1">Trạng thái</label><select id="contract-status" {...register('status')} className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"><option value="">Tất cả</option><option value="draft">Bản nháp</option><option value="active">Đang hiệu lực</option><option value="terminated">Đã thanh lý</option></select></div>
      <div className="flex gap-2"><Button type="submit">Tìm kiếm</Button><Button type="button" variant="outline" onClick={() => { reset(emptyFilters); setFilters({ ...emptyFilters }); setPage(1); setLoading(true) }}>Xóa bộ lọc</Button></div>
    </form>
    {loading ? <p role="status" className="text-sm text-slate-500 py-6">Đang tải danh sách hợp đồng…</p> : error ? <div role="alert" className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-3"><p className="text-sm text-rose-700">{error}</p><div className="flex gap-3 items-center"><Button variant="outline" onClick={reload}>Thử lại</Button><a href="/login" className="text-sm text-sky-700 underline">Đăng nhập</a></div></div> : result && <>
      <div className="bg-white rounded-3xl border border-slate-200 overflow-x-auto shadow-xs"><table className="w-full text-left text-xs"><thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase"><tr><th className="px-5 py-3.5">Mã hợp đồng</th><th className="px-5 py-3.5">Phòng / Tòa nhà</th><th className="px-5 py-3.5">Người thuê</th><th className="px-5 py-3.5">Thời hạn (ngày cuối ở)</th><th className="px-5 py-3.5">Tiền thuê</th><th className="px-5 py-3.5">Trạng thái cọc</th><th className="px-5 py-3.5">Trạng thái</th><th className="px-5 py-3.5 text-right">Chi tiết</th></tr></thead><tbody className="divide-y divide-slate-100 text-slate-700">
        {result.data.length === 0 ? <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-500">Không có hợp đồng phù hợp.</td></tr> : result.data.map(contract => <tr key={contract.id} className="hover:bg-slate-50/80"><td className="px-5 py-4 font-mono font-bold text-slate-900"><Link to={`/admin/contracts/${contract.id}`} className="hover:text-sky-600">{contract.contract_number ?? `Bản nháp #${contract.id}`}</Link></td><td className="px-5 py-4"><span className="font-bold block">{contract.room.code}</span><span className="text-slate-500">{contract.room.building.name}</span></td><td className="px-5 py-4"><span className="font-semibold block">{contract.tenant.full_name}</span><span className="text-slate-500">{contract.tenant.phone}</span></td><td className="px-5 py-4 whitespace-nowrap">{formatDate(contract.start_date)} → <strong>{formatDate(contract.end_date)}</strong></td><td className="px-5 py-4 font-bold text-sky-700 whitespace-nowrap">{formatVND(contract.monthly_rent)}/tháng</td><td className="px-5 py-4"><Badge tone={contract.deposit_status === 'held' ? 'sky' : 'slate'}>{depositStatusLabels[contract.deposit_status] ?? contract.deposit_status}</Badge></td><td className="px-5 py-4"><Badge tone={contract.status === 'active' ? 'emerald' : 'slate'}>{contractStatusLabels[contract.status]}</Badge></td><td className="px-5 py-4 text-right"><Link to={`/admin/contracts/${contract.id}`} className="inline-block px-3 py-1.5 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">Chi tiết</Link></td></tr>)}
      </tbody></table></div>
      <nav aria-label="Phân trang hợp đồng" className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><p>Trang {result.meta.current_page}/{result.meta.last_page} · {result.meta.total} hợp đồng</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => changePage(page - 1)}>Trang trước</Button><Button variant="outline" size="sm" disabled={page >= result.meta.last_page} onClick={() => changePage(page + 1)}>Trang sau</Button></div></nav>
    </>}
  </div>
}
