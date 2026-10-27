import { Wrench } from 'lucide-react'
import { UnavailableWorkspace } from '@/components/ui/UnavailableWorkspace'

// Source: ui-antigravity-full/src/pages/staff/TechnicianTasksPage.tsx. No business mock is imported.
export function TechnicianTasksPage() {
  return <UnavailableWorkspace title="Công việc được phân công" icon={Wrench} description="Thông tin được giới hạn theo quyền của tài khoản; nghiệp vụ tương ứng chưa được kết nối."
    tabs={["Tất cả","Chờ xử lý","Đang thực hiện","Đã hoàn tất"]}
  />
}
