import { isAxiosError } from 'axios'
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'

/** Thông báo chung không trả SQL/stack trace từ server ra giao diện. */
export function apiErrorMessage(error: unknown): string {
  if (!isAxiosError(error) || !error.response) return 'Không thể kết nối máy chủ. Vui lòng thử lại.'
  switch (error.response.status) {
    case 401: return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    case 403: return 'Bạn không có quyền thực hiện thao tác này hoặc tài khoản đã bị khóa.'
    case 404: return 'Không tìm thấy dữ liệu yêu cầu.'
    case 409: return 'Dữ liệu bị xung đột. Vui lòng tải lại và kiểm tra trước khi lưu.'
    case 419: return 'Phiên bảo mật đã hết hạn. Vui lòng thử lại.'
    case 422: return 'Vui lòng kiểm tra thông tin đã nhập.'
    case 429: return 'Bạn thao tác quá nhanh. Vui lòng đợi rồi thử lại.'
    case 503: return 'Khu vực này chưa sẵn sàng. Vui lòng thử lại sau.'
    default: return 'Máy chủ chưa xử lý được yêu cầu. Vui lòng thử lại sau.'
  }
}

export function applyApiErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, allowedFields: readonly string[]): void {
  if (isAxiosError(error) && error.response?.status === 422) {
    const errors: unknown = error.response.data?.errors
    if (errors && typeof errors === 'object') {
      for (const [field, messages] of Object.entries(errors)) {
        if (allowedFields.includes(field) && Array.isArray(messages) && typeof messages[0] === 'string') {
          setError(field as Path<T>, { type: 'server', message: messages[0] })
        }
      }
    }
  }
  setError('root', { message: apiErrorMessage(error) })
}
