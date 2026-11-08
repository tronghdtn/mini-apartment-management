import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/useAuth'
import { apiErrorMessage } from '@/lib/apiErrors'
import { getMeterReadings, getMeterServiceOptions } from './api'
import { MeterReadingsTable } from './MeterReadingsTable'
import { clearRoomMeterFilters, roomMeterFilterValues, roomMeterSearchParams, type RoomMeterFilter } from './roomFilters'
import { meterFiltersSchema } from './schemas'
import type { MeterOptions, MeterReadingPage } from './types'
import { RefreshingFrame } from '@/components/ui/RefreshingFrame'
import { useKeepPrevious } from '@/hooks/useKeepPrevious'

export function RoomMeterReadingsPanel({ roomId }: { roomId: number }) {
  const { refresh } = useAuth()
  const [params, setParams] = useSearchParams()
  const [revision, setRevision] = useState(0)
  const [optionRevision, setOptionRevision] = useState(0)
  const [options, setOptions] = useState<MeterOptions['services']>([])
  const [optionError, setOptionError] = useState('')
  const [result, setResult] = useState<{ key: string; data?: MeterReadingPage; error?: string }>()
  const values = roomMeterFilterValues(roomId, params)
  const { service_id: service, period, kind, page } = values
  const queryError = meterFiltersSchema.safeParse(values).success ? '' : 'Bộ lọc lịch sử không hợp lệ. Kỳ phải là ngày 01 của tháng.'
  const key = `${roomId}:${service}:${period}:${kind}:${page}:${revision}`
  const change = (field: RoomMeterFilter, value: string) => setParams(roomMeterSearchParams(params, field, value))

  useEffect(() => {
    const abort = new AbortController()
    getMeterServiceOptions(abort.signal).then(data => { if (!abort.signal.aborted) { setOptions(data); setOptionError('') } })
      .catch(error => { if (!abort.signal.aborted) setOptionError(apiErrorMessage(error)) })
    return () => abort.abort()
  }, [optionRevision])
  useEffect(() => {
    if (queryError) return
    const abort = new AbortController()
    const filters = meterFiltersSchema.parse({ building_id: '', room_id: String(roomId), service_id: service, period, kind, page })
    getMeterReadings(filters, abort.signal).then(data => { if (!abort.signal.aborted) setResult({ key, data }) })
      .catch(error => {
        if (!abort.signal.aborted) {
          setResult({ key, error: apiErrorMessage(error) })
          if (isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) void refresh()
        }
      })
    return () => abort.abort()
  }, [roomId, service, period, kind, page, key, queryError, refresh])

  const current = result?.key === key ? result : undefined
  const { value: loaded, stale } = useKeepPrevious(current?.data ? current : undefined)
  const error = queryError || loaded?.error
  return <section className="min-w-0 space-y-5" aria-label="Lịch sử điện nước của phòng">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-bold text-slate-900">Lịch sử chỉ số điện nước</h2><p className="mt-1 text-xs text-slate-500">Chỉ hiển thị dữ liệu của phòng đang mở. Số tiền lấy từ chỉ số đã lưu, không tính lại tại đây.</p></div>
      <Link className="text-sm font-semibold text-sky-700 underline" to={`/admin/meter-readings?room_id=${roomId}`}>Đến trang quản lý chỉ số</Link>
    </div>
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
      <label className="text-xs font-semibold text-slate-700">Dịch vụ<select value={service} onChange={event => change('meter_service_id', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm">
        <option value="">Tất cả Điện/Nước</option>{service && !options.some(item => String(item.id) === service) && <option value={service}>Dịch vụ #{service}</option>}
        {options.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-700">Kỳ tiêu thụ<input type="date" value={period} onChange={event => change('meter_period', event.target.value)} className="mt-1 w-full min-w-0 rounded-xl border border-slate-200 p-3 text-sm" /></label>
      <label className="text-xs font-semibold text-slate-700">Loại chỉ số<select value={kind} onChange={event => change('meter_kind', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm"><option value="">Tất cả loại</option><option value="periodic">Định kỳ</option><option value="final">Chốt thanh lý</option></select></label>
    </div>
    {optionError && <div role="alert" className="space-y-2 text-sm text-rose-700"><p>{optionError}</p><Button variant="outline" onClick={() => setOptionRevision(value => value + 1)}>Tải lại danh mục dịch vụ</Button></div>}
    {error ? <div role="alert" className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"><p>{error}</p>
      {queryError ? <Button variant="outline" onClick={() => setParams(clearRoomMeterFilters(params))}>Xóa bộ lọc không hợp lệ</Button> : <Button variant="outline" onClick={() => setRevision(value => value + 1)}>Thử lại lịch sử</Button>}
    </div> : !loaded?.data ? <p role="status" className="p-6 text-sm text-slate-500">Đang tải lịch sử điện nước…</p> : <RefreshingFrame busy={stale} className="space-y-4">
      <MeterReadingsTable readings={loaded.data.data} />
      <nav aria-label="Phân trang lịch sử điện nước" className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <p>Trang {loaded.data.meta.current_page}/{loaded.data.meta.last_page} · {loaded.data.meta.total} chỉ số</p>
        <div className="flex gap-2"><Button variant="outline" disabled={Number(page) <= 1} onClick={() => change('meter_page', String(Number(page) - 1))}>Trang trước</Button><Button variant="outline" disabled={Number(page) >= loaded.data.meta.last_page} onClick={() => change('meter_page', String(Number(page) + 1))}>Trang sau</Button></div>
      </nav>
    </RefreshingFrame>}
  </section>
}
