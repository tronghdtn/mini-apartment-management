import { RoomPhotosPanel } from '@/features/room-photos/RoomPhotosPanel'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { isAxiosError } from 'axios'
import { ChevronRight, ExternalLink, FilePlus2, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import { RoomContractsPanel } from '@/features/contracts/RoomContractsPanel'
import { RoomMeterReadingsPanel } from '@/features/meter-readings/RoomMeterReadingsPanel'
import { AppointmentsWorkspace } from '@/features/viewing-appointments/AppointmentsWorkspace'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatVND } from '@/lib/format'
import { getRoom } from '@/features/room-management/api'
import { RoomForm } from '@/features/room-management/RoomForm'
import { AmenityAssignmentPanel } from '@/features/amenity-assignment/AmenityAssignmentPanel'
import { MaintenanceRequestList } from '@/features/maintenance-requests/MaintenanceRequestList'
import { roomStatusLabels } from '@/features/room-management/types'
import type { Room } from '@/features/room-management/types'

export function AdminRoomDetailPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const [room, setRoom] = useState<Room | null>(null)
  const [resolvedId, setResolvedId] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [revision, setRevision] = useState(0)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [params, setParams] = useSearchParams()
  const rawTab = params.get('tab') ?? 'info'
  const validTab = ['info', 'contracts', 'utilities', 'maintenance', 'appointments'].includes(rawTab)
  const tab = validTab ? rawTab : 'info'
  const setTab = (value: string) => setParams(current => { const next = new URLSearchParams(current); next.set('tab', value); return next })

  useEffect(() => {
    const controller = new AbortController()
    getRoom(roomId ?? '', controller.signal)
      .then(data => { if (!controller.signal.aborted) { setRoom(data); setNotFound(false); setError(''); setResolvedId(roomId) } })
      .catch(failure => { if (!controller.signal.aborted) { setRoom(null); setResolvedId(roomId); setNotFound(isAxiosError(failure) && failure.response?.status === 404); setError(apiErrorMessage(failure)) } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [roomId, revision])

  const close = () => { if (!saving) setEditing(false) }
  if (loading || resolvedId !== roomId) return <p role="status" className="text-sm text-slate-500 py-6">Đang tải thông tin phòng…</p>
  if (error || !room) return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
      <h1 className="text-xl font-bold text-slate-900">{notFound ? 'Không tìm thấy phòng' : 'Chưa tải được phòng'}</h1>
      <p role="alert" className="text-sm text-rose-700">{notFound ? 'Phòng không tồn tại hoặc không còn khả dụng.' : error}</p>
      <div className="flex flex-wrap items-center gap-3">
        {!notFound && <Button variant="outline" onClick={() => { setLoading(true); setError(''); setRevision(value => value + 1) }}>Thử lại</Button>}
        <Link to="/admin/rooms" className="text-sm text-sky-700 underline">Về danh sách phòng</Link>
        <a href="/login" className="text-sm text-sky-700 underline">Đăng nhập</a>
      </div>
    </div>
  )
  return (
    <div className="space-y-6">
      <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link to="/admin/buildings" className="hover:text-slate-900">Tòa nhà</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <Link to={`/admin/buildings/${room.building_id}`} className="hover:text-slate-900">{room.building.name}</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <Link to="/admin/rooms" className="hover:text-slate-900">Phòng</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-bold text-slate-900">{room.code}</span>
      </nav>
      {success && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge tone={room.status === 'available' ? 'sky' : room.status === 'occupied' ? 'emerald' : room.status === 'maintenance' ? 'amber' : 'slate'} dot>{roomStatusLabels[room.status]}</Badge>
            <Badge tone={room.is_public ? 'emerald' : 'slate'}>{room.is_public ? 'Đánh dấu công khai' : 'Không công khai'}</Badge>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 break-words">Phòng {room.code}</h1>
          <p className="text-xs text-slate-500 mt-1">
            <Link to={`/admin/buildings/${room.building_id}`} className="text-sky-700 hover:underline font-semibold">{room.building.name}</Link> · Tầng {room.floor_number}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {room.status === 'available' && room.is_public && (
            <Link to={`/rooms/${room.id}`} target="_blank" rel="noreferrer">
              <Button variant="ghost" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />}>
                Xem trang công khai
              </Button>
            </Link>
          )}
          {room.status === 'available' && (
            <Link to={`/admin/contracts/new?room_id=${room.id}`}>
              <Button variant="primary" icon={<FilePlus2 className="w-4 h-4" />}>
                Lập hợp đồng cho thuê
              </Button>
            </Link>
          )}
          <Button variant="outline" icon={<Pencil className="w-4 h-4" />} onClick={() => { setSuccess(''); setEditing(true) }}>Sửa thông tin</Button>
        </div>
      </div>
      {!validTab && <p role="alert" className="text-sm text-rose-700">Tab không hợp lệ. Đang hiển thị thông tin phòng.</p>}
      <Tabs tabs={[{ id: 'info', label: 'Thông tin phòng' }, { id: 'contracts', label: 'Hợp đồng' }, { id: 'utilities', label: 'Điện nước' }, { id: 'maintenance', label: 'Sửa chữa' }, { id: 'appointments', label: 'Lịch xem phòng' }]} activeTab={tab} onChange={setTab} />
      <div hidden={tab !== 'info'} className="space-y-6">
        <section className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-5">
          <h2 className="font-bold text-base text-slate-900">Thông Số Cơ Bản</h2>
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-5 text-sm">
            <div><dt className="text-xs text-slate-500">Giá thuê niêm yết</dt><dd className="font-bold text-sky-700 mt-1 break-words">{formatVND(room.base_price)}</dd></div>
            <div><dt className="text-xs text-slate-500">Tiền cọc niêm yết</dt><dd className="font-bold text-slate-800 mt-1 break-words">{formatVND(room.deposit_amount)}</dd></div>
            <div><dt className="text-xs text-slate-500">Diện tích</dt><dd className="font-bold text-slate-800 mt-1">{room.area} m²</dd></div>
            <div><dt className="text-xs text-slate-500">Sức chứa tối đa</dt><dd className="font-bold text-slate-800 mt-1">{room.max_occupants} người</dd></div>
            <div className="col-span-2 lg:col-span-4"><dt className="text-xs text-slate-500">Mô tả</dt><dd className="mt-1 text-slate-700 whitespace-pre-wrap break-words">{room.description || 'Chưa có mô tả.'}</dd></div>
          </dl>
        </section>
        <RoomPhotosPanel key={`photos-${room.id}-${revision}`} roomId={room.id} />
        <AmenityAssignmentPanel key={`amenities-${room.id}-${revision}`} targetType="rooms" targetId={room.id} archivedVisibility="show" />
        <p className="text-xs text-slate-500">Giá niêm yết không sửa các hợp đồng đã ký.</p>
      </div>
      {tab === 'contracts' && <RoomContractsPanel key={room.id} roomId={room.id} />}
      {tab === 'maintenance' && <MaintenanceRequestList audience="admin" roomId={room.id} />}
      {tab === 'utilities' && <RoomMeterReadingsPanel key={room.id} roomId={room.id} />}
      {tab === 'appointments' && <AppointmentsWorkspace key={room.id} mode="admin" roomId={room.id} />}
      <Modal isOpen={editing} onClose={close} title="Sửa thông tin phòng" maxWidth="lg">
        <RoomForm key={`${room.id}-${revision}`} room={room} buildings={[]} onCancel={close} onBusyChange={setSaving} onSaved={updated => { setRoom(updated); setEditing(false); setRevision(v => v + 1); setSuccess('Đã lưu thông tin phòng, tiện nghi và ảnh.') }} />
      </Modal>
    </div>
  )
}
