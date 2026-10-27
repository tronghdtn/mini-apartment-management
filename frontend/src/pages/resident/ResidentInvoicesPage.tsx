import { Receipt } from 'lucide-react'
import { UnavailableWorkspace } from '@/components/ui/UnavailableWorkspace'

// Source: ui-antigravity-full/src/pages/resident/ResidentInvoicesPage.tsx. No business mock is imported.
export function ResidentInvoicesPage() {
  return <UnavailableWorkspace title="Hóa đơn của tôi" icon={Receipt} description="Thông tin được giới hạn theo quyền của tài khoản; nghiệp vụ tương ứng chưa được kết nối."
    tabs={["Tất cả","Chưa thanh toán","Đã thanh toán"]}
  />
}
