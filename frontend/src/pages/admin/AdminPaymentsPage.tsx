import { Link } from 'react-router'
import { Plus } from 'lucide-react'
import { PaymentsWorkspace } from '@/features/payments/PaymentsWorkspace'

export function AdminPaymentsPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Thanh toán</h1>
          <p className="mt-1 text-sm text-slate-500">Đối chiếu minh chứng chuyển khoản và xác nhận khi đã nhận được tiền.</p>
        </div>
        <Link
          to="/admin/invoices"
          title="Chọn hóa đơn rồi ghi nhận tiền mặt hoặc chuyển khoản đã nhận"
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:self-auto"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />Ghi nhận khoản thu
        </Link>
      </header>
      <PaymentsWorkspace admin />
    </div>
  )
}
