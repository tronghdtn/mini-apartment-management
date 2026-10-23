import { useEffect, useState } from 'react'
import { Info, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatVND } from '@/lib/format'
import { getMeteredServices, getUtilityPrices } from '@/features/utility-prices/api'
import { UtilityPriceForm } from '@/features/utility-prices/UtilityPriceForm'
import type { MeteredService, UtilityPricePage } from '@/features/utility-prices/types'

export function AdminUtilityPricesPage() {
  const [page, setPage] = useState(1)
  const [serviceId, setServiceId] = useState('')
  const [result, setResult] = useState<UtilityPricePage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [services, setServices] = useState<MeteredService[]>([])
  const [servicesLoading, setServicesLoading] = useState(true)
  const [servicesError, setServicesError] = useState('')
  const [servicesRevision, setServicesRevision] = useState(0)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    getUtilityPrices(page, serviceId, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult(data) })
      .catch(failure => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [page, serviceId, revision])

  useEffect(() => {
    const controller = new AbortController()
    getMeteredServices(controller.signal)
      .then(data => { if (!controller.signal.aborted) setServices(data) })
      .catch(failure => { if (!controller.signal.aborted) setServicesError(apiErrorMessage(failure)) })
      .finally(() => { if (!controller.signal.aborted) setServicesLoading(false) })
    return () => controller.abort()
  }, [servicesRevision])

  const reload = () => { setLoading(true); setError(''); setRevision(value => value + 1) }
  const changePage = (next: number) => { setLoading(true); setError(''); setPage(next) }
  const close = () => { if (!saving) setCreating(false) }
  const configurationMissing = !servicesLoading && !servicesError && (!services.some(service => service.code === 'ELECTRICITY') || !services.some(service => service.code === 'WATER'))
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div><h1 className="text-2xl font-bold text-slate-900">Bảng Giá Điện Nước Theo Kỳ</h1><p className="text-xs text-slate-500 mt-1">Lịch sử đơn giá theo ngày hiệu lực, không thay đổi kỳ tiêu thụ đã ghi nhận.</p></div>
        <Button icon={<Plus className="w-4 h-4" />} disabled={servicesLoading || !!servicesError || services.length === 0} onClick={() => { setSuccess(''); setCreating(true) }}>Thêm giá áp dụng mới</Button>
      </div>
      <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl flex items-start gap-3 text-xs text-sky-800"><Info className="w-4 h-4 shrink-0 mt-0.5" /><p>Mức giá có hiệu lực từ ngày 01 của tháng. Chỉ thêm giá cho kỳ chưa có chỉ số tiêu thụ; không sửa hoặc xóa giá trong phần này.</p></div>
      {configurationMissing && <p role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Cấu hình dịch vụ điện nước chưa đầy đủ. Vui lòng liên hệ người vận hành hệ thống.</p>}
      {servicesError && <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 space-y-2">
        <p>Chưa tải được danh sách dịch vụ. {servicesError}</p>
        <Button variant="outline" size="sm" onClick={() => { setServicesLoading(true); setServicesError(''); setServicesRevision(value => value + 1) }}>Tải lại dịch vụ</Button>
      </div>}
      {success && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <label htmlFor="utility-price-service-filter" className="block text-xs font-semibold text-slate-600 mb-1">Lọc theo dịch vụ</label>
        <select id="utility-price-service-filter" value={serviceId} disabled={servicesLoading || !!servicesError} onChange={event => { setLoading(true); setError(''); setPage(1); setServiceId(event.target.value) }} className="w-full sm:max-w-sm px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-sky-500">
          <option value="">Tất cả dịch vụ theo chỉ số</option>
          {services.map(service => <option key={service.id} value={service.id}>{service.name}{service.unit ? ` (${service.unit})` : ''}</option>)}
        </select>
      </div>
      {loading ? <p role="status" className="text-sm text-slate-500 py-6">Đang tải bảng giá điện nước…</p> : error ? (
        <div role="alert" className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-3">
          <p className="text-sm text-rose-700">{error}</p><div className="flex items-center gap-3"><Button variant="outline" onClick={reload}>Thử lại</Button><a href="/login" className="text-sm text-sky-700 underline">Đăng nhập</a></div>
        </div>
      ) : result && <>
        <div className="bg-white rounded-3xl border border-slate-200 overflow-x-auto shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase"><tr><th className="px-5 py-3.5">Dịch vụ</th><th className="px-5 py-3.5">Ngày hiệu lực</th><th className="px-5 py-3.5">Đơn giá</th><th className="px-5 py-3.5">Đơn vị</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {result.data.length === 0 ? <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-500">Chưa có bảng giá phù hợp.</td></tr> : result.data.map(price => (
                <tr key={price.id} className="hover:bg-slate-50/80"><td className="px-5 py-4 font-bold text-slate-900">{price.service.name}<span className="block text-xs text-slate-400 font-mono mt-1">{price.service.code}</span></td><td className="px-5 py-4 font-mono text-slate-700 whitespace-nowrap">{price.effective_from}</td><td className="px-5 py-4 font-bold text-sky-700 whitespace-nowrap">{formatVND(price.unit_price)}</td><td className="px-5 py-4 text-slate-600">{price.service.unit || 'Chưa khai báo'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <nav aria-label="Phân trang bảng giá điện nước" className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <p>Trang {result.meta.current_page}/{result.meta.last_page} · {result.meta.total} mức giá</p>
          <div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => changePage(page - 1)}>Trang trước</Button><Button variant="outline" size="sm" disabled={page >= result.meta.last_page} onClick={() => changePage(page + 1)}>Trang sau</Button></div>
        </nav>
      </>}
      <Modal isOpen={creating} onClose={close} title="Thêm mức giá áp dụng mới" maxWidth="md">
        <UtilityPriceForm services={services} onCancel={close} onBusyChange={setSaving} onSaved={price => { setCreating(false); setSuccess(`Đã thêm giá cho ${price.service.name} từ ${price.effective_from}.`); setServiceId(''); setPage(1); reload() }} />
      </Modal>
    </div>
  )
}
