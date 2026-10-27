import { Receipt } from 'lucide-react'
import { UnavailableWorkspace } from '@/components/ui/UnavailableWorkspace'

// Source: ui-antigravity-full/src/pages/admin/AdminInvoiceDetailPage.tsx. No business mock is imported.
export function AdminInvoiceDetailPage() {
  return <UnavailableWorkspace title="Chi tiết hóa đơn" icon={Receipt} description="Thông tin được giới hạn theo quyền của tài khoản; nghiệp vụ tương ứng chưa được kết nối."
    tabs={["Khoản thu","Thanh toán"]}
    stats={["Tổng hóa đơn","Đã thanh toán","Còn phải trả"]}
    columns={["Khoản thu","Số lượng","Đơn giá","Thành tiền"]}
    actions={[{"label":"Xem biểu mẫu hủy","fields":["Hóa đơn cần xử lý","Lý do hủy"]}]}
    sections={[{"title":"Thông tin hóa đơn","fields":["Mã hóa đơn","Hợp đồng","Kỳ","Hạn thanh toán"]},{"title":"Thanh toán và minh chứng","fields":["Phương thức","Trạng thái xác nhận","Ảnh minh chứng"]}]}
    backTo={"/admin/invoices"}
  />
}
