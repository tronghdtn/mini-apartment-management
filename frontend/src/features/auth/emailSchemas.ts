import { z } from 'zod'
import { passwordConfirmationRule, passwordFitsBcrypt, passwordsMatch, registrationFields } from '../../lib/accountSchemas.ts'

// DB-D95: Backend là nơi kiểm tra cuối cùng; Zod chỉ báo lỗi sớm đúng ô.
const requiredEmail = registrationFields.email.refine(value => value !== '', 'Vui lòng nhập email')

export const forgotPasswordSchema = z.object({ email: requiredEmail }).strict()
export const resetPasswordSchema = z.object({
  password: registrationFields.password,
  password_confirmation: registrationFields.password_confirmation,
}).strict().refine(passwordsMatch, passwordConfirmationRule)
export const changeEmailSchema = z.object({
  email: requiredEmail,
  current_password: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại').refine(passwordFitsBcrypt, 'Mật khẩu không hợp lệ hoặc vượt 72 byte'),
}).strict()

/** Tham số liên kết xác minh trên URL: chỉ chuyển nguyên văn cho Backend kiểm chữ ký. */
export const verifyLinkSchema = z.object({
  id: z.string().regex(/^[1-9]\d{0,15}$/),
  hash: z.string().regex(/^[a-f0-9]{40}$/),
  expires: z.string().regex(/^[1-9]\d{0,9}$/),
  signature: z.string().regex(/^[a-f0-9]{64}$/),
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type ChangeEmailInput = z.infer<typeof changeEmailSchema>
export type VerifyLink = z.infer<typeof verifyLinkSchema>
