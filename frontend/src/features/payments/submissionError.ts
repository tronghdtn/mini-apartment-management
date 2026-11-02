import { isAxiosError } from 'axios'
import { apiErrorMessage } from '../../lib/apiErrors.ts'

/** Không có phản hồi chắc chắn không có nghĩa là máy chủ chưa lưu tiền. */
export function paymentSubmissionError(failure: unknown) {
  const status = isAxiosError(failure) ? failure.response?.status : undefined
  // Lỗi đọc JSON/schema sau HTTP 201 cũng có thể xảy ra sau khi đã lưu.
  const requiresReload = status === undefined || status < 400 || status >= 500

  return {
    requiresReload,
    message: requiresReload
      ? 'Chưa xác định được kết quả xử lý. Hãy tải lại hóa đơn và lịch sử thanh toán, kiểm tra khoản đã lưu trước khi thao tác tiếp. Không chuyển tiền hoặc gửi lại chỉ vì gặp lỗi này.'
      : apiErrorMessage(failure) + (status === 409 ? ' Đóng biểu mẫu và tải lại dữ liệu trước khi thao tác tiếp.' : ''),
  }
}
