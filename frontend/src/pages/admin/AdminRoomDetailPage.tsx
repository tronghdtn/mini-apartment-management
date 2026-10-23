import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { isAxiosError } from 'axios'
import { ChevronRight, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatVND } from '@/lib/format'
import { getRoom } from '@/features/room-management/api'
import { RoomForm } from '@/features/room-management/RoomForm'
import { AmenityAssignmentPanel } from '@/features/amenity-assignment/AmenityAssignmentPanel'
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
      <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><Link to="/admin/rooms" className="hover:text-slate-900">Phòng</Link><ChevronRight className="w-3.5 h-3.5 text-slate-400" /><span className="font-bold text-slate-900">{room.code}</span></nav>
      {success && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2"><Badge tone={room.status === 'available' ? 'emerald' : room.status === 'occupied' ? 'sky' : room.status === 'maintenance' ? 'amber' : 'slate'} dot>{roomStatusLabels[room.status]}</Badge><Badge tone={room.is_public ? 'emerald' : 'slate'}>{room.is_public ? 'Đánh dấu công khai' : 'Không công khai'}</Badge></div>
          <h1 className="text-2xl font-extrabold text-slate-900 break-words">Phòng {room.code}</h1>
          <p className="text-xs text-slate-500 mt-1">{room.building.name} · Tầng {room.floor_number}</p>
        </div>
        <Button variant="outline" icon={<Pencil className="w-4 h-4" />} onClick={() => { setSuccess(''); setEditing(true) }}>Sửa thông tin</Button>
      </div>
      <section className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-5">
        <h2 className="font-bold text-base text-slate-900">Thông Số Cơ Bản</h2>
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-5 text-sm">
          <div><dt className="text-xs text-slate-500">Giá thuê niêm yết</dt><dd className="font-bold text-sky-700 mt-1 break-words">{formatVND(room.base_price)}</dd></div>
          <div><dt className="text-xs text-slate-500">Tiền cọc niêm yết</dt><dd className="font-bold text-slate-800 mt-1 break-words">{formatVND(room.deposit_amount)}</dd></div>
          <div><dt className="text-xs text-slate-500">Diện tích</dt><dd className="font-bold text-slate-800 mt-1">{room.area} m²</dd></div>
          <div><dt className="text-xs text-slate-500">Sức chứa tối đa</dt><dd className="font-bold text-slate-800 mt-1">{room.max_occupants} người</dd></div>
          <div className="col-span-2 lg:col-span-4"><dt className="text-xs text-slate-500">Mô tả</dt><dd className="mt-1 text-slate-700 whitespace-pre-wrap break-words">{room.description || 'Chưa có mô tả.'}</dd></div>
        </dl>
      </section>
      <AmenityAssignmentPanel key={room.id} targetType="rooms" targetId={room.id} archivedVisibility="show" />
      <section className="bg-sky-50 rounded-3xl border border-sky-100 p-6 text-sm text-sky-800 space-y-2">
        <p>Hợp đồng, chỉ số điện nước, sửa chữa, lịch xem và ảnh phòng chưa được tích hợp.</p>
        <p>Trang phòng công khai vẫn dùng dữ liệu minh họa. Giá niêm yết tại đây không sửa các hợp đồng đã ký.</p>
      </section>
      <Modal isOpen={editing} onClose={close} title="Sửa thông tin phòng" maxWidth="lg">
        <RoomForm key={room.id} room={room} buildings={[]} onCancel={close} onBusyChange={setSaving} onSaved={updated => { setRoom(updated); setEditing(false); setSuccess('Đã lưu thông tin phòng.') }} />
      </Modal>
    </div>
  )
}
