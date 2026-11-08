import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Bell } from 'lucide-react'
import { getNotifications } from './api'
import { NOTIFICATIONS_CHANGED, unreadBadgeText } from './unread'

const POLL_MS = 60_000

/**
 * Chuông có số thông báo chưa đọc (Backend đếm `unread_count`).
 * Tự tải lại mỗi phút khi tab đang mở, khi quay lại tab, khi chuyển trang và ngay sau khi đánh dấu đã đọc.
 */
export function NotificationBell({ to, className = '' }: { to: string; className?: string }) {
  const [count, setCount] = useState(0)
  const [round, setRound] = useState(0)
  const location = useLocation()

  useEffect(() => {
    const abort = new AbortController()
    // Chờ một microtask để lượt chạy thử của StrictMode bị hủy trước khi gửi request.
    void Promise.resolve().then(async () => {
      if (abort.signal.aborted) return
      try {
        const page = await getNotifications({ status: 'unread', page: '1' }, abort.signal)
        if (!abort.signal.aborted) setCount(page.unread_count)
      } catch {
        // Lỗi mạng hoặc hết phiên: giữ số cũ; trang Thông báo vẫn báo lỗi đầy đủ khi người dùng mở.
      }
    })
    return () => abort.abort()
  }, [round, location.pathname])

  useEffect(() => {
    const bump = () => setRound(value => value + 1)
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') bump() }, POLL_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') bump() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener(NOTIFICATIONS_CHANGED, bump)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener(NOTIFICATIONS_CHANGED, bump)
    }
  }, [])

  const badge = unreadBadgeText(count)
  return (
    <Link
      to={to}
      title="Thông báo"
      aria-label={count > 0 ? `Thông báo, ${count} chưa đọc` : 'Thông báo'}
      className={`relative rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 ${className}`}
    >
      <Bell aria-hidden="true" className="h-5 w-5" />
      {badge && (
        <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-rose-600 px-1 text-center text-[10px] font-bold leading-[18px] text-white ring-2 ring-white tabular-nums">
          {badge}
        </span>
      )}
    </Link>
  )
}
