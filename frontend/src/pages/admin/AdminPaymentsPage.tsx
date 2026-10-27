import { CreditCard } from 'lucide-react'
import { UnavailableWorkspace } from '@/components/ui/UnavailableWorkspace'

// Source: ui-antigravity-full/src/pages/admin/AdminPaymentsPage.tsx. No business mock is imported.
export function AdminPaymentsPage() {
  return <UnavailableWorkspace title="Thanh toán & Đối soát" icon={CreditCard} description="Thông tin được giới hạn theo quyền của tài khoản; nghiệp vụ tương ứng chưa được kết nối."
    tabs={["Chờ xác nhận","Ngoại lệ đối soát","Đã xác nhận","Đã từ chối"]}
    stats={["Chờ đối soát","Đã xác nhận","Ngoại lệ","Đã từ chối"]}
    columns={["Thanh toán","Hóa đơn / Cư dân","Số tiền","Phương thức","Trạng thái"]}
    actions={[{"label":"Ghi nhận tiền mặt","fields":["Hóa đơn","Số tiền thực nhận","Ngày nhận","Ghi chú"]},{"label":"Xem biểu mẫu từ chối","fields":["Thanh toán cần xử lý","Lý do từ chối"]}]}
    sections={[{"title":"Minh chứng thanh toán","fields":["Ảnh minh chứng","Nội dung chuyển khoản","Người xác nhận"]}]}
  />
}
