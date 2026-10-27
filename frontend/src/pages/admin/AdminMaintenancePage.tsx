import { Wrench } from 'lucide-react'
import { UnavailableWorkspace } from '@/components/ui/UnavailableWorkspace'

// Source: ui-antigravity-full/src/pages/admin/AdminMaintenancePage.tsx. No business mock is imported.
export function AdminMaintenancePage() {
  return <UnavailableWorkspace title="Yêu cầu sửa chữa" icon={Wrench} description="Thông tin được giới hạn theo quyền của tài khoản; nghiệp vụ tương ứng chưa được kết nối."
    tabs={["Tất cả","Chờ xử lý","Đang xử lý","Đã giải quyết","Từ chối"]}
    stats={["Chờ xử lý","Đang xử lý","Đã giải quyết","Khẩn cấp"]}
    columns={["Yêu cầu","Phòng / Cư dân","Mức độ","Người phụ trách","Trạng thái"]}
    actions={[{"label":"Phân công kỹ thuật viên","fields":["Yêu cầu sửa chữa","Kỹ thuật viên đang hoạt động","Ghi chú phân công"]}]}
  />
}
