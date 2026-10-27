import { LayoutDashboard } from 'lucide-react'
import { UnavailableWorkspace } from '@/components/ui/UnavailableWorkspace'

// Source: ui-antigravity-full/src/pages/admin/AdminDashboardPage.tsx. No business mock is imported.
export function AdminDashboardPage() {
  return <UnavailableWorkspace title="Tổng quan hoạt động" icon={LayoutDashboard} description="Thông tin được giới hạn theo quyền của tài khoản; nghiệp vụ tương ứng chưa được kết nối."
    stats={["Phòng đang thuê","Doanh thu đã xác nhận","Công nợ","Yêu cầu chờ xử lý"]}
    columns={["Tòa nhà","Tổng phòng","Đang thuê","Phòng trống"]}
    sections={[{"title":"Khách xem phòng hôm nay","fields":["Khách","Thời gian","Trạng thái"]},{"title":"Công việc cần xử lý","fields":["Thanh toán chờ xác nhận","Yêu cầu sửa chữa","Hợp đồng sắp hết hạn"]}]}
  />
}
