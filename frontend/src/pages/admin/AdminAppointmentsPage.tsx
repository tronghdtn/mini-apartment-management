import { Calendar } from 'lucide-react'
import { UnavailableWorkspace } from '@/components/ui/UnavailableWorkspace'

// Source: ui-antigravity-full/src/pages/admin/AdminAppointmentsPage.tsx. No business mock is imported.
export function AdminAppointmentsPage() {
  return <UnavailableWorkspace title="Lịch xem phòng" icon={Calendar} description="Thông tin được giới hạn theo quyền của tài khoản; nghiệp vụ tương ứng chưa được kết nối."
    tabs={["Tất cả","Chờ xác nhận","Đã xác nhận","Hoàn tất","Đã hủy"]}
    stats={["Chờ xác nhận","Lịch hôm nay","Đã hoàn tất"]}
    columns={["Khách xem phòng","Tòa nhà / Phòng","Thời gian","Trạng thái","Thao tác"]}
  />
}
