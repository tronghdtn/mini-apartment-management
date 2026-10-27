import { Wrench } from 'lucide-react'
import { UnavailableWorkspace } from '@/components/ui/UnavailableWorkspace'

// Source: ui-antigravity-full/src/pages/staff/TechnicianTaskDetailPage.tsx. No business mock is imported.
export function TechnicianTaskDetailPage() {
  return <UnavailableWorkspace title="Chi tiết công việc sửa chữa" icon={Wrench} description="Thông tin được giới hạn theo quyền của tài khoản; nghiệp vụ tương ứng chưa được kết nối."
    tabs={["Thông tin sự cố","Kết quả xử lý"]}
    actions={[{"label":"Ghi nhận hoàn tất","fields":["Ghi chú kết quả xử lý","Ảnh hoàn tất"]}]}
    sections={[{"title":"Thông tin công việc","fields":["Tiêu đề","Mô tả","Phòng","Người liên hệ","Ảnh hiện trạng"]},{"title":"Kết quả xử lý","fields":["Trạng thái","Ghi chú","Ảnh hoàn tất"]}]}
    backTo={"/staff/maintenance-requests"}
  />
}
