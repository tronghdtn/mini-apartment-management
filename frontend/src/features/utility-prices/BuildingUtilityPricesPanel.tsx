import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/Button'
import { apiErrorMessage } from '@/lib/apiErrors'
import { getUtilityPrices } from './api'
import { UtilityPriceHistory } from './UtilityPriceHistory'
import type { UtilityPricePage } from './types'

export function BuildingUtilityPricesPanel({ buildingId, onAuthFailure }: { buildingId: number; onAuthFailure: () => void }) {
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const key = `${buildingId}:${page}:${revision}`
  const [loaded, setLoaded] = useState<{ key: string; result?: UtilityPricePage; error?: string }>()
  useEffect(() => {
    const abort = new AbortController()
    getUtilityPrices(page, { building_id: String(buildingId), service_id: '' }, abort.signal)
      .then(result => { if (!abort.signal.aborted) setLoaded({ key, result }) })
      .catch(failure => { if (!abort.signal.aborted) { setLoaded({ key, error: apiErrorMessage(failure) }); if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) onAuthFailure() } })
    return () => abort.abort()
  }, [buildingId, page, key, onAuthFailure])
  const current = loaded?.key === key ? loaded : undefined
  return <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold text-slate-900">Lịch sử giá điện nước của tòa</h2><Link className="text-sm font-semibold text-sky-700 underline" to={`/admin/utility-prices?building_id=${buildingId}`}>Quản lý giá của tòa</Link></div><p className="text-sm text-slate-500">Lịch sử theo ngày hiệu lực, không tự nhận giá từ tòa khác; không suy giá hiện hành từ dòng đầu.</p>{!current ? <p role="status">Đang tải giá theo tòa…</p> : current.error ? <div role="alert" className="space-y-3 text-sm text-rose-700"><p>{current.error}</p><Button variant="outline" onClick={() => setRevision(value => value + 1)}>Thử lại</Button></div> : current.result && <><UtilityPriceHistory prices={current.result.data} /><div className="flex flex-wrap justify-between gap-3 text-sm"><span>Trang {current.result.meta.current_page}/{current.result.meta.last_page}</span><div className="flex gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Trang trước</Button><Button variant="outline" disabled={page >= current.result.meta.last_page} onClick={() => setPage(value => value + 1)}>Trang sau</Button></div></div></>}</section>
}
