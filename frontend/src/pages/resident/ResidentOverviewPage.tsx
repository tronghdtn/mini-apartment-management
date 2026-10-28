import { Home } from 'lucide-react'
import { UnavailableWorkspace } from '@/components/ui/UnavailableWorkspace'
import { ResidentMeterReadingsPanel } from '@/features/meter-submissions/ResidentMeterReadingsPanel'

// Source: ui-antigravity-full/src/pages/resident/ResidentOverviewPage.tsx. No business mock is imported.
export function ResidentOverviewPage() {
  return <div className="space-y-6"><ResidentMeterReadingsPanel /><UnavailableWorkspace title="Tổng quan cư dân" icon={Home} description="Các mục tổng quan bên dưới chưa kết nối; gửi ảnh chỉ số ở panel phía trên đã có API riêng."
    stats={["Hợp đồng đang hiệu lực","Hóa đơn chưa thanh toán","Yêu cầu sửa chữa","Thông báo chưa đọc"]}
    sections={[{"title":"Thông tin căn hộ","fields":["Tòa nhà","Phòng","Thời hạn hợp đồng"]},{"title":"Hóa đơn gần nhất","fields":["Kỳ","Số tiền còn nợ","Hạn thanh toán"]},{"title":"Sửa chữa gần đây","fields":["Yêu cầu","Trạng thái xử lý"]},{"title":"Thông báo gần đây","fields":["Nội dung","Thời gian"]}]}
  /></div>
}
