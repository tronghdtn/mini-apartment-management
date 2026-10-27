import { Bell } from 'lucide-react'
import { UnavailableWorkspace } from '@/components/ui/UnavailableWorkspace'

// Source: ui-antigravity-full/src/pages/admin/AdminNotificationsPage.tsx. No business mock is imported.
export function AdminNotificationsPage() {
  return <UnavailableWorkspace title="Trung tâm thông báo" icon={Bell} description="Thông tin được giới hạn theo quyền của tài khoản; nghiệp vụ tương ứng chưa được kết nối."
    tabs={["Tất cả","Quản trị viên","Cư dân","Kỹ thuật viên","Bảo vệ"]}
    actions={[{"label":"Soạn thông báo","fields":["Đối tượng nhận","Tiêu đề","Nội dung"]}]}
  />
}
