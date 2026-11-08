import { useState } from 'react'
import { Copy, Landmark, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/useAuth'
import { useApiResource } from '@/hooks/useApiResource'
import { formatVND } from '@/lib/format'
import { buildVietQrUrl, usePublicSettings } from '@/lib/publicSettings'
import { getPaymentInstructions } from './api'

/** RES-05: hướng dẫn chuyển khoản do Backend trả (DB-D94); số tiền gợi ý là phần còn lại, chưa trừ khoản chờ xác nhận. */
export function PaymentInstructionsCard({ invoiceId, version }: { invoiceId: number; version: number }) {
  const { refresh } = useAuth()
  const siteSettings = usePublicSettings()
  const { data, error, reload } = useApiResource(`instructions:${invoiceId}:${version}`, signal => getPaymentInstructions(invoiceId, signal), refresh)
  const [copied, setCopied] = useState('')

  async function copy(label: string, text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(`Đã sao chép ${label.toLowerCase()}.`) }
    catch { setCopied(`Không sao chép được ${label.toLowerCase()}; hãy chọn và sao chép thủ công.`) }
  }

  if (data && !data.payable) return null
  const rows = data?.payable ? [
    ['Ngân hàng', data.bank_name],
    ['Số tài khoản', data.account_number],
    ['Chủ tài khoản', data.account_holder],
    ['Số tiền gợi ý', data.amount === null ? null : String(data.amount)],
    ['Nội dung chuyển khoản', data.transfer_content],
  ] as const : []

  const vietQrUrl = data?.payable ? buildVietQrUrl({
    bankName: data.bank_name,
    accountNumber: data.account_number,
    accountHolder: data.account_holder,
    amount: data.amount,
    transferContent: data.transfer_content,
  }) : null
  const qrImageSrc = siteSettings.customQrDataUrl || vietQrUrl

  return (
    <section aria-label="Thanh toán chuyển khoản" className="space-y-4 rounded-2xl border border-sky-200 bg-sky-50/60 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Landmark className="h-5 w-5 text-sky-700" />
          Thông tin chuyển khoản & Mã QR thanh toán
        </h2>
        {qrImageSrc && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
            <QrCode className="w-3.5 h-3.5" />
            Quét mã QR chuyển khoản nhanh
          </span>
        )}
      </div>

      {error ? (
        <div role="alert" className="space-y-2 text-sm text-rose-700">
          <p>{error}</p>
          <Button variant="outline" onClick={reload}>Tải lại hướng dẫn</Button>
        </div>
      ) : !data ? (
        <p role="status" className="text-sm text-slate-500">Đang tải thông tin chuyển khoản…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          <div className={qrImageSrc ? 'md:col-span-7 lg:col-span-8 space-y-3' : 'md:col-span-12 space-y-3'}>
            {!data.configured && !siteSettings.customQrDataUrl && (
              <p className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
                Ban quản lý chưa cấu hình tài khoản ngân hàng nhận tiền (có thể thiết lập tại mục <strong>Cài đặt hệ thống</strong>).
              </p>
            )}
            <dl className="grid gap-3 sm:grid-cols-2">
              {rows.filter(([, value]) => value !== null).map(([label, value]) => (
                <div key={label} className={`min-w-0 rounded-xl border border-slate-200 bg-white p-3 ${label === 'Nội dung chuyển khoản' ? 'sm:col-span-2' : ''}`}>
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="mt-1 flex items-center justify-between gap-2">
                    <span className="min-w-0 break-all font-mono font-bold text-slate-900">
                      {label === 'Số tiền gợi ý' ? formatVND(data.amount ?? 0) : value}
                    </span>
                    <button
                      type="button"
                      onClick={() => void copy(label, value ?? '')}
                      className="shrink-0 rounded-lg p-1.5 text-sky-700 hover:bg-sky-50 cursor-pointer"
                      aria-label={`Sao chép ${label.toLowerCase()}`}
                      title={`Sao chép ${label.toLowerCase()}`}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </dd>
                </div>
              ))}
            </dl>
            {copied && <p role="status" className="text-xs font-semibold text-teal-700">{copied}</p>}
            <p className="text-xs text-slate-600">
              Sau khi chuyển khoản thành công, bấm <strong>“Gửi minh chứng chuyển khoản”</strong> để đính kèm ảnh chụp giao dịch.
            </p>
          </div>

          {qrImageSrc && (
            <div className="md:col-span-5 lg:col-span-4 bg-white rounded-2xl border border-sky-200 p-4 text-center shadow-xs space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Mã QR thanh toán</p>
              <img
                src={qrImageSrc}
                alt="Mã QR thanh toán hóa đơn"
                className="w-48 h-48 object-contain mx-auto rounded-xl border border-slate-100 p-1 bg-white"
              />
              <p className="text-[11px] text-slate-500">
                Mở ứng dụng Ngân hàng bất kỳ để quét mã QR với đúng số tiền & nội dung chuyển khoản.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
