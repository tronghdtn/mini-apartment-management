import { CalendarCheck } from 'lucide-react'
import { UnavailableWorkspace } from '@/components/ui/UnavailableWorkspace'

// Source: ui-antigravity-full/src/pages/staff/GuardAppointmentsPage.tsx. No business mock is imported.
export function GuardAppointmentsPage() {
  return <UnavailableWorkspace title="Lịch xem phòng hôm nay" icon={CalendarCheck} description="Thông tin được giới hạn theo quyền của tài khoản; nghiệp vụ tương ứng chưa được kết nối."
    tabs={["Chờ khách đến","Đã check-in","Đã check-out"]}
    stats={["Lịch đã xác nhận hôm nay","Đã check-in","Đã check-out"]}
    actions={[{"label":"Biểu mẫu check-in","fields":["Lịch đã xác nhận","Ghi chú đón khách"]}]}
    sections={[{"title":"Quy trình đón khách","fields":["Lịch phải được xác nhận trong ngày","Check-in trước check-out","Người thao tác lấy từ phiên đăng nhập"]}]}
  />
}
