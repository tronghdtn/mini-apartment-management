import { CircleDollarSign } from 'lucide-react'
import { UnavailableWorkspace } from '@/components/ui/UnavailableWorkspace'

// Source: ui-antigravity-full/src/pages/admin/AdminDebtsPage.tsx. No business mock is imported.
export function AdminDebtsPage() {
  return <UnavailableWorkspace title="Quản lý công nợ" icon={CircleDollarSign} description="Thông tin được giới hạn theo quyền của tài khoản; nghiệp vụ tương ứng chưa được kết nối."
    tabs={["Tất cả","Quá hạn","Chưa đến hạn"]}
    stats={["Tổng công nợ","Nợ quá hạn","Cư dân còn nợ","Hóa đơn chưa thanh toán"]}
    columns={["Cư dân","Tòa nhà / Phòng","Hóa đơn","Số tiền còn nợ","Hạn thanh toán"]}
  />
}
