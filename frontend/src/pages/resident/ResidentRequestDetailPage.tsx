import { Wrench } from 'lucide-react'
import { UnavailableWorkspace } from '@/components/ui/UnavailableWorkspace'

// Source: ui-antigravity-full/src/pages/resident/ResidentRequestDetailPage.tsx. No business mock is imported.
export function ResidentRequestDetailPage() {
  return <UnavailableWorkspace title="Chi tiết sự cố" icon={Wrench} description="Thông tin được giới hạn theo quyền của tài khoản; nghiệp vụ tương ứng chưa được kết nối."
    tabs={["Thông tin","Tiến độ xử lý"]}
    sections={[{"title":"Sự cố đã báo","fields":["Tiêu đề","Mô tả","Ảnh hiện trạng","Ngày gửi"]},{"title":"Tiến độ xử lý","fields":["Trạng thái","Kỹ thuật viên phụ trách","Ghi chú hoàn tất","Ảnh kết quả"]}]}
    backTo={"/resident/requests"}
  />
}
