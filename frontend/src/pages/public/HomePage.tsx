import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Search, Sparkles, ArrowRight, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { RoomCard } from '@/features/rooms/RoomCard'
import { HomeInformationSections } from '@/features/rooms/HomeInformationSections'
import { getPublicRoomOptions, getPublicRooms } from '@/features/rooms/api'
import { roomPriceRanges } from '@/features/rooms/ranges'
import { emptyRoomFilters, roomSearch } from '@/features/rooms/schemas'
import type { PublicRoomOptions, PublicRoomPage } from '@/features/rooms/types'
import { apiErrorMessage } from '@/lib/apiErrors'

export function HomePage() {
  const navigate = useNavigate()
  const [selectedBuilding, setSelectedBuilding] = useState('')
  const [selectedPrice, setSelectedPrice] = useState('')
  const [result, setResult] = useState<PublicRoomPage | null>(null)
  const [options, setOptions] = useState<PublicRoomOptions | null>(null)
  const [error, setError] = useState('')
  const [optionsError, setOptionsError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    getPublicRooms(1, { ...emptyRoomFilters, sort: 'price_asc' }, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult(data) })
      .catch(failure => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)) })
    getPublicRoomOptions(controller.signal)
      .then(data => { if (!controller.signal.aborted) setOptions(data) })
      .catch(failure => { if (!controller.signal.aborted) setOptionsError(apiErrorMessage(failure)) })
    return () => controller.abort()
  }, [revision])
  const searchRooms = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const range = roomPriceRanges.find(([name]) => name === selectedPrice)
    const search = roomSearch({
      ...emptyRoomFilters,
      building_id: selectedBuilding,
      min_price: range?.[1] ?? '',
      max_price: range?.[2] ?? '',
    })
    navigate({ pathname: '/rooms', search: search.toString() })
  }
  const reload = () => { setError(''); setOptionsError(''); setResult(null); setOptions(null); setRevision(value => value + 1) }
  return <div className="space-y-16 sm:space-y-24 pb-16">
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 text-white shadow-2xl">
        <div aria-hidden="true" className="absolute top-0 right-0 w-80 h-80 rounded-full bg-sky-500/20 blur-3xl pointer-events-none" />
        <div aria-hidden="true" className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />
        <div className="relative px-6 py-12 sm:px-12 sm:py-16 lg:py-20 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-semibold uppercase tracking-wider mb-5">
            <Sparkles aria-hidden="true" className="w-4 h-4" />Hệ thống chung cư mini</div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">Tìm Không Gian Sống <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-sky-200 to-teal-300">Phù Hợp Với Bạn</span>
          </h1>
          <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">Xem thông tin phòng đang cho thuê, giá niêm yết và tiện nghi được cập nhật từ hệ thống quản lý.</p>
          <form onSubmit={searchRooms} className="mt-8 p-3 sm:p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-white/20 text-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 shadow-xl">
            <div>
              <label htmlFor="home-building" className="block text-sm font-semibold mb-1">Tòa nhà</label>
              <select id="home-building" value={selectedBuilding} disabled={!options} onChange={event => setSelectedBuilding(event.target.value)} className="w-full border border-slate-200 rounded-xl p-2.5 text-sm">
                <option value="">Tất cả tòa nhà</option>
                {options?.buildings.map(building => <option key={building.id} value={building.id}>
                  {building.name}
                </option>)}
              </select>
            </div>
            <div>
              <label htmlFor="home-price" className="block text-sm font-semibold mb-1">Ngân sách thuê</label>
              <select id="home-price" value={selectedPrice} onChange={event => setSelectedPrice(event.target.value)} className="w-full border border-slate-200 rounded-xl p-2.5 text-sm">
                <option value="">Tất cả mức giá</option>
                {roomPriceRanges.map(([name]) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            <Button type="submit" className="self-end" icon={<Search aria-hidden="true" className="w-4 h-4" />}>Tìm phòng ngay</Button>
          </form>
          {optionsError && <div role="alert" className="mt-3 text-sm text-amber-200">
            <p>Chưa tải được danh sách tòa nhà. {optionsError}
            </p>
            <button type="button" onClick={reload} className="underline py-2">Thử lại</button>
          </div>}
        </div>
      </div>
    </section>
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Phòng trống giá tốt</h2>
          <p className="text-sm text-slate-500 mt-1">Tối đa 6 phòng đang cho thuê, sắp theo giá từ thấp đến cao.</p>
        </div>
        <Link to="/rooms" className="inline-flex items-center gap-2 text-sky-700 text-sm font-semibold">Xem tất cả{result ? ` (${result.meta.total} phòng)` : ''}<ArrowRight aria-hidden="true" className="w-4 h-4" />
        </Link>
      </div>
      {error ? <div role="alert" className="rounded-2xl bg-rose-50 border border-rose-200 p-5 space-y-3">
        <p className="text-sm text-rose-700">
          {error}
        </p>
        <Button variant="outline" onClick={reload}>Thử lại</Button>
      </div> : !result ? <p role="status" className="text-slate-500 py-8">Đang tải phòng cho thuê…</p> : result.data.length ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {result.data.slice(0, 6).map(room => <RoomCard key={room.id} room={room} />)}
      </div> : <div className="rounded-3xl bg-white border border-slate-200 p-10 text-center text-slate-500">
        <Building2 aria-hidden="true" className="w-10 h-10 mx-auto mb-3 text-slate-400" />
        <p>Hiện chưa có phòng công khai đang cho thuê.</p>
      </div>}
    </section>
    <HomeInformationSections options={options} error={optionsError} onRetry={reload} />
  </div>
}
