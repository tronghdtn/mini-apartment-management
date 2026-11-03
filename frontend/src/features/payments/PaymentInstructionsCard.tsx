import { useState } from 'react'
import { Copy, Landmark } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/useAuth'
import { useApiResource } from '@/hooks/useApiResource'
import { formatVND } from '@/lib/format'
import { getPaymentInstructions } from './api'

/** RES-05: hướng dẫn chuyển khoản do Backend trả (DB-D94); số tiền gợi ý là phần còn lại, chưa trừ khoản chờ xác nhận. */
export function PaymentInstructionsCard({ invoiceId, version }: { invoiceId: number; version: number }) {
  const { refresh } = useAuth()
  const { data, error, reload } = useApiResource(`instructions:${invoiceId}:${version}`, signal => getPaymentInstructions(invoiceId, signal), refresh)
  const [copied, setCopied] = useState('')
  async function copy(label: string, text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(`Đã sao chép ${label.toLowerCase()}.`) }
    catch { setCopied(`Không sao chép được ${label.toLowerCase()}; hãy chọn và sao chép thủ công.`) }
  }
  if (data && !data.payable) return null
  const rows = data?.payable ? [
    ['Ngân hàng', data.bank_name], ['Số tài khoản', data.account_number], ['Chủ tài khoản', data.account_holder],
    ['Số tiền gợi ý', data.amount === null ? null : String(data.amount)], ['Nội dung chuyển khoản', data.transfer_content],
  ] as const : []
  return <section aria-label="Thanh toán chuyển khoản" className="space-y-4 rounded-2xl border border-sky-200 bg-sky-50/60 p-4 sm:p-6">
    <h2 className="flex items-center gap-2 text-lg font-bold"><Landmark className="h-5 w-5 text-sky-700" />Thanh toán chuyển khoản</h2>
    {error ? <div role="alert" className="space-y-2 text-sm text-rose-700"><p>{error}</p><Button variant="outline" onClick={reload}>Tải lại hướng dẫn</Button></div>
      : !data ? <p role="status" className="text-sm text-slate-500">Đang tải thông tin chuyển khoản…</p>
      : <>
        {!data.configured && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Ban quản lý chưa cấu hình tài khoản nhận tiền. Vui lòng liên hệ ban quản lý để được hướng dẫn thanh toán.</p>}
        <dl className="grid gap-3 sm:grid-cols-2">
          {rows.filter(([, value]) => value !== null).map(([label, value]) => <div key={label} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="mt-1 flex items-center justify-between gap-2">
              <span className="min-w-0 break-all font-mono font-bold text-slate-900">{label === 'Số tiền gợi ý' ? formatVND(data.amount ?? 0) : value}</span>
              <button type="button" onClick={() => void copy(label, value ?? '')} className="shrink-0 rounded-lg p-1.5 text-sky-700 hover:bg-sky-50" aria-label={`Sao chép ${label.toLowerCase()}`}><Copy className="h-4 w-4" /></button>
            </dd>
          </div>)}
        </dl>
        {copied && <p role="status" className="text-xs text-teal-700">{copied}</p>}
        <p className="text-xs text-slate-500">Sau khi chuyển khoản, bấm “Gửi minh chứng chuyển khoản”. Khoản chờ xác nhận chưa được trừ vào công nợ; mã QR chưa được hỗ trợ.</p>
      </>}
  </section>
}
