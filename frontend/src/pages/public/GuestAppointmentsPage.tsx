import { Link } from 'react-router'
import { AppointmentsWorkspace } from '@/features/viewing-appointments/AppointmentsWorkspace'
import { useAuth } from '@/features/auth/useAuth'
import { NotificationsWorkspace } from '@/features/notifications/NotificationsWorkspace'

export function GuestAppointmentsPage() {
  const { user } = useAuth()
  return <div className="max-w-3xl mx-auto px-4 py-12">
    <AppointmentsWorkspace mode={user?.role === 'admin' ? 'admin' : user?.role === 'guard' ? 'guard' : 'owner'} />
    <Link to="/rooms" className="inline-block mt-5 text-sm font-semibold text-sky-700">Đặt lịch xem phòng khác</Link>
    <section className="mt-10"><NotificationsWorkspace queryPrefix="notice_" /></section>
  </div>
}
