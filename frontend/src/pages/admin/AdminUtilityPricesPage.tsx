import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { isAxiosError } from 'axios'
import { Info, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/features/auth/useAuth'
import { apiErrorMessage } from '@/lib/apiErrors'
import { getMeteredServices, getUtilityBuildings, getUtilityPrices } from '@/features/utility-prices/api'
import { UtilityPriceForm } from '@/features/utility-prices/UtilityPriceForm'
import { UtilityPriceHistory } from '@/features/utility-prices/UtilityPriceHistory'
import { utilityPriceFiltersSchema } from '@/features/utility-prices/schemas'
import type { MeteredService, UtilityBuilding, UtilityPricePage } from '@/features/utility-prices/types'
import { RefreshingFrame } from '@/components/ui/RefreshingFrame'
import { useKeepPrevious } from '@/hooks/useKeepPrevious'

export function AdminUtilityPricesPage() {
  const { refresh } = useAuth()
  const [params, setParams] = useSearchParams()
  const buildingId = params.get('building_id') ?? ''
  const serviceId = params.get('service_id') ?? ''
  const parsed = utilityPriceFiltersSchema.safeParse({ building_id: buildingId, service_id: serviceId, page: params.get('page') ?? '1' })
  const queryError = parsed.success ? '' : parsed.error.issues[0]?.message ?? 'Bộ lọc không hợp lệ.'
  const page = parsed.success ? Number(parsed.data.page) : 1
  const [revision, setRevision] = useState(0)
  const key = `${page}:${buildingId}:${serviceId}:${revision}`
  const [loaded, setLoaded] = useState<{ key: string; result?: UtilityPricePage; error?: string }>()
  const [optionsRevision, setOptionsRevision] = useState(0)
  const [options, setOptions] = useState<{ revision: number; services: MeteredService[]; buildings: UtilityBuilding[]; error?: string }>()
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (queryError) return
    const abort = new AbortController()
    getUtilityPrices(page, { building_id: buildingId, service_id: serviceId }, abort.signal)
      .then(result => { if (!abort.signal.aborted) setLoaded({ key, result }) })
      .catch(failure => {
        if (abort.signal.aborted) return
        setLoaded({ key, error: apiErrorMessage(failure) })
        if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) void refresh()
      })
    return () => abort.abort()
  }, [page, buildingId, serviceId, key, queryError, refresh])

  useEffect(() => {
    const abort = new AbortController()
    Promise.all([getMeteredServices(abort.signal), getUtilityBuildings(abort.signal)])
      .then(([services, buildings]) => { if (!abort.signal.aborted) setOptions({ revision: optionsRevision, services, buildings }) })
      .catch(failure => { if (!abort.signal.aborted) { setOptions({ revision: optionsRevision, services: [], buildings: [], error: apiErrorMessage(failure) }); if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) void refresh() } })
    return () => abort.abort()
  }, [optionsRevision, refresh])

  const optionsLoading = !options || options.revision !== optionsRevision
  const services = options?.services ?? []
  const buildings = options?.buildings ?? []
  const loading = !queryError && loaded?.key !== key
  const error = queryError || (loaded?.key === key ? loaded.error : '')
  const { value: result } = useKeepPrevious(loaded?.key === key ? loaded.result : undefined)
  function filter(name: 'building_id' | 'service_id', value: string) {
    const next = new URLSearchParams()
    const building = name === 'building_id' ? value : buildingId
    const service = name === 'service_id' ? value : serviceId
    if (building) next.set('building_id', building)
    if (service) next.set('service_id', service)
    setParams(next)
  }
  function changePage(nextPage: number) {
    const next = new URLSearchParams(params)
    if (nextPage === 1) next.delete('page'); else next.set('page', String(nextPage))
    setParams(next)
  }
  const close = () => { if (!saving) setCreating(false) }
  return <div className="space-y-6">
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold text-slate-900">Bảng Giá Điện Nước Theo Tòa</h1><p className="mt-1 text-sm text-slate-500">Lịch sử riêng từng tòa, theo ngày hiệu lực; không thay đổi kỳ tiêu thụ đã ghi nhận.</p></div><Button icon={<Plus className="h-4 w-4" />} disabled={optionsLoading || !!options?.error || !buildings.length || !services.length || loading || !!error} onClick={() => { setSuccess(''); setCreating(true) }}>Thêm giá áp dụng mới</Button></header>
    <p className="flex gap-2 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-800"><Info className="mt-0.5 h-4 w-4 shrink-0" />Chỉ thêm giá từ ngày 01 của kỳ chưa ghi chỉ số tại đúng tòa/dịch vụ. Tòa mới phải được cấu hình riêng. Các dòng dưới đây là lịch sử, có thể gồm giá tương lai.</p>
    {!optionsLoading && options?.error && <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm"><p>Chưa tải được lựa chọn tòa/dịch vụ. {options.error}</p><Button variant="outline" onClick={() => setOptionsRevision(value => value + 1)}>Tải lại lựa chọn</Button></div>}
    {!optionsLoading && !options?.error && (!buildings.length || !services.some(service => service.code === 'ELECTRICITY') || !services.some(service => service.code === 'WATER')) && <p role="status" className="text-sm text-amber-800">Cần có tòa nhà và cấu hình đầy đủ dịch vụ Điện/Nước trước khi thêm giá.</p>}
    {success && <p role="status" className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">{success}</p>}
    <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
      <label className="text-sm font-semibold">Lọc theo tòa nhà<select value={buildingId} disabled={optionsLoading || !!options?.error} onChange={event => filter('building_id', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3"><option value="">Tất cả tòa nhà</option>{buildingId && !buildings.some(building => String(building.id) === buildingId) && <option value={buildingId}>Tòa #{buildingId} — chưa có thông tin</option>}{buildings.map(building => <option key={building.id} value={building.id}>{building.name}</option>)}</select></label>
      <label className="text-sm font-semibold">Lọc theo dịch vụ<select value={serviceId} disabled={optionsLoading || !!options?.error} onChange={event => filter('service_id', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3"><option value="">Tất cả dịch vụ theo chỉ số</option>{serviceId && !services.some(service => String(service.id) === serviceId) && <option value={serviceId}>Dịch vụ #{serviceId}</option>}{services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
    </div>
    {loading && !result ? <p role="status" className="py-6 text-sm text-slate-500">Đang tải bảng giá điện nước…</p> : error ? <div role="alert" className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-5"><p className="text-sm text-rose-700">{error}</p><Button variant="outline" onClick={() => setRevision(value => value + 1)}>Thử lại</Button>{queryError && <Button variant="ghost" onClick={() => setParams({})}>Xóa bộ lọc không hợp lệ</Button>}</div> : result && <RefreshingFrame busy={loading} className="space-y-6"><UtilityPriceHistory prices={result.data} /><nav aria-label="Phân trang bảng giá điện nước" className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500"><p>Trang {result.meta.current_page}/{result.meta.last_page} · {result.meta.total} mức giá</p><div className="flex gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => changePage(page - 1)}>Trang trước</Button><Button variant="outline" disabled={page >= result.meta.last_page} onClick={() => changePage(page + 1)}>Trang sau</Button></div></nav></RefreshingFrame>}
    <Modal isOpen={creating} onClose={close} title="Thêm mức giá áp dụng mới" maxWidth="md"><UtilityPriceForm buildings={buildings} buildingId={buildingId ? Number(buildingId) : undefined} services={services} onAuthFailure={refresh} onCancel={close} onBusyChange={setSaving} onSaved={price => { setCreating(false); setSuccess(`Đã thêm giá ${price.service.name} cho ${price.building.name} từ ${price.effective_from}.`); setParams({ building_id: String(price.building_id), service_id: String(price.service_id) }); setRevision(value => value + 1) }} /></Modal>
  </div>
}
