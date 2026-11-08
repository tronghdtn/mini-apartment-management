import { Link } from 'react-router'
import { Building2, DoorOpen, MapPin, Maximize2, Sparkles, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatVND } from '@/lib/format'
import type { PublicRoom } from './types'

export interface RoomCardProps {
  room: PublicRoom
  featured?: boolean
  onBookClick?: (room: PublicRoom) => void
}

export function RoomCard({ room, featured, onBookClick }: RoomCardProps) {
  const isFeatured = featured ?? (room.id % 3 === 1)
  const firstLine = room.description?.split('\n')[0]?.trim() ?? ''
  const displayTitle = firstLine
    ? firstLine.replace(/[,.]$/, '')
    : `Căn Hộ Mini Tiện Nghi ${room.code}`

  return (
    <article className="group bg-white rounded-2xl border border-slate-200/80 hover:border-sky-300 shadow-xs hover:shadow-xl hover:shadow-sky-500/5 transition-all duration-300 flex flex-col overflow-hidden">
      {/* Image Thumbnail with Badges */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        {room.photos.length > 0 ? (
          <img
            src={room.photos[0].url}
            alt={`Phòng ${room.code}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400 bg-slate-100">
            <Building2 className="w-10 h-10 text-slate-300" />
            <span className="text-xs">Chưa có ảnh phòng</span>
          </div>
        )}

        {/* Gradient overlay for text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/90 backdrop-blur-md text-white text-xs font-semibold shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Còn trống
            </span>
            {isFeatured && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/90 backdrop-blur-md text-white text-xs font-semibold shadow-xs">
                <Sparkles className="w-3 h-3" />
                Nổi bật
              </span>
            )}
          </div>

          <span className="px-2.5 py-1 rounded-full bg-slate-900/70 backdrop-blur-md text-white text-xs font-mono font-medium">
            Tầng {room.floor_number}
          </span>
        </div>

        {/* Bottom overlay: Building & Address */}
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <p className="text-xs font-medium text-slate-200 flex items-center gap-1 drop-shadow-xs">
            <MapPin className="w-3.5 h-3.5 text-sky-300 shrink-0" />
            <span className="truncate">{room.building.name} • {room.building.address}</span>
          </p>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Room Title */}
          <Link to={`/rooms/${room.id}`} className="block group-hover:text-sky-600 transition-colors">
            <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-1">
              {displayTitle}
            </h3>
          </Link>

          {/* Quick Specifications */}
          <div className="flex items-center gap-3 sm:gap-4 mt-2.5 text-xs sm:text-sm text-slate-500 font-medium whitespace-nowrap overflow-hidden">
            <span className="inline-flex items-center gap-1 shrink-0">
              <Maximize2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {Number(room.area)} m²
            </span>
            <span className="inline-flex items-center gap-1 shrink-0">
              <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {room.max_occupants} người
            </span>
            <span className="inline-flex items-center gap-1 shrink-0">
              <DoorOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              Phòng {room.code}
            </span>
          </div>

          {/* Amenities Pills */}
          <div className="flex items-center gap-1.5 mt-3 overflow-hidden">
            {room.amenities.slice(0, 3).map((amenity) => (
              <span
                key={amenity.id}
                className="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium whitespace-nowrap truncate"
              >
                {amenity.name}
              </span>
            ))}
            {room.amenities.length > 3 && (
              <span className="text-xs px-2 py-1 rounded-md bg-slate-50 text-slate-500 font-medium whitespace-nowrap shrink-0">
                +{room.amenities.length - 3}
              </span>
            )}
          </div>
        </div>

        {/* Pricing and Action Buttons */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between gap-2 mb-3.5 whitespace-nowrap">
            <div className=" flex items-baseline">
              <span className="text-xl font-extrabold text-sky-700 tracking-tight">
                {formatVND(room.base_price)}
              </span>
              <span className="text-xs sm:text-sm text-slate-500 font-normal ml-1">/ tháng</span>
            </div>
            <span className="text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 font-medium shrink-0 whitespace-nowrap">
              Cọc 1 tháng
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link to={`/rooms/${room.id}`} className="w-full">
              <Button variant="outline" size="sm" className="w-full text-xs sm:text-sm font-semibold">
                Chi tiết
              </Button>
            </Link>

            {onBookClick ? (
              <Button
                variant="primary"
                size="sm"
                className="w-full text-xs sm:text-sm font-semibold"
                onClick={() => onBookClick(room)}
              >
                Đặt lịch hẹn
              </Button>
            ) : (
              <Link to={`/rooms/${room.id}/book`} className="w-full">
                <Button variant="primary" size="sm" className="w-full text-xs sm:text-sm font-semibold">
                  Đặt lịch hẹn
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
