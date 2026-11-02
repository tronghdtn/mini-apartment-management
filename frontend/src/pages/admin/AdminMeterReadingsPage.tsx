import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { isAxiosError } from 'axios'
import { Camera, FileText, Info, Layers, Plus, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/features/auth/useAuth'
import { getMeterOptions, getMeterReadings } from '@/features/meter-readings/api'
import { MeterReadingForm } from '@/features/meter-readings/MeterReadingForm'
import { MeterReadingsTable } from '@/features/meter-readings/MeterReadingsTable'
import { SubmissionList } from '@/features/meter-submissions/SubmissionList'
import { meterFiltersSchema } from '@/features/meter-readings/schemas'
import type { MeterOptions, MeterReading, MeterReadingPage } from '@/features/meter-readings/types'
import { apiErrorMessage } from '@/lib/apiErrors'

type MeterTab = 'list' | 'batch' | 'verify'
export function AdminMeterReadingsPage() {
  const { refresh } = useAuth()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<MeterTab>('list')
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const [optionRevision, setOptionRevision] = useState(0)
  const [options, setOptions] = useState<{ revision: number; data?: MeterOptions; error?: string }>()
  const [loaded, setLoaded] = useState<{ key: string; data?: MeterReadingPage; error?: string }>()
  const [success, setSuccess] = useState('')
  const building = params.get('building_id') ?? ''
  const room = params.get('room_id') ?? ''
  const service = params.get('service_id') ?? ''
  const period = params.get('period') ?? ''
  const kind = params.get('kind') ?? ''
  const page = params.get('page') ?? '1'
  const parsed = meterFiltersSchema.safeParse({ building_id: building, room_id: room, service_id: service, period, kind, page })
  const queryError = parsed.success ? '' : 'Bộ lọc không hợp lệ. Vui lòng xóa hoặc chọn lại.'
  const key = `${building}:${room}:${service}:${period}:${kind}:${page}:${revision}`
  useEffect(() => {
    if (queryError) return
    const abort = new AbortController()
    getMeterReadings(meterFiltersSchema.parse({ building_id: building, room_id: room, service_id: service, period, kind, page }), abort.signal)
      .then(data => { if (!abort.signal.aborted) setLoaded({ key, data }) })
      .catch(failure => { if (!abort.signal.aborted) { setLoaded({ key, error: apiErrorMessage(failure) }); if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) void refresh() } })
    return () => abort.abort()
  }, [building, room, service, period, kind, page, key, queryError, refresh])
  useEffect(() => {
    const abort = new AbortController()
    getMeterOptions(abort.signal).then(data => { if (!abort.signal.aborted) setOptions({ revision: optionRevision, data }) })
      .catch(failure => { if (!abort.signal.aborted) { setOptions({ revision: optionRevision, error: apiErrorMessage(failure) }); if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) void refresh() } })
    return () => abort.abort()
  }, [optionRevision, refresh])
  const optionLoading = options?.revision !== optionRevision
  const data = loaded?.key === key ? loaded.data : undefined
  const error = queryError || (loaded?.key === key ? loaded.error : '')
  const loading = !queryError && loaded?.key !== key
  const ready = !loading && !error && !optionLoading && !!options?.data && options.data.rooms.length > 0 && options.data.services.length > 0
  function filter(name: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value); else next.delete(name)
    if (name !== 'page') next.delete('page')
    if (name === 'building_id') next.delete('room_id')
    setParams(next)
  }
  function saved(readings: MeterReading[]) {
    const first = readings[0]
    setSuccess(`Đã lưu ${readings.length} chỉ số chính thức. Số tiền và mốc tiêu thụ được trả từ hệ thống.`)
    setCreating(false); setTab('list')
    setParams({ building_id: String(first.room.building_id), service_id: String(first.service_id), period: first.period })
    setRevision(value => value + 1)
  }
  const close = () => { if (!busy) setCreating(false) }
  return <div className="space-y-6">
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Dịch vụ & Điện nước / <span className="text-sky-700">Chỉ số điện nước</span></p><h1 className="flex items-center gap-2 text-xl font-extrabold text-slate-900 sm:text-2xl"><Zap className="h-6 w-6 shrink-0 text-amber-500" />Chỉ Số Điện & Nước Định Kỳ</h1><p className="mt-1 text-sm text-slate-500">Mốc đo thực tế, kỳ tiêu thụ và giá được lưu để đối chiếu.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" icon={<Layers className="h-4 w-4" />} disabled={!ready || busy} onClick={() => setTab('batch')}>Nhập nhanh theo tòa</Button><Button icon={<Plus className="h-4 w-4" />} disabled={!ready || busy} onClick={() => { setSuccess(''); setCreating(true) }}>Ghi chỉ số mới</Button></div></header>
    <fieldset disabled={busy}><nav aria-label="Các chế độ chỉ số" className="flex overflow-x-auto border-b border-slate-200">{([{ id: 'list', label: 'Danh sách chỉ số', icon: FileText }, { id: 'batch', label: 'Nhập hàng loạt theo tòa', icon: Layers }, { id: 'verify', label: 'Duyệt ảnh cư dân gửi', icon: Camera }] as const).map(item => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`flex shrink-0 items-center gap-2 border-b-2 px-4 pb-3.5 text-sm font-bold transition ${tab === item.id ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><item.icon className="h-4 w-4" />{item.label}</button>)}</nav></fieldset>
    {success && <p role="status" className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">{success}</p>}
    {options?.error && <div role="alert" className="space-y-3 rounded-2xl bg-amber-50 p-4"><p>{options.error}</p><Button variant="outline" onClick={() => setOptionRevision(value => value + 1)}>Tải lại lựa chọn</Button></div>}
    {tab === 'verify' ? <SubmissionList admin rooms={options?.data?.rooms} onBusyChange={setBusy} onReviewed={() => setRevision(value => value + 1)} /> : tab === 'batch' ? <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"><h2 className="mb-4 text-lg font-bold">Nhập chỉ số theo tòa và dịch vụ</h2>{ready && options?.data ? <MeterReadingForm key={`batch:${building}`} options={options.data} batch buildingId={building ? Number(building) : undefined} onAuthFailure={refresh} onBusyChange={setBusy} onSaved={saved} /> : <p role="status">Chưa thể mở nhập hàng loạt. Cần tải được dữ liệu tòa/phòng/dịch vụ và danh sách chỉ số.</p>}</section> : <>
      <p className="flex gap-2 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-800"><Info className="mt-0.5 h-4 w-4 shrink-0" />Periodic là chỉ số định kỳ; final là chỉ số chốt từ thanh lý. Phòng trống được ghi riêng, không tự gán nợ cho người thuê.</p>
      <fieldset disabled={busy || optionLoading || !!options?.error} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-3">
        <label className="text-xs font-bold text-slate-700">Tòa nhà<select value={building} onChange={event => filter('building_id', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm"><option value="">Tất cả tòa nhà</option>{building && !options?.data?.buildings.some(item => String(item.id) === building) && <option value={building}>Tòa #{building}</option>}{options?.data?.buildings.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-xs font-bold text-slate-700">Phòng<select value={room} onChange={event => filter('room_id', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm"><option value="">Tất cả phòng</option>{room && !options?.data?.rooms.some(item => String(item.id) === room && (!building || String(item.building_id) === building)) && <option value={room}>Phòng #{room}</option>}{options?.data?.rooms.filter(item => !building || String(item.building_id) === building).map(item => <option key={item.id} value={item.id}>{item.code} · Tòa #{item.building_id}</option>)}</select></label>
        <label className="text-xs font-bold text-slate-700">Dịch vụ<select value={service} onChange={event => filter('service_id', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm"><option value="">Tất cả Điện/Nước</option>{service && !options?.data?.services.some(item => String(item.id) === service) && <option value={service}>Dịch vụ #{service}</option>}{options?.data?.services.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-xs font-bold text-slate-700">Kỳ tiêu thụ<input type="date" value={period} onChange={event => filter('period', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm" /></label>
        <label className="text-xs font-bold text-slate-700">Loại chỉ số<select value={kind} onChange={event => filter('kind', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm"><option value="">Tất cả loại</option><option value="periodic">Định kỳ</option><option value="final">Chốt thanh lý</option></select></label>
      </fieldset>
      {loading ? <p role="status">Đang tải chỉ số điện nước…</p> : error ? <div role="alert" className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-5"><p>{error}</p><Button variant="outline" onClick={() => setRevision(value => value + 1)}>Thử lại</Button>{queryError && <Button variant="ghost" onClick={() => setParams({})}>Xóa bộ lọc không hợp lệ</Button>}</div> : data && <>
        <MeterReadingsTable readings={data.data} />
        <nav aria-label="Phân trang chỉ số" className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500"><p>Trang {data.meta.current_page}/{data.meta.last_page} · {data.meta.total} chỉ số</p><div className="flex gap-2"><Button variant="outline" disabled={busy || Number(page) <= 1} onClick={() => filter('page', String(Number(page) - 1))}>Trang trước</Button><Button variant="outline" disabled={busy || Number(page) >= data.meta.last_page} onClick={() => filter('page', String(Number(page) + 1))}>Trang sau</Button></div></nav>
      </>}
    </>}
    <Modal isOpen={creating} onClose={close} title="Nhập chỉ số chính thức" maxWidth="lg">{options?.data && <MeterReadingForm key={`single:${building}`} options={options.data} buildingId={building ? Number(building) : undefined} onSaved={saved} onCancel={close} onBusyChange={setBusy} onAuthFailure={refresh} />}</Modal>
  </div>
}
