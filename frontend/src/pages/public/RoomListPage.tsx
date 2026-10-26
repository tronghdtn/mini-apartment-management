import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { RoomCard } from '@/features/rooms/RoomCard'
import { RoomFilterBar } from '@/features/rooms/RoomFilterBar'
import { getPublicRoomOptions, getPublicRooms } from '@/features/rooms/api'
import { readRoomSearch, roomSearch } from '@/features/rooms/schemas'
import type { PublicRoomOptions, PublicRoomPage } from '@/features/rooms/types'
import { apiErrorMessage } from '@/lib/apiErrors'

export function RoomListPage() {
  const [params, setParams] = useSearchParams()
  const search = params.toString()
  const { filters, page, error: queryError } = readRoomSearch(params)
  const [revision, setRevision] = useState(0)
  const [response, setResponse] = useState<{ key: string; result?: PublicRoomPage; error?: string } | null>(null)
  const [options, setOptions] = useState<PublicRoomOptions | null>(null)
  const [optionsError, setOptionsError] = useState('')
  const [optionsRevision, setOptionsRevision] = useState(0)
  const requestKey = `${search}:${revision}`

  useEffect(() => {
    const controller = new AbortController()
    const query = readRoomSearch(new URLSearchParams(search))
    if (!query.error) getPublicRooms(query.page, query.filters, controller.signal)
      .then(result => { if (!controller.signal.aborted) setResponse({ key: requestKey, result }) })
      .catch(failure => { if (!controller.signal.aborted) setResponse({ key: requestKey, error: apiErrorMessage(failure) }) })
    return () => controller.abort()
  }, [search, requestKey])

  useEffect(() => {
    const controller = new AbortController()
    getPublicRoomOptions(controller.signal)
      .then(data => { if (!controller.signal.aborted) setOptions(data) })
      .catch(failure => { if (!controller.signal.aborted) setOptionsError(apiErrorMessage(failure)) })
    return () => controller.abort()
  }, [optionsRevision])

  const current = response?.key === requestKey ? response : null
  const result = current?.result
  const error = queryError || current?.error
  return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
    <header className="pb-6 border-b border-slate-200">
      <nav aria-label="Đường dẫn" className="text-sm text-slate-500 mb-2">
        <Link to="/" className="hover:text-sky-700">Trang chủ</Link> / Phòng cho thuê</nav>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Danh Sách Phòng Đang Cho Thuê</h1>
      <p className="text-sm text-slate-500 mt-2">Thông tin và giá niêm yết lấy từ hệ thống quản lý.</p>
    </header>
    <RoomFilterBar key={search} filters={filters} options={options} onApply={next => { setRevision(value => value + 1); setParams(roomSearch(next)) }} onReset={() => { setRevision(value => value + 1); setParams({}) }} />
    {!options && !optionsError && <p role="status" className="text-sm text-slate-500">Đang tải lựa chọn tòa nhà và tiện nghi…</p>}
    {optionsError && <div role="alert" className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-3">
      <p className="text-sm text-amber-800">Chưa tải được lựa chọn tòa nhà/tiện nghi. {optionsError}
      </p>
      <Button variant="outline" size="sm" onClick={() => { setOptionsError(''); setOptionsRevision(value => value + 1) }}>Tải lại lựa chọn</Button>
    </div>}
    {error ? <div role="alert" className="bg-rose-50 border border-rose-200 p-5 rounded-2xl space-y-3">
      <p className="text-sm text-rose-700">
        {error}
      </p>
      <Button variant="outline" onClick={() => queryError ? setParams({}) : setRevision(value => value + 1)}>
        {queryError ? 'Xóa bộ lọc' : 'Thử lại'}
      </Button>
    </div>
      : !current ? <p role="status" className="py-10 text-center text-slate-500">Đang tải danh sách phòng…</p>
        : result && <>
          <p role="status" className="text-sm text-slate-600">
            {result.meta.total} phòng phù hợp · Trang {result.meta.current_page}/{result.meta.last_page}
          </p>
          {result.data.length ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {result.data.map(room => <RoomCard key={room.id} room={room} />)}
          </div> : <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 space-y-4 px-4">
            <h2 className="text-xl font-bold">Không có phòng phù hợp</h2>
            <p className="text-sm text-slate-500">Thử thay đổi bộ lọc hoặc quay về trang đầu.</p>
            <Button variant="outline" onClick={() => setParams(roomSearch(filters))}>Về trang đầu</Button>
          </div>}
          <nav aria-label="Phân trang phòng công khai" className="flex flex-wrap justify-between items-center gap-3">
            <Button variant="outline" disabled={page <= 1} onClick={() => setParams(roomSearch(filters, page - 1))}>Trang trước</Button>
            <Button variant="outline" disabled={page >= result.meta.last_page} onClick={() => setParams(roomSearch(filters, page + 1))}>Trang sau</Button>
          </nav>
        </>}
  </div>
}
