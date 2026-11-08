import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Frown, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { RoomCard } from '@/features/rooms/RoomCard'
import { RoomFilterBar } from '@/features/rooms/RoomFilterBar'
import { AppointmentBookingForm } from '@/features/viewing-appointments/AppointmentBookingForm'
import { getCachedPublicRoomOptions, getCachedPublicRooms, getPublicRoomOptions, getPublicRooms } from '@/features/rooms/api'
import { readRoomSearch, roomSearch } from '@/features/rooms/schemas'
import type { PublicRoom, PublicRoomOptions, PublicRoomPage } from '@/features/rooms/types'
import { apiErrorMessage } from '@/lib/apiErrors'
import { RefreshingFrame } from '@/components/ui/RefreshingFrame'
import { useKeepPrevious } from '@/hooks/useKeepPrevious'

export function RoomListPage() {
  const [params, setParams] = useSearchParams()
  const search = params.toString()
  const { filters, page, error: queryError } = readRoomSearch(params)
  const [revision, setRevision] = useState(0)
  const [response, setResponse] = useState<{ key: string; result?: PublicRoomPage; error?: string } | null>(null)
  const [options, setOptions] = useState<PublicRoomOptions | null>(() => getCachedPublicRoomOptions())
  const [optionsError, setOptionsError] = useState('')
  const [optionsRevision, setOptionsRevision] = useState(0)
  const [bookingRoom, setBookingRoom] = useState<PublicRoom | null>(null)
  const requestKey = `${search}:${revision}`

  useEffect(() => {
    const controller = new AbortController()
    const query = readRoomSearch(new URLSearchParams(search))
    if (!query.error)
      getPublicRooms(query.page, query.filters, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted) setResponse({ key: requestKey, result })
        })
        .catch((failure) => {
          if (!controller.signal.aborted)
            setResponse({ key: requestKey, error: apiErrorMessage(failure) })
        })
    return () => controller.abort()
  }, [search, requestKey])

  useEffect(() => {
    const controller = new AbortController()
    getPublicRoomOptions(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setOptions(data)
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setOptionsError(apiErrorMessage(failure))
      })
    return () => controller.abort()
  }, [optionsRevision])

  const cachedResult = !queryError ? getCachedPublicRooms(page, filters) : null
  const current = response?.key === requestKey ? response : cachedResult ? { key: requestKey, result: cachedResult } : null
  const { value: result, stale } = useKeepPrevious(current?.result ?? undefined)
  const error = queryError || current?.error

  const handleResetFilters = () => {
    setRevision((value) => value + 1)
    setParams({})
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header Banner */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <nav aria-label="Đường dẫn" className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            <Link to="/" className="hover:text-sky-700 transition-colors">
              Trang chủ
            </Link>
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
      </header>

      {/* Interactive Filter Bar */}
      <RoomFilterBar
        filters={filters}
        options={options}
        totalResults={result?.meta.total}
        onApply={(next) => {
          setRevision((value) => value + 1)
          setParams(roomSearch(next))
        }}
        onReset={handleResetFilters}
      />

      {optionsError && (
        <div role="alert" className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-3">
          <p className="text-sm text-amber-800">
            Chưa tải được lựa chọn tòa nhà/tiện nghi. {optionsError}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setOptionsError('')
              setOptionsRevision((value) => value + 1)
            }}
          >
            Tải lại lựa chọn
          </Button>
        </div>
      )}

      {error ? (
        <div role="alert" className="bg-rose-50 border border-rose-200 p-5 rounded-2xl space-y-3">
          <p className="text-sm text-rose-700">{error}</p>
          <Button
            variant="outline"
            onClick={() => (queryError ? setParams({}) : setRevision((value) => value + 1))}
          >
            {queryError ? 'Xóa bộ lọc' : 'Thử lại'}
          </Button>
        </div>
      ) : !result ? (
        <p role="status" className="py-10 text-center text-sm text-slate-500">
          Đang tải danh sách phòng…
        </p>
      ) : (
        result && (
          <RefreshingFrame busy={stale} className="space-y-8">
            {result.data.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {result.data.map((room, idx) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    featured={page === 1 && idx < 6}
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
                  <h2 className="text-lg font-bold text-slate-900">
                    Không Tìm Thấy Phòng Phù Hợp
                  </h2>
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

            {result.meta.last_page > 1 && (
              <nav
                aria-label="Phân trang phòng công khai"
                className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-slate-200/80"
              >
                <span className="text-xs text-slate-500">
                  Trang <strong className="text-slate-900">{result.meta.current_page}</strong> /{' '}
                  {result.meta.last_page}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setParams(roomSearch(filters, page - 1))}
                  >
                    Trang trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= result.meta.last_page}
                    onClick={() => setParams(roomSearch(filters, page + 1))}
                  >
                    Trang sau
                  </Button>
                </div>
              </nav>
            )}
          </RefreshingFrame>
        )
      )}

      {/* Quick Booking Modal */}
      {bookingRoom && (
        <Modal
          isOpen={!!bookingRoom}
          onClose={() => setBookingRoom(null)}
          size="lg"
          title={`Đặt lịch xem phòng ${bookingRoom.code}`}
        >
          <div className="p-4 sm:p-6">
            <AppointmentBookingForm
              roomId={String(bookingRoom.id)}
              room={bookingRoom}
            />
          </div>
        </Modal>
      )}
    </div>
  )
}
