import { Wrench } from 'lucide-react'
import { UnavailableWorkspace } from '@/components/ui/UnavailableWorkspace'

// Source: ui-antigravity-full/src/pages/resident/ResidentRequestNewPage.tsx. No business mock is imported.
export function ResidentRequestNewPage() {
  return <UnavailableWorkspace title="Báo sự cố mới" icon={Wrench} description="Thông tin được giới hạn theo quyền của tài khoản; nghiệp vụ tương ứng chưa được kết nối."
    actions={[{"label":"Biểu mẫu báo sự cố","fields":["Tiêu đề sự cố","Mô tả chi tiết","Mức độ ưu tiên","Ảnh hiện trạng"]}]}
    sections={[{"title":"Phòng gửi yêu cầu","fields":["Tòa nhà","Phòng","Hợp đồng đang hiệu lực"]},{"title":"Nội dung sự cố","fields":["Tiêu đề","Mô tả","Mức độ ưu tiên","Ảnh hiện trạng"]}]}
    backTo={"/resident/requests"}
  />
}
