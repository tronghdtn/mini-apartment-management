import { useEffect, useId, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { DoorOpen, ExternalLink, Eye, EyeOff, FilePlus2, History, Plus, RotateCcw, Search, X } from 'lucide-react'
import { RowMenu, type RowMenuItem } from '@/components/ui/RowMenu'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatVND } from '@/lib/format'
import { getBuildingOptions, getRooms } from '@/features/room-management/api'
import { RoomForm } from '@/features/room-management/RoomForm'
import { roomStatusLabels } from '@/features/room-management/types'
import type { BuildingOption, RoomFilters, RoomPage, RoomStatus } from '@/features/room-management/types'
import { RefreshingFrame } from '@/components/ui/RefreshingFrame'

const emptyFilters: RoomFilters = { building_id: '', status: '', q: '' }

export function AdminRoomsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialBuildingId = searchParams.get('building_id') ?? ''
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<RoomFilters>({ ...emptyFilters, building_id: initialBuildingId })
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
  const roomSearchId = useId()
  const buildingFilterId = useId()
  const statusFilterId = useId()

  // Debounced search for room code
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = query.trim()
      setFilters(prev => {
        if (prev.q === trimmed) return prev
        setPage(1)
        setLoading(true)
        return { ...prev, q: trimmed }
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

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

  const handleFilterChange = (key: keyof RoomFilters, value: string) => {
    if (key === 'building_id') {
      const next = new URLSearchParams(searchParams)
      if (value) next.set('building_id', value)
      else next.delete('building_id')
      setSearchParams(next, { replace: true })
    }
    setFilters(prev => {
      if (prev[key] === value) return prev
      setPage(1)
      setLoading(true)
      return { ...prev, [key]: value }
    })
  }

  const clearFilters = () => {
    setQuery('')
    setFilters(emptyFilters)
    setSearchParams(new URLSearchParams(), { replace: true })
    setPage(1)
    setLoading(true)
  }

  const close = () => { if (!saving) setCreating(false) }

  const hasActiveFilters = Boolean(filters.building_id || filters.status || query.trim())

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600">Bất động sản</span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-medium text-slate-500">Quản lý quỹ phòng</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Quản Lý Phòng</h1>
          <p className="text-xs text-slate-500 mt-1">Thông tin chi tiết từng căn hộ, giá thuê niêm yết và trạng thái sẵn sàng cho thuê.</p>
        </div>
        <Button
          icon={<Plus className="w-4 h-4" />}
          onClick={() => { setSuccess(''); setCreating(true) }}
          className="shadow-xs font-bold"
        >
          Thêm phòng mới
        </Button>
      </div>

      {success && (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-800 flex items-center justify-between gap-3">
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess('')} className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold">Đóng</button>
        </div>
      )}

      {/* Modern Filter Toolbar */}
      <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Instant Search Bar */}
          <div className="relative flex-1 max-w-md">
            <label htmlFor={roomSearchId} className="sr-only">Tìm phòng</label>
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id={roomSearchId}
              type="text"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Tìm theo mã phòng (vd: A-101, B-201...)"
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
                title="Xóa từ khóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Instant Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div>
              <label htmlFor={buildingFilterId} className="sr-only">Tòa nhà</label>
              <select
                id={buildingFilterId}
                value={filters.building_id}
                disabled={buildingsLoading || !!buildingsError}
                onChange={event => handleFilterChange('building_id', event.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-700 hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition cursor-pointer"
                title="Lọc theo tòa nhà"
              >
                <option value="">Tất cả tòa nhà</option>
                {buildings.map(building => (
                  <option key={building.id} value={building.id}>{building.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={statusFilterId} className="sr-only">Trạng thái phòng</label>
              <select
                id={statusFilterId}
                value={filters.status}
                onChange={event => handleFilterChange('status', event.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-700 hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition cursor-pointer"
                title="Lọc theo trạng thái phòng"
              >
                <option value="">Tất cả trạng thái</option>
                {(Object.keys(roomStatusLabels) as RoomStatus[]).map(status => (
                  <option key={status} value={status}>{roomStatusLabels[status]}</option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50/70 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                title="Đặt lại toàn bộ bộ lọc"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Xóa lọc</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {buildingsError && (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 space-y-2">
          <p>Chưa tải được danh sách tòa nhà. {buildingsError}</p>
          <Button variant="outline" size="sm" onClick={() => { setBuildingsLoading(true); setBuildingsError(''); setBuildingsRevision(value => value + 1) }}>Tải lại tòa nhà</Button>
        </div>
      )}

      {loading && !result ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-sky-500 border-t-transparent" />
          <p role="status" className="text-xs text-slate-500 mt-3 font-medium">Đang tải danh sách phòng…</p>
        </div>
      ) : error && !loading ? (
        <div role="alert" className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-3">
          <p className="text-sm text-rose-700">{error}</p>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={reload}>Thử lại</Button>
            <a href="/login" className="text-xs text-sky-700 underline font-semibold">Đăng nhập</a>
          </div>
        </div>
      ) : result && (
        <RefreshingFrame busy={loading} className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Phòng</th>
                    <th className="px-5 py-3 font-medium">Tầng / Diện tích</th>
                    <th className="px-5 py-3 text-right font-medium">Giá niêm yết</th>
                    <th className="px-5 py-3 font-medium">Trạng thái</th>
                    <th className="px-5 py-3 font-medium">Trang công khai</th>
                    <th className="px-5 py-3" aria-label="Thao tác"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {result.data.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-14 text-center">
                        <DoorOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-700 text-sm">Không tìm thấy phòng phù hợp</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {hasActiveFilters
                            ? 'Thử thay đổi từ khóa tìm kiếm hoặc bấm Xóa lọc để xem tất cả.'
                            : 'Chưa có phòng nào trong hệ thống.'}
                        </p>
                        {hasActiveFilters && (
                          <button
                            type="button"
                            onClick={clearFilters}
                            className="inline-flex items-center gap-1.5 mt-3 px-3.5 py-1.5 rounded-xl bg-sky-50 text-sky-700 text-xs font-semibold hover:bg-sky-100 transition cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Xóa bộ lọc
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    result.data.map(room => (
                      <tr
                        key={room.id}
                        onClick={() => navigate(`/admin/rooms/${room.id}`)}
                        className="group hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-3.5">
                          <Link
                            to={`/admin/rooms/${room.id}`}
                            onClick={e => e.stopPropagation()}
                            className="font-semibold text-slate-900 hover:text-sky-700"
                          >
                            Phòng {room.code}
                          </Link>
                          <span className="block max-w-64 truncate text-xs text-slate-500" title={room.building.name}>{room.building.name}</span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-600 tabular-nums">
                          Tầng {room.floor_number} · {room.area} m²
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                          {formatVND(room.base_price)}
                          <span className="text-xs text-slate-500 font-normal">/tháng</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge size="sm" tone={room.status === 'available' ? 'sky' : room.status === 'occupied' ? 'emerald' : room.status === 'maintenance' ? 'amber' : 'slate'} dot>
                            {roomStatusLabels[room.status]}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-600">
                          {room.is_public
                            ? <span className="inline-flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />Đang hiển thị</span>
                            : <span className="inline-flex items-center gap-1.5 text-slate-400"><EyeOff className="h-3.5 w-3.5" aria-hidden="true" />Ẩn</span>}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          {(() => {
                            const menuItems: RowMenuItem[] = [
                              ...(room.status === 'available' ? [{ label: 'Lập hợp đồng cho thuê', icon: <FilePlus2 className="h-4 w-4 text-slate-400" aria-hidden="true" />, to: `/admin/contracts/new?room_id=${room.id}` }] : []),
                              { label: 'Lịch sử hợp đồng', icon: <History className="h-4 w-4 text-slate-400" aria-hidden="true" />, to: `/admin/rooms/${room.id}?tab=contracts` },
                              ...(room.is_public && room.status === 'available' ? [{ label: 'Xem trên trang công khai', icon: <ExternalLink className="h-4 w-4 text-slate-400" aria-hidden="true" />, to: `/rooms/${room.id}` }] : []),
                            ]
                            return <RowMenu label={`Thao tác khác với phòng ${room.code}`} items={menuItems} />
                          })()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <nav aria-label="Phân trang phòng" className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 pt-1">
            <p className="font-medium">
              Trang <strong className="text-slate-700">{result.meta.current_page}</strong> / {result.meta.last_page} · Tổng cộng <strong className="text-slate-700">{result.meta.total}</strong> phòng
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => changePage(page - 1)} className="text-xs">Trang trước</Button>
              <Button variant="outline" size="sm" disabled={page >= result.meta.last_page} onClick={() => changePage(page + 1)} className="text-xs">Trang sau</Button>
            </div>
          </nav>
        </RefreshingFrame>
      )}

      <Modal isOpen={creating} onClose={close} title="Thêm phòng mới" maxWidth="lg">
        {buildingsLoading ? (
          <p role="status" className="text-sm text-slate-500">Đang tải tòa nhà…</p>
        ) : buildingsError ? (
          <p role="alert" className="text-sm text-rose-700">{buildingsError}</p>
        ) : buildings.length === 0 ? (
          <p className="text-sm text-slate-600">Cần <Link to="/admin/buildings" className="text-sky-700 underline">tạo tòa nhà</Link> trước khi thêm phòng.</p>
        ) : (
          <RoomForm
            buildings={buildings}
            defaultBuildingId={filters.building_id ? Number(filters.building_id) : undefined}
            onCancel={close}
            onBusyChange={setSaving}
            onSaved={room => {
              setCreating(false)
              setSuccess(`Đã tạo phòng ${room.code}.`)
              setPage(1)
              reload()
            }}
          />
        )}
      </Modal>
    </div>
  )
}
