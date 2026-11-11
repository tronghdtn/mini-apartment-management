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

/**
 * Thông điệp nghiệp vụ Backend tự viết bằng `abort(409|422, '...')` (422 không kèm lỗi theo trường).
 * Trả `null` khi không có hoặc khi chuỗi dài, giống SQL/đường dẫn mã nguồn, để nơi gọi dùng thông báo chung.
 */
export function apiBusinessMessage(error: unknown): string | null {
  if (!isAxiosError(error) || !error.response) return null
  const { status, data } = error.response
  if (status !== 409 && status !== 422) return null
  const fieldErrors: unknown = data?.errors
  if (status === 422 && fieldErrors && typeof fieldErrors === 'object' && Object.keys(fieldErrors).length > 0) return null
  const message: unknown = data?.message
  if (typeof message !== 'string') return null
  const text = message.trim()
  if (text === '' || text.length > 300 || /sql|select |insert |update |delete |exception|\.php/i.test(text)) return null
  return text
}

/**
 * 409 ở các bước nhiều điều kiện (thanh lý, lập hóa đơn) cần lý do cụ thể; các status khác giữ thông báo chung.
 */
export function apiConflictMessage(error: unknown): string {
  const message = isAxiosError(error) && error.response?.status === 409 ? apiBusinessMessage(error) : null
  if (message) return /tải lại/i.test(message) ? message : `${message} Tải lại dữ liệu trước khi thử lại.`
  return apiErrorMessage(error)
}

/** Thông báo cấp form: lý do nghiệp vụ của 409/422 nếu Backend có gửi, ngược lại là thông báo chung theo status. */
export function apiActionMessage(error: unknown): string {
  if (isAxiosError(error) && error.response?.status === 409) return apiConflictMessage(error)
  return apiBusinessMessage(error) ?? apiErrorMessage(error)
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
  setError('root', { message: apiActionMessage(error) })
}
