import { FileText } from 'lucide-react'
import { UnavailableWorkspace } from '@/components/ui/UnavailableWorkspace'

// Source: ui-antigravity-full/src/pages/admin/AdminContractTerminatePage.tsx. No business mock is imported.
export function AdminContractTerminatePage() {
  return <UnavailableWorkspace title="Thanh lý hợp đồng" icon={FileText} description="Thông tin được giới hạn theo quyền của tài khoản; nghiệp vụ tương ứng chưa được kết nối."
    tabs={["Bàn giao","Kiểm tra tài sản","Quyết toán","Xác nhận"]}
    actions={[{"label":"Xem biểu mẫu bàn giao","fields":["Ngày bàn giao thực tế","Lý do và ghi chú","Chỉ số điện chốt","Chỉ số nước chốt","Kết quả kiểm tra tài sản","Căn cứ miễn phí nếu có"]}]}
    sections={[{"title":"Hợp đồng cần thanh lý","fields":["Phòng","Người thuê","Điều khoản đã ký"]},{"title":"Đối soát sau bàn giao","fields":["Hóa đơn quyết toán","Bồi thường tài sản","Đối soát tiền cọc"]}]}
    backTo={"/admin/contracts"}
  />
}
