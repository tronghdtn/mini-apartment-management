import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { NotFoundPage } from './NotFoundPage'

/** Bắt lỗi phát sinh khi render route để không làm trắng toàn bộ ứng dụng. */
export function RouteErrorPage() {
  const error = useRouteError()

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />
  }

  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Lỗi không xác định'

  return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Đã xảy ra lỗi</h1>
        <p className="mt-2 text-slate-600">{message}</p>
        <Link to="/" className="mt-6 inline-block text-brand-600 hover:underline">
          Về trang chủ
        </Link>
      </div>
    </div>
  )
}
