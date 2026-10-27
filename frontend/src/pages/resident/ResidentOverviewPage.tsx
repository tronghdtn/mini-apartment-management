import { Home } from 'lucide-react'
import { UnavailableWorkspace } from '@/components/ui/UnavailableWorkspace'

// Source: ui-antigravity-full/src/pages/resident/ResidentOverviewPage.tsx. No business mock is imported.
export function ResidentOverviewPage() {
  return <UnavailableWorkspace title="Tổng quan cư dân" icon={Home} description="Thông tin được giới hạn theo quyền của tài khoản; nghiệp vụ tương ứng chưa được kết nối."
    stats={["Hợp đồng đang hiệu lực","Hóa đơn chưa thanh toán","Yêu cầu sửa chữa","Thông báo chưa đọc"]}
    sections={[{"title":"Thông tin căn hộ","fields":["Tòa nhà","Phòng","Thời hạn hợp đồng"]},{"title":"Hóa đơn gần nhất","fields":["Kỳ","Số tiền còn nợ","Hạn thanh toán"]},{"title":"Sửa chữa gần đây","fields":["Yêu cầu","Trạng thái xử lý"]},{"title":"Thông báo gần đây","fields":["Nội dung","Thời gian"]}]}
  />
}
