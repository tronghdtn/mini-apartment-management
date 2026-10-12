import { Link } from 'react-router'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('Không tìm thấy trang')

  return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <p className="text-6xl font-bold text-brand-600">404</p>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Không tìm thấy trang</h1>
        <p className="mt-2 text-slate-600">Trang bạn tìm không tồn tại hoặc đã bị di chuyển.</p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  )
}
