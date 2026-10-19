import React from 'react'
import { useParams, Link } from 'react-router'
import { MapPin, Plus, ChevronRight } from 'lucide-react'
import { buildings, rooms } from '@/mocks/data'
import { formatVND } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

export const AdminBuildingDetailPage: React.FC = () => {
  const { buildingId } = useParams<{ buildingId: string }>()
  const building = buildings.find((b) => b.id.toString() === buildingId) || buildings[0]

  const buildingRooms = rooms.filter((r) => r.buildingId === building.id)

  // Group rooms by floor (highest floor on top)
  const floorMap: Record<number, typeof buildingRooms> = {}
  for (let f = building.floors; f >= 1; f--) {
    floorMap[f] = buildingRooms.filter((r) => r.floor === f)
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/admin" className="hover:text-slate-900">Dashboard</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <Link to="/admin/buildings" className="hover:text-slate-900">Tòa nhà</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-bold text-slate-900">{building.name}</span>
      </div>

      {/* Building Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge tone="emerald" dot>Đang hoạt động</Badge>
            <span className="text-xs text-slate-400 font-medium">Mã cơ sở: #{building.id}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{building.name}</h1>
          <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5 mt-1">
            <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
            <span>{building.address}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to={`/admin/rooms?buildingId=${building.id}`}>
            <Button variant="outline" size="sm">
              Danh sách phòng ({buildingRooms.length})
            </Button>
          </Link>
          <Link to="/admin/contracts/new">
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
              Lập hợp đồng mới
            </Button>
          </Link>
        </div>
      </div>

      {/* Sơ đồ phòng theo tầng (Floor Matrix) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Sơ Đồ Phòng Theo Tầng (Floor Matrix)</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Bấm vào từng ô phòng để xem chi tiết hoặc hợp đồng đang hiệu lực.
            </p>
          </div>

          {/* Status Legends */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500" />
              <span>Còn trống</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-sky-600" />
              <span>Đang thuê</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-amber-500" />
              <span>Bảo trì</span>
            </span>
          </div>
        </div>

        {/* Floors Grid List */}
        <div className="space-y-4">
          {Object.entries(floorMap).map(([floorNum, roomsOnFloor]) => (
            <div
              key={floorNum}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="w-20 shrink-0 text-center sm:text-left">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Tầng</span>
                <span className="text-lg font-extrabold text-slate-900">{floorNum}</span>
              </div>

              <div className="flex-1 flex flex-wrap gap-3">
                {roomsOnFloor.length > 0 ? (
                  roomsOnFloor.map((rm) => {
                    const statusColor =
                      rm.status === 'available'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                        : rm.status === 'occupied'
                        ? 'bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100'
                        : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'

                    return (
                      <Link
                        key={rm.id}
                        to={`/admin/rooms/${rm.id}`}
                        className={`p-3 rounded-xl border transition shadow-2xs min-w-[140px] flex flex-col justify-between ${statusColor}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm">{rm.code}</span>
                          <span className="text-[10px] font-bold">
                            {rm.status === 'available' ? 'Trống' : rm.status === 'occupied' ? 'Đang thuê' : 'Bảo trì'}
                          </span>
                        </div>
                        <div className="mt-2 text-[11px] font-medium opacity-80">
                          {formatVND(rm.price)}/th
                        </div>
                        <div className="text-[10px] opacity-70">
                          {rm.area} m² • {rm.capacity} người
                        </div>
                      </Link>
                    )
                  })
                ) : (
                  <span className="text-xs text-slate-400 italic py-2">
                    Tầng này chưa có phòng nào được khai báo
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Building Amenities & Info */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 space-y-4 shadow-xs">
        <h3 className="font-bold text-base text-slate-900">Tiện Nghi Hạ Tầng Tòa Nhà</h3>
        <div className="flex flex-wrap gap-2">
          {building.buildingAmenities.map((amenity, idx) => (
            <span key={idx} className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium">
              {amenity}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
