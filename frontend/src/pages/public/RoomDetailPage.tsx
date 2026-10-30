import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { Link, useParams } from 'react-router'
import { Building2, CheckCircle2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getPublicRoom } from '@/features/rooms/api'
import type { PublicRoom } from '@/features/rooms/types'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatVND } from '@/lib/format'

export function RoomDetailPage() {
  const { roomId = '' } = useParams<{ roomId: string }>()
  const [revision, setRevision] = useState(0)
  const key = `${roomId}:${revision}`
  const [response, setResponse] = useState<{ key: string; room?: PublicRoom; error?: string; missing?: boolean } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    getPublicRoom(roomId, controller.signal)
      .then(room => { if (!controller.signal.aborted) setResponse({ key, room }) })
      .catch(error => { if (!controller.signal.aborted) setResponse({ key, error: apiErrorMessage(error), missing: isAxiosError(error) && error.response?.status === 404 }) })
    return () => controller.abort()
  }, [roomId, key])
  const current = response?.key === key ? response : null
  const room = current?.room
  if (!current) return <p role="status" className="p-12 text-center text-slate-500">Đang tải thông tin phòng…</p>
  if (!room) return <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
    <h1 className="text-2xl font-bold">
      {current.missing ? 'Không tìm thấy phòng đang cho thuê' : 'Chưa tải được thông tin phòng'}
    </h1>
    <p role="alert" className="text-slate-600">
      {current.error}
    </p>
    {!current.missing && <Button variant="outline" onClick={() => setRevision(value => value + 1)}>Thử lại</Button>}<Link to="/rooms" className="block text-sky-700 underline">Xem phòng khác</Link>
  </div>
  const metrics = [['Giá thuê / tháng', formatVND(room.base_price)], ['Tiền cọc', formatVND(room.deposit_amount)], ['Diện tích', `${room.area} m²`], ['Sức chứa tối đa', `${room.max_occupants} người`]]
  return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
    <nav aria-label="Đường dẫn" className="text-sm text-slate-500">
      <Link to="/rooms" className="text-sky-700 hover:underline">Phòng cho thuê</Link> / Phòng {room.code}
    </nav>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-8 space-y-6">
        <div className="aspect-[16/9] bg-slate-100 rounded-3xl flex flex-col items-center justify-center gap-3 text-slate-500">
          <Building2 aria-hidden="true" className="w-12 h-12 text-slate-400" />
          <p>Chưa có ảnh phòng</p>
        </div>
        <section className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 space-y-6">
          <div>
            <span className="inline-block text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full mb-3">Còn trống · Tầng {room.floor_number}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 break-words">Phòng {room.code} — {room.building.name}
            </h1>
            <p className="flex gap-2 text-sm sm:text-base text-slate-600 mt-3">
              <MapPin aria-hidden="true" className="w-5 h-5 shrink-0" />
              <span className="break-words">
                {room.building.address}
              </span>
            </p>
          </div>
          <dl className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3 border-y border-slate-100 py-4">
            {metrics.map(([label, value]) => <div key={label} className="bg-slate-50 p-4 rounded-xl min-w-0">
              <dt className="text-sm text-slate-500">
                {label}
              </dt>
              <dd className="text-lg sm:text-xl font-bold text-sky-700 mt-1 break-words">
                {value}
              </dd>
            </div>)}
          </dl>
          <div>
            <h2 className="text-lg font-bold mb-2">Mô tả phòng</h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed whitespace-pre-wrap break-words">
              {room.description || 'Chưa có mô tả phòng.'}
            </p>
          </div>
        </section>
        <section className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8">
          <h2 className="text-lg font-bold mb-2">Tiện nghi phòng và tòa nhà</h2>
          <p className="text-sm text-slate-500 mb-4">Các tiện nghi được cung cấp tại phòng hoặc dùng chung trong tòa nhà.</p>
          {room.amenities.length ? <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {room.amenities.map(amenity => <li key={amenity.id} className="bg-slate-50 p-3 rounded-xl flex items-start gap-2">
              <CheckCircle2 aria-hidden="true" className="w-5 h-5 text-sky-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold break-words">
                  {amenity.name}
                </p>
                {amenity.description && <p className="text-sm text-slate-500 break-words mt-1">
                  {amenity.description}
                </p>}
              </div>
            </li>)}
          </ul> : <p className="text-sm text-slate-500">Chưa có thông tin tiện nghi.</p>}
        </section>
      </div>
      <aside className="lg:col-span-4">
        <div className="sticky top-24 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-xl font-bold">Xem phòng trực tiếp</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Gửi thời gian mong muốn trong 08:00–20:00 giờ Việt Nam. Lịch cần được quản trị viên xác nhận.</p>
          <p className="text-sm text-slate-500">Phí dịch vụ và giá điện nước sẽ được công bố khi cấu hình đã sẵn sàng.</p>
          <Link to={`/rooms/${room.id}/book`} className="block text-center rounded-xl bg-sky-600 text-white font-semibold py-3 text-sm hover:bg-sky-700">Đặt lịch xem phòng</Link>
        </div>
      </aside>
    </div>
  </div>
}
