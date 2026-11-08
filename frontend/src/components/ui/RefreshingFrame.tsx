import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

/** `className` áp cho khối nội dung (ví dụ `space-y-4`). Bọc nội dung đang hiển thị dữ liệu cũ: làm mờ nhẹ và báo đang cập nhật, không đổi bố cục. */
export function RefreshingFrame({ busy, children, className = '' }: { busy: boolean; children: ReactNode; className?: string }) {
  return (
    <div className="relative" aria-busy={busy}>
      <div className={`transition-opacity duration-150 ${busy ? 'pointer-events-none opacity-60' : ''} ${className}`}>{children}</div>
      {busy && (
        <span role="status" className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-600" aria-hidden="true" />
          Đang cập nhật…
        </span>
      )}
    </div>
  )
}
