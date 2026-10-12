import type { ReactNode } from 'react'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

interface PlaceholderPageProps {
  title: string
  description?: string
  children?: ReactNode
}

/** Trang tạm dùng trong giai đoạn khởi tạo để kiểm tra điều hướng; sẽ thay bằng trang thật. */
export function PlaceholderPage({ title, description, children }: PlaceholderPageProps) {
  useDocumentTitle(title)

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-slate-600">{description}</p>}
      </header>

      {children}

      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
        Chức năng đang được phát triển.
      </div>
    </section>
  )
}
