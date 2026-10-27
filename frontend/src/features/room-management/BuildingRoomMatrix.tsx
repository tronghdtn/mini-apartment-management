import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { DoorOpen, Layers } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatVND } from '@/lib/format'
import { getRooms } from './api'
import { roomStatusLabels } from './types'
import type { Room } from './types'

const roomColors = {
  available: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400',
  occupied: 'border-sky-200 bg-sky-50 text-sky-800 hover:border-sky-400',
  maintenance: 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-400',
  inactive: 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-400',
}

export function BuildingRoomMatrix({ buildingId, totalFloors }: { buildingId: number; totalFloors: number }) {
  const [rooms, setRooms] = useState<Room[] | null>(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [floorPage, setFloorPage] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      const result: Room[] = []
      let page = 1
      while (true) {
        const response = await getRooms(page, { building_id: String(buildingId), status: '', q: '' }, controller.signal)
        result.push(...response.data)
        if (page >= response.meta.last_page) break
        page += 1
      }
      if (!controller.signal.aborted) setRooms(result)
    }
    load().catch(failure => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)) })
    return () => controller.abort()
  }, [buildingId, revision])
  if (error) return <div role="alert" className="rounded-2xl bg-rose-50 p-5 space-y-3 text-sm text-rose-800"><p>{error}</p><Button variant="outline" onClick={() => { setError(''); setRooms(null); setRevision(value => value + 1) }}>Thử lại</Button></div>
  if (!rooms) return <p role="status" className="p-6 text-sm text-slate-500">Đang tải sơ đồ phòng…</p>
  const byFloor = new Map<number, Room[]>()
  for (const room of rooms) byFloor.set(room.floor_number, [...(byFloor.get(room.floor_number) ?? []), room])
  const highestFloor = Math.max(totalFloors, ...byFloor.keys())
  const floorCount = highestFloor + (byFloor.has(0) ? 1 : 0)
  const lastPage = Math.max(0, Math.ceil(floorCount / 10) - 1)
  const currentPage = Math.min(floorPage, lastPage)
  const floors = Array.from({ length: Math.min(10, floorCount - currentPage * 10) }, (_, index) => highestFloor - currentPage * 10 - index)
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-4"><h2 className="flex items-center gap-2 font-bold text-slate-900"><Layers className="size-5 text-sky-600" />Sơ đồ phòng theo tầng <span className="text-sm font-medium text-slate-500">({rooms.length} phòng)</span></h2><Link to="/admin/rooms" className="text-sm font-semibold text-sky-700 hover:underline">Quản lý phòng</Link></div>
    <div className="flex flex-wrap gap-2">{Object.entries(roomStatusLabels).map(([status, label]) => <span key={status} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${roomColors[status as Room['status']]}`}>{label}: {rooms.filter(room => room.status === status).length}</span>)}</div>
    {rooms.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">Tòa nhà chưa có phòng. Thêm phòng tại mục Quản lý phòng.</p>}
    {floors.map(floor => <div key={floor} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:p-5"><div className="w-20 shrink-0 text-sm font-bold text-slate-700">Tầng {floor}</div><div className="grid min-w-0 flex-1 grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{(byFloor.get(floor) ?? []).map(room => <Link key={room.id} to={`/admin/rooms/${room.id}`} className={`min-w-0 rounded-xl border p-3 transition ${roomColors[room.status]}`}><div className="flex items-center gap-2 font-bold"><DoorOpen className="size-4 shrink-0" /><span className="break-all">{room.code}</span></div><p className="mt-2 text-xs font-medium">{roomStatusLabels[room.status]}</p><p className="mt-1 break-words text-xs">{formatVND(room.base_price)}/tháng</p><p className="mt-1 text-xs opacity-80">{room.area} m² · {room.max_occupants} người</p></Link>)}{!byFloor.has(floor) && <p className="col-span-full py-2 text-sm text-slate-400">Chưa có phòng tại tầng này.</p>}</div></div>)}
    {lastPage > 0 && <div className="flex flex-wrap items-center justify-center gap-3 text-sm"><Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setFloorPage(currentPage - 1)}>Tầng cao hơn</Button><span>Nhóm tầng {currentPage + 1}/{lastPage + 1}</span><Button variant="outline" size="sm" disabled={currentPage === lastPage} onClick={() => setFloorPage(currentPage + 1)}>Tầng thấp hơn</Button></div>}
  </section>
}
