import React from 'react'
import { Link } from 'react-router'
import {
  MapPin,
  Users,
  Maximize2,
  Sparkles,
} from 'lucide-react'
import type { Room } from '@/mocks/types'
import { formatVND } from '@/lib/format'
import { Button } from '@/components/ui/Button'

interface RoomCardProps {
  room: Room
  onBookClick?: (room: Room) => void
}

export const RoomCard: React.FC<RoomCardProps> = ({ room, onBookClick }) => {
  return (
    <div className="group bg-white rounded-2xl border border-slate-200/80 hover:border-sky-300 shadow-xs hover:shadow-xl hover:shadow-sky-500/5 transition-all duration-300 flex flex-col overflow-hidden">
      {/* Image Thumbnail with Badges */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <img
          src={room.images[0]}
          alt={room.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />

        {/* Gradient overlay for text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/90 backdrop-blur-md text-white text-xs font-semibold shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Còn trống
            </span>
            {room.featured && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/90 backdrop-blur-md text-white text-xs font-semibold shadow-xs">
                <Sparkles className="w-3 h-3" />
                Nổi bật
              </span>
            )}
          </div>

          <span className="px-2.5 py-1 rounded-full bg-slate-900/70 backdrop-blur-md text-white text-xs font-mono font-medium">
            Tầng {room.floor}
          </span>
        </div>

        {/* Bottom overlay: Room Code & Building */}
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <p className="text-xs font-medium text-slate-200 flex items-center gap-1 drop-shadow-xs">
            <MapPin className="w-3.5 h-3.5 text-sky-300 shrink-0" />
            <span className="truncate">{room.buildingName} • {room.district}</span>
          </p>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Room Title */}
          <Link to={`/rooms/${room.id}`} className="block group-hover:text-sky-600 transition-colors">
            <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-1">
              {room.title}
            </h3>
          </Link>

          {/* Quick Specifications (Area, Capacity, Floor) */}
          <div className="flex items-center gap-4 mt-2.5 text-xs text-slate-500 font-medium">
            <span className="inline-flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
              {room.area} m²
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              {room.capacity} người
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">#</span>
              Mã: {room.code}
            </span>
          </div>

          {/* Key Amenities (up to 3) */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {room.roomAmenities.slice(0, 3).map((amenity, idx) => (
              <span
                key={idx}
                className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-normal"
              >
                {amenity.split(' ')[0]} {amenity.split(' ')[1] || ''}
              </span>
            ))}
            {room.roomAmenities.length > 3 && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-400 font-normal">
                +{room.roomAmenities.length - 3}
              </span>
            )}
          </div>
        </div>

        {/* Pricing and Action Buttons */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-baseline justify-between mb-3.5">
            <div>
              <span className="text-lg font-extrabold text-sky-700 tracking-tight">
                {formatVND(room.price)}
              </span>
              <span className="text-xs text-slate-400 font-normal ml-1">/ tháng</span>
            </div>
            <span className="text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
              Cọc 1 tháng
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link to={`/rooms/${room.id}`} className="w-full">
              <Button variant="outline" size="sm" className="w-full text-xs">
                Chi tiết
              </Button>
            </Link>

            {onBookClick ? (
              <Button
                variant="primary"
                size="sm"
                className="w-full text-xs"
                onClick={() => onBookClick(room)}
              >
                Đặt lịch hẹn
              </Button>
            ) : (
              <Link to={`/rooms/${room.id}?action=book`} className="w-full">
                <Button variant="primary" size="sm" className="w-full text-xs">
                  Đặt lịch hẹn
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
