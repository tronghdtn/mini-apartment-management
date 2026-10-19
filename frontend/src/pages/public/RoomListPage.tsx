import React, { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { Frown, RefreshCw } from 'lucide-react'
import { rooms } from '@/mocks/data'
import type { Room, FilterState } from '@/mocks/types'
import { RoomCard } from '@/features/rooms/RoomCard'
import { RoomFilterBar } from '@/features/rooms/RoomFilterBar'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { BookingForm } from '@/features/rooms/BookingForm'

export const RoomListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  // Initialize filters from search params or defaults
  const [filters, setFilters] = useState<FilterState>({
    keyword: searchParams.get('keyword') || '',
    buildingId: searchParams.get('buildingId') || 'all',
    priceRange: searchParams.get('priceRange') || 'all',
    areaRange: searchParams.get('areaRange') || 'all',
    capacity: searchParams.get('capacity') || 'all',
    amenities: searchParams.get('amenity') ? [searchParams.get('amenity')!] : [],
    sortBy: 'featured',
  })

  // Synchronize state to URL query params
  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.keyword) params.set('keyword', filters.keyword)
    if (filters.buildingId !== 'all') params.set('buildingId', filters.buildingId)
    if (filters.priceRange !== 'all') params.set('priceRange', filters.priceRange)
    if (filters.areaRange !== 'all') params.set('areaRange', filters.areaRange)
    if (filters.capacity !== 'all') params.set('capacity', filters.capacity)
    if (filters.amenities.length > 0) params.set('amenity', filters.amenities[0])
    setSearchParams(params, { replace: true })
  }, [filters, setSearchParams])

  // Reset Filters Handler
  const handleResetFilters = () => {
    setFilters({
      keyword: '',
      buildingId: 'all',
      priceRange: 'all',
      areaRange: 'all',
      capacity: 'all',
      amenities: [],
      sortBy: 'featured',
    })
  }

  // Booking Modal
  const [bookingRoom, setBookingRoom] = useState<Room | null>(null)

  // Filter & Sort Logic
  const filteredRooms = useMemo(() => {
    return rooms
      .filter((room) => {
        // Only public available rooms
        if (room.status !== 'available' || !room.is_public) return false

        // Keyword filter
        if (filters.keyword.trim()) {
          const q = filters.keyword.toLowerCase().trim()
          const matchCode = room.code.toLowerCase().includes(q)
          const matchTitle = room.title.toLowerCase().includes(q)
          const matchBuilding = room.buildingName.toLowerCase().includes(q)
          const matchDistrict = room.district.toLowerCase().includes(q)
          if (!matchCode && !matchTitle && !matchBuilding && !matchDistrict) return false
        }

        // Building filter
        if (filters.buildingId !== 'all') {
          if (room.buildingId.toString() !== filters.buildingId) return false
        }

        // Price range filter
        if (filters.priceRange === 'under-3.5m' && room.price >= 3500000) return false
        if (filters.priceRange === '3.5m-4.5m' && (room.price < 3500000 || room.price > 4500000))
          return false
        if (filters.priceRange === 'above-4.5m' && room.price <= 4500000) return false

        // Area range filter
        const areaNum = parseFloat(room.area)
        if (filters.areaRange === 'under-25' && areaNum >= 25) return false
        if (filters.areaRange === '25-32' && (areaNum < 25 || areaNum > 32)) return false
        if (filters.areaRange === 'above-32' && areaNum <= 32) return false

        // Capacity filter
        if (filters.capacity === '1' && room.capacity !== 1) return false
        if (filters.capacity === '2' && room.capacity !== 2) return false
        if (filters.capacity === '3+' && room.capacity < 3) return false

        // Amenities filter (must contain all selected amenities)
        if (filters.amenities.length > 0) {
          const allRoomAmenities = [...room.roomAmenities, ...room.buildingAmenities].map((a) =>
            a.toLowerCase()
          )
          const hasAll = filters.amenities.every((req) =>
            allRoomAmenities.some((item) => item.includes(req.toLowerCase()))
          )
          if (!hasAll) return false
        }

        return true
      })
      .sort((a, b) => {
        if (filters.sortBy === 'price-asc') return a.price - b.price
        if (filters.sortBy === 'price-desc') return b.price - a.price
        if (filters.sortBy === 'area-desc')
          return parseFloat(b.area) - parseFloat(a.area)
        // Default: featured first
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0)
      })
  }, [filters])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            <span>Trang chủ</span>
            <span>/</span>
            <span className="font-semibold text-slate-900">Danh sách phòng trống</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Danh Sách Phòng Đang Cho Thuê
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tất cả các phòng hiển thị dưới đây đều đang sẵn sàng bàn giao ngay.
          </p>
        </div>

        <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto font-medium">
          Dữ liệu phòng trống cập nhật theo thời gian thực
        </div>
      </div>

      {/* Interactive Filter Bar */}
      <RoomFilterBar
        filters={filters}
        setFilters={setFilters}
        onReset={handleResetFilters}
        totalResults={filteredRooms.length}
      />

      {/* Room Grid Results */}
      {filteredRooms.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onBookClick={(r) => setBookingRoom(r)}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-200/90 shadow-xs max-w-lg mx-auto p-8 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
            <Frown className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Không Tìm Thấy Phòng Phù Hợp
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Rất tiếc hiện chưa có phòng nào khớp với toàn bộ các điều kiện lọc bạn vừa chọn. Hãy thử nới lỏng mức giá hoặc bỏ bớt các yêu cầu tiện nghi.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={handleResetFilters}
          >
            Xóa bộ lọc & xem tất cả phòng
          </Button>
        </div>
      )}

      {/* Quick Booking Modal */}
      {bookingRoom && (
        <Modal
          isOpen={true}
          onClose={() => setBookingRoom(null)}
          title={`Đặt lịch xem phòng ${bookingRoom.code}`}
          maxWidth="lg"
        >
          <BookingForm
            room={bookingRoom}
            onCancel={() => setBookingRoom(null)}
            onSuccess={() => {}}
          />
        </Modal>
      )}
    </div>
  )
}
