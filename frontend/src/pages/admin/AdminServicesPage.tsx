import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Info, Pencil, Plus, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatVND } from '@/lib/format'
import { getServices } from '@/features/services/api'
import { ServiceCreateForm, ServiceEditForm } from '@/features/services/ServiceForm'
import { billingTypeLabels } from '@/features/services/types'
import type { Service, ServicePage } from '@/features/services/types'

export function AdminServicesPage() {
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<ServicePage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [editing, setEditing] = useState<Service | null | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    getServices(page, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult(data) })
      .catch(failure => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [page, revision])

  const reload = () => { setLoading(true); setError(''); setRevision(value => value + 1) }
  const changePage = (next: number) => { setLoading(true); setError(''); setPage(next) }
  const close = () => { if (!saving) setEditing(undefined) }
  const saved = (service: Service) => {
    const creating = editing === null
    setEditing(undefined)
    setSuccess(`Đã lưu dịch vụ ${service.name}.`)
    if (creating) setPage(1)
    reload()
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div><h1 className="text-2xl font-bold text-slate-900">Danh Mục Khoản Thu & Dịch Vụ</h1><p className="text-xs text-slate-500 mt-1">Quản lý dịch vụ và giá niêm yết dùng khi lập hợp đồng.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/admin/utility-prices" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><Zap className="w-4 h-4" />Bảng giá điện nước</Link>
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setSuccess(''); setEditing(null) }}>Thêm dịch vụ</Button>
        </div>
      </div>
      <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl flex items-start gap-3 text-xs text-sky-800">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>Điện và nước tính theo chỉ số đồng hồ, dùng bảng giá theo kỳ. Dịch vụ định kỳ được chia theo ngày sử dụng ở tháng đầu và tháng cuối. Thay đổi giá niêm yết không sửa giá đã ghi trong hợp đồng hoặc hóa đơn.</p>
      </div>
      {success && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}
      {loading ? <p role="status" className="text-sm text-slate-500 py-6">Đang tải danh sách dịch vụ…</p> : error ? (
        <div role="alert" className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-3">
          <p className="text-sm text-rose-700">{error}</p><div className="flex items-center gap-3"><Button variant="outline" onClick={reload}>Thử lại</Button><a href="/login" className="text-sm text-sky-700 underline">Đăng nhập</a></div>
        </div>
      ) : result && <>
        <div className="bg-white rounded-3xl border border-slate-200 overflow-x-auto shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
              <tr><th className="px-5 py-3.5">Mã dịch vụ</th><th className="px-5 py-3.5">Tên dịch vụ</th><th className="px-5 py-3.5">Cách tính phí</th><th className="px-5 py-3.5">Đơn giá niêm yết</th><th className="px-5 py-3.5">Đơn vị</th><th className="px-5 py-3.5">Trạng thái</th><th className="px-5 py-3.5 text-right">Thao tác</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.data.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">Chưa có dịch vụ nào.</td></tr> : result.data.map(service => (
                <tr key={service.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4 font-mono font-bold text-slate-900">{service.code}</td>
                  <td className="px-5 py-4"><span className="font-bold text-slate-800">{service.name}</span>{service.description && <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap break-words">{service.description}</p>}</td>
                  <td className="px-5 py-4"><Badge tone={service.billing_type === 'metered' ? 'amber' : 'sky'}>{billingTypeLabels[service.billing_type]}</Badge></td>
                  <td className="px-5 py-4 font-bold text-slate-900 whitespace-nowrap">{service.billing_type === 'metered' ? <Link to="/admin/utility-prices" className="text-sky-600 hover:underline">Theo bảng giá điện nước →</Link> : service.price === null ? 'Chưa có giá' : formatVND(service.price)}</td>
                  <td className="px-5 py-4 text-slate-600">{service.unit || 'Chưa khai báo'}</td>
                  <td className="px-5 py-4"><Badge tone={service.status === 'active' ? 'emerald' : 'slate'}>{service.status === 'active' ? 'Hoạt động' : 'Ngừng hoạt động'}</Badge></td>
                  <td className="px-5 py-4 text-right"><Button variant="outline" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} aria-label={`Sửa dịch vụ ${service.code}`} onClick={() => { setSuccess(''); setEditing(service) }}>Sửa</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <nav aria-label="Phân trang dịch vụ" className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <p>Trang {result.meta.current_page}/{result.meta.last_page} · {result.meta.total} dịch vụ</p>
          <div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => changePage(page - 1)}>Trang trước</Button><Button variant="outline" size="sm" disabled={page >= result.meta.last_page} onClick={() => changePage(page + 1)}>Trang sau</Button></div>
        </nav>
      </>}
      <Modal isOpen={editing !== undefined} onClose={close} title={editing ? 'Sửa dịch vụ' : 'Thêm dịch vụ mới'} maxWidth="lg">
        {editing ? <ServiceEditForm key={editing.id} service={editing} onSaved={saved} onCancel={close} onBusyChange={setSaving} /> : <ServiceCreateForm onSaved={saved} onCancel={close} onBusyChange={setSaving} />}
      </Modal>
    </div>
  )
}
