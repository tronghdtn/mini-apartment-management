import axios from 'axios'

/**
 * Axios instance dùng chung cho toàn bộ ứng dụng.
 *
 * Frontend và API chạy cùng origin (qua Nginx hoặc Vite proxy), vì vậy dùng đường dẫn tương đối.
 * `withCredentials` + `withXSRFToken` để Laravel Sanctum xác thực SPA bằng session cookie.
 */
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

/**
 * Gọi trước khi đăng nhập để Laravel đặt cookie XSRF-TOKEN.
 * Route này nằm ngoài prefix /api/v1.
 */
export function fetchCsrfCookie() {
  return http.get('/sanctum/csrf-cookie', { baseURL: '/' })
}
