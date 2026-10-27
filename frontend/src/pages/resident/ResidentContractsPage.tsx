import { FileText } from 'lucide-react'
import { UnavailableWorkspace } from '@/components/ui/UnavailableWorkspace'

// Source: ui-antigravity-full/src/pages/resident/ResidentContractsPage.tsx. No business mock is imported.
export function ResidentContractsPage() {
  return <UnavailableWorkspace title="Hợp đồng thuê của tôi" icon={FileText} description="Thông tin được giới hạn theo quyền của tài khoản; nghiệp vụ tương ứng chưa được kết nối."
    tabs={["Tất cả","Đang hiệu lực","Đã thanh lý"]}
  />
}
