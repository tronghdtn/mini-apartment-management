import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { Banknote, CircleDollarSign, DoorOpen, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { StatCard } from '@/components/ui/StatCard'
import { useAuth } from '@/features/auth/useAuth'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatVND } from '@/lib/format'
import { getDashboardSummary } from './api'
import type { DashboardSummary } from './types'

export function DashboardSummaryPanel() {
  const { refresh } = useAuth()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ attempt: number; data?: DashboardSummary; error?: string }>()
  useEffect(() => {
    const abort = new AbortController()
    getDashboardSummary(abort.signal)
      .then(data => { if (!abort.signal.aborted) setResult({ attempt, data }) })
      .catch(failure => {
        if (abort.signal.aborted) return
        setResult({ attempt, error: apiErrorMessage(failure) })
        if (isAxiosError(failure) && [401, 403].includes(failure.response?.status ?? 0)) void refresh()
      })
    return () => abort.abort()
  }, [attempt, refresh])

  function reloadSummary() {
    setAttempt(value => value + 1)
  }

  // Khi tải lại, ẩn kết quả lượt cũ cho đến khi lượt mới trả về.
  const current = result?.attempt === attempt ? result : undefined
  const data = current?.data
  return <section aria-label="Bốn chỉ số tổng quan" className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-500">{data ? `Thực nhận kỳ ${data.period.slice(5)}/${data.period.slice(0, 4)} theo giờ Việt Nam; các số còn lại tại thời điểm tải.` : 'Chỉ số được tổng hợp từ dữ liệu hệ thống.'}</p>
      <Button variant="outline" disabled={!current} onClick={reloadSummary}>Tải lại chỉ số</Button>
    </div>
    {!current ? <p role="status">Đang tải chỉ số tổng quan…</p> : current.error ? <div role="alert" className="rounded-2xl border border-rose-200 bg-white p-5">
      <p className="text-sm text-rose-700">{current.error}</p>
      <Button className="mt-3" variant="outline" onClick={reloadSummary}>Thử lại chỉ số</Button>
    </div> : data && <div className="grid gap-4 [overflow-wrap:anywhere] sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Phòng đang thuê" value={data.rented_rooms_count} subValue="Phòng có hợp đồng đang hiệu lực" icon={<DoorOpen className="h-5 w-5" />} tone="sky" />
      <StatCard label="Tiền thực nhận tháng này" value={formatVND(BigInt(data.received_amount))} subValue="Đã xác nhận, không gồm tiền cọc" icon={<Banknote className="h-5 w-5" />} tone="emerald" />
      <StatCard label="Công nợ" value={formatVND(BigInt(data.outstanding_amount))} subValue="Gồm nợ hợp đồng đã thanh lý" icon={<CircleDollarSign className="h-5 w-5" />} tone="amber" />
      <StatCard label="Yêu cầu chờ xử lý" value={data.pending_maintenance_count} subValue="Chưa bắt đầu sửa chữa" icon={<Wrench className="h-5 w-5" />} />
    </div>}
  </section>
}
