import { Link } from 'react-router'
import { Building2, MapPin, Maximize2, Users } from 'lucide-react'
import { formatVND } from '@/lib/format'
import type { PublicRoom } from './types'

export function RoomCard({ room }: { room: PublicRoom }) {
  return <article className="group bg-white rounded-2xl border border-slate-200/80 hover:border-sky-300 shadow-xs hover:shadow-xl hover:shadow-sky-500/5 transition-all flex flex-col overflow-hidden">
    <div className="relative aspect-[16/10] bg-slate-100 flex flex-col items-center justify-center gap-2 text-slate-500">
      <Building2 aria-hidden="true" className="w-10 h-10 text-slate-400" />
      <span className="text-sm">Chưa có ảnh phòng</span>
      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">Còn trống</span>
      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white text-slate-700 text-xs">Tầng {room.floor_number}
      </span>
    </div>
    <div className="p-5 flex-1 flex flex-col gap-4">
      <div>
        <Link to={`/rooms/${room.id}`} className="font-bold text-lg text-slate-900 hover:text-sky-600 break-words">Phòng {room.code}
        </Link>
        <p className="text-sm text-slate-500 mt-1 flex gap-1.5">
          <MapPin aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="break-words">
            {room.building.name}
          </span>
        </p>
        <p className="text-sm text-slate-500 mt-3 flex flex-wrap gap-4">
          <span className="inline-flex items-center gap-1.5">
            <Maximize2 aria-hidden="true" className="w-4 h-4" />
            {room.area} m²</span>
          <span className="inline-flex items-center gap-1.5">
            <Users aria-hidden="true" className="w-4 h-4" />Tối đa {room.max_occupants} người</span>
        </p>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {room.amenities.slice(0, 3).map(amenity => <span key={amenity.id} className="text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-600 break-words">
            {amenity.name}
          </span>)}{room.amenities.length > 3 && <span className="text-xs p-1 text-slate-500">+{room.amenities.length - 3}
          </span>}
        </div>
      </div>
      <div className="mt-auto pt-4 border-t border-slate-100 space-y-3">
        <p>
          <strong className="text-xl text-sky-700 break-words">
            {formatVND(room.base_price)}
          </strong>
          <span className="text-xs text-slate-500"> / tháng</span>
        </p>
        <p className="text-sm text-slate-500">Tiền cọc: {formatVND(room.deposit_amount)}
        </p>
        <Link to={`/rooms/${room.id}`} className="block text-center rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2.5 text-sm">Xem chi tiết</Link>
      </div>
    </div>
  </article>
}
