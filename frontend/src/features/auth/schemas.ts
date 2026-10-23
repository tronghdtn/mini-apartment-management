import { z } from 'zod'
import { passwordFitsBcrypt, registrationFields, passwordsMatch, passwordConfirmationRule } from '../../lib/accountSchemas.ts'

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Vui lòng nhập email hoặc số điện thoại').max(191, 'Định danh tối đa 191 ký tự'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu').refine(passwordFitsBcrypt, 'Mật khẩu không hợp lệ hoặc vượt 72 byte'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const registerSchema = z.object(registrationFields).refine(passwordsMatch, passwordConfirmationRule)

export type RegisterInput = z.infer<typeof registerSchema>
