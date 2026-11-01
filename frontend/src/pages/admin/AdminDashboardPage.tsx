import { LayoutDashboard } from 'lucide-react'
import { UnavailableWorkspace } from '@/components/ui/UnavailableWorkspace'
import { DashboardSummaryPanel } from '@/features/dashboard/DashboardSummaryPanel'

// Source: ui-antigravity-full/src/pages/admin/AdminDashboardPage.tsx. No business mock is imported.
export function AdminDashboardPage() {
  return <UnavailableWorkspace title="Tổng quan hoạt động" icon={LayoutDashboard} description="Bốn chỉ số được tổng hợp từ dữ liệu hệ thống dành cho quản trị viên."
    notice="Các bảng và danh sách bên dưới chưa được kết nối dữ liệu; hiện chỉ bốn chỉ số phía trên được cung cấp."
    columns={["Tòa nhà","Tổng phòng","Đang thuê","Phòng trống"]}
    sections={[{"title":"Khách xem phòng hôm nay","fields":["Khách","Thời gian","Trạng thái"]},{"title":"Công việc cần xử lý","fields":["Thanh toán chờ xác nhận","Yêu cầu sửa chữa","Hợp đồng sắp hết hạn"]}]}
  ><DashboardSummaryPanel /></UnavailableWorkspace>
}
