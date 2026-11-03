import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatVND } from '@/lib/format'
import { getUserDebtSummary } from './api'
import type { UserDebtSummary } from './debtSummary'

/** Công nợ của tài khoản do Backend tổng hợp trên mọi hợp đồng, kể cả đã thanh lý; React chỉ định dạng. */
export function UserDebtSummaryCard({ userId }: { userId: number }) {
  const [retry, setRetry] = useState(0)
  const key = `${userId}:${retry}`
  const [result, setResult] = useState<{ key: string; data?: UserDebtSummary; error?: string }>()
  useEffect(() => {
    const controller = new AbortController()
    getUserDebtSummary(userId, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult({ key, data }) })
      .catch(failure => { if (!controller.signal.aborted) setResult({ key, error: apiErrorMessage(failure) }) })
    return () => controller.abort()
  }, [userId, key])
  const current = result?.key === key ? result : undefined
  const data = current?.data
  return <section aria-label="Công nợ" className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 space-y-4">
    <h2 className="font-bold text-slate-900">Công nợ</h2>
    {current?.error ? <div role="alert" className="space-y-2 text-sm text-rose-700"><p>{current.error}</p><Button variant="outline" onClick={() => setRetry(value => value + 1)}>Thử lại công nợ</Button></div>
      : !data ? <p role="status" className="text-sm text-slate-500">Đang tải công nợ…</p>
      : data.outstanding_invoice_count === 0 ? <p className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />Không còn hóa đơn chưa thanh toán đủ.</p>
      : <div className="grid gap-3 sm:grid-cols-2 [overflow-wrap:anywhere]">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs text-amber-800">Tổng còn nợ · {data.outstanding_invoice_count} hóa đơn</p><p className="mt-1 font-mono text-lg font-black text-amber-700">{formatVND(BigInt(data.outstanding_amount))}</p></div>
        <div className={`rounded-2xl border p-4 ${data.overdue_invoice_count > 0 ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}><p className={`flex items-center gap-1.5 text-xs ${data.overdue_invoice_count > 0 ? 'text-rose-700' : 'text-slate-500'}`}>{data.overdue_invoice_count > 0 && <AlertCircle className="h-3.5 w-3.5" />}Quá hạn · {data.overdue_invoice_count} hóa đơn</p><p className={`mt-1 font-mono text-lg font-black ${data.overdue_invoice_count > 0 ? 'text-rose-700' : 'text-slate-700'}`}>{formatVND(BigInt(data.overdue_amount))}</p></div>
      </div>}
    <p className="text-xs text-slate-500">Gồm cả hợp đồng đã thanh lý. Khoản chờ xác nhận chưa được trừ vào công nợ. Xem từng hóa đơn trong chi tiết hợp đồng.</p>
  </section>
}
