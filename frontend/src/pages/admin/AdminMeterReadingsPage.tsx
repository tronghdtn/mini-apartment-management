import { Gauge } from 'lucide-react'
import { UnavailableWorkspace } from '@/components/ui/UnavailableWorkspace'

// Source: ui-antigravity-full/src/pages/admin/AdminMeterReadingsPage.tsx. No business mock is imported.
export function AdminMeterReadingsPage() {
  return <UnavailableWorkspace title="Chỉ số điện nước" icon={Gauge} description="Thông tin được giới hạn theo quyền của tài khoản; nghiệp vụ tương ứng chưa được kết nối."
    tabs={["Danh sách chỉ số","Nhập hàng loạt","Duyệt ảnh cư dân"]}
    stats={["Đã ghi chỉ số","Chưa ghi","Yêu cầu chờ duyệt"]}
    columns={["Phòng","Dịch vụ","Kỳ tiêu thụ","Ngày ghi","Chỉ số mới","Trạng thái"]}
    actions={[{"label":"Nhập chỉ số","fields":["Phòng","Dịch vụ","Kỳ tiêu thụ","Ngày ghi thực tế","Chỉ số mới"]},{"label":"Xem biểu mẫu nhập hàng loạt","fields":["Tòa nhà","Kỳ tiêu thụ","Ngày ghi","Danh sách chỉ số cần kiểm tra"]}]}
    sections={[{"title":"Yêu cầu chỉ số từ cư dân","fields":["Ảnh chỉ số","Người gửi","Trạng thái duyệt"]}]}
  />
}
