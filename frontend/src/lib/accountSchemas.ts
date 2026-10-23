import { z } from 'zod'

/** Giữ chung quy tắc đăng ký và cấp nhân viên; mật khẩu không bị trim hoặc chuyển đổi. */
export function passwordFitsBcrypt(value: string) {
  return !value.includes('\0') && new TextEncoder().encode(value).length <= 72
}

export function validPhone(value: string) {
  const normalized = value.replace(/^\+?84(?=\d{9}$)/, '0')
  return /^\+?\d{10,15}$/.test(normalized)
}

export const registrationFields = {
  full_name: z.string().trim().min(1, 'Vui lòng nhập họ và tên').max(120, 'Họ tên tối đa 120 ký tự'),
  phone: z.string().trim().refine(validPhone, 'Số điện thoại phải có 10–15 chữ số, có thể bắt đầu bằng +'),
  email: z.string().trim().max(191, 'Email tối đa 191 ký tự').refine(value => value === '' || z.email({ pattern: z.regexes.rfc5322Email }).safeParse(value).success, 'Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự').refine(passwordFitsBcrypt, 'Mật khẩu không hợp lệ hoặc vượt 72 byte'),
  password_confirmation: z.string().min(1, 'Vui lòng nhập lại mật khẩu'),
}

export function passwordsMatch(value: { password: string; password_confirmation: string }) {
  return value.password === value.password_confirmation
}

export const passwordConfirmationRule = {
  path: ['password_confirmation'], message: 'Mật khẩu nhập lại không khớp',
}
