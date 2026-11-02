import { Link } from 'react-router'
import { AlertCircle, AlertTriangle, Building2, Calendar, CheckCircle2, CreditCard, History } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatDate, formatVND } from '@/lib/format'
import type { ResidentOverview } from './types'

export function ResidentRoomBanner({ name, overview }: { name: string; overview: ResidentOverview }) {
  const contract = overview.active_contract
  return <section aria-label="Phòng của tôi" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-cyan-700 to-slate-900 p-6 text-white shadow-md sm:p-8">
    <div className="relative z-10 space-y-4">
      <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-sky-100 backdrop-blur-md">{contract ? 'Đang thuê' : 'Cư dân'}</span>
      <div className="min-w-0">
        <h1 className="break-words text-2xl font-extrabold tracking-tight sm:text-3xl">Xin chào, {name}</h1>
        <p className="mt-1 flex min-w-0 items-start gap-1.5 text-sm text-sky-100/90">
          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
          {contract ? <span className="min-w-0 break-words">Phòng <strong>{contract.room.code}</strong> — {contract.room.building_name} · {contract.room.address}</span>
            : <span>Bạn không còn hợp đồng đang hiệu lực. Bạn vẫn xem được lịch sử hợp đồng và hóa đơn.</span>}
        </p>
      </div>
      {contract ? <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 pt-2 text-xs text-sky-100/80">
        <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 shrink-0 text-sky-300" />Bắt đầu {formatDate(contract.start_date)} · Ngày cuối được ở {formatDate(contract.end_date)}</span>
        <Link to={`/resident/contracts/${contract.id}`} className="font-semibold text-white underline">{contract.contract_number ?? `Hợp đồng #${contract.id}`}</Link>
      </div> : <div className="flex flex-wrap gap-3 border-t border-white/10 pt-3 text-xs font-semibold">
        <Link to="/resident/contracts" className="flex items-center gap-1.5 text-white underline"><History className="h-3.5 w-3.5" />Lịch sử hợp đồng</Link>
        <Link to="/resident/invoices" className="flex items-center gap-1.5 text-white underline"><History className="h-3.5 w-3.5" />Lịch sử hóa đơn</Link>
      </div>}
      {contract?.due_state && <p role="status" className="flex items-start gap-2 rounded-xl bg-amber-100 p-3 text-xs font-semibold text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        {contract.due_state === 'overdue'
          ? `Hợp đồng đã quá ngày cuối được ở (${formatDate(contract.end_date)}). Vui lòng liên hệ ban quản lý để gia hạn hoặc bàn giao phòng.`
          : `Hợp đồng sắp hết hạn: ngày cuối được ở ${formatDate(contract.end_date)}, bàn giao dự kiến ${formatDate(contract.planned_handover_date)}.`}
      </p>}
    </div>
    <div className="pointer-events-none absolute -bottom-12 -right-12 h-64 w-64 rounded-full bg-white/5" />
  </section>
}

export function ResidentDebtCard({ debt }: { debt: ResidentOverview['debt'] }) {
  if (debt.outstanding_invoice_count === 0) {
    return <section aria-label="Cần thanh toán" className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-white p-4 shadow-2xs">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><CheckCircle2 className="h-4 w-4" /></div>
      <div className="text-xs"><span className="block font-bold text-slate-900">Không còn hóa đơn cần thanh toán.</span>
        <span className="text-slate-500">Khoản chờ xác nhận chưa được trừ vào công nợ; công nợ chỉ giảm khi ban quản lý xác nhận.</span></div>
    </section>
  }
  return <section aria-label="Cần thanh toán" className="space-y-3 rounded-2xl border-2 border-amber-300/80 bg-white p-5 shadow-2xs">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><AlertCircle className="h-5 w-5" /></div>
        <div className="min-w-0">
          <h2 className="text-sm font-extrabold text-slate-900">Cần thanh toán</h2>
          <p className="mt-0.5 text-xs text-slate-500">{debt.outstanding_invoice_count} hóa đơn còn nợ, gồm cả hợp đồng đã thanh lý</p>
        </div>
      </div>
      <span className="min-w-0 break-all font-mono text-base font-black text-amber-700 sm:text-lg">{formatVND(BigInt(debt.outstanding_amount))}</span>
    </div>
    {debt.overdue_invoice_count > 0 && <p className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
      {debt.overdue_invoice_count} hóa đơn quá hạn · {formatVND(BigInt(debt.overdue_amount))}
    </p>}
    <div className="flex flex-col gap-2 border-t border-slate-100 pt-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs text-slate-500">Khoản chờ xác nhận chưa được trừ vào công nợ.</span>
      <Link to="/resident/invoices" className="w-full sm:w-auto"><Button size="sm" className="w-full gap-1.5 text-xs sm:w-auto" icon={<CreditCard className="h-3.5 w-3.5" />}>Thanh toán</Button></Link>
    </div>
  </section>
}
