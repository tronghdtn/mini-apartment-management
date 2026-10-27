import { Wrench } from 'lucide-react'
import { UnavailableWorkspace } from '@/components/ui/UnavailableWorkspace'

// Source: ui-antigravity-full/src/pages/resident/ResidentRequestsPage.tsx. No business mock is imported.
export function ResidentRequestsPage() {
  return <UnavailableWorkspace title="Yêu cầu sửa chữa của tôi" icon={Wrench} description="Thông tin được giới hạn theo quyền của tài khoản; nghiệp vụ tương ứng chưa được kết nối."
    tabs={["Tất cả","Chờ xử lý","Đang xử lý","Đã giải quyết","Từ chối"]}
    actions={[{"label":"Báo sự cố","fields":["Tiêu đề sự cố","Mô tả chi tiết","Mức độ ưu tiên","Ảnh hiện trạng"]}]}
  />
}
