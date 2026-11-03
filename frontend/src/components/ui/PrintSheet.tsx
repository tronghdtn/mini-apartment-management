import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Building2, Printer } from 'lucide-react'
import { Button } from './Button'
import { formatDateTime } from '@/lib/format'

interface PrintSheetProps {
  title: string
  code?: string | null
  backTo: string
  backLabel: string
  /** Chỉ cho bấm In khi dữ liệu đã tải và tài liệu được phép in. */
  ready: boolean
  children: ReactNode
}

/** Khung giấy A4 cho bản in/Lưu PDF của trình duyệt; thanh công cụ bị ẩn khi in. */
export function PrintSheet({ title, code, backTo, backLabel, ready, children }: PrintSheetProps) {
  const [printedAt] = useState(() => new Date().toISOString())
  useEffect(() => {
    if (!ready) return
    // Tên tệp gợi ý khi chọn "Lưu dưới dạng PDF" lấy từ tiêu đề trang.
    const previous = document.title
    document.title = [title, code].filter(Boolean).join(' ')
    return () => { document.title = previous }
  }, [ready, title, code])

  return <div className="min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:p-0">
    <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 print:hidden">
      <Link to={backTo} className="inline-flex items-center gap-2 text-sm font-bold text-sky-700"><ArrowLeft className="h-4 w-4" />{backLabel}</Link>
      <Button disabled={!ready} icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>In / Lưu PDF</Button>
    </div>
    <article className="mx-auto max-w-[210mm] space-y-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-800 shadow-sm sm:p-10 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-7 w-7 text-sky-700" />
          <div><p className="text-lg font-extrabold text-slate-900">MiniApart</p><p className="text-xs text-slate-500">Hệ thống quản lý chung cư mini</p></div>
        </div>
        <div className="text-right">
          <h1 className="text-xl font-extrabold uppercase tracking-wide text-slate-900">{title}</h1>
          {code && <p className="font-mono text-sm font-bold">{code}</p>}
          <p className="text-xs text-slate-500">In lúc {formatDateTime(printedAt)}</p>
        </div>
      </header>
      {children}
    </article>
  </div>
}

/** Thông báo thay cho nội dung khi chưa tải xong, lỗi hoặc tài liệu không được phép in. */
export function PrintNotice({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  return <div role={onRetry ? 'alert' : 'status'} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-5 print:hidden">
    <p>{children}</p>
    {onRetry && <Button variant="outline" onClick={onRetry}>Thử lại</Button>}
  </div>
}

/** Một dòng nhãn – giá trị trong bản in. */
export function PrintField({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-0.5 break-words font-semibold text-slate-900">{children}</dd></div>
}
