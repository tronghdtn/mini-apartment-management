import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { AppointmentBookingForm } from '@/features/viewing-appointments/AppointmentBookingForm'
import { getPublicRoom } from '@/features/rooms/api'
import type { PublicRoom } from '@/features/rooms/types'
import { apiErrorMessage } from '@/lib/apiErrors'

export function BookingPage() {
  const { roomId: routeRoomId } = useParams()
  const [params] = useSearchParams()
  const roomId = routeRoomId ?? params.get('roomId') ?? ''
  const [retry, setRetry] = useState(0)
  const key = `${roomId}:${retry}`
  const [result, setResult] = useState<{ key: string; room?: PublicRoom; error?: string }>()
  useEffect(() => {
    if (!roomId) return
    const abort = new AbortController()
    getPublicRoom(roomId, abort.signal).then(room => { if (!abort.signal.aborted) setResult({ key, room }) })
      .catch(failure => { if (!abort.signal.aborted) setResult({ key, error: apiErrorMessage(failure) }) })
    return () => abort.abort()
  }, [roomId, key])
  const current = result?.key === key ? result : undefined
  return <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
    <nav className="text-sm text-slate-500"><Link to="/rooms" className="text-sky-700 underline">Danh sách phòng</Link> / Đặt lịch xem phòng</nav>
    <header className="border-b border-slate-200 pb-6"><h1 className="flex items-center gap-2 text-2xl sm:text-3xl font-extrabold text-slate-900"><Calendar className="text-sky-600" />Đặt lịch xem phòng</h1><p className="mt-3 text-sm text-slate-500">Chọn ngày giờ ghé xem phòng. Quản trị viên sẽ xác nhận trước buổi hẹn.</p></header>
    {!roomId ? <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8"><p>Chọn một phòng đang cho thuê để đặt lịch.</p><Link to="/rooms" className="font-bold text-sky-700 underline">Xem phòng đang cho thuê</Link></div> : current?.error ? <div role="alert" className="space-y-4"><p>{current.error}</p><Button onClick={() => setRetry(value => value + 1)}>Thử lại</Button></div> : !current?.room ? <p role="status">Đang tải thông tin phòng…</p> : <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm"><div className="border-b border-slate-100 pb-4"><h2 className="text-xl font-bold">Phòng {current.room.code} · {current.room.building.name}</h2><Link to={`/rooms/${roomId}`} className="text-sm text-sky-700 underline">Thông tin phòng</Link></div><AppointmentBookingForm key={roomId} roomId={roomId} /></section>}
  </div>
}
