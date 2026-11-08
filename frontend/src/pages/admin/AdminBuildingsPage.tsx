import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Building2, DoorOpen, MapPin, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { apiErrorMessage } from '@/lib/apiErrors'
import { getBuildings } from '@/features/buildings/api'
import { getDashboardBuildings } from '@/features/dashboard/api'
import { BuildingForm } from '@/features/buildings/BuildingForm'
import type { BuildingPage } from '@/features/buildings/types'
import { RefreshingFrame } from '@/components/ui/RefreshingFrame'

const BUILDING_COVERS = [
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80',
]

export function AdminBuildingsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<BuildingPage | null>(null)
  const [statsMap, setStatsMap] = useState<Record<number, { total: number; rented: number; available: number }>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      getBuildings(page, controller.signal),
      getDashboardBuildings(String(page), controller.signal).catch(() => null),
    ])
      .then(([data, dash]) => {
        if (controller.signal.aborted) return
        setResult(data)
        if (dash) {
          const map: Record<number, { total: number; rented: number; available: number }> = {}
          for (const item of dash.data) {
            map[item.id] = {
              total: item.rooms_count,
              rented: item.rented_rooms_count,
              available: item.available_rooms_count,
            }
          }
          setStatsMap(map)
        }
      })
      .catch(failure => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [page, revision])

  const reload = () => { setLoading(true); setError(''); setRevision(value => value + 1) }
  const changePage = (next: number) => { setLoading(true); setError(''); setPage(next) }
  const close = () => { if (!saving) setIsModalOpen(false) }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600">Bất động sản</span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-medium text-slate-500">Cơ sở vận hành</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Danh Sách Tòa Nhà</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý các cơ sở chung cư mini, sơ đồ tầng, tiện nghi chung và biểu giá điện nước từng tòa.
          </p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setSuccess(''); setIsModalOpen(true) }}>
          Thêm tòa nhà mới
        </Button>
      </div>

      {success && (
        <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {success}
        </p>
      )}

      {loading && !result ? (
        <p role="status" className="text-sm text-slate-500 py-6">Đang tải danh sách tòa nhà…</p>
      ) : error && !loading ? (
        <div role="alert" className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-3">
          <p className="text-sm text-rose-700">{error}</p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={reload}>Thử lại</Button>
            <a href="/login" className="text-sm text-sky-700 underline">Đăng nhập</a>
          </div>
        </div>
      ) : result && (
        <RefreshingFrame busy={loading} className="space-y-6">
          {result.data.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-500">
              Chưa có tòa nhà nào.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {result.data.map((building, index) => {
                const stats = statsMap[building.id]
                const coverUrl = BUILDING_COVERS[index % BUILDING_COVERS.length]

                return (
                  <article
                    key={building.id}
                    onClick={() => navigate(`/admin/buildings/${building.id}`)}
                    className="group bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-sky-200 transition-all overflow-hidden flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      <div className="relative h-40 overflow-hidden bg-slate-100">
                        <img
                          src={coverUrl}
                          alt={building.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent" />
                        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-semibold flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-sky-300" />
                          {building.total_floors} tầng
                        </div>
                        <div className="absolute top-2.5 right-2.5">
                          <Badge tone={building.status === 'active' ? 'emerald' : 'slate'} dot>
                            {building.status === 'active' ? 'Hoạt động' : 'Ngừng hoạt động'}
                          </Badge>
                        </div>
                      </div>

                      <div className="p-4 sm:p-5 space-y-3">
                        <div>
                          <h2 className="font-bold text-base text-slate-900 group-hover:text-sky-700 transition-colors break-words">
                            {building.name}
                          </h2>
                          <p className="text-xs text-slate-500 flex items-start gap-1.5 mt-1">
                            <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                            <span className="break-words">{building.address}</span>
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-slate-100 text-center bg-slate-50/60 rounded-xl">
                          <div>
                            <span className="text-[11px] text-slate-500 block">Tổng phòng</span>
                            <span className="text-sm font-extrabold text-slate-800">{stats ? stats.total : '—'}</span>
                          </div>
                          <div className="border-x border-slate-200/70">
                            <span className="text-[11px] text-slate-500 block">Đang thuê</span>
                            <span className="text-sm font-extrabold text-emerald-700">{stats ? stats.rented : '—'}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-500 block">Còn trống</span>
                            <span className="text-sm font-extrabold text-sky-700">{stats ? stats.available : '—'}</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed break-words">
                          {building.description || 'Chưa có mô tả.'}
                        </p>
                      </div>
                    </div>

                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <Link
                        to={`/admin/buildings/${building.id}`}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-center text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        Xem sơ đồ phòng & chi tiết
                      </Link>
                      <Link
                        to={`/admin/rooms?building_id=${building.id}`}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/70 text-xs font-semibold transition"
                        title="Danh sách phòng thuộc tòa nhà này"
                      >
                        <DoorOpen className="w-3.5 h-3.5" />
                        <span>DS Phòng</span>
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          <nav aria-label="Phân trang tòa nhà" className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <p>Trang {result.meta.current_page}/{result.meta.last_page} · {result.meta.total} tòa nhà</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => changePage(page - 1)}>Trang trước</Button>
              <Button variant="outline" size="sm" disabled={page >= result.meta.last_page} onClick={() => changePage(page + 1)}>Trang sau</Button>
            </div>
          </nav>
        </RefreshingFrame>
      )}

      <Modal isOpen={isModalOpen} onClose={close} title="Thêm tòa nhà mới vào hệ thống" maxWidth="lg">
        <BuildingForm
          onCancel={close}
          onBusyChange={setSaving}
          onSaved={building => {
            setIsModalOpen(false)
            setSuccess(`Đã tạo tòa nhà ${building.name}.`)
            setPage(1)
            reload()
          }}
        />
      </Modal>
    </div>
  )
}
