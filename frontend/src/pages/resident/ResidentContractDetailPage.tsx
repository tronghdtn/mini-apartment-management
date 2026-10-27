import { FileText } from 'lucide-react'
import { UnavailableWorkspace } from '@/components/ui/UnavailableWorkspace'

// Source: ui-antigravity-full/src/pages/resident/ResidentContractDetailPage.tsx. No business mock is imported.
export function ResidentContractDetailPage() {
  return <UnavailableWorkspace title="Chi tiết hợp đồng thuê" icon={FileText} description="Thông tin được giới hạn theo quyền của tài khoản; nghiệp vụ tương ứng chưa được kết nối."
    tabs={["Tổng quan","Điều khoản","Dịch vụ"]}
    sections={[{"title":"Thời hạn và tài chính","fields":["Ngày bắt đầu","Ngày cuối được ở","Tiền thuê / tháng","Tiền cọc","Trạng thái cọc"]},{"title":"Điều khoản đã ký","fields":["Điều khoản phí trước hạn","Điều kiện miễn phí","Người ở cùng","Dịch vụ đã đăng ký"]}]}
    backTo={"/resident/contracts"}
  />
}
