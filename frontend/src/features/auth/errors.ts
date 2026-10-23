import { isAxiosError } from 'axios'
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'

export function authErrorMessage(error: unknown): string {
  if (!isAxiosError(error) || !error.response) return 'Không thể kết nối máy chủ. Vui lòng thử lại.'
  switch (error.response.status) {
    case 401: return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    case 403: return 'Tài khoản đã bị khóa hoặc không có quyền thực hiện thao tác này.'
    case 409: return 'Email hoặc số điện thoại vừa được sử dụng. Vui lòng kiểm tra lại.'
    case 419: return 'Phiên bảo mật đã hết hạn. Vui lòng gửi lại biểu mẫu.'
    case 422: return 'Vui lòng kiểm tra thông tin đã nhập.'
    case 429: {
      const seconds = Number(error.response.headers['retry-after'])
      return Number.isFinite(seconds) && seconds > 0
        ? `Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ${Math.ceil(seconds)} giây.`
        : 'Bạn đã thử quá nhiều lần. Vui lòng đợi một phút rồi thử lại.'
    }
    default: return 'Máy chủ chưa xử lý được yêu cầu. Vui lòng thử lại sau.'
  }
}

export function applyAuthErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, fields: readonly string[]) {
  if (isAxiosError(error) && error.response?.status === 422) {
    const errors: unknown = error.response.data?.errors
    if (errors && typeof errors === 'object') {
      for (const [field, messages] of Object.entries(errors)) {
        if (fields.includes(field) && Array.isArray(messages) && typeof messages[0] === 'string') {
          setError(field as Path<T>, { type: 'server', message: messages[0] })
        }
      }
    }
  }
  setError('root', { message: authErrorMessage(error) })
}
