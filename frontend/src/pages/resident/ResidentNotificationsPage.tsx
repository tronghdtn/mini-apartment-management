import { Bell } from 'lucide-react'
import { UnavailableWorkspace } from '@/components/ui/UnavailableWorkspace'

// Source: ui-antigravity-full/src/pages/resident/ResidentNotificationsPage.tsx. No business mock is imported.
export function ResidentNotificationsPage() {
  return <UnavailableWorkspace title="Thông báo của tôi" icon={Bell} description="Thông tin được giới hạn theo quyền của tài khoản; nghiệp vụ tương ứng chưa được kết nối."
    tabs={["Tất cả","Chưa đọc"]}
  />
}
