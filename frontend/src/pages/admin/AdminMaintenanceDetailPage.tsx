import { Wrench } from 'lucide-react'
import { UnavailableWorkspace } from '@/components/ui/UnavailableWorkspace'

// Source: ui-antigravity-full/src/pages/admin/AdminMaintenanceDetailPage.tsx. No business mock is imported.
export function AdminMaintenanceDetailPage() {
  return <UnavailableWorkspace title="Chi tiết yêu cầu sửa chữa" icon={Wrench} description="Thông tin được giới hạn theo quyền của tài khoản; nghiệp vụ tương ứng chưa được kết nối."
    tabs={["Thông tin","Tiến độ xử lý"]}
    actions={[{"label":"Phân công kỹ thuật viên","fields":["Kỹ thuật viên đang hoạt động","Ghi chú phân công"]}]}
    sections={[{"title":"Thông tin sự cố","fields":["Tiêu đề","Mô tả","Mức độ ưu tiên","Phòng","Người gửi"]},{"title":"Tiến độ và kết quả","fields":["Trạng thái","Người phụ trách","Ảnh hiện trạng","Ghi chú xử lý","Ảnh hoàn tất"]}]}
    backTo={"/admin/maintenance-requests"}
  />
}
