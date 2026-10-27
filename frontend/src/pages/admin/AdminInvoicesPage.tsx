import { Receipt } from 'lucide-react'
import { UnavailableWorkspace } from '@/components/ui/UnavailableWorkspace'

// Source: ui-antigravity-full/src/pages/admin/AdminInvoicesPage.tsx. No business mock is imported.
export function AdminInvoicesPage() {
  return <UnavailableWorkspace title="Quản lý hóa đơn" icon={Receipt} description="Thông tin được giới hạn theo quyền của tài khoản; nghiệp vụ tương ứng chưa được kết nối."
    tabs={["Tất cả","Bản nháp","Đã phát hành","Thanh toán một phần","Đã thanh toán","Đã hủy"]}
    stats={["Tổng đã phát hành","Đã xác nhận thanh toán","Công nợ","Hóa đơn quá hạn"]}
    columns={["Hóa đơn","Hợp đồng / Phòng","Kỳ","Tổng tiền","Còn nợ","Trạng thái"]}
    actions={[{"label":"Lập hóa đơn","fields":["Hợp đồng","Loại hóa đơn","Kỳ hóa đơn","Hạn thanh toán"]}]}
  />
}
