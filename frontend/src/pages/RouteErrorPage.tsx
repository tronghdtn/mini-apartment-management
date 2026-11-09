import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { isConnectionRouteError } from '@/lib/routeErrors'
import { NotFoundPage } from './NotFoundPage'

interface RouteErrorPageProps {
  /** Hiển thị bên trong layout (giữ menu); mặc định chiếm toàn màn hình. */
  embedded?: boolean
}

/** Bắt lỗi phát sinh khi render route để không làm trắng toàn bộ ứng dụng. */
export function RouteErrorPage({ embedded = false }: RouteErrorPageProps) {
  const error = useRouteError()

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />
  }

  const connection = isConnectionRouteError(error, typeof navigator === 'undefined' || navigator.onLine)
  const title = connection ? 'Mất kết nối mạng' : 'Đã xảy ra lỗi'
  const message = connection
    ? 'Không tải được trang này vì thiết bị đang mất kết nối. Kiểm tra mạng rồi bấm Thử lại; phiên đăng nhập và dữ liệu đã lưu vẫn giữ nguyên.'
    : 'Không thể tải trang. Vui lòng thử tải lại; nếu lỗi vẫn tiếp diễn, hãy quay về trang chủ.'

  return (
    <div className={embedded ? 'px-4 py-16 text-center' : 'grid min-h-screen place-items-center px-4 text-center'}>
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p role="alert" className="mt-2 text-slate-600">{message}</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-xl bg-sky-600 px-4 py-2.5 font-semibold text-white hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600">
          {connection ? 'Thử lại' : 'Tải lại trang'}
        </button>
        {!embedded && (
          <Link to="/" className="mt-6 ml-4 inline-block text-brand-600 hover:underline">
            Về trang chủ
          </Link>
        )}
      </div>
    </div>
  )
}
