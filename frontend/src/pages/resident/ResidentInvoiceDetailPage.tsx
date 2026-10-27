import { Receipt } from 'lucide-react'
import { UnavailableWorkspace } from '@/components/ui/UnavailableWorkspace'

// Source: ui-antigravity-full/src/pages/resident/ResidentInvoiceDetailPage.tsx. No business mock is imported.
export function ResidentInvoiceDetailPage() {
  return <UnavailableWorkspace title="Chi tiết hóa đơn" icon={Receipt} description="Thông tin được giới hạn theo quyền của tài khoản; nghiệp vụ tương ứng chưa được kết nối."
    tabs={["Chi tiết khoản thu","Lịch sử thanh toán"]}
    stats={["Tổng hóa đơn","Đã thanh toán","Còn phải trả"]}
    columns={["Khoản thu","Số lượng","Đơn giá","Thành tiền"]}
    actions={[{"label":"Gửi minh chứng thanh toán","fields":["Số tiền đã chuyển","Nội dung chuyển khoản","Ảnh minh chứng"]}]}
    sections={[{"title":"Thông tin chuyển khoản","fields":["Ngân hàng","Số tài khoản","Chủ tài khoản","Nội dung chuyển khoản"]},{"title":"Lịch sử thanh toán","fields":["Phương thức","Số tiền xác nhận","Thời điểm xác nhận"]}]}
    backTo={"/resident/invoices"}
  />
}
