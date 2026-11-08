import { Link } from 'react-router'
import { Bell, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { AppointmentsWorkspace } from '@/features/viewing-appointments/AppointmentsWorkspace'
import { useAuth } from '@/features/auth/useAuth'
import { NotificationsWorkspace } from '@/features/notifications/NotificationsWorkspace'

export function GuestAppointmentsPage() {
  const { user } = useAuth()
  const mode = user?.role === 'admin' ? 'admin' : user?.role === 'guard' ? 'guard' : 'owner'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/rooms">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              className="font-semibold"
            >
              Đặt thêm lịch xem phòng
            </Button>
          </Link>
        </div>

        <AppointmentsWorkspace mode={mode} />
      </div>

      {/* Notifications Section */}
      <section className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 sm:p-7 space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-4 h-4 text-sky-600" />
            Thông Báo Hệ Thống Của Tôi
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Các cập nhật xác nhận lịch hẹn và thông báo quan trọng từ ban quản lý chung cư.
          </p>
        </div>

        <NotificationsWorkspace queryPrefix="notice_" />
      </section>
    </div>
  )
}
