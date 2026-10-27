import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { NotFoundPage } from './NotFoundPage'

/** Bắt lỗi phát sinh khi render route để không làm trắng toàn bộ ứng dụng. */
export function RouteErrorPage() {
  const error = useRouteError()

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />
  }

  return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Đã xảy ra lỗi</h1>
        <p role="alert" className="mt-2 text-slate-600">Không thể tải trang. Vui lòng thử tải lại; nếu lỗi vẫn tiếp diễn, hãy quay về trang chủ.</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-xl bg-sky-600 px-4 py-2.5 font-semibold text-white hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600">
          Tải lại trang
        </button>
        <Link to="/" className="mt-6 ml-4 inline-block text-brand-600 hover:underline">
          Về trang chủ
        </Link>
      </div>
    </div>
  )
}
