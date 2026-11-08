/** Sự kiện trong trang báo cho chuông tải lại số chưa đọc ngay sau khi người dùng đánh dấu đã đọc. */
export const NOTIFICATIONS_CHANGED = 'miniapart:notifications-changed'

export function announceNotificationsChanged() {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED))
}

/** Chữ trên chấm đỏ: ẩn khi 0, tối đa "99+". */
export function unreadBadgeText(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null
  return count > 99 ? '99+' : String(Math.floor(count))
}
