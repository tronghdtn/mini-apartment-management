/** Chỉ reset trang của thông báo, giữ bộ lọc/lịch hẹn dùng chung URL. */
export function withoutNotificationPage(params: URLSearchParams, prefix = ''): URLSearchParams {
  const next = new URLSearchParams(params)
  next.delete(`${prefix}page`)
  return next
}
