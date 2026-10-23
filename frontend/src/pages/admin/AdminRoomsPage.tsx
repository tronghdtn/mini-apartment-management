import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Plus, Search } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatVND } from '@/lib/format'
import { getBuildingOptions, getRooms } from '@/features/room-management/api'
import { RoomForm } from '@/features/room-management/RoomForm'
import { roomStatusLabels } from '@/features/room-management/types'
import type { BuildingOption, RoomFilters, RoomPage, RoomStatus } from '@/features/room-management/types'

const emptyFilters: RoomFilters = { building_id: '', status: '', q: '' }

export function AdminRoomsPage() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<RoomFilters>(emptyFilters)
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<RoomPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [buildings, setBuildings] = useState<BuildingOption[]>([])
  const [buildingsLoading, setBuildingsLoading] = useState(true)
  const [buildingsError, setBuildingsError] = useState('')
  const [buildingsRevision, setBuildingsRevision] = useState(0)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    getRooms(page, filters, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult(data) })
      .catch(failure => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [page, filters, revision])

  useEffect(() => {
    const controller = new AbortController()
    getBuildingOptions(controller.signal)
      .then(data => { if (!controller.signal.aborted) setBuildings(data) })
      .catch(failure => { if (!controller.signal.aborted) setBuildingsError(apiErrorMessage(failure)) })
      .finally(() => { if (!controller.signal.aborted) setBuildingsLoading(false) })
    return () => controller.abort()
  }, [buildingsRevision])

  const reload = () => { setLoading(true); setError(''); setRevision(value => value + 1) }
  const changePage = (next: number) => { setLoading(true); setError(''); setPage(next) }
  const applyFilters = (next: RoomFilters) => {
    setLoading(true)
    setError('')
    setPage(1)
    setFilters(next)
  }
  const close = () => { if (!saving) setCreating(false) }
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản Lý Phòng</h1>
          <p className="text-xs text-slate-500 mt-1">Thông tin phòng và giá niêm yết được lưu tại hệ thống.</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setSuccess(''); setCreating(true) }}>Thêm phòng mới</Button>
      </div>
      {success && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}
      <form onSubmit={event => { event.preventDefault(); applyFilters({ ...filters, q: query.trim() }) }} className="p-4 bg-white rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div>
          <label htmlFor="room-query" className="block text-xs font-semibold text-slate-600 mb-1">Tìm phòng</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input id="room-query" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm theo mã phòng" className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-sky-500" />
          </div>
        </div>
        <div>
          <label htmlFor="room-building-filter" className="block text-xs font-semibold text-slate-600 mb-1">Tòa nhà</label>
          <select id="room-building-filter" value={filters.building_id} disabled={buildingsLoading || !!buildingsError} onChange={event => applyFilters({ ...filters, building_id: event.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-sky-500">
            <option value="">Tất cả tòa nhà</option>
            {buildings.map(building => <option key={building.id} value={building.id}>{building.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="room-status-filter" className="block text-xs font-semibold text-slate-600 mb-1">Trạng thái</label>
          <select id="room-status-filter" value={filters.status} onChange={event => applyFilters({ ...filters, status: event.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-sky-500">
            <option value="">Tất cả trạng thái</option>
            {(Object.keys(roomStatusLabels) as RoomStatus[]).map(status => <option key={status} value={status}>{roomStatusLabels[status]}</option>)}
          </select>
        </div>
        <Button type="submit" variant="outline" className="self-end">Tìm kiếm</Button>
      </form>
      {buildingsError && <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 space-y-2">
        <p>Chưa tải được danh sách tòa nhà. {buildingsError}</p>
        <Button variant="outline" size="sm" onClick={() => { setBuildingsLoading(true); setBuildingsError(''); setBuildingsRevision(value => value + 1) }}>Tải lại tòa nhà</Button>
      </div>}
      {loading ? <p role="status" className="text-sm text-slate-500 py-6">Đang tải danh sách phòng…</p> : error ? (
        <div role="alert" className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-3">
          <p className="text-sm text-rose-700">{error}</p>
          <div className="flex items-center gap-3"><Button variant="outline" onClick={reload}>Thử lại</Button><a href="/login" className="text-sm text-sky-700 underline">Đăng nhập</a></div>
        </div>
      ) : result && <>
        <div className="bg-white rounded-3xl border border-slate-200 overflow-x-auto shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr><th className="px-5 py-3.5">Mã phòng</th><th className="px-5 py-3.5">Tòa nhà</th><th className="px-5 py-3.5">Tầng / Diện tích</th><th className="px-5 py-3.5">Giá niêm yết</th><th className="px-5 py-3.5">Trạng thái</th><th className="px-5 py-3.5">Công khai</th><th className="px-5 py-3.5 text-right">Thao tác</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {result.data.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">Không có phòng phù hợp.</td></tr> : result.data.map(room => (
                <tr key={room.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4 font-mono font-bold text-slate-900"><Link to={`/admin/rooms/${room.id}`} className="hover:text-sky-600">{room.code}</Link></td>
                  <td className="px-5 py-4 font-semibold">{room.building.name}</td>
                  <td className="px-5 py-4 whitespace-nowrap">Tầng {room.floor_number} · {room.area} m²</td>
                  <td className="px-5 py-4 font-bold text-sky-700 whitespace-nowrap">{formatVND(room.base_price)}</td>
                  <td className="px-5 py-4"><Badge tone={room.status === 'available' ? 'emerald' : room.status === 'occupied' ? 'sky' : room.status === 'maintenance' ? 'amber' : 'slate'} dot>{roomStatusLabels[room.status]}</Badge></td>
                  <td className="px-5 py-4"><Badge tone={room.is_public ? 'emerald' : 'slate'}>{room.is_public ? 'Có' : 'Không'}</Badge></td>
                  <td className="px-5 py-4 text-right"><Link to={`/admin/rooms/${room.id}`} className="inline-block px-3 py-1.5 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">Chi tiết</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <nav aria-label="Phân trang phòng" className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <p>Trang {result.meta.current_page}/{result.meta.last_page} · {result.meta.total} phòng</p>
          <div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => changePage(page - 1)}>Trang trước</Button><Button variant="outline" size="sm" disabled={page >= result.meta.last_page} onClick={() => changePage(page + 1)}>Trang sau</Button></div>
        </nav>
      </>}
      <p className="text-xs text-slate-500">Trang phòng công khai, hợp đồng, tiện nghi, ảnh và lịch sử phòng chưa tích hợp trong phần này.</p>
      <Modal isOpen={creating} onClose={close} title="Thêm phòng mới" maxWidth="lg">
        {buildingsLoading ? <p role="status" className="text-sm text-slate-500">Đang tải tòa nhà…</p> : buildingsError ? <p role="alert" className="text-sm text-rose-700">{buildingsError}</p> : buildings.length === 0 ? <p className="text-sm text-slate-600">Cần <Link to="/admin/buildings" className="text-sky-700 underline">tạo tòa nhà</Link> trước khi thêm phòng.</p> : <RoomForm buildings={buildings} onCancel={close} onBusyChange={setSaving} onSaved={room => { setCreating(false); setSuccess(`Đã tạo phòng ${room.code}.`); setPage(1); reload() }} />}
      </Modal>
    </div>
  )
}
